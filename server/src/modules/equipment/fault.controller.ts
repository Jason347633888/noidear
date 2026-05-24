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
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FaultService } from './fault.service';
import {
  CreateFaultDto,
  AcceptFaultDto,
  CompleteFaultDto,
  QueryFaultDto,
} from './dto/fault.dto';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import type { OwnershipContext } from '../module-access/ownership-context';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@UseGuards(JwtAuthGuard)
@ModuleKey('equipment_site')
@Controller('equipment/faults')
export class FaultController {
  constructor(private readonly faultService: FaultService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFaultDto, @Request() req: AuthenticatedRequest) {
    return this.faultService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query() query: QueryFaultDto, @Ownership() ownership: OwnershipContext) {
    return this.faultService.findAll(query, ownership);
  }

  @Get('my')
  findMyFaults(@Request() req: AuthenticatedRequest, @Query() query: QueryFaultDto) {
    return this.faultService.findMyFaults(req.user.id, query);
  }

  @Get('stats')
  getStats() {
    return this.faultService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faultService.findOne(id);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @Body() dto: AcceptFaultDto) {
    return this.faultService.accept(id, dto);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteFaultDto) {
    return this.faultService.complete(id, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.faultService.cancel(id);
  }
}
