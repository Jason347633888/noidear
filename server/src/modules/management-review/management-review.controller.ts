import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { ManagementReviewService } from './management-review.service';
import { CreateManagementReviewDto } from './dto/create-management-review.dto';
import { QueryManagementReviewDto } from './dto/query-management-review.dto';
import { CreateManagementReviewActionDto } from './dto/create-management-review-action.dto';
import { UpdateManagementReviewActionDto } from './dto/update-management-review-action.dto';

@Controller('management-reviews')
@UseGuards(JwtAuthGuard)
export class ManagementReviewController {
  constructor(private readonly service: ManagementReviewService) {}

  @Post()
  create(@Body() dto: CreateManagementReviewDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Get()
  findAll(@Query() query: QueryManagementReviewDto, @Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.companyId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post(':id/collect-sources')
  collectSources(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.collectSources(id, req.user.companyId);
  }

  @Post(':id/actions')
  createAction(
    @Param('id') id: string,
    @Body() dto: CreateManagementReviewActionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createAction(id, req.user.companyId, dto);
  }

  @Patch(':id/actions/:actionId')
  updateAction(
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() dto: UpdateManagementReviewActionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateAction(id, actionId, req.user.companyId, dto);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() body: { reportDocumentId?: string; reportRecordId?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.complete(id, req.user.companyId, body);
  }
}
