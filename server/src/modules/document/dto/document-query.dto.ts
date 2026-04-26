import { IsInt, IsOptional, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DocumentQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: '文档级别', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '文档状态', example: 'draft' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: '文档类型' })
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiPropertyOptional({ description: '来源文件夹 01-06' })
  @IsString()
  @IsOptional()
  sourceFolder?: string;

  @ApiPropertyOptional({ description: '负责部门' })
  @IsString()
  @IsOptional()
  ownerDepartment?: string;

  @ApiPropertyOptional({ description: '标签' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ description: '复审到期天数' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  dueWithinDays?: number;
}
