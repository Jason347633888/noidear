import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryRecordDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ description: '状态筛选', required: false, enum: ['all', 'draft', 'submitted', 'approved', 'rejected'] })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'draft', 'submitted', 'approved', 'rejected'])
  status?: string;

  @ApiProperty({ description: '模板ID筛选', required: false })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ description: '关键词搜索（记录编号）', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;
}
