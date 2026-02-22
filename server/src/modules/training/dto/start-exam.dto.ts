import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class StartExamDto {
  @ApiProperty({ description: '培训项目ID' })
  @IsString()
  projectId: string;
}
