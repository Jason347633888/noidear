import { IsArray, ArrayMinSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchRevokePermissionsDto {
  @ApiProperty({
    description: '用户权限 ID 列表',
    example: ['up_001', 'up_002', 'up_003'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userPermissionIds: string[];
}
