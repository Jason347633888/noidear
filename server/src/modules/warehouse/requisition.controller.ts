import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequisitionService } from './requisition.service';

@UseGuards(JwtAuthGuard)
@Controller('warehouse/requisitions')
export class RequisitionController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: any, @Request() req: any) {
    return this.requisitionService.create({ ...createDto, applicantId: req.user.id });
  }

  @Get()
  findAll(@Query() query: any) {
    return this.requisitionService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requisitionService.findOne(id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submit(@Param('id') id: string) {
    return this.requisitionService.submit(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @Body() body: { action?: 'approved' | 'rejected' }, @Request() req: any) {
    return this.requisitionService.approve(id, req.user.id, body.action ?? 'approved');
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@Param('id') id: string, @Request() req: any) {
    return this.requisitionService.complete(id, req.user.id);
  }
}
