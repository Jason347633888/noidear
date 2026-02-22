import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { DeviationService, DeviationReportQueryDto } from './deviation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from '../export/export.service';
import { ExportDeviationReportsDto } from '../export/dto';

@Controller('deviation-reports')
@UseGuards(JwtAuthGuard)
export class DeviationController {
  constructor(
    private readonly deviationService: DeviationService,
    private readonly exportService: ExportService,
  ) {}

  @Get()
  async findAll(@Query() query: DeviationReportQueryDto) {
    return this.deviationService.findDeviationReports(query);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; comment?: string },
    @Request() req: any,
  ) {
    return this.deviationService.approveDeviationReport(
      id,
      req.user.id,
      body.status,
      body.comment,
    );
  }

  @Get('export')
  async export(@Query() dto: ExportDeviationReportsDto, @Res() res: Response, @Request() req: any) {
    try {
      // HIGH-1: 传递用户信息进行权限过滤
      const buffer = await this.exportService.exportDeviationReports(dto, req.user);
      const filename = `deviation_reports_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '导出失败',
        error: error.message,
      });
    }
  }
}
