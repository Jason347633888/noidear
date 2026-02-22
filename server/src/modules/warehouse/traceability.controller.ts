import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TraceabilityService } from '../batch-trace/services/traceability.service';

@Controller('warehouse/traceability')
export class WarehouseTraceabilityController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  @Get('backward/:finishedGoodsBatchId')
  traceBackward(
    @Param('finishedGoodsBatchId', ParseUUIDPipe) finishedGoodsBatchId: string,
  ) {
    return this.traceabilityService.traceBackward(finishedGoodsBatchId);
  }

  @Get('forward/:materialBatchId')
  traceForward(
    @Param('materialBatchId', ParseUUIDPipe) materialBatchId: string,
  ) {
    return this.traceabilityService.traceForward(materialBatchId);
  }
}
