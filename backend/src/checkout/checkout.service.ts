import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import Stripe from 'stripe';

export interface CreateCheckoutDto {
  productId: string;
  originUrl: string;
  isGuest: boolean;
  email?: string;
  phone?: string;
  telegramUserId?: string;
  telegramUsername?: string;
}

export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
  orderId: string;
}

@Injectable()
export class CheckoutService {
  private stripe: Stripe;
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private telegramService: TelegramService,
  ) {
    const stripeKey = this.config.get<string>('STRIPE_API_KEY');
    if (!stripeKey) {
      this.logger.warn('STRIPE_API_KEY not configured');
    }
    this.stripe = new Stripe(stripeKey || '');
  }

  async createCheckoutSession(dto: CreateCheckoutDto): Promise<CheckoutSessionResponse> {
    // 1. Get product from database
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product || !product.active) {
      throw new NotFoundException('Producto no encontrado o no está disponible');
    }

    // Get tipster info
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: product.tipsterId },
    });

    // 2. Create order in database BEFORE Stripe session
    const orderId = await this.createPendingOrder({
      productId: dto.productId,
      tipsterId: product.tipsterId,
      amountCents: product.priceCents,
      currency: product.currency,
      email: dto.email,
      phone: dto.phone,
      telegramUserId: dto.telegramUserId,
      telegramUsername: dto.telegramUsername,
      isGuest: dto.isGuest,
    });

    // 3. Build success and cancel URLs
    const successUrl = `${dto.originUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;
    const cancelUrl = `${dto.originUrl}/checkout/cancel?order_id=${orderId}`;

    // 4. Create Stripe checkout session
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: product.currency.toLowerCase(),
              product_data: {
                name: product.title,
                description: product.description || `Pronóstico de ${tipster?.publicName || 'Tipster'}`,
              },
              unit_amount: product.priceCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: dto.email || undefined,
        metadata: {
          orderId,
          productId: dto.productId,
          tipsterId: product.tipsterId,
          telegramUserId: dto.telegramUserId || '',
          telegramUsername: dto.telegramUsername || '',
          isGuest: dto.isGuest ? 'true' : 'false',
        },
      });

      // 5. Update order with Stripe session ID
      await this.updateOrderWithSession(orderId, session.id);

      this.logger.log(`Created checkout session ${session.id} for order ${orderId}`);

      return {
        url: session.url!,
        sessionId: session.id,
        orderId,
      };
    } catch (error) {
      this.logger.error('Error creating Stripe session:', error);
      throw new BadRequestException('Error al crear la sesión de pago');
    }
  }

  async getCheckoutStatus(sessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      
      return {
        status: session.status,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      };
    } catch (error) {
      this.logger.error('Error retrieving checkout status:', error);
      throw new NotFoundException('Sesión de pago no encontrada');
    }
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    
    let event: Stripe.Event;

    try {
      if (webhookSecret) {
        event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        // For testing without webhook secret
        event = JSON.parse(payload.toString());
      }
    } catch (err) {
      this.logger.error('Webhook signature verification failed:', err);
      throw new BadRequestException('Webhook signature verification failed');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handlePaymentSuccess(session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handlePaymentExpired(session);
        break;
      }
    }

    return { received: true };
  }

  async handlePaymentSuccess(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      this.logger.error('No orderId in session metadata');
      return;
    }

    this.logger.log(`Processing successful payment for order ${orderId}`);

    // Update order status
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [{
        q: { _id: { $oid: orderId } },
        u: {
          $set: {
            status: 'PAGADA',
            payment_provider: 'stripe',
            provider_order_id: session.id,
            payment_method: 'card',
            updated_at: { $date: new Date().toISOString() },
          },
        },
      }],
    });

    // Send Telegram notification if user came from Telegram
    const telegramUserId = session.metadata?.telegramUserId;
    if (telegramUserId) {
      await this.telegramService.notifyPaymentSuccess(
        telegramUserId,
        orderId,
        session.metadata?.productId || '',
      );
    }
  }

  async handlePaymentExpired(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;

    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [{
        q: { _id: { $oid: orderId } },
        u: {
          $set: {
            status: 'EXPIRED',
            updated_at: { $date: new Date().toISOString() },
          },
        },
      }],
    });
  }

  async verifyPaymentAndGetOrder(sessionId: string, orderId: string) {
    // Get session status from Stripe
    const status = await this.getCheckoutStatus(sessionId);
    
    if (status.paymentStatus === 'paid') {
      // Update order if not already updated
      const order = await this.getOrderById(orderId);
      
      if (order && order.status === 'PENDING') {
        await this.prisma.$runCommandRaw({
          update: 'orders',
          updates: [{
            q: { _id: { $oid: orderId } },
            u: {
              $set: {
                status: 'PAGADA',
                payment_provider: 'stripe',
                provider_order_id: sessionId,
                payment_method: 'card',
                updated_at: { $date: new Date().toISOString() },
              },
            },
          }],
        });
      }
    }

    // Get updated order
    const order = await this.getOrderById(orderId);
    
    // Get product info
    const product = order ? await this.prisma.product.findUnique({
      where: { id: order.productId },
    }) : null;

    // Get tipster info
    const tipster = product ? await this.prisma.tipsterProfile.findUnique({
      where: { id: product.tipsterId },
    }) : null;

    return {
      ...status,
      order,
      product,
      tipster,
    };
  }

  private async createPendingOrder(data: {
    productId: string;
    tipsterId: string;
    amountCents: number;
    currency: string;
    email?: string;
    phone?: string;
    telegramUserId?: string;
    telegramUsername?: string;
    isGuest: boolean;
  }): Promise<string> {
    const now = new Date();
    const orderId = this.generateOrderId();

    await this.prisma.$runCommandRaw({
      insert: 'orders',
      documents: [{
        _id: { $oid: orderId },
        product_id: data.productId,
        tipster_id: data.tipsterId,
        amount_cents: data.amountCents,
        currency: data.currency,
        email_backup: data.email || null,
        phone_backup: data.phone || null,
        telegram_user_id: data.telegramUserId || null,
        telegram_username: data.telegramUsername || null,
        status: 'PENDING',
        payment_provider: 'stripe',
        meta: { isGuest: data.isGuest },
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });

    return orderId;
  }

  private async updateOrderWithSession(orderId: string, sessionId: string) {
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [{
        q: { _id: { $oid: orderId } },
        u: {
          $set: {
            provider_order_id: sessionId,
            updated_at: { $date: new Date().toISOString() },
          },
        },
      }],
    });
  }

  private async getOrderById(orderId: string) {
    const result = await this.prisma.$runCommandRaw({
      find: 'orders',
      filter: { _id: { $oid: orderId } },
      limit: 1,
    }) as any;

    if (result.cursor?.firstBatch?.length > 0) {
      const doc = result.cursor.firstBatch[0];
      return {
        id: doc._id.$oid || doc._id,
        productId: doc.product_id,
        tipsterId: doc.tipster_id,
        amountCents: doc.amount_cents,
        currency: doc.currency,
        status: doc.status,
        emailBackup: doc.email_backup,
        phoneBackup: doc.phone_backup,
        telegramUserId: doc.telegram_user_id,
        telegramUsername: doc.telegram_username,
        paymentProvider: doc.payment_provider,
        providerOrderId: doc.provider_order_id,
        createdAt: doc.created_at,
      };
    }
    return null;
  }

  private generateOrderId(): string {
    // Generate a MongoDB ObjectId-like string
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const random = Math.random().toString(16).substring(2, 18).padStart(16, '0');
    return timestamp + random.substring(0, 16);
  }

  async getProductForCheckout(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      throw new NotFoundException('Producto no encontrado');
    }

    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: product.tipsterId },
    });

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      priceCents: product.priceCents,
      currency: product.currency,
      billingType: product.billingType,
      validityDays: product.validityDays,
      tipster: tipster ? {
        id: tipster.id,
        publicName: tipster.publicName,
        avatarUrl: tipster.avatarUrl,
      } : null,
    };
  }

  /**
   * Simulate a successful payment (for testing purposes)
   */
  async simulateSuccessfulPayment(orderId: string) {
    const order = await this.getOrderById(orderId);
    
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status === 'PAGADA') {
      return {
        success: true,
        message: 'La orden ya está pagada',
        order,
      };
    }

    // Update order status to PAGADA
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [{
        q: { _id: { $oid: orderId } },
        u: {
          $set: {
            status: 'PAGADA',
            payment_provider: 'stripe_simulated',
            payment_method: 'card_simulated',
            paid_at: { $date: new Date().toISOString() },
            updated_at: { $date: new Date().toISOString() },
          },
        },
      }],
    });

    // Send Telegram notification if user came from Telegram
    let telegramResult = null;
    if (order.telegramUserId) {
      telegramResult = await this.telegramService.notifyPaymentSuccess(
        order.telegramUserId,
        orderId,
        order.productId,
      );
    }

    // Get updated order
    const updatedOrder = await this.getOrderById(orderId);

    return {
      success: true,
      message: 'Pago simulado exitosamente',
      order: updatedOrder,
      telegramNotification: telegramResult,
    };
  }

  /**
   * Complete payment and send notifications
   */
  async completePaymentAndNotify(orderId: string, sessionId?: string) {
    const order = await this.getOrderById(orderId);
    
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // If already paid, just return the order info
    if (order.status === 'PAGADA') {
      const product = await this.prisma.product.findUnique({
        where: { id: order.productId },
      });
      const tipster = product ? await this.prisma.tipsterProfile.findUnique({
        where: { id: product.tipsterId },
      }) : null;

      return {
        success: true,
        alreadyPaid: true,
        order,
        product,
        tipster,
      };
    }

    // Update order status to PAGADA
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [{
        q: { _id: { $oid: orderId } },
        u: {
          $set: {
            status: 'PAGADA',
            payment_provider: 'stripe',
            provider_order_id: sessionId || order.providerOrderId,
            payment_method: 'card',
            paid_at: { $date: new Date().toISOString() },
            updated_at: { $date: new Date().toISOString() },
          },
        },
      }],
    });

    // Get product and tipster info first
    const product = await this.prisma.product.findUnique({
      where: { id: order.productId },
    });
    const tipster = product ? await this.prisma.tipsterProfile.findUnique({
      where: { id: product.tipsterId },
    }) : null;

    // Send Telegram notification to BUYER if user came from Telegram
    let telegramResult = null;
    if (order.telegramUserId) {
      telegramResult = await this.telegramService.notifyPaymentSuccess(
        order.telegramUserId,
        orderId,
        order.productId,
      );
    }

    // Send notification to TIPSTER about new sale
    if (product) {
      await this.telegramService.notifyTipsterNewSale(
        product.tipsterId,
        orderId,
        order.productId,
        order.amountCents,
        order.currency,
        order.emailBackup,
        order.telegramUsername,
      );
    }

    // Get updated order
    const updatedOrder = await this.getOrderById(orderId);

    return {
      success: true,
      order: updatedOrder,
      product,
      tipster,
      telegramNotification: telegramResult,
    };
  }

  /**
   * Get order details by ID
   */
  async getOrderDetails(orderId: string) {
    const order = await this.getOrderById(orderId);
    
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: order.productId },
    });
    const tipster = product ? await this.prisma.tipsterProfile.findUnique({
      where: { id: product.tipsterId },
    }) : null;

    return {
      order,
      product,
      tipster,
    };
  }

  /**
   * Create order and simulate payment in one step (for testing)
   */
  async createAndSimulatePayment(data: {
    productId: string;
    email?: string;
    phone?: string;
    telegramUserId?: string;
    telegramUsername?: string;
  }) {
    // 1. Get product
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product || !product.active) {
      throw new NotFoundException('Producto no encontrado o no está disponible');
    }

    // 2. Create order
    const orderId = await this.createPendingOrder({
      productId: data.productId,
      tipsterId: product.tipsterId,
      amountCents: product.priceCents,
      currency: product.currency,
      email: data.email,
      phone: data.phone,
      telegramUserId: data.telegramUserId,
      telegramUsername: data.telegramUsername,
      isGuest: true,
    });

    this.logger.log(`Created test order ${orderId}`);

    // 3. Simulate payment
    await this.prisma.$runCommandRaw({
      update: 'orders',
      updates: [{
        q: { _id: { $oid: orderId } },
        u: {
          $set: {
            status: 'PAGADA',
            payment_provider: 'test_simulated',
            payment_method: 'test',
            paid_at: { $date: new Date().toISOString() },
            updated_at: { $date: new Date().toISOString() },
          },
        },
      }],
    });

    this.logger.log(`Simulated payment for order ${orderId}`);

    // 4. Send Telegram notification if user came from Telegram
    let telegramResult = null;
    if (data.telegramUserId) {
      telegramResult = await this.telegramService.notifyPaymentSuccess(
        data.telegramUserId,
        orderId,
        data.productId,
      );
    }

    // 5. Get order details
    const order = await this.getOrderById(orderId);
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: product.tipsterId },
    });

    return {
      success: true,
      message: 'Pago simulado exitosamente',
      orderId,
      order,
      product: {
        id: product.id,
        title: product.title,
        priceCents: product.priceCents,
        currency: product.currency,
      },
      tipster: tipster ? {
        id: tipster.id,
        publicName: tipster.publicName,
      } : null,
      telegramNotification: telegramResult,
    };
  }
}
