import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateTrainingProjectDto {
  @ApiProperty({ description: '培训计划ID' })
  @IsString()
  planId: string;

  @ApiProperty({ description: '培训标题' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '培训描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '培训部门' })
  @IsString()
  department: string;

  @ApiProperty({ description: '季度', example: 1 })
  @IsInt()
  @Min(1)
  @Max(4)
  quarter: number;

  @ApiProperty({ description: '培训讲师ID' })
  @IsString()
  trainerId: string;

  @ApiProperty({ description: '学员ID数组', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100) // BR-099: 培训学员限制
  trainees: string[];

  @ApiPropertyOptional({ description: '计划培训日期' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: '培训资料文档ID数组', type: [String] })
  @IsArray()
  @IsOptional()
  documentIds?: string[];

  @ApiPropertyOptional({ description: '及格分数', example: 60 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  passingScore?: number;

  @ApiPropertyOptional({ description: '最大考试次数', example: 3 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxAttempts?: number;
}
