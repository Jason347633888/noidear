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
import { StagingAreaService } from './staging-area.service';

@Controller('staging-area')
export class StagingAreaController {
  constructor(private readonly stagingAreaService: StagingAreaService) {}

  @Get('stock')
  getCurrentStock(@Query() query: any) {
    return this.stagingAreaService.getCurrentStock(query);
  }

  @Post('inventory')
  @HttpCode(HttpStatus.CREATED)
  recordInventory(@Body() recordDto: any) {
    return this.stagingAreaService.recordInventory(recordDto);
  }

  @Get('inventory/:batchId')
  getInventoryHistory(@Param('batchId') batchId: string) {
    return this.stagingAreaService.getInventoryHistory(batchId);
  }
}
