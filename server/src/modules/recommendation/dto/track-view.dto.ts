import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class TrackViewDto {
  @ApiProperty({ description: '文档ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: '阅读时长（秒）', required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;
}
