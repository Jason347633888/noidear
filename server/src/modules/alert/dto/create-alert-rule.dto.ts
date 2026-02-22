import { IsString, IsNumber, IsEnum, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AlertCondition {
  GT = '>',
  LT = '<',
  GTE = '>=',
  LTE = '<=',
  EQ = '==',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * 创建告警规则 DTO
 * TASK-364: Alert Management
 */
export class CreateAlertRuleDto {
  @ApiProperty({ description: '规则名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '指标名称' })
  @IsString()
  metricName: string;

  @ApiProperty({ description: '条件', enum: AlertCondition })
  @IsEnum(AlertCondition)
  condition: AlertCondition;

  @ApiProperty({ description: '阈值' })
  @IsNumber()
  threshold: number;

  @ApiProperty({ description: '严重程度', enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({ description: '是否启用', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @ApiProperty({ description: '通知渠道 (JSON 数组)', required: false })
  @IsOptional()
  @IsString()
  notifyChannels?: string;
}
