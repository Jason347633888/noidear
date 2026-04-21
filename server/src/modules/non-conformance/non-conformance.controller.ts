import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NonConformanceService } from './non-conformance.service';
import { CreateNcDto, DisposeNcDto } from './dto/create-nc.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('non-conformances')
@UseGuards(JwtAuthGuard)
export class NonConformanceController {
  constructor(private service: NonConformanceService) {}

  @Post()
  create(@Body() dto: CreateNcDto, @Request() req: { user: { id: string } }) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Patch(':id/dispose')
  dispose(
    @Param('id') id: string,
    @Body() dto: DisposeNcDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.dispose(id, dto, req.user.id);
  }
}
