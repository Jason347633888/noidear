import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryTrainingProjectDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: '部门筛选' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: '季度筛选' })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  quarter?: number;

  @ApiPropertyOptional({ description: '状态筛选', enum: ['planned', 'ongoing', 'completed', 'cancelled'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: '培训计划ID筛选' })
  @IsString()
  @IsOptional()
  planId?: string;
}
