import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { UserRole } from '@prisma/client';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.TIPSTER)
  @ApiOperation({ summary: 'Create new product (Tipster only)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.tipsterProfile.id, dto);
  }

  @Get('my')
  @Roles(UserRole.TIPSTER)
  @ApiOperation({ summary: 'Get my products (Tipster only)' })
  async getMyProducts(@CurrentUser() user: any) {
    return this.productsService.findAllByTipster(user.tipsterProfile.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async getOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.TIPSTER)
  @ApiOperation({ summary: 'Update product (Tipster only)' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, user.tipsterProfile.id, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.TIPSTER)
  @ApiOperation({ summary: 'Publish product (Tipster only)' })
  async publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.publish(id, user.tipsterProfile.id);
  }

  @Post(':id/pause')
  @Roles(UserRole.TIPSTER)
  @ApiOperation({ summary: 'Pause product (Tipster only)' })
  async pause(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.pause(id, user.tipsterProfile.id);
  }

  @Get(':id/checkout-link')
  @Roles(UserRole.TIPSTER)
  @ApiOperation({ summary: 'Get checkout link for product' })
  async getCheckoutLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.getCheckoutLink(id, user.tipsterProfile.id);
  }
}
