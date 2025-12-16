import { Controller, Get, Post, Patch, Body, Param, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
  ) {}

  @Post()
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Create new product (Tipster only)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    // Get tipster profile
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });
    return this.productsService.create(tipsterProfile.id, dto);
  }

  @Get('my')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Get my products (Tipster only)' })
  async getMyProducts(@CurrentUser() user: any) {
    return this.productsService.findAllByUserId(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async getOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Update product (Tipster only)' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateProductDto,
  ) {
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });
    return this.productsService.update(id, tipsterProfile.id, dto);
  }

  @Post(':id/publish')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Publish product (Tipster only)' })
  async publish(@Param('id') id: string, @CurrentUser() user: any) {
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });
    return this.productsService.publish(id, tipsterProfile.id);
  }

  @Post(':id/pause')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Pause product (Tipster only)' })
  async pause(@Param('id') id: string, @CurrentUser() user: any) {
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });
    return this.productsService.pause(id, tipsterProfile.id);
  }

  @Get(':id/checkout-link')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Get checkout link for product' })
  async getCheckoutLink(@Param('id') id: string, @CurrentUser() user: any) {
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });
    return this.productsService.getCheckoutLink(id, tipsterProfile.id);
  }

  @Post(':id/publish-telegram')
  @Roles('TIPSTER')
  @ApiOperation({ summary: 'Publish product to Telegram channel' })
  async publishToTelegram(@Param('id') id: string, @CurrentUser() user: any) {
    // Get tipster profile
    const tipsterProfile = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipsterProfile) {
      return {
        success: false,
        message: 'Perfil de tipster no encontrado',
      };
    }

    // Check if Telegram channel is connected
    if (!tipsterProfile.telegramChannelId) {
      return {
        success: false,
        message: 'No tienes un canal de Telegram conectado. Por favor, conéctalo primero.',
      };
    }

    // Get product details
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return {
        success: false,
        message: 'Producto no encontrado',
      };
    }

    // Verify product belongs to this tipster
    if (product.tipsterId !== tipsterProfile.id) {
      return {
        success: false,
        message: 'No tienes permiso para publicar este producto',
      };
    }

    // Get checkout link
    const checkoutLink = await this.productsService.getCheckoutLink(id, tipsterProfile.id);

    // Publish to Telegram
    return this.telegramService.publishProduct(
      tipsterProfile.telegramChannelId,
      {
        ...product,
        checkoutLink: checkoutLink.url,
      },
    );
  }
}
