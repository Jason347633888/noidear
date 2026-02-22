import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({ description: '搜索关键词' })
  @IsString()
  keyword: string;

  @ApiProperty({ description: '文档类型筛选', required: false })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiProperty({ description: '部门ID筛选', required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ description: '标签筛选', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ description: '排序方式：relevance | time', required: false })
  @IsOptional()
  @IsString()
  sortBy?: 'relevance' | 'time';

  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
