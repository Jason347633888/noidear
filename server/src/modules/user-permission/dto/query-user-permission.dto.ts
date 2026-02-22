import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryUserPermissionDto {
  @ApiPropertyOptional({
    description: '用户 ID',
    example: 'user_001',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: '细粒度权限 ID',
    example: 'perm_001',
  })
  @IsString()
  @IsOptional()
  fineGrainedPermissionId?: string;

  @ApiPropertyOptional({
    description: '资源类型',
    example: 'document',
  })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({
    description: '资源 ID',
    example: 'doc_001',
  })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
