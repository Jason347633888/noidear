import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPermissionService } from '../../modules/user-permission/user-permission.service';
import { RedisService } from '../../modules/redis/redis.service';

/**
 * 细粒度权限检查守卫
 *
 * 支持的装饰器：
 * - @CheckPermission(code) - 单个权限
 * - @CheckPermissions(codes) - 多个权限 AND 逻辑
 * - @CheckAnyPermission(codes) - 多个权限 OR 逻辑
 * - @Resource(type, idParam) - 资源级别权限
 *
 * P2-20: 使用 Redis 缓存用户权限（TTL 300秒）
 *
 * 使用示例：
 * @example
 * // 单个权限检查
 * @UseGuards(PermissionGuard)
 * @CheckPermission('document:read')
 * getDocument() { }
 *
 * // 多个权限检查（AND 逻辑）
 * @UseGuards(PermissionGuard)
 * @CheckPermissions(['document:read', 'document:write'])
 * updateDocument() { }
 *
 * // 多个权限检查（OR 逻辑）
 * @UseGuards(PermissionGuard)
 * @CheckAnyPermission(['document:read', 'document:admin'])
 * viewDocument() { }
 *
 * // 资源级别权限检查
 * @UseGuards(PermissionGuard)
 * @CheckPermission('document:delete')
 * @Resource('document', 'id')
 * deleteDocument(@Param('id') id: string) { }
 *
 * 业务规则：
 * - BR-354: 权限检查规则（过期权限无效）
 * - BR-355: 资源级别权限规则
 * - Admin 角色（role='admin'）自动通过所有权限检查
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private static readonly CACHE_PREFIX = 'user_permissions:';
  private static readonly CACHE_TTL = 300; // 5 分钟缓存

  constructor(
    private reflector: Reflector,
    private userPermissionService: UserPermissionService,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 从装饰器获取所需权限（P1-10: 统一元数据 key）
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      'requiredPermission',
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'requiredPermissions',
      [context.getHandler(), context.getClass()],
    );

    const requiredAnyPermissions = this.reflector.getAllAndOverride<string[]>(
      'requiredAnyPermissions',
      [context.getHandler(), context.getClass()],
    );

    const resourceMeta = this.reflector.getAllAndOverride<{
      type: string;
      idParam: string;
    }>('resource', [context.getHandler(), context.getClass()]);

    // P1-10: 兼容 @RequirePermissions 装饰器（key='permissions'）
    const legacyPermissions = this.reflector.getAllAndOverride<
      Array<{ resource: string; action: string }>
    >('permissions', [context.getHandler(), context.getClass()]);

    // 如果没有任何权限装饰器，允许通过
    if (
      !requiredPermission &&
      !requiredPermissions &&
      !requiredAnyPermissions &&
      !legacyPermissions
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('未登录');
    }

    // 管理员跳过权限检查
    if (user.role === 'admin') {
      return true;
    }

    // P2-20: 从 Redis 缓存获取用户权限
    const userPermissions = await this.getCachedPermissions(user.id);

    // 过滤掉过期权限（BR-354）
    const now = new Date();
    const validPermissions = userPermissions.filter(
      (up: any) => !up.expiresAt || new Date(up.expiresAt) > now,
    );

    // 检查单个权限
    if (requiredPermission) {
      const hasPermission = this.checkPermission(
        validPermissions,
        requiredPermission,
        resourceMeta,
        request.params,
      );
      if (!hasPermission) {
        throw new UnauthorizedException(
          `缺少权限: ${requiredPermission}`,
        );
      }
    }

    // 检查多个权限（AND 逻辑）
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((code) =>
        this.checkPermission(
          validPermissions,
          code,
          resourceMeta,
          request.params,
        ),
      );
      if (!hasAllPermissions) {
        throw new UnauthorizedException(
          `缺少权限: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    // 检查多个权限（OR 逻辑）
    if (requiredAnyPermissions && requiredAnyPermissions.length > 0) {
      const hasAnyPermission = requiredAnyPermissions.some((code) =>
        this.checkPermission(
          validPermissions,
          code,
          resourceMeta,
          request.params,
        ),
      );
      if (!hasAnyPermission) {
        throw new UnauthorizedException(
          `缺少以下任一权限: ${requiredAnyPermissions.join(', ')}`,
        );
      }
    }

    // P1-10: 兼容 @RequirePermissions 装饰器（resource:action 格式）
    if (legacyPermissions && legacyPermissions.length > 0) {
      const hasAllLegacy = legacyPermissions.every((perm) => {
        const code = `${perm.resource}:${perm.action}`;
        return this.checkPermission(
          validPermissions,
          code,
          resourceMeta,
          request.params,
        );
      });
      if (!hasAllLegacy) {
        const required = legacyPermissions
          .map((p) => `${p.resource}:${p.action}`)
          .join(', ');
        throw new UnauthorizedException(`缺少权限: ${required}`);
      }
    }

    return true;
  }

  /**
   * 检查用户是否拥有指定权限
   * @param userPermissions 用户权限列表
   * @param requiredCode 所需权限代码
   * @param resourceMeta 资源元数据（可选）
   * @param params 请求参数（用于资源 ID）
   */
  private checkPermission(
    userPermissions: any[],
    requiredCode: string,
    resourceMeta?: { type: string; idParam: string },
    params?: any,
  ): boolean {
    // 查找匹配的权限
    const matchingPermissions = userPermissions.filter(
      (up) => up.fineGrainedPermission.code === requiredCode,
    );

    if (matchingPermissions.length === 0) {
      return false;
    }

    // 如果没有资源级别要求，任意匹配即可
    if (!resourceMeta) {
      return true;
    }

    // BR-355: 资源级别权限检查
    const resourceId = params?.[resourceMeta.idParam];

    return matchingPermissions.some((up) => {
      // 全局权限（无资源限制）
      if (!up.resourceType && !up.resourceId) {
        return true;
      }

      // 资源类型匹配 + 资源 ID 匹配
      return (
        up.resourceType === resourceMeta.type && up.resourceId === resourceId
      );
    });
  }

  /**
   * P2-20: 从 Redis 缓存获取用户权限
   * TTL 300 秒（5 分钟），减少数据库查询
   */
  private async getCachedPermissions(userId: string): Promise<any[]> {
    const cacheKey = `${PermissionGuard.CACHE_PREFIX}${userId}`;

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Redis 不可用时直接查数据库
    }

    // 缓存未命中，查询数据库
    const result = await this.userPermissionService.findUserPermissions({
      userId,
    });

    const permissions = result?.data || [];

    // 写入缓存
    try {
      await this.redisService.setex(
        cacheKey,
        PermissionGuard.CACHE_TTL,
        JSON.stringify(permissions),
      );
    } catch {
      // Redis 写入失败不影响功能
    }

    return permissions;
  }
}
