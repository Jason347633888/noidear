import { Controller, Post, Body, Res, UseGuards, HttpStatus, HttpException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessException, getHttpStatus } from '../../common/exceptions/business.exception';
import {
  ExportDocumentsDto,
  ExportTasksDto,
  ExportTaskRecordsDto,
  ExportDeviationReportsDto,
  ExportApprovalsDto,
  ExportUsersDto,
} from './dto';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('documents')
  async exportDocuments(@Body() dto: ExportDocumentsDto, @Res() res: Response) {
    try {
      const buffer = await this.exportService.exportDocuments(dto);
      this.sendExcelFile(res, buffer, 'documents');
    } catch (error) {
      this.handleError(res, error);
    }
  }

  @Post('tasks')
  async exportTasks(@Body() dto: ExportTasksDto, @Res() res: Response) {
    try {
      const buffer = await this.exportService.exportTasks(dto);
      this.sendExcelFile(res, buffer, 'tasks');
    } catch (error) {
      this.handleError(res, error);
    }
  }

  @Post('task-records')
  async exportTaskRecords(@Body() dto: ExportTaskRecordsDto, @Res() res: Response) {
    try {
      const buffer = await this.exportService.exportTaskRecords(dto);
      this.sendExcelFile(res, buffer, 'task_records');
    } catch (error) {
      this.handleError(res, error);
    }
  }

  @Post('deviation-reports')
  async exportDeviationReports(@Body() dto: ExportDeviationReportsDto, @Res() res: Response) {
    try {
      const buffer = await this.exportService.exportDeviationReports(dto);
      this.sendExcelFile(res, buffer, 'deviation_reports');
    } catch (error) {
      this.handleError(res, error);
    }
  }

  @Post('approvals')
  async exportApprovals(@Body() dto: ExportApprovalsDto, @Res() res: Response) {
    try {
      const buffer = await this.exportService.exportApprovals(dto);
      this.sendExcelFile(res, buffer, 'approvals');
    } catch (error) {
      this.handleError(res, error);
    }
  }

  @Post('users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async exportUsers(@Body() dto: ExportUsersDto, @Res() res: Response) {
    try {
      const buffer = await this.exportService.exportUsers(dto);
      this.sendExcelFile(res, buffer, 'users');
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private sendExcelFile(res: Response, buffer: Buffer, prefix: string) {
    const filename = `${prefix}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }

  private handleError(res: Response, error: any) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '导出失败';

    if (error instanceof BusinessException) {
      status = getHttpStatus(error.code);
      message = error.message;
    } else if (error instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      message = error.message || '请求参数无效';
    } else if (error instanceof NotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = error.message || '资源不存在';
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      message = error.message;
    }

    res.status(status).json({
      success: false,
      message,
      error: error.message,
    });
  }
}
