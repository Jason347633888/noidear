import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RejectFindingDto {
  @ApiProperty({
    description: 'Rejection reason (required)',
    example: 'The corrective action is insufficient. Please provide more detailed evidence.',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  rejectionReason: string;
}
