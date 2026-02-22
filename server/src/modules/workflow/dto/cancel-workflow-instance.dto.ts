import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelWorkflowInstanceDto {
  @ApiProperty({
    description: '取消原因',
    example: '业务需求变更',
  })
  @IsString()
  @IsNotEmpty()
  cancelReason: string;
}
