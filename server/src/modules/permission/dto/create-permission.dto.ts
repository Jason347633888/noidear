import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ description: '资源类型', example: 'document' })
  @IsNotEmpty({ message: '资源类型不能为空' })
  @IsString({ message: '资源类型必须是字符串' })
  @MaxLength(50, { message: '资源类型不能超过50个字符' })
  resource: string;

  @ApiProperty({ description: '操作类型', example: 'create' })
  @IsNotEmpty({ message: '操作类型不能为空' })
  @IsString({ message: '操作类型必须是字符串' })
  @MaxLength(50, { message: '操作类型不能超过50个字符' })
  action: string;

  @ApiProperty({ description: '权限描述', example: '创建文档', required: false })
  @IsOptional()
  @IsString({ message: '权限描述必须是字符串' })
  @MaxLength(500, { message: '权限描述不能超过500个字符' })
  description?: string;
}
