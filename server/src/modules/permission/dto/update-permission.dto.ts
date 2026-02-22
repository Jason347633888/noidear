import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdatePermissionDto {
  @ApiProperty({ description: '权限描述', example: '创建和编辑文档', required: false })
  @IsOptional()
  @IsString({ message: '权限描述必须是字符串' })
  @MaxLength(500, { message: '权限描述不能超过500个字符' })
  description?: string;
}
