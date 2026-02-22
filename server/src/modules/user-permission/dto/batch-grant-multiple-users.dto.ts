import { IsString, IsNotEmpty, IsArray, IsOptional, IsDateString, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatchGrantMultipleUsersDto {
  @ApiProperty({
    description: '用户 ID 列表',
    example: ['user_001', 'user_002', 'user_003'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({
    description: '细粒度权限 ID 列表',
    example: ['perm_001', 'perm_002'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  fineGrainedPermissionIds: string[];

  @ApiProperty({
    description: '批量授权原因',
    example: '新员工培训完成',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: '权限过期时间（可选，ISO 8601 格式）',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
