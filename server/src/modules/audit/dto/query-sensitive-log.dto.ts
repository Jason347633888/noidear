import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 敏感操作日志查询 DTO
 * TASK-362: Audit Query APIs
 */
export class QuerySensitiveLogDto {
  @ApiProperty({ description: '用户ID', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: '操作类型', required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ description: '资源类型', required: false })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiProperty({ description: '资源ID', required: false })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', default: 20, maximum: 100, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
