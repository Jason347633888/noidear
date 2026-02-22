import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ description: '角色名称', example: '高级主管', required: false })
  @IsOptional()
  @IsString({ message: '角色名称必须是字符串' })
  @MaxLength(100, { message: '角色名称不能超过100个字符' })
  name?: string;

  @ApiProperty({ description: '角色描述', example: '高级部门主管，拥有更高审批权限', required: false })
  @IsOptional()
  @IsString({ message: '角色描述必须是字符串' })
  @MaxLength(500, { message: '角色描述不能超过500个字符' })
  description?: string;
}
