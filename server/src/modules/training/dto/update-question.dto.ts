import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsObject,
  Min,
} from 'class-validator';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ description: '题目内容' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: '选项（选择题）', example: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' } })
  @IsObject()
  @IsOptional()
  options?: Record<string, string>;

  @ApiPropertyOptional({ description: '正确答案', example: 'A' })
  @IsString()
  @IsOptional()
  correctAnswer?: string;

  @ApiPropertyOptional({ description: '分值', example: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({ description: '题目顺序', example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  order?: number;
}
