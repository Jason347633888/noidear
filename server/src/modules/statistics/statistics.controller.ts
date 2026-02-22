import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Res,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatisticsService } from './statistics.service';
import { DocumentStatsQueryDto } from './dto/document-stats-query.dto';
import { TaskStatsQueryDto } from './dto/task-stats-query.dto';
import { ApprovalStatsQueryDto } from './dto/approval-stats-query.dto';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { ExportService } from '../export/export.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  private readonly logger = new Logger(StatisticsController.name);

  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly exportService: ExportService,
  ) {}

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

  @Get('export')
  async export(
    @Query('type') type: 'documents' | 'tasks' | 'approvals',
    @Res() res: Response,
    @Request() req: any,
  ) {
    try {
      let buffer: Buffer;

      // CRITICAL-1 修复: 导出统计数据而非原始列表
      // 注意：统计服务本身已包含权限过滤，所以这里不需要额外传递user参数
      if (type === 'documents') {
        const stats = await this.statisticsService.getDocumentStatistics({});
        buffer = await this.exportService.exportDocumentStatistics(stats);
      } else if (type === 'tasks') {
        const stats = await this.statisticsService.getTaskStatistics({});
        buffer = await this.exportService.exportTaskStatistics(stats);
      } else if (type === 'approvals') {
        const stats = await this.statisticsService.getApprovalStatistics({});
        buffer = await this.exportService.exportApprovalStatistics(stats);
      } else {
        throw new Error('Invalid export type. Must be: documents, tasks, or approvals');
      }

      const filename = `statistics_${type}_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      this.logger.error('Failed to export statistics', error.stack);
      res.status(500).json({
        success: false,
        message: '导出失败',
        error: error.message,
      });
    }
  }
}
