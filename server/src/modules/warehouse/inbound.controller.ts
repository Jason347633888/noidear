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
import { InboundService } from './inbound.service';
import { CreateInboundDto, QueryInboundDto } from './dto/inbound.dto';

@Controller('warehouse/inbound')
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInboundDto: CreateInboundDto, @Request() req: any) {
    const userId = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    return this.inboundService.create(createInboundDto, userId);
  }

  @Get()
  findAll(@Query() query: QueryInboundDto) {
    return this.inboundService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inboundService.findOne(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Request() req: any) {
    const approverId = req.user?.id || 'system';
    return this.inboundService.approve(id, approverId);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Request() req: any) {
    const operatorId = req.user?.id || 'system';
    return this.inboundService.complete(id, operatorId);
  }
}
