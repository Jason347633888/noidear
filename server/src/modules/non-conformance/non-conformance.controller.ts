import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NonConformanceService } from './non-conformance.service';
import { CreateNcDto, DisposeNcDto } from './dto/create-nc.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('quality_compliance')
@Controller('non-conformances')
@UseGuards(JwtAuthGuard)
export class NonConformanceController {
  constructor(private service: NonConformanceService) {}

  @Post()
  create(@Body() dto: CreateNcDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id, req.user.companyId);
  }

  @Get()
  findAll(@Ownership() ownership: OwnershipContext, @Query('status') status?: string) {
    return this.service.listForOwnership(ownership);
  }

  @Patch(':id/dispose')
  dispose(
    @Param('id') id: string,
    @Body() dto: DisposeNcDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.dispose(id, dto, req.user.id, req.user.companyId);
  }
}
