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
  async traceBackward(
    @Param('finishedGoodsBatchId', ParseUUIDPipe) finishedGoodsBatchId: string,
  ) {
    const data = await this.traceabilityService.traceBackward(finishedGoodsBatchId);
    return {
      data,
      meta: {
        deprecated: true,
        authority: 'traceability',
        message: '此端点已弃用，请使用 POST /traceability/query',
      },
    };
  }

  @Get('forward/:materialBatchId')
  async traceForward(
    @Param('materialBatchId', ParseUUIDPipe) materialBatchId: string,
  ) {
    const data = await this.traceabilityService.traceForward(materialBatchId);
    return {
      data,
      meta: {
        deprecated: true,
        authority: 'traceability',
        message: '此端点已弃用，请使用 POST /traceability/query',
      },
    };
  }
}
