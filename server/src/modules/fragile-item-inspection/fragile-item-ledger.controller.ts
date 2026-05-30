import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { FragileItemLedgerService } from './fragile-item-ledger.service';
import {
  CreateFragileItemLedgerDto,
  CreateFragileItemUsageReturnDto,
} from './dto/create-fragile-item-ledger.dto';

@Controller('fragile-item-ledgers')
@UseGuards(JwtAuthGuard)
export class FragileItemLedgerController {
  constructor(private readonly service: FragileItemLedgerService) {}

  @Post()
  createLedger(@Body() dto: CreateFragileItemLedgerDto, @Request() req: AuthenticatedRequest) {
    return this.service.createLedger(dto, req.user.companyId);
  }

  @Get()
  findAllLedgers(
    @Request() req: AuthenticatedRequest,
    @Query('area_point_id') areaPointId?: string,
  ) {
    return this.service.findAllLedgers(req.user.companyId, areaPointId);
  }

  @Post('usage-returns')
  createUsageReturn(
    @Body() dto: CreateFragileItemUsageReturnDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createUsageReturn(dto, req.user.companyId, req.user.id);
  }

  @Get('usage-returns')
  findAllUsageReturns(
    @Request() req: AuthenticatedRequest,
    @Query('fragile_item_id') fragileItemId?: string,
  ) {
    return this.service.findAllUsageReturns(req.user.companyId, fragileItemId);
  }
}
