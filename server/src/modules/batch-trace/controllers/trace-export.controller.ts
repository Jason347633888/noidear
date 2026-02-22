import { Controller, Get, Param, Res, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { TraceExportService } from '../services/trace-export.service';

@ApiTags('批次追溯')
@Controller('api/v1/trace')
export class TraceExportController {
  constructor(private readonly traceExportService: TraceExportService) {}

  @Get(':batchId/export-pdf')
  @ApiOperation({ summary: '导出逆向追溯 PDF 报告（成品→原料）' })
  @ApiResponse({ status: 200, description: 'PDF 文件下载成功' })
  @ApiResponse({ status: 404, description: '批次不存在' })
  async exportPDF(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename, contentType } = await this.traceExportService.exportPDF(batchId);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Get(':batchId/forward/pdf')
  @ApiOperation({ summary: '导出正向追溯 PDF 报告（原料→成品）' })
  @ApiResponse({ status: 200, description: 'PDF 文件下载成功' })
  @ApiResponse({ status: 404, description: '批次不存在' })
  async exportForwardPDF(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename, contentType } = await this.traceExportService.exportForwardPDF(batchId);

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
