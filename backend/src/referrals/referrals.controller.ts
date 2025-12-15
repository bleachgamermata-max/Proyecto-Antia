import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReferralsService } from './referrals.service';
import { UserRole } from '@prisma/client';

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('links')
  @Roles(UserRole.TIPSTER)
  @ApiOperation({ summary: 'Get referral links (Tipster only)' })
  async getLinks(@CurrentUser() user: any) {
    return this.referralsService.getLinks(user.tipsterProfile.id);
  }

  @Get('metrics')
  @Roles(UserRole.TIPSTER)
  @ApiOperation({ summary: 'Get referral metrics (Tipster only)' })
  async getMetrics(@CurrentUser() user: any, @Query('range') range?: string) {
    // TODO: Parse range parameter
    return this.referralsService.getMetrics(user.tipsterProfile.id);
  }

  @Get('commissions')
  @Roles(UserRole.TIPSTER)
  @ApiOperation({ summary: 'Get commissions (Tipster only)' })
  async getCommissions(@CurrentUser() user: any) {
    return this.referralsService.getCommissions(user.tipsterProfile.id);
  }
}
