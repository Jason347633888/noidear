import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NonConformanceService } from './non-conformance.service';
import { CreateNcDto, DisposeNcDto } from './dto/create-nc.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@Controller('non-conformances')
@UseGuards(JwtAuthGuard)
export class NonConformanceController {
  constructor(private service: NonConformanceService) {}

  @Post()
  create(@Body() dto: CreateNcDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id, req.user.companyId);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.service.findAll(req.user.companyId, status);
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
