import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.order.create({ data });
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        product: true,
        client: true,
        receipts: true,
        accessGrants: true,
      },
    });
  }

  async findByClient(clientUserId: string) {
    return this.prisma.order.findMany({
      where: { clientUserId },
      include: {
        product: true,
        receipts: true,
        accessGrants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async grantAccess(orderId: string, clientUserId: string, channelId: string) {
    // Update order status
    await this.updateStatus(orderId, OrderStatus.ACCESS_GRANTED);

    // Create access grant
    return this.prisma.channelAccessGrant.create({
      data: {
        orderId,
        clientUserId,
        channelId,
        status: 'GRANTED',
        joinedAt: new Date(),
      },
    });
  }
}
