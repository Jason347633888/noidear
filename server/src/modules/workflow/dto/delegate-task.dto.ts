import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class DelegateTaskDto {
  @ApiProperty({ description: '委托给的用户ID' })
  @IsString()
  toUserId: string;

  @ApiProperty({ description: '委托原因', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
