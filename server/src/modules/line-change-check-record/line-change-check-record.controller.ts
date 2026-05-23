import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LineChangeCheckRecordService } from './line-change-check-record.service';
import { CreateLineChangeCheckRecordDto } from './dto/create-line-change-check-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import type { OwnershipContext } from '../module-access/ownership-context';

@ModuleKey('production_execution')
@Controller('line-change-check-records')
@UseGuards(JwtAuthGuard)
export class LineChangeCheckRecordController {
  constructor(private service: LineChangeCheckRecordService) {}

  @Get()
  findAll(@Ownership() ownership: OwnershipContext) {
    return this.service.findAll(ownership);
  }

  @Post()
  create(@Body() dto: CreateLineChangeCheckRecordDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
