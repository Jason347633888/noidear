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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IncomingInspectionService } from './incoming-inspection.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';

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
}
