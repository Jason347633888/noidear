import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TraceabilityService } from './traceability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('traceability')
@UseGuards(JwtAuthGuard)
export class TraceabilityController {
  constructor(private service: TraceabilityService) {}

  @Get('forward/:materialBatchId')
  forwardTrace(@Param('materialBatchId') id: string) {
    return this.service.forwardTrace(id);
  }

  @Get('backward/:productionBatchId')
  backwardTrace(@Param('productionBatchId') id: string) {
    return this.service.backwardTrace(id);
  }

  @Get('balance/:productionBatchId')
  materialBalance(@Param('productionBatchId') id: string) {
    return this.service.materialBalance(id);
  }
}
