import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VerifyRectificationDto {
  @ApiProperty({
    description: 'Optional verification comment',
    example: 'Rectification verified successfully',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
