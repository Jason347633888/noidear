import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowTemplateService } from './workflow-template.service';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-workflow-template.dto';
import { QueryWorkflowTemplateDto } from './dto/query-workflow-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('工作流模板管理')
@Controller('workflow-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WorkflowTemplateController {
  constructor(private readonly templateService: WorkflowTemplateService) {}

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建工作流模板' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 409, description: '模板编码已存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  create(@Body() createDto: CreateWorkflowTemplateDto) {
    return this.templateService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '查询工作流模板列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query() query: QueryWorkflowTemplateDto) {
    return this.templateService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询工作流模板详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Put(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新工作流模板' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  update(@Param('id') id: string, @Body() updateDto: UpdateWorkflowTemplateDto) {
    return this.templateService.update(id, updateDto);
  }

  @Put(':id/disable')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '停用工作流模板' })
  @ApiResponse({ status: 200, description: '停用成功' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  disable(@Param('id') id: string) {
    return this.templateService.disable(id);
  }
}
