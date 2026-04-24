import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeviationService, DeviationReportQueryDto } from './deviation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from '../export/export.service';
import { ExportDeviationReportsDto } from '../export/dto';

@ApiTags('偏差报告')
@Controller('deviation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeviationAliasController {
  constructor(
    private readonly deviationService: DeviationService,
    private readonly exportService: ExportService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取偏差报告列表' })
  async findAll(@Query() query: DeviationReportQueryDto) {
    return this.deviationService.findDeviationReports(query);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '审批偏差报告' })
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
  @ApiOperation({ summary: '导出偏差报告' })
  async export(@Query() dto: ExportDeviationReportsDto, @Res() res: Response, @Request() req: any) {
    try {
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
