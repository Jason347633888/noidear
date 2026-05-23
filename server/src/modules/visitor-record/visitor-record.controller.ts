import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { VisitorRecordService } from './visitor-record.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ModuleKey('equipment_site')
@Controller('visitor-records')
@UseGuards(JwtAuthGuard)
export class VisitorRecordController {
  constructor(private service: VisitorRecordService) {}

  @Post()
  create(
    @Body() dto: CreateVisitorDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query('date') date?: string) {
    return this.service.findAll(date);
  }
}
