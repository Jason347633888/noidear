import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { FragileItemInspectionService } from './fragile-item-inspection.service';
import { CreateFragileItemInspectionDto } from './dto/create-fragile-item-inspection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import type { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('equipment_site')
@Controller('fragile-item-inspections')
@UseGuards(JwtAuthGuard)
export class FragileItemInspectionController {
  constructor(private service: FragileItemInspectionService) {}

  @Post()
  create(@Body() dto: CreateFragileItemInspectionDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.companyId);
  }

  @Get()
  findAll(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Ownership() ownership?: OwnershipContext,
  ) {
    return this.service.findAll(startDate, endDate, ownership);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
