import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CheckoutService, CreateCheckoutDto } from './checkout.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  private readonly logger = new Logger(CheckoutController.name);

  constructor(private checkoutService: CheckoutService) {}

  // Get product info for checkout page
  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get product info for checkout' })
  async getProduct(@Param('productId') productId: string) {
    return this.checkoutService.getProductForCheckout(productId);
  }

  // Create checkout session
  @Public()
  @Post('session')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  async createCheckoutSession(
    @Body() body: {
      productId: string;
      originUrl: string;
      isGuest: boolean;
      email?: string;
      phone?: string;
      telegramUserId?: string;
      telegramUsername?: string;
    },
  ) {
    this.logger.log(`Creating checkout session for product ${body.productId}`);
    return this.checkoutService.createCheckoutSession(body);
  }

  // Get checkout status
  @Public()
  @Get('status/:sessionId')
  @ApiOperation({ summary: 'Get checkout session status' })
  async getCheckoutStatus(@Param('sessionId') sessionId: string) {
    return this.checkoutService.getCheckoutStatus(sessionId);
  }

  // Verify payment and get order details (for success page)
  @Public()
  @Get('verify')
  @ApiOperation({ summary: 'Verify payment and get order details' })
  async verifyPayment(
    @Query('session_id') sessionId: string,
    @Query('order_id') orderId: string,
  ) {
    return this.checkoutService.verifyPaymentAndGetOrder(sessionId, orderId);
  }

  // Stripe webhook
  @Public()
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('No raw body in webhook request');
      return { received: false };
    }
    
    this.logger.log('Received Stripe webhook');
    return this.checkoutService.handleStripeWebhook(rawBody, signature);
  }
}
