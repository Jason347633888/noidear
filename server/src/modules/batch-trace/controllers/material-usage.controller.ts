import { ModuleKey } from '../../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { MaterialUsageService } from '../services/material-usage.service';
import { CreateMaterialUsageDto, QueryMaterialUsageDto } from '../dto/material-usage.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Ownership } from '../../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../../module-access/ownership-context';

@ApiTags('批次物料关联管理')
@ModuleKey('traceability_batch')
@Controller('batch-trace/material-usage')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MaterialUsageController {
  constructor(private readonly service: MaterialUsageService) {}

  @Post()
  @ApiOperation({ summary: '创建批次物料关联' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 404, description: '批次不存在' })
  @ApiResponse({ status: 400, description: '库存不足' })
  create(@Body() createDto: CreateMaterialUsageDto, @Ownership() ownership: OwnershipContext) {
    return this.service.create(createDto, ownership);
  }

  @Get()
  @ApiOperation({ summary: '查询生产批次使用的原料' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findByProductionBatch(@Query() query: QueryMaterialUsageDto) {
    return this.service.findByProductionBatch(query.productionBatchId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除批次物料关联' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '关联记录不存在' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
