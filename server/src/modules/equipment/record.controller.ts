import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RecordService } from './record.service';
import {
  CreateRecordDto,
  UpdateRecordDto,
  ApproveRecordDto,
  RejectRecordDto,
  QueryRecordDto,
} from './dto/record.dto';

@Controller('api/v1/maintenance-records')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRecordDto) {
    return this.recordService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryRecordDto) {
    return this.recordService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recordService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecordDto) {
    return this.recordService.update(id, dto);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string) {
    return this.recordService.submit(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveRecordDto) {
    return this.recordService.approve(id, dto);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectRecordDto) {
    return this.recordService.reject(id, dto);
  }
}
