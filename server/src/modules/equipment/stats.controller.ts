import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard)
@ModuleKey('equipment_site')
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
