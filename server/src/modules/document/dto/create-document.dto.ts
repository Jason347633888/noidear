import { IsInt, IsString, IsNotEmpty, Min, Max, MinLength, MaxLength, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DocumentControlMetadataDto } from './document-control.dto';

export class CreateDocumentDto {
  @ApiProperty({ description: '文档级别', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  level: number;

  @ApiProperty({ description: '文档标题', example: '测试文档' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ type: DocumentControlMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentControlMetadataDto)
  control?: DocumentControlMetadataDto;
}
