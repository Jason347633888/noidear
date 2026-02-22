import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class TransferTaskDto {
  @ApiProperty({ description: '转办给的用户ID' })
  @IsString()
  toUserId: string;

  @ApiProperty({ description: '转办原因', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
