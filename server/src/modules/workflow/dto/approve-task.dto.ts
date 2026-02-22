import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveTaskDto {
  @ApiProperty({
    description: '审批意见',
    example: '同意，符合要求',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
