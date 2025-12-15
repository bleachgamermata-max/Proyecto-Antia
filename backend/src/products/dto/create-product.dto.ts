import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BillingType, BillingPeriod, AccessMode } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({ default: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: BillingType })
  @IsEnum(BillingType)
  billingType: BillingType;

  @ApiProperty({ enum: BillingPeriod, required: false })
  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  capacityLimit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telegramChannelId?: string;

  @ApiProperty({ enum: AccessMode, default: 'AUTO_JOIN' })
  @IsOptional()
  @IsEnum(AccessMode)
  accessMode?: AccessMode;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  validityDays?: number;
}
