import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryMyTasksDto {
  @ApiPropertyOptional({
    description: '任务状态',
    example: 'pending',
    enum: ['pending', 'approved', 'rejected', 'all'],
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: '资源类型',
    example: 'document',
    enum: ['document', 'task', 'record', 'all'],
  })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
