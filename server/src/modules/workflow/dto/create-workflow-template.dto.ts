import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 工作流步骤配置
 */
export class WorkflowStepDto {
  @ApiProperty({ description: '步骤索引', example: 0 })
  @IsInt()
  @Min(0)
  index: number;

  @ApiProperty({ description: '步骤名称', example: '部门主管审批' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '审批人角色', example: 'manager' })
  @IsString()
  @IsNotEmpty()
  assigneeRole: string;

  @ApiProperty({ description: '是否并行审批（会签）', example: false })
  @IsBoolean()
  parallelMode: boolean;

  @ApiPropertyOptional({ description: '并行审批人列表（并行模式时必填）', example: ['user_001', 'user_002'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parallelAssignees?: string[];

  @ApiProperty({ description: '超时时间（小时）', example: 24 })
  @IsInt()
  @Min(1)
  timeoutHours: number;
}

/**
 * 创建工作流模板 DTO
 */
export class CreateWorkflowTemplateDto {
  @ApiProperty({ description: '模板名称', example: '文档审批流程' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '所属部门 ID（null 表示全局模板）', example: 'dept_001' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ description: '模板类别', enum: ['document', 'task', 'record'], example: 'document' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: '工作流步骤配置', type: [WorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({ description: '模板描述', example: '用于生产部门文档审批' })
  @IsOptional()
  @IsString()
  description?: string;
}
