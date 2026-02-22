import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateTrainingPlanDto {
  @ApiProperty({ description: '年度', example: 2024 })
  @IsInt()
  @Min(2000)
  year: number;

  @ApiProperty({ description: '标题', example: '2024年度培训计划' })
  @IsString()
  title: string;
}
