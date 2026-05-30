import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { ProductRecallService } from './product-recall.service';
import { CreateProductRecallDto, CreateProductRecallNotificationDto } from './dto/create-product-recall.dto';
import { CreateRecallFromSnapshotDto } from './dto/create-recall-from-snapshot.dto';
import { QueryProductRecallDto } from './dto/query-product-recall.dto';
import { MarkNotificationSentDto, RecallCancelDto, RecallCompleteDto } from './dto/transition-product-recall.dto';

@ModuleKey('quality_compliance')
@Controller('product-recalls')
@UseGuards(JwtAuthGuard)
export class ProductRecallController {
  constructor(private readonly service: ProductRecallService) {}

  @Post()
  create(@Body() dto: CreateProductRecallDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post('from-snapshot')
  createFromSnapshot(@Body() dto: CreateRecallFromSnapshotDto, @Request() req: AuthenticatedRequest) {
    return this.service.createRecallFromSnapshot(dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Get()
  findAll(@Query() query: QueryProductRecallDto, @Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.companyId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Get(':id/snapshot-preview')
  refreshSnapshotPreview(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.refreshRecallPreview(id, req.user.companyId);
  }

  @Post(':id/lock-scope')
  lockScope(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.lockRecallScope(id, req.user.companyId);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.submit(id, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: RecallCompleteDto, @Request() req: AuthenticatedRequest) {
    return this.service.complete(id, dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: RecallCancelDto, @Request() req: AuthenticatedRequest) {
    return this.service.cancel(id, dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/notifications')
  createNotification(@Param('id') id: string, @Body() dto: CreateProductRecallNotificationDto, @Request() req: AuthenticatedRequest) {
    return this.service.createNotification(id, dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/notifications/:notificationId/mark-sent')
  markNotificationSent(
    @Param('id') id: string,
    @Param('notificationId') notificationId: string,
    @Body() dto: MarkNotificationSentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.markNotificationSent(id, notificationId, dto, { id: req.user.id, companyId: req.user.companyId });
  }
}
