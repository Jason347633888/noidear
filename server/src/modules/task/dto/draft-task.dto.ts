import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DraftTaskDto {
  @ApiPropertyOptional({ description: '表单数据（草稿）' })
  @IsOptional()
  data?: Record<string, unknown>;
}
