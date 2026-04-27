import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateMarkdownDto {
  @ApiProperty({ description: 'Markdown 正文', example: '# 新内容' })
  @IsString()
  contentMd!: string;
}
