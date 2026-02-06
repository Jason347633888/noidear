import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeviationAnalyticsService } from './deviation-analytics.service';
import { TrendQueryDto, DateRangeDto } from './dto/deviation-analytics.dto';

@Controller('deviation-analytics')
@UseGuards(JwtAuthGuard)
export class DeviationAnalyticsController {
  constructor(
    private readonly deviationAnalyticsService: DeviationAnalyticsService,
  ) {}

  @Get('trend')
  async getTrend(@Query() query: TrendQueryDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const data = await this.deviationAnalyticsService.getDeviationTrend(
      startDate,
      endDate,
      query.granularity,
    );

    return {
      success: true,
      data,
    };
  }

  @Get('field-distribution')
  async getFieldDistribution(@Query() query: DateRangeDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const data =
      await this.deviationAnalyticsService.getFieldDistribution(
        startDate,
        endDate,
      );

    return {
      success: true,
      data,
    };
  }

  @Get('rate-by-department')
  async getRateByDepartment(@Query() query: DateRangeDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const data =
      await this.deviationAnalyticsService.getDeviationRateByDepartment(
        startDate,
        endDate,
      );

    return {
      success: true,
      data,
    };
  }

  @Get('rate-by-template')
  async getRateByTemplate(@Query() query: DateRangeDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const data =
      await this.deviationAnalyticsService.getDeviationRateByTemplate(
        startDate,
        endDate,
      );

    return {
      success: true,
      data,
    };
  }

  @Get('reason-wordcloud')
  async getReasonWordCloud() {
    const data =
      await this.deviationAnalyticsService.getDeviationReasonWordCloud();

    return {
      success: true,
      data,
    };
  }
}
