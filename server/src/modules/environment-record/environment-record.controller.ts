import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EnvironmentRecordService } from './environment-record.service';
import { CreateEnvironmentRecordDto } from './dto/create-environment-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('equipment_site')
@Controller('environment-records')
@UseGuards(JwtAuthGuard)
export class EnvironmentRecordController {
  constructor(private service: EnvironmentRecordService) {}

  @Post()
  create(
    @Body() dto: CreateEnvironmentRecordDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(
    @Ownership() ownership: OwnershipContext,
    @Query('start_date') _startDate?: string,
    @Query('end_date') _endDate?: string,
  ) {
    return this.service.listForOwnership(ownership);
  }
}
