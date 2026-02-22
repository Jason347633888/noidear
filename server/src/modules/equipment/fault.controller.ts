import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FaultService } from './fault.service';
import {
  CreateFaultDto,
  AcceptFaultDto,
  CompleteFaultDto,
  QueryFaultDto,
} from './dto/fault.dto';

@Controller('equipment/faults')
export class FaultController {
  constructor(private readonly faultService: FaultService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFaultDto) {
    return this.faultService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryFaultDto) {
    return this.faultService.findAll(query);
  }

  @Get('my')
  findMyFaults(@Query('reporterId') reporterId: string, @Query() query: QueryFaultDto) {
    return this.faultService.findMyFaults(reporterId, query);
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
