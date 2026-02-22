import { Controller, Get, Query } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('equipment/stats')
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
