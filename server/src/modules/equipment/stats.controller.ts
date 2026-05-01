import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('equipment/stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  getOverview() {
    return this.statsService.getOverview();
  }

  @Get('maintenance')
  getMaintenanceStats() {
    return this.statsService.getMaintenanceStats();
  }

  @Get('fault-rate')
  getFaultRateStats() {
    return this.statsService.getFaultRateStats();
  }

  @Get('cost')
  getCostStats(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.statsService.getCostStats(yearNum);
  }

  @Get('repair')
  getRepairStats(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.statsService.getRepairStats(yearNum);
  }
}
