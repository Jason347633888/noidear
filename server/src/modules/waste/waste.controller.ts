import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { WasteService } from './waste.service';
import { CreateDisposalDto } from './dto/create-disposal.dto';
import { CreateWasteRecordDto } from './dto/create-waste-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('waste')
@UseGuards(JwtAuthGuard)
export class WasteController {
  constructor(private readonly wasteService: WasteService) {}

  @Post('disposals')
  createDisposal(
    @Body() dto: CreateDisposalDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.wasteService.createDisposal(dto, req.user.id);
  }

  @Get('disposals')
  findAllDisposals() {
    return this.wasteService.findAllDisposals();
  }

  @Post('records')
  createWasteRecord(
    @Body() dto: CreateWasteRecordDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.wasteService.createWasteRecord(dto, req.user.id);
  }

  @Get('records')
  findAllWasteRecords(@Query('waste_type') wasteType?: string) {
    return this.wasteService.findAllWasteRecords(wasteType);
  }
}
