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
  @ApiOperation({
    summary: '获取默认流程模板',
    description: `
业务语义：返回当前激活的流程模板，供创建流程实例时获取 templateId。
前置条件：系统中必须存在至少一个 isActive=true 的 ProcessTemplate 记录。
副作用：无，只读操作。
例外情况：若无激活模板则抛出 404 NotFoundException。
    `.trim(),
  })
  getDefaultTemplate() {
    return this.processService.getDefaultTemplate();
  }

  @Get('instances')
  @ApiOperation({
    summary: '获取当前用户的流程实例列表',
    description: `
业务语义：返回当前登录用户创建的所有流程实例，按创建时间降序排列，含模板名称。
前置条件：需要有效的 JWT Bearer Token。
副作用：无，只读操作。
例外情况：若用户无实例则返回空数组，不抛出错误。
    `.trim(),
  })
  listInstances(@Request() req: { user: { id: string } }) {
    return this.processService.listInstances(req.user.id);
  }

  @Post('instances')
  @ApiOperation({
    summary: '创建流程实例',
    description: `
业务语义：基于指定模板创建一个新的研发流程实例，初始状态为 DRAFT，currentStep=1。
前置条件：需要提供有效的 templateId（可通过 GET /process/templates/default 获取）。
副作用：在数据库中新增 ProcessInstance 记录，关联当前用户为创建者。
例外情况：templateId 不存在时抛出 404；productName 为空字符串时自动填充空值。
    `.trim(),
  })
  createInstance(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateProcessInstanceDto,
  ) {
    return this.processService.createInstance(req.user.id, dto);
  }

  @Get('instances/:id')
  @ApiOperation({
    summary: '获取流程实例详情',
    description: `
业务语义：返回流程实例完整信息，包含所有步骤数据列表（stepDataList），用于 ProcessDetail 页面展示。
前置条件：实例 ID 必须存在。
副作用：无，只读操作。
例外情况：ID 不存在时抛出 404 NotFoundException。
    `.trim(),
  })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  getInstance(@Param('id') id: string) {
    return this.processService.getInstance(id);
  }

  @Delete('instances/:id')
  @ApiOperation({
    summary: '删除流程实例',
    description: `
业务语义：永久删除指定流程实例及其所有步骤数据。
前置条件：调用者必须是该实例的创建者，且实例状态不能为 COMPLETED。
副作用：级联删除关联的 ProcessStepData 记录。
例外情况：非创建者操作抛出 403 ForbiddenException；已完成实例抛出 403 ForbiddenException。
    `.trim(),
  })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  deleteInstance(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.processService.deleteInstance(id, req.user.id);
  }

  @Patch('instances/:id/product-name')
  @ApiOperation({
    summary: '更新产品名称',
    description: `
业务语义：更新流程实例的产品名称字段，同步更新 updatedAt 时间戳。
前置条件：实例 ID 必须存在。
副作用：修改 ProcessInstance.productName 和 updatedAt 字段。
例外情况：实例不存在时抛出 404 NotFoundException。
    `.trim(),
  })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  updateProductName(@Param('id') id: string, @Body() dto: UpdateProductNameDto) {
    return this.processService.updateProductName(id, dto);
  }

  @Get('instances/:id/steps/:stepNumber')
  @ApiOperation({
    summary: '获取步骤数据',
    description: `
业务语义：获取指定流程实例的某一步骤数据；若该步骤尚未提交则返回空 stub（data={}, status=PENDING）。
前置条件：实例 ID 必须存在，stepNumber 范围为 1-9。
副作用：无，只读操作。
例外情况：实例不存在时抛出 404；stepNumber 超出范围时返回空 stub，不报错。
    `.trim(),
  })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  @ApiParam({ name: 'stepNumber', description: '步骤编号（1-9）' })
  getStepData(
    @Param('id') id: string,
    @Param('stepNumber', ParseIntPipe) stepNumber: number,
  ) {
    return this.processService.getStepData(id, stepNumber);
  }

  @Post('instances/:id/steps')
  @ApiOperation({
    summary: '提交步骤数据',
    description: `
业务语义：提交或草稿保存当前步骤的表单数据。stepNumber 必须等于实例的 currentStep。
前置条件：调用者已登录；dto.stepNumber 必须等于 instance.currentStep，否则拒绝操作。
副作用：saveAsDraft=true 时仅保存数据不推进步骤；saveAsDraft=false 时 currentStep+1；Step7/8 提交后需 HACCP 审批才推进；Step9 完成后 instance.status→COMPLETED。
例外情况：stepNumber 不等于 currentStep 时抛出 403 ForbiddenException，错误体包含机器可读错误码 PROCESS_WRONG_STEP。
    `.trim(),
  })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  submitStep(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: SubmitStepDto,
  ) {
    return this.processService.submitStep(id, req.user.id, dto);
  }

  @Post('instances/:id/approve')
  @ApiOperation({
    summary: '审批步骤（Step 7/8 HACCP 审批）',
    description: `
业务语义：由 HACCP 审批人对已提交的步骤数据进行审批操作。approve 推进步骤，reject 回退步骤。
前置条件：被审批步骤的 status 必须为 SUBMITTED；调用者须具备 HACCP 审批权限。
副作用：approve 时 currentStep+1，stepData.status→APPROVED；reject 时 currentStep-1，stepData.status→REJECTED，原步骤数据保留供修改。
例外情况：步骤状态非 SUBMITTED 时抛出 403 ForbiddenException，错误体包含机器可读错误码 PROCESS_STEP_NOT_SUBMITTED。
    `.trim(),
  })
  @ApiParam({ name: 'id', description: '流程实例 ID' })
  approveStep(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: ApproveStepDto,
  ) {
    return this.processService.approveStep(id, req.user.id, dto);
  }
}
