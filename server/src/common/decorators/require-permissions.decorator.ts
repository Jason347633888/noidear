import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionRequirement {
  resource: string;
  action: string;
}

/**
 * @deprecated 请使用 CheckPermission / CheckPermissions / CheckAnyPermission
 * 保留向后兼容，内部委托到 'permissions' 元数据 key，由 PermissionGuard 统一处理
 */
export const RequirePermissions = (...permissions: PermissionRequirement[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
