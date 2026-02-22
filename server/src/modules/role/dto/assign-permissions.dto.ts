import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({ description: '权限ID列表', example: ['perm-1', 'perm-2'] })
  @IsArray({ message: '权限ID必须是数组' })
  @ArrayNotEmpty({ message: '权限ID列表不能为空' })
  @IsString({ each: true, message: '每个权限ID必须是字符串' })
  permissionIds: string[];
}
