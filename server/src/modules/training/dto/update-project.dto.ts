import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class UpdateTrainingProjectDto {
  @ApiPropertyOptional({ description: '培训标题' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '培训描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '计划培训日期' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: '培训资料文档ID数组', type: [String] })
  @IsArray()
  @IsOptional()
  documentIds?: string[];

  @ApiPropertyOptional({ description: '及格分数' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  passingScore?: number;

  @ApiPropertyOptional({ description: '最大考试次数' })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxAttempts?: number;
}
