import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MaterialBalanceService } from './material-balance.service';

@Controller('api/v1/material-balance')
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
