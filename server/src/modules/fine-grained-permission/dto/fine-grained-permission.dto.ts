import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, Matches } from 'class-validator';

/**
 * 权限类别枚举
 */
export enum PermissionCategory {
  DOCUMENT = 'document',
  RECORD = 'record',
  TASK = 'task',
  APPROVAL = 'approval',
  SYSTEM = 'system',
}

/**
 * 权限范围枚举
 */
export enum PermissionScope {
  DEPARTMENT = 'department',
  CROSS_DEPARTMENT = 'cross_department',
  GLOBAL = 'global',
}

/**
 * 权限状态枚举
 */
export enum PermissionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * 创建细粒度权限定义 DTO
 */
export class CreateFineGrainedPermissionDto {
  @ApiProperty({
    description: '权限编码（格式：{action}:{scope}:{resource}）',
    example: 'view:cross_department:document',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z_]+:[a-z_]+:[a-z_]+$/, {
    message: '权限编码格式错误，应为 {action}:{scope}:{resource}',
  })
  code: string;

  @ApiProperty({
    description: '权限名称',
    example: '跨部门查看文档',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '权限类别',
    enum: PermissionCategory,
    example: PermissionCategory.DOCUMENT,
  })
  @IsEnum(PermissionCategory)
  category: PermissionCategory;

  @ApiProperty({
    description: '权限范围',
    enum: PermissionScope,
    example: PermissionScope.CROSS_DEPARTMENT,
  })
  @IsEnum(PermissionScope)
  scope: PermissionScope;

  @ApiPropertyOptional({
    description: '权限描述',
    example: '可跨部门查看其他部门的文档',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

/**
 * 更新细粒度权限定义 DTO
 */
export class UpdateFineGrainedPermissionDto {
  @ApiPropertyOptional({
    description: '权限名称',
    example: '跨部门查看文档（更新）',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '权限描述',
    example: '可跨部门查看其他部门的文档（更新）',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '权限状态',
    enum: PermissionStatus,
    example: PermissionStatus.ACTIVE,
  })
  @IsEnum(PermissionStatus)
  @IsOptional()
  status?: PermissionStatus;
}

/**
 * 查询细粒度权限 DTO
 */
export class QueryFineGrainedPermissionDto {
  @ApiPropertyOptional({
    description: '权限类别',
    enum: PermissionCategory,
  })
  @IsEnum(PermissionCategory)
  @IsOptional()
  category?: PermissionCategory;

  @ApiPropertyOptional({
    description: '权限范围',
    enum: PermissionScope,
  })
  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: '权限状态',
    enum: PermissionStatus,
  })
  @IsEnum(PermissionStatus)
  @IsOptional()
  status?: PermissionStatus;
}
