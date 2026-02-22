import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MetricType {
  SYSTEM = 'system',
  APPLICATION = 'application',
  BUSINESS = 'business',
}

/**
 * 记录指标 DTO
 * TASK-363: Monitoring Module
 */
export class RecordMetricDto {
  @ApiProperty({ description: '指标名称' })
  @IsString()
  metricName: string;

  @ApiProperty({ description: '指标值' })
  @IsNumber()
  metricValue: number;

  @ApiProperty({ description: '指标类型', enum: MetricType })
  @IsEnum(MetricType)
  metricType: MetricType;

  @ApiProperty({ description: '标签 (JSON 字符串)', required: false })
  @IsOptional()
  @IsString()
  tags?: string;
}
