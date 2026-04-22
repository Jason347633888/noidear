import { Controller, Get, Post, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ShiftInstanceService } from './shift-instance.service';
import { CreateShiftInstanceDto, CloseShiftInstanceDto } from './dto/create-shift-instance.dto';

@Controller('shift-instances')
export class ShiftInstanceController {
  constructor(private readonly svc: ShiftInstanceService) {}

  @Post()
  create(@Body() dto: CreateShiftInstanceDto, @Req() req: any) {
    return this.svc.create(dto, req.user?.id ?? 'system');
  }

  @Get()
  findAll(@Query('date') date?: string) {
    return this.svc.findAll(date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseShiftInstanceDto, @Req() req: any) {
    return this.svc.close(id, dto, req.user?.id ?? 'system');
  }
}
