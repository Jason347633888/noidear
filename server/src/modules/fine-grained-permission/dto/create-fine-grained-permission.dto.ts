import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// BR-350: 权限分类（文档、记录、任务、审批、系统）
export enum PermissionCategory {
  DOCUMENT = 'document',
  RECORD = 'record',
  TASK = 'task',
  APPROVAL = 'approval',
  SYSTEM = 'system',
}

// BR-351: 权限范围（部门、跨部门、全局）
export enum PermissionScope {
  DEPARTMENT = 'department',
  CROSS_DEPARTMENT = 'cross_department',
  GLOBAL = 'global',
}

export class CreateFineGrainedPermissionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(PermissionCategory)
  category: PermissionCategory;

  @IsEnum(PermissionScope)
  scope: PermissionScope;

  @IsString()
  @IsOptional()
  description?: string;
}
