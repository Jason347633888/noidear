import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class SubmitRectificationDto {
  @ApiProperty({
    description: 'Rectification document ID',
    example: 'doc-456',
  })
  @IsUUID()
  documentId: string;

  @ApiProperty({
    description: 'Rectification document version',
    example: '2.0',
  })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiPropertyOptional({
    description: 'Rectification comment',
    example: 'Fixed all issues mentioned in the audit',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
