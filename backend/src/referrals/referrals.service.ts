import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async getLinks(tipsterId: string) {
    return this.prisma.referralLink.findMany({
      where: { tipsterId },
      include: { house: true },
    });
  }

  async getMetrics(tipsterId: string, dateRange?: { start: Date; end: Date }) {
    const where: any = { tipsterId };
    
    if (dateRange) {
      where.eventAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const events = await this.prisma.referralEvent.findMany({
      where,
    });

    const clicks = events.filter(e => e.type === 'CLICK').length;
    const registers = events.filter(e => e.type === 'REGISTER').length;
    const ftds = events.filter(e => e.type === 'FTD').length;
    const deposits = events.filter(e => e.type === 'DEPOSIT').length;

    const totalDeposits = events
      .filter(e => e.type === 'DEPOSIT' && e.amountCents)
      .reduce((sum, e) => sum + (e.amountCents || 0), 0);

    return {
      clicks,
      registers,
      ftds,
      deposits,
      totalDeposits,
      conversionRate: clicks > 0 ? (registers / clicks * 100).toFixed(2) : 0,
    };
  }

  async getCommissions(tipsterId: string) {
    return this.prisma.commission.findMany({
      where: { tipsterId },
      include: { house: true },
      orderBy: { periodMonth: 'desc' },
    });
  }
}
