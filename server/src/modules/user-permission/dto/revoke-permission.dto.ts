import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevokePermissionDto {
  @ApiProperty({
    description: '撤销原因',
    example: '项目结束',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
