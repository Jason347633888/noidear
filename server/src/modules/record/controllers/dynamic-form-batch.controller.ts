import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DynamicFormBatchService } from '../services/dynamic-form-batch.service';

@ApiTags('动态表单批次关联')
@Controller('dynamic-forms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DynamicFormBatchController {
  constructor(
    private readonly dynamicFormBatchService: DynamicFormBatchService,
  ) {}

  @Get(':formId/batches/:batchId/submissions')
  @ApiOperation({ summary: '查询指定批次的动态表单提交记录' })
  @ApiParam({ name: 'formId', description: '表单模板ID' })
  @ApiParam({ name: 'batchId', description: '批次ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'status', required: false, description: '状态过滤' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '表单模板不存在' })
  getSubmissionsByBatch(
    @Param('formId') formId: string,
    @Param('batchId') batchId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: string,
  ) {
    return this.dynamicFormBatchService.getSubmissionsByBatch(
      formId,
      batchId,
      { page, limit, status },
    );
  }
}
