import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 日志导出 DTO
 * TASK-362: Export logs to Excel
 */
export enum LogType {
  LOGIN = 'login',
  PERMISSION = 'permission',
  SENSITIVE = 'sensitive',
}

export class ExportLogDto {
  @ApiProperty({ description: '日志类型', enum: LogType })
  @IsEnum(LogType)
  logType: LogType;

  @ApiProperty({ description: '用户ID', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: '操作类型', required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
