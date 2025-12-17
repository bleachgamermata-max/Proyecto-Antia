import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(
    private telegramService: TelegramService,
    private prisma: PrismaService,
  ) {}

  // Webhook endpoint (sin guards - debe ser público para Telegram)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram webhook endpoint' })
  async handleWebhook(@Req() req: any, @Body() update: any) {
    try {
      this.logger.log('📥 Received webhook update');
      // Procesar el update con el bot
      await this.telegramService.handleUpdate(update);
      return { ok: true };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      return { ok: false };
    }
  }

  // Endpoints protegidos
  @Post('connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect Telegram channel manually' })
  async connectChannel(
    @CurrentUser() user: any,
    @Body() body: { channelIdentifier: string },
  ) {
    // Obtener el perfil del tipster
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        success: false,
        message: 'Perfil de tipster no encontrado',
      };
    }

    return this.telegramService.connectChannelManually(
      tipster.id,
      body.channelIdentifier,
    );
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Telegram channel' })
  async disconnectChannel(@CurrentUser() user: any) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      throw new Error('Perfil de tipster no encontrado');
    }

    await this.telegramService.disconnectChannel(tipster.id);
  }

  @Get('channel-info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TIPSTER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get connected channel info' })
  async getChannelInfo(@CurrentUser() user: any) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { userId: user.id },
    });

    if (!tipster) {
      return {
        connected: false,
        channel: null,
      };
    }

    const channel = await this.telegramService.getConnectedChannel(tipster.id);

    return {
      connected: !!channel,
      channel,
    };
  }

}
