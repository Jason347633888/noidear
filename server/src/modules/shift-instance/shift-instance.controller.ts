import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ShiftInstanceService } from './shift-instance.service';
import { ShiftCompletionService } from './shift-completion.service';
import { CreateShiftInstanceDto, CloseShiftInstanceDto } from './dto/create-shift-instance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import type { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('production_execution')
@Controller('shift-instances')
@UseGuards(JwtAuthGuard)
export class ShiftInstanceController {
  constructor(
    private readonly svc: ShiftInstanceService,
    private readonly completionService: ShiftCompletionService,
  ) {}

  @Post()
  create(@Body() dto: CreateShiftInstanceDto, @Req() req: any) {
    return this.svc.create(dto, req.user?.id ?? 'system');
  }

  @Get()
  findAll(@Query('date') date?: string, @Ownership() ownership?: OwnershipContext) {
    return this.svc.findAll(date, ownership);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseShiftInstanceDto, @Req() req: any) {
    return this.svc.close(id, dto, req.user?.id ?? 'system');
  }

  @Get(':id/completion')
  getCompletion(@Param('id') id: string) {
    return this.completionService.getCompletionStatus(id);
  }
}
