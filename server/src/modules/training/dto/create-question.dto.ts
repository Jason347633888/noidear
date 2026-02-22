import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsObject,
  Min,
  ValidateIf,
} from 'class-validator';

export enum QuestionType {
  CHOICE = 'choice',
  JUDGE = 'judge',
}

export class CreateQuestionDto {
  @ApiProperty({ description: '培训项目ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: '题目类型', enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ description: '题目内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '选项（选择题）', example: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' } })
  @IsObject()
  @ValidateIf(o => o.type === QuestionType.CHOICE)
  options?: Record<string, string>;

  @ApiProperty({ description: '正确答案（选择题：A/B/C/D，判断题：true/false）', example: 'A' })
  @IsString()
  correctAnswer: string;

  @ApiProperty({ description: '分值', example: 10 })
  @IsInt()
  @Min(1)
  points: number;

  @ApiPropertyOptional({ description: '题目顺序', example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  order?: number;
}
