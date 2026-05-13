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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { InboundService } from './inbound.service';
import { CreateInboundDto, QueryInboundDto } from './dto/inbound.dto';

@Controller('warehouse/inbound')
@UseGuards(JwtAuthGuard)
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInboundDto: CreateInboundDto, @Request() req: AuthenticatedRequest) {
    return this.inboundService.create(createInboundDto, req.user.id);
  }

  @Get()
  findAll(@Query() query: QueryInboundDto) {
    return this.inboundService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inboundService.findOne(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.inboundService.complete(id, req.user.id);
  }
}
