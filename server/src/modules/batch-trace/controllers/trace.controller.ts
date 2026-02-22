import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TraceabilityService } from '../services/traceability.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('批次追溯')
@Controller('api/v1/trace')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TraceController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  @Post('backward')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '逆向追溯（成品 -> 原料）' })
  @ApiResponse({ status: 200, description: '追溯成功' })
  @ApiResponse({ status: 404, description: '成品批次不存在' })
  backwardTrace(@Body('finishedGoodsBatchId') finishedGoodsBatchId: string) {
    return this.traceabilityService.traceBackward(finishedGoodsBatchId);
  }

  @Post('forward')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '正向追溯（原料 -> 成品）' })
  @ApiResponse({ status: 200, description: '追溯成功' })
  @ApiResponse({ status: 404, description: '原料批次不存在' })
  forwardTrace(@Body('materialBatchId') materialBatchId: string) {
    return this.traceabilityService.traceForward(materialBatchId);
  }
}
