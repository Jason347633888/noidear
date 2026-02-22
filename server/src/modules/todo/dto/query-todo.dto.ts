import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsEnum, Min } from 'class-validator';

export enum TodoType {
  TRAINING_ORGANIZE = 'training_organize',
  TRAINING_ATTEND = 'training_attend',
  APPROVAL = 'approval',
  EQUIPMENT_MAINTAIN = 'equipment_maintain',
  INVENTORY = 'inventory',
  CHANGE_REQUEST = 'change_request',
}

export enum TodoStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export enum TodoPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class QueryTodoDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: '待办类型', enum: TodoType })
  @IsEnum(TodoType)
  @IsOptional()
  type?: TodoType;

  @ApiPropertyOptional({ description: '待办状态', enum: TodoStatus })
  @IsEnum(TodoStatus)
  @IsOptional()
  status?: TodoStatus;

  @ApiPropertyOptional({ description: '优先级', enum: TodoPriority })
  @IsEnum(TodoPriority)
  @IsOptional()
  priority?: TodoPriority;
}
