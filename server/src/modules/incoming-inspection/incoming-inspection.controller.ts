import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IncomingInspectionService } from './incoming-inspection.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { InspectionReportDocumentDto } from './dto/inspection-report-document.dto';

// Single-tenant today: company_id is a string default until multi-tenancy lands.
const DEFAULT_COMPANY_ID = '1';

@ModuleKey('traceability_batch')
@Controller('incoming-inspections')
@UseGuards(JwtAuthGuard)
export class IncomingInspectionController {
  constructor(private readonly incomingInspectionService: IncomingInspectionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateInspectionDto, @Request() req: any) {
    const inspectorId: string = req.user?.id || 'system';
    return this.incomingInspectionService.create(dto, DEFAULT_COMPANY_ID, inspectorId);
  }

  @Post('release/:materialInboundItemId')
  @HttpCode(HttpStatus.CREATED)
  releaseFinalInspection(@Param('materialInboundItemId') materialInboundItemId: string, @Request() req: any) {
    const userId: string = req.user?.id ?? 'system';
    return this.incomingInspectionService.releaseFinalInspection(materialInboundItemId, DEFAULT_COMPANY_ID, userId);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.incomingInspectionService.findAll(DEFAULT_COMPANY_ID);
  }

  @Get('batch/:batchId')
  findByBatch(@Param('batchId') batchId: string, @Request() req: any) {
    return this.incomingInspectionService.findByBatch(batchId, DEFAULT_COMPANY_ID);
  }

  @Post(':id/reports')
  @UseInterceptors(FileInterceptor('file'))
  uploadReport(
    @Param('id') id: string,
    @Body() dto: InspectionReportDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.incomingInspectionService.uploadReport(id, dto, file, req.user?.id ?? 'system', DEFAULT_COMPANY_ID);
  }

  @Get(':id/reports')
  getReports(@Param('id') id: string) {
    return this.incomingInspectionService.getReports(id, DEFAULT_COMPANY_ID);
  }

  @Post(':id/reports/:linkId/replace')
  @UseInterceptors(FileInterceptor('file'))
  replaceReport(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Body() dto: InspectionReportDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.incomingInspectionService.replaceReport(id, linkId, dto, file, req.user?.id ?? 'system', DEFAULT_COMPANY_ID);
  }
}
