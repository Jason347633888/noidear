import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CustomerComplaintService } from './customer-complaint.service';
import { CreateComplaintDto, ResolveComplaintDto } from './dto/create-complaint.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('quality_compliance')
@Controller('customer-complaints')
@UseGuards(JwtAuthGuard)
export class CustomerComplaintController {
  constructor(private service: CustomerComplaintService) {}

  @Post()
  create(@Body() dto: CreateComplaintDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.companyId);
  }

  @Get()
  findAll(@Ownership() ownership: OwnershipContext, @Request() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.service.findAll(req.user.companyId, ownership, status);
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
