import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional, Matches } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: '角色代码', example: 'leader' })
  @IsNotEmpty({ message: '角色代码不能为空' })
  @IsString({ message: '角色代码必须是字符串' })
  @MaxLength(50, { message: '角色代码不能超过50个字符' })
  @Matches(/^[a-z0-9_-]+$/, { message: '角色代码只能包含小写字母、数字、下划线和连字符' })
  code: string;

  @ApiProperty({ description: '角色名称', example: '主管' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  @IsString({ message: '角色名称必须是字符串' })
  @MaxLength(100, { message: '角色名称不能超过100个字符' })
  name: string;

  @ApiProperty({ description: '角色描述', example: '部门主管，拥有审批权限', required: false })
  @IsOptional()
  @IsString({ message: '角色描述必须是字符串' })
  @MaxLength(500, { message: '角色描述不能超过500个字符' })
  description?: string;
}
