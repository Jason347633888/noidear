import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { DeviationService, DeviationReportQueryDto } from './deviation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeviationExportService } from './deviation-export.service';
import { ExportDeviationReportsDto } from './dto/export-deviation-reports.dto';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('quality_compliance')
@Controller('deviation-reports')
@UseGuards(JwtAuthGuard)
export class DeviationController {
  constructor(
    private readonly deviationService: DeviationService,
    private readonly deviationExportService: DeviationExportService,
  ) {}

  @Get()
  async findAll(@Ownership() ownership: OwnershipContext, @Query() _query: DeviationReportQueryDto) {
    return this.deviationService.listForOwnership(ownership);
  }

  @Get('export')
  async export(@Query() dto: ExportDeviationReportsDto, @Res() res: Response, @Request() req: any) {
    try {
      const buffer = await this.deviationExportService.exportDeviationReports(dto, req.user);
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
