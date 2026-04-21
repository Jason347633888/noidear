import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPermissionService } from '../user-permission/user-permission.service';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * 细粒度权限装饰器
 * 使用示例：@RequirePermission('view:cross_department:document')
 */
export const RequirePermission = (permissionCode: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissionCode);

/**
 * 细粒度权限拦截守卫
 * 检查用户是否拥有所需细粒度权限（含角色继承）
 * 无权限时返回 403
 */
@Injectable()
export class FineGrainedPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userPermissionService: UserPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionCode = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 若路由未标注 @RequirePermission，直接放行
    if (!permissionCode) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('未登录，无法访问受保护资源');
    }

    const hasPermission = await this.userPermissionService.hasPermission(
      user.id,
      permissionCode,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `缺少权限 [${permissionCode}]，无法访问该资源`,
      );
    }

    return true;
  }
}
