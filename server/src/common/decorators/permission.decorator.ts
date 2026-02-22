import { SetMetadata } from '@nestjs/common';

/**
 * 声明所需权限（单个）
 * @param code 权限代码（如 'view:department:document'）
 */
export const CheckPermission = (code: string) =>
  SetMetadata('requiredPermission', code);

/**
 * 声明多个权限（AND 逻辑 - 全部满足）
 * @param codes 权限代码数组
 */
export const CheckPermissions = (codes: string[]) =>
  SetMetadata('requiredPermissions', codes);

/**
 * 声明多个权限（OR 逻辑 - 任一满足）
 * @param codes 权限代码数组
 */
export const CheckAnyPermission = (codes: string[]) =>
  SetMetadata('requiredAnyPermissions', codes);

/**
 * 声明资源级别权限
 * @param type 资源类型（如 'document', 'record'）
 * @param idParam 请求参数中的资源 ID 字段名（如 'id', 'documentId'）
 */
export const Resource = (type: string, idParam: string) =>
  SetMetadata('resource', { type, idParam });
