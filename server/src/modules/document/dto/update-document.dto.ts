import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: '文档标题' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;
}
