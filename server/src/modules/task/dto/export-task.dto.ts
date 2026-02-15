import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportTaskDto {
  @ApiPropertyOptional({ description: '导出格式', enum: ['excel'], default: 'excel' })
  @IsString()
  @IsIn(['excel'])
  @IsOptional()
  format?: string = 'excel';

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
