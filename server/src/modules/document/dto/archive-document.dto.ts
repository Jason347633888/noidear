import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ArchiveDocumentDto {
  @ApiProperty({
    description: '归档原因',
    example: '文档版本过旧，已发布新版本替代',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10, { message: '归档原因至少 10 个字符' })
  @MaxLength(500, { message: '归档原因最多 500 个字符' })
  reason: string;
}

export class ObsoleteDocumentDto {
  @ApiProperty({
    description: '作废原因',
    example: '文档内容存在错误，需要重新制定',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10, { message: '作废原因至少 10 个字符' })
  @MaxLength(500, { message: '作废原因最多 500 个字符' })
  reason: string;
}
