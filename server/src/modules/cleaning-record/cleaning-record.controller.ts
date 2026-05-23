import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { CleaningRecordService } from './cleaning-record.service';
import { CreateCleaningRecordDto } from './dto/create-cleaning-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ModuleKey('quality_compliance')
@Controller('cleaning-records')
@UseGuards(JwtAuthGuard)
export class CleaningRecordController {
  constructor(private service: CleaningRecordService) {}

  @Post()
  create(@Body() dto: CreateCleaningRecordDto, @Request() req: { user: { id: string } }) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query('target_type') targetType?: string) {
    return this.service.findAll(targetType);
  }
}
