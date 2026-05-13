import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const STATUS_VALUES = ['all', 'pending', 'completed'] as const;
const TYPE_VALUES = [
  'all',
  'training_attend',
  'training_organize',
  'approval',
  'approval_task',
  'equipment_maintain',
  'inventory',
  'change_request',
  'document_renewal',
  'change_execution_failed',
] as const;

export type TodoStatusFilter = typeof STATUS_VALUES[number];
export type TodoTypeFilter = typeof TYPE_VALUES[number];

export class QueryTodoDto {
  @ApiPropertyOptional({ enum: STATUS_VALUES, default: 'all' })
  @IsOptional()
  @IsEnum(STATUS_VALUES)
  status?: TodoStatusFilter = 'all';

  @ApiPropertyOptional({ enum: TYPE_VALUES, default: 'all' })
  @IsOptional()
  @IsEnum(TYPE_VALUES)
  type?: TodoTypeFilter = 'all';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
