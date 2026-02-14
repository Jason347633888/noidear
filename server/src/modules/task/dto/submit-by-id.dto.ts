import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitByIdDto {
  @ApiPropertyOptional({ description: '表单数据' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '偏离原因（字段名 -> 原因）' })
  @IsOptional()
  @IsObject()
  deviationReasons?: Record<string, string>;
}
