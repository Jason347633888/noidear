import { IsOptional, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 查询指标 DTO
 * TASK-363: Query metrics from SystemMetric table
 */
export class QueryMetricsDto {
  @ApiProperty({ description: '指标名称', required: false })
  @IsOptional()
  @IsString()
  metricName?: string;

  @ApiProperty({ description: '指标类型', required: false })
  @IsOptional()
  @IsString()
  metricType?: string;

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

  @ApiProperty({ description: '每页数量', default: 100, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 100;
}
