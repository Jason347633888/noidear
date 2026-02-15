import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString, IsIn, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @ApiProperty({ description: '模板 ID' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: '部门 ID' })
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ description: '截止日期' })
  @IsDateString()
  deadline: string;
}

export class TaskQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: '任务状态', enum: ['pending', 'submitted', 'approved', 'rejected', 'cancelled', 'overdue'] })
  @IsString()
  @IsIn(['pending', 'submitted', 'approved', 'rejected', 'cancelled', 'overdue'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: '部门 ID' })
  @IsString()
  @IsOptional()
  departmentId?: string;
}

export class SubmitTaskDto {
  @ApiProperty({ description: '任务 ID' })
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ description: '表单数据' })
  @IsOptional()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '偏离原因（字段名 -> 原因）' })
  @IsOptional()
  deviationReasons?: Record<string, string>;
}

export class CancelTaskDto {
  @ApiProperty({ description: '任务 ID' })
  @IsString()
  @IsNotEmpty()
  taskId: string;
}

export class ApproveTaskDto {
  @ApiProperty({ description: '记录 ID' })
  @IsString()
  @IsNotEmpty()
  recordId: string;

  @ApiProperty({ description: '审批状态', enum: ['approved', 'rejected'] })
  @IsString()
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({ description: '审批意见' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export { BatchAssignTaskDto } from './batch-assign-task.dto';
export { ExportTaskDto } from './export-task.dto';
