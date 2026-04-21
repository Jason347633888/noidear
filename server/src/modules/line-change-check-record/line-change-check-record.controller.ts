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

@Controller('line-change-check-records')
@UseGuards(JwtAuthGuard)
export class LineChangeCheckRecordController {
  constructor(private service: LineChangeCheckRecordService) {}

  @Get()
  findAll() {
    return this.service.findAll();
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
