import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BatchService } from './batch.service';
import { CreateBatchDto, UpdateBatchDto, QueryBatchDto } from './dto/batch.dto';

@Controller('api/v1/batches')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createBatchDto: CreateBatchDto) {
    return this.batchService.create(createBatchDto);
  }

  @Get()
  findAll(@Query() query: QueryBatchDto) {
    return this.batchService.findAll(query);
  }

  @Get('fifo')
  getFIFO(@Query('materialId') materialId: string) {
    return this.batchService.getFIFO(materialId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.batchService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateBatchDto: UpdateBatchDto) {
    return this.batchService.update(id, updateBatchDto);
  }

  @Put(':id/lock')
  lock(@Param('id') id: string) {
    return this.batchService.lock(id);
  }
}
