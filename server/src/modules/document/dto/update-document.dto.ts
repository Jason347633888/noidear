import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DocumentControlMetadataDto } from './document-control.dto';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: '文档标题' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ type: DocumentControlMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentControlMetadataDto)
  control?: DocumentControlMetadataDto;
}
