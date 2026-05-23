import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { TraceabilityService } from '../batch-trace/services/traceability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ModuleKey('traceability_batch')
@Controller('warehouse/traceability')
@UseGuards(JwtAuthGuard)
export class WarehouseTraceabilityController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  // TASK-9: URL param renamed to productionBatchId; FinishedGoodsBatch removed
  @Get('backward/:productionBatchId')
  async traceBackward(
    @Param('productionBatchId', ParseUUIDPipe) productionBatchId: string,
  ) {
    const data = await this.traceabilityService.traceBackward(productionBatchId);
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
