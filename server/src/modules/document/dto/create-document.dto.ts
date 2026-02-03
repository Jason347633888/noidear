import { IsInt, IsString, IsNotEmpty, Min, Max, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDocumentDto {
  @ApiProperty({ description: '文档级别', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  level: number;

  @ApiProperty({ description: '文档标题', example: '测试文档' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  title: string;
}
