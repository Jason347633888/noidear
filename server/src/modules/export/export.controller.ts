import { Controller, Post, Body, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ExportDocumentsDto,
  ExportTasksDto,
  ExportDeviationReportsDto,
  ExportApprovalsDto,
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

  private sendExcelFile(res: Response, buffer: Buffer, prefix: string) {
    const filename = `${prefix}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }

  private handleError(res: Response, error: any) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '导出失败',
      error: error.message,
    });
  }
}
