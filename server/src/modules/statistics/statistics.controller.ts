import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatisticsService } from './statistics.service';
import { DocumentStatsQueryDto } from './dto/document-stats-query.dto';
import { TaskStatsQueryDto } from './dto/task-stats-query.dto';
import { ApprovalStatsQueryDto } from './dto/approval-stats-query.dto';
import { OverviewQueryDto } from './dto/overview-query.dto';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  private readonly logger = new Logger(StatisticsController.name);

  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('documents')
  async getDocumentStatistics(@Query() query: DocumentStatsQueryDto) {
    try {
      return await this.statisticsService.getDocumentStatistics(query);
    } catch (error) {
      this.logger.error(
        'Failed to get document statistics',
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve document statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('tasks')
  async getTaskStatistics(@Query() query: TaskStatsQueryDto) {
    try {
      return await this.statisticsService.getTaskStatistics(query);
    } catch (error) {
      this.logger.error('Failed to get task statistics', error.stack);
      throw new HttpException(
        'Failed to retrieve task statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('approvals')
  async getApprovalStatistics(@Query() query: ApprovalStatsQueryDto) {
    try {
      return await this.statisticsService.getApprovalStatistics(query);
    } catch (error) {
      this.logger.error(
        'Failed to get approval statistics',
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve approval statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('overview')
  async getOverviewStatistics(@Query() query: OverviewQueryDto) {
    try {
      return await this.statisticsService.getOverviewStatistics(query);
    } catch (error) {
      this.logger.error(
        'Failed to get overview statistics',
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve overview statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
