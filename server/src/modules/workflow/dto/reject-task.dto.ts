import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectTaskDto {
  @ApiProperty({
    description: '驳回原因',
    example: '不符合质量标准，需要重新修改',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
