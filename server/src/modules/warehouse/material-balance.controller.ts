import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MaterialBalanceService } from './material-balance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ModuleKey('traceability_batch')
@Controller('warehouse/material-balance')
@UseGuards(JwtAuthGuard)
export class MaterialBalanceController {
  constructor(private readonly materialBalanceService: MaterialBalanceService) {}

  @Get('check/:batchId')
  @HttpCode(HttpStatus.OK)
  checkBalance(@Param('batchId') batchId: string) {
    return this.materialBalanceService.checkBalance(batchId);
  }

  @Get('check-all')
  @HttpCode(HttpStatus.OK)
  checkAllBatches() {
    return this.materialBalanceService.checkAllBatches();
  }
}
