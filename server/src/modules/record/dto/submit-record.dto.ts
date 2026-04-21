import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitRecordDto {
  @ApiPropertyOptional({
    description: '偏差原因映射（字段名 -> 原因，每个原因 ≥10 字）',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  deviationReasons?: Record<string, string>;
}
