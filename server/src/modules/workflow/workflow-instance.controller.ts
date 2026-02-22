import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowInstanceService } from './workflow-instance.service';
import { CreateWorkflowInstanceDto } from './dto/create-workflow-instance.dto';
import { CancelWorkflowInstanceDto } from './dto/cancel-workflow-instance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('工作流实例管理')
@Controller('workflow-instances')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WorkflowInstanceController {
  constructor(private readonly instanceService: WorkflowInstanceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建工作流实例' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  create(@Body() createDto: CreateWorkflowInstanceDto, @Request() req: any) {
    return this.instanceService.create(createDto, req.user.id);
  }

  /**
   * P2-7: 工作流统计信息 API
   * 注意：statistics 路由必须在 :id 之前，避免被参数路由捕获
   */
  @Get('statistics')
  @ApiOperation({ summary: '工作流统计信息' })
  @ApiResponse({ status: 200, description: '查询成功' })
  getStatistics() {
    return this.instanceService.getStatistics();
  }

  /**
   * P1-14: 工作流实例列表 API
   */
  @Get()
  @ApiOperation({ summary: '查询工作流实例列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(
    @Query('status') status?: string,
    @Query('resourceType') resourceType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.instanceService.findAll({
      status,
      resourceType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消工作流实例' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @ApiResponse({ status: 404, description: '实例不存在' })
  cancel(
    @Param('id') id: string,
    @Body() cancelDto: CancelWorkflowInstanceDto,
    @Request() req: any,
  ) {
    return this.instanceService.cancel(id, cancelDto, req.user.id, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询工作流实例详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '实例不存在' })
  findOne(@Param('id') id: string) {
    return this.instanceService.findOne(id);
  }
}
