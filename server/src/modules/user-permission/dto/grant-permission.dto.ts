import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GrantPermissionDto {
  @ApiProperty({
    description: '用户 ID',
    example: 'user_001',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: '细粒度权限 ID',
    example: 'perm_001',
  })
  @IsString()
  @IsNotEmpty()
  fineGrainedPermissionId: string;

  @ApiProperty({
    description: '授权原因',
    example: '临时项目需求',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: '资源类型（可选，用于资源级权限）',
    example: 'document',
  })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({
    description: '资源 ID（可选，用于资源级权限）',
    example: 'doc_001',
  })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({
    description: '权限过期时间（可选，ISO 8601 格式）',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
