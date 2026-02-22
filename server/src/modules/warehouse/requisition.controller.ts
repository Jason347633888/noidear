import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { RequisitionService } from './requisition.service';

@Controller('requisitions')
export class RequisitionController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: any) {
    return this.requisitionService.create(createDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.requisitionService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requisitionService.findOne(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Request() req: any) {
    return this.requisitionService.approve(id, req.user?.id || 'system');
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Request() req: any) {
    return this.requisitionService.complete(id, req.user?.id || 'system');
  }
}
