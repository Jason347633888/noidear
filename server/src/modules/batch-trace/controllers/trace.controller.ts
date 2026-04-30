import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TraceabilityService } from '../services/traceability.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('批次追溯')
@Controller('batch-trace/trace')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TraceController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  @Post('backward')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '逆向追溯（产品批次 -> 原料）[已弃用 — 使用 POST /traceability/query]' })
  @ApiResponse({ status: 200, description: '追溯成功' })
  @ApiResponse({ status: 404, description: '产品批次不存在' })
  async backwardTrace(@Body('productionBatchId') productionBatchId: string) {
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

  @Post('forward')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '正向追溯（原料 -> 成品）[已弃用 — 使用 POST /traceability/query]' })
  @ApiResponse({ status: 200, description: '追溯成功' })
  @ApiResponse({ status: 404, description: '原料批次不存在' })
  async forwardTrace(@Body('materialBatchId') materialBatchId: string) {
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
