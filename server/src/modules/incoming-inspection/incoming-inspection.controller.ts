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

@Controller('incoming-inspections')
@UseGuards(JwtAuthGuard)
export class IncomingInspectionController {
  constructor(private readonly incomingInspectionService: IncomingInspectionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateInspectionDto, @Request() req: any) {
    const inspectorId: string = req.user?.id || 'system';
    const companyId = 1; // company_id is Int; single-tenant default
    return this.incomingInspectionService.create(dto, companyId, inspectorId);
  }

  @Get()
  findAll(@Request() req: any) {
    const companyId = 1;
    return this.incomingInspectionService.findAll(companyId);
  }

  @Get('batch/:batchId')
  findByBatch(@Param('batchId') batchId: string, @Request() req: any) {
    const companyId = 1;
    return this.incomingInspectionService.findByBatch(batchId, companyId);
  }

  @Post(':id/reports')
  @UseInterceptors(FileInterceptor('file'))
  uploadReport(
    @Param('id') id: string,
    @Body() dto: InspectionReportDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    const companyId = 1;
    return this.incomingInspectionService.uploadReport(id, dto, file, req.user?.id ?? 'system', companyId);
  }

  @Get(':id/reports')
  getReports(@Param('id') id: string) {
    const companyId = 1;
    return this.incomingInspectionService.getReports(id, companyId);
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
    const companyId = 1;
    return this.incomingInspectionService.replaceReport(id, linkId, dto, file, req.user?.id ?? 'system', companyId);
  }
}
