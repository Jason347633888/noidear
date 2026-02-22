import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RejectRectificationDto {
  @ApiProperty({
    description: 'Reason for rejecting the rectification (required, min 10 chars)',
    example: 'The rectification document does not address the root cause of the issue',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  rejectionReason: string;
}
