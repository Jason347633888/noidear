import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject } from 'class-validator';

export class SubmitExamDto {
  @ApiProperty({ description: '培训项目ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: '答案对象', example: { 'question-id-1': 'A', 'question-id-2': 'true' } })
  @IsObject()
  answers: Record<string, string>;
}
