import { Controller, Get, Post, Delete, Patch, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProcessService } from './process.service';
import { CreateProcessInstanceDto, SubmitStepDto, ApproveStepDto, UpdateProductNameDto } from './dto';

@ApiTags('产品研发流程')
@ApiBearerAuth()
@Controller('process')
@UseGuards(JwtAuthGuard)
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  @Get('templates/default')
  @ApiOperation({ summary: '获取默认流程模板' })
  getDefaultTemplate() {
    return this.processService.getDefaultTemplate();
  }

  @Get('instances')
  @ApiOperation({ summary: '获取当前用户的流程实例列表' })
  listInstances(@Request() req: { user: { userId: string } }) {
    return this.processService.listInstances(req.user.userId);
  }

  @Post('instances')
  @ApiOperation({ summary: '创建流程实例' })
  createInstance(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateProcessInstanceDto,
  ) {
    return this.processService.createInstance(req.user.userId, dto);
  }

  @Get('instances/:id')
  @ApiOperation({ summary: '获取流程实例详情' })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  getInstance(@Param('id') id: string) {
    return this.processService.getInstance(id);
  }

  @Delete('instances/:id')
  @ApiOperation({ summary: '删除流程实例' })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  deleteInstance(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.processService.deleteInstance(id, req.user.userId);
  }

  @Patch('instances/:id/product-name')
  @ApiOperation({ summary: '更新产品名称' })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  updateProductName(@Param('id') id: string, @Body() dto: UpdateProductNameDto) {
    return this.processService.updateProductName(id, dto);
  }

  @Get('instances/:id/steps/:stepNumber')
  @ApiOperation({ summary: '获取步骤数据' })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  @ApiParam({ name: 'stepNumber', description: '步骤编号（1-9）' })
  getStepData(
    @Param('id') id: string,
    @Param('stepNumber', ParseIntPipe) stepNumber: number,
  ) {
    return this.processService.getStepData(id, stepNumber);
  }

  @Post('instances/:id/steps')
  @ApiOperation({ summary: '提交步骤数据' })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  submitStep(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: SubmitStepDto,
  ) {
    return this.processService.submitStep(id, req.user.userId, dto);
  }

  @Post('instances/:id/approve')
  @ApiOperation({ summary: '审批步骤（Step 7/8 HACCP 审批）' })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  approveStep(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: ApproveStepDto,
  ) {
    return this.processService.approveStep(id, req.user.userId, dto);
  }
}
