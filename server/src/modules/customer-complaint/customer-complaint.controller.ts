import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CustomerComplaintService } from './customer-complaint.service';
import { CreateComplaintDto, ResolveComplaintDto } from './dto/create-complaint.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@Controller('customer-complaints')
@UseGuards(JwtAuthGuard)
export class CustomerComplaintController {
  constructor(private service: CustomerComplaintService) {}

  @Post()
  create(@Body() dto: CreateComplaintDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.companyId);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.service.findAll(req.user.companyId, status);
  }

  @Post(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveComplaintDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.resolve(id, dto.resolution, req.user.companyId);
  }
}
