import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.error('TELEGRAM_BOT_TOKEN is not configured');
      throw new Error('Telegram bot token is required');
    }
    this.bot = new Telegraf(token);
    this.setupBot();
  }

  async onModuleInit() {
    try {
      // Obtener info del bot sin lanzarlo (solo inicializar botInfo)
      const botInfo = await this.bot.telegram.getMe();
      this.logger.log(`📱 Bot ready: @${botInfo.username} (polling not started)`);
      
      // No lanzamos el bot automáticamente para evitar problemas
      // El bot funcionará para enviar mensajes pero no recibirá updates
      // await this.bot.launch(); // Comentado intencionalmente
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot:', error);
      this.logger.warn('⚠️  Telegram features may not work correctly');
    }
  }

  private setupBot() {
    // Handler cuando el bot es añadido a un canal
    this.bot.on('my_chat_member', async (ctx) => {
      try {
        const { chat, new_chat_member } = ctx.myChatMember;
        
        // Verificar si el bot fue añadido como administrador
        if (
          new_chat_member.status === 'administrator' &&
          (chat.type === 'channel' || chat.type === 'supergroup')
        ) {
          this.logger.log(`🎉 Bot added to channel: ${chat.title} (${chat.id})`);
          
          // Aquí guardaremos la conexión automática
          // Buscar el tipster por algún identificador (lo implementaremos)
          await this.handleChannelConnection(chat.id.toString(), chat.title, chat.username);
        }
      } catch (error) {
        this.logger.error('Error handling my_chat_member:', error);
      }
    });

    // Command /start - Flujo principal para clientes
    this.bot.command('start', async (ctx) => {
      try {
        const startPayload = ctx.message.text.split(' ')[1]; // Obtener parámetro después de /start
        
        if (!startPayload) {
          // Sin parámetro - Mensaje genérico
          await ctx.reply(
            '👋 ¡Bienvenido a Antia!\n\n' +
            'Para comprar pronósticos de un tipster, utiliza el link que te proporcionó en su canal.\n\n' +
            '¿Eres tipster? Gestiona tu canal desde: https://antia.com/dashboard'
          );
          return;
        }

        // Verificar si es un link de producto
        if (startPayload.startsWith('product_')) {
          const productId = startPayload.replace('product_', '');
          await this.handleProductPurchaseFlow(ctx, productId);
        } else {
          await ctx.reply('Link inválido. Por favor, usa el link proporcionado por tu tipster.');
        }
      } catch (error) {
        this.logger.error('Error in /start command:', error);
        await ctx.reply('Hubo un error. Por favor, intenta nuevamente.');
      }
    });

    // Command /info para obtener información del chat
    this.bot.command('info', async (ctx) => {
      const chatId = ctx.chat.id;
      const chatType = ctx.chat.type;
      const chatTitle = 'title' in ctx.chat ? ctx.chat.title : 'N/A';
      const chatUsername = 'username' in ctx.chat ? ctx.chat.username : 'N/A';
      
      await ctx.reply(`
📊 **Información del Chat**

🆔 Chat ID: \`${chatId}\`
📝 Tipo: ${chatType}
🏷️ Título: ${chatTitle}
👤 Username: @${chatUsername}
      `, { parse_mode: 'Markdown' });
    });
  }

  // Método para manejar la conexión automática del canal
  private async handleChannelConnection(
    channelId: string,
    channelTitle: string,
    channelUsername?: string,
  ) {
    // Buscar un tipster que tenga este canal registrado por username
    if (channelUsername) {
      const tipster = await this.prisma.tipsterProfile.findFirst({
        where: {
          OR: [
            { telegramChannelName: `@${channelUsername}` },
            { telegramChannelName: channelUsername },
          ],
        },
      });

      if (tipster) {
        // Actualizar con la conexión automática
        await this.prisma.$runCommandRaw({
          update: 'tipster_profiles',
          updates: [{
            q: { _id: { $oid: tipster.id } },
            u: {
              $set: {
                telegram_channel_id: channelId,
                telegram_channel_title: channelTitle,
                telegram_connected_at: { $date: new Date().toISOString() },
                telegram_connection_type: 'auto',
                updated_at: { $date: new Date().toISOString() },
              },
            },
          }],
        });

        this.logger.log(`✅ Auto-connected channel for tipster: ${tipster.publicName}`);
        
        // Enviar mensaje de confirmación al canal
        await this.sendMessage(
          channelId,
          '✅ Canal conectado exitosamente con Antia. Ahora puedes publicar tus pronósticos aquí.',
        );
      }
    }
  }

  /**
   * Conectar un canal manualmente
   */
  async connectChannelManually(
    tipsterId: string,
    channelIdentifier: string,
  ): Promise<{ success: boolean; message: string; channelInfo?: any }> {
    try {
      // Verificar si es un username o un ID
      let chatInfo;
      
      try {
        if (channelIdentifier.startsWith('@') || !channelIdentifier.startsWith('-')) {
          // Es un username
          chatInfo = await this.bot.telegram.getChat(channelIdentifier);
        } else {
          // Es un ID numérico
          chatInfo = await this.bot.telegram.getChat(channelIdentifier);
        }
      } catch (error) {
        return {
          success: false,
          message: `No se puede acceder al canal "${channelIdentifier}". Verifica que el ID o username sea correcto.`,
        };
      }

      // Verificar que el bot es administrador
      const botInfo = await this.bot.telegram.getMe();
      let botMember;
      
      try {
        botMember = await this.bot.telegram.getChatMember(
          chatInfo.id.toString(),
          botInfo.id,
        );
      } catch (error) {
        // Si no podemos obtener info del bot, probablemente no está en el canal
        return {
          success: false,
          message: `El bot @${botInfo.username} no está añadido al canal. Por favor:\n\n1. Ve a tu canal de Telegram\n2. Añade el bot como administrador\n3. Dale permiso para "Post messages"\n4. Intenta conectar nuevamente`,
        };
      }

      if (botMember.status !== 'administrator' && botMember.status !== 'creator') {
        return {
          success: false,
          message: `El bot está en el canal pero no es administrador. Por favor, asegúrate de darle permisos de administrador con la opción "Post messages" activada.`,
        };
      }

      // Actualizar el perfil del tipster
      await this.prisma.$runCommandRaw({
        update: 'tipster_profiles',
        updates: [{
          q: { _id: { $oid: tipsterId } },
          u: {
            $set: {
              telegram_channel_id: chatInfo.id.toString(),
              telegram_channel_name: 'username' in chatInfo ? `@${chatInfo.username}` : null,
              telegram_channel_title: 'title' in chatInfo ? chatInfo.title : null,
              telegram_connected_at: { $date: new Date().toISOString() },
              telegram_connection_type: 'manual',
              updated_at: { $date: new Date().toISOString() },
            },
          },
        }],
      });

      this.logger.log(`✅ Manually connected channel for tipster ID: ${tipsterId}`);

      return {
        success: true,
        message: 'Canal conectado exitosamente',
        channelInfo: {
          id: chatInfo.id.toString(),
          title: 'title' in chatInfo ? chatInfo.title : 'N/A',
          username: 'username' in chatInfo ? chatInfo.username : null,
        },
      };
    } catch (error) {
      this.logger.error('Error connecting channel manually:', error);
      return {
        success: false,
        message: error.message || 'Error al conectar el canal. Verifica que el ID/username sea correcto y que el bot sea administrador.',
      };
    }
  }

  /**
   * Desconectar un canal
   */
  async disconnectChannel(tipsterId: string): Promise<void> {
    await this.prisma.$runCommandRaw({
      update: 'tipster_profiles',
      updates: [{
        q: { _id: { $oid: tipsterId } },
        u: {
          $set: {
            telegram_channel_id: null,
            telegram_channel_name: null,
            telegram_channel_title: null,
            telegram_connected_at: null,
            telegram_connection_type: null,
            updated_at: { $date: new Date().toISOString() },
          },
        },
      }],
    });

    this.logger.log(`✅ Disconnected channel for tipster ID: ${tipsterId}`);
  }

  /**
   * Publicar un producto en Telegram
   */
  async publishProduct(
    channelId: string,
    product: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const message = this.formatProductMessage(product);
      
      await this.bot.telegram.sendMessage(channelId, message, {
        parse_mode: 'Markdown',
      });

      this.logger.log(`✅ Published product ${product.id} to channel ${channelId}`);

      return {
        success: true,
        message: 'Producto publicado exitosamente en Telegram',
      };
    } catch (error) {
      this.logger.error('Error publishing product:', error);
      return {
        success: false,
        message: error.message || 'Error al publicar en Telegram',
      };
    }
  }

  /**
   * Formatear mensaje del producto
   */
  private formatProductMessage(product: any): string {
    const {
      title,
      description,
      price,
      currency,
      validityDays,
      checkoutLink,
    } = product;

    return `
🎯 *Nuevo Pronóstico VIP*

📋 *Título:* ${this.escapeMarkdown(title)}
📝 *Descripción:* ${this.escapeMarkdown(description || 'Sin descripción')}
💰 *Precio:* ${price} ${currency}
📅 *Validez:* ${validityDays} días

🔗 [Suscríbete aquí](${checkoutLink})
    `.trim();
  }

  /**
   * Escapar caracteres especiales de Markdown
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  /**
   * Enviar un mensaje simple
   */
  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, text);
    } catch (error) {
      this.logger.error(`Error sending message to ${chatId}:`, error);
    }
  }

  /**
   * Verificar si un canal está conectado
   */
  async isChannelConnected(tipsterId: string): Promise<boolean> {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: tipsterId },
    });
    return !!tipster?.telegramChannelId;
  }

  /**
   * Obtener información del canal conectado
   */
  async getConnectedChannel(tipsterId: string) {
    const tipster = await this.prisma.tipsterProfile.findUnique({
      where: { id: tipsterId },
      select: {
        telegramChannelId: true,
        telegramChannelName: true,
        telegramChannelTitle: true,
        telegramConnectedAt: true,
        telegramConnectionType: true,
      },
    });

    if (!tipster?.telegramChannelId) {
      return null;
    }

    return {
      id: tipster.telegramChannelId,
      name: tipster.telegramChannelName,
      title: tipster.telegramChannelTitle,
      connectedAt: tipster.telegramConnectedAt,
      connectionType: tipster.telegramConnectionType,
    };
  }
}
