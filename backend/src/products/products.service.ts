import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(tipsterId: string, dto: CreateProductDto) {
    // Use $runCommandRaw to bypass transaction requirement
    const productData = {
      tipsterId,
      title: dto.title,
      description: dto.description || null,
      priceCents: dto.priceCents,
      currency: dto.currency || 'EUR',
      billingType: dto.billingType,
      billingPeriod: dto.billingPeriod || null,
      capacityLimit: dto.capacityLimit || null,
      active: true,
      telegramChannelId: dto.telegramChannelId || null,
      accessMode: dto.accessMode || 'AUTO_JOIN',
      validityDays: dto.validityDays || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert directly using MongoDB driver to avoid transaction
    const result = await this.prisma.$runCommandRaw({
      insert: 'products',
      documents: [productData],
    });

    // Fetch the created product
    const products = await this.prisma.product.findMany({
      where: { tipsterId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return products[0];
  }

  async findAllByTipster(tipsterId: string) {
    return this.prisma.product.findMany({
      where: { tipsterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByUserId(userId: string) {
    // Get tipster profile first
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId },
    });
    
    if (!tipsterProfile) {
      return [];
    }
    
    return this.findAllByTipster(tipsterProfile.id);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, tipsterId: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (product.tipsterId !== tipsterId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async publish(id: string, tipsterId: string) {
    const product = await this.findOne(id);
    if (product.tipsterId !== tipsterId) {
      throw new ForbiddenException('Not authorized');
    }
    return this.prisma.product.update({
      where: { id },
      data: { active: true },
    });
  }

  async pause(id: string, tipsterId: string) {
    const product = await this.findOne(id);
    if (product.tipsterId !== tipsterId) {
      throw new ForbiddenException('Not authorized');
    }
    return this.prisma.product.update({
      where: { id },
      data: { active: false },
    });
  }

  async getCheckoutLink(productId: string, tipsterId: string) {
    const product = await this.findOne(productId);

    if (product.tipsterId !== tipsterId) {
      throw new ForbiddenException('Not authorized');
    }

    const checkoutUrl = `${process.env.CHECKOUT_BASE_URL}?product_id=${productId}&tipster_id=${tipsterId}`;
    
    return {
      url: checkoutUrl,
      productId,
      tipsterId,
    };
  }
}
