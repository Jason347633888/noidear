import { ModuleKey } from '../../shared/decorators/module-key.decorator';
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
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('warehouse')
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
  findAll(@Ownership() ownership: OwnershipContext, @Query() _query: QueryInboundDto) {
    return this.inboundService.listForOwnership(ownership);
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
