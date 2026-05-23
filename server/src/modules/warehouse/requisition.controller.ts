import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequisitionService } from './requisition.service';
import { CreateRequisitionDto, QueryRequisitionDto } from './dto/requisition.dto';

@UseGuards(JwtAuthGuard)
@ModuleKey('warehouse')
@Controller('warehouse/requisitions')
export class RequisitionController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateRequisitionDto, @Request() req: any) {
    return this.requisitionService.create({ ...createDto, applicantId: req.user.id });
  }

  @Get()
  findAll(@Query() query: QueryRequisitionDto) {
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

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@Param('id') id: string, @Request() req: any) {
    return this.requisitionService.complete(id, req.user.id);
  }
}
