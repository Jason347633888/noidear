import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 部门权限检查服务
 *
 * 业务规则：
 * - BR-356: 部门边界规则
 * - BR-357: 跨部门权限验证规则
 */
@Injectable()
export class DepartmentPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 检查用户是否有权访问指定部门的资源
   *
   * BR-356: 部门边界规则
   * - 用户默认只能访问本部门资源
   * - 拥有 scope: 'cross_department' 权限可跨部门访问
   * - 拥有 scope: 'global' 权限可访问所有部门
   *
   * @param userId 用户 ID
   * @param departmentId 目标部门 ID
   * @param action 操作类型 ('view', 'edit', 'delete')
   * @param resourceType 资源类型 ('document', 'record', 'task')
   * @returns 是否有权访问
   */
  async canAccessDepartmentResource(
    userId: string,
    departmentId: string,
    action: string,
    resourceType: string,
  ): Promise<boolean> {
    // 获取用户所属部门
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!user) {
      return false;
    }

    // 如果是本部门资源，允许访问
    if (user.departmentId === departmentId) {
      return true;
    }

    // 检查是否有跨部门或全局权限
    const permissions = await this.prisma.userPermission.findMany({
      where: {
        userId,
        fineGrainedPermission: {
          category: resourceType,
          scope: {
            in: ['cross_department', 'global'],
          },
        },
      },
      include: {
        fineGrainedPermission: true,
      },
    });

    // 过滤掉已过期的权限（BR-354）
    const now = new Date();
    const validPermissions = permissions.filter(
      (up) => !up.expiresAt || new Date(up.expiresAt) > now,
    );

    // 检查是否有匹配的跨部门或全局权限
    return validPermissions.some((up) => {
      const scope = up.fineGrainedPermission.scope;
      return (
        scope === 'cross_department' ||
        scope === 'global'
      );
    });
  }

  /**
   * 检查用户是否有跨部门权限
   *
   * BR-357: 跨部门权限验证规则
   * - 跨部门查看：需要 view:cross_department:* 权限
   * - 跨部门编辑：需要 edit:cross_department:* 权限
   * - 跨部门删除：需要 delete:cross_department:* 权限
   *
   * @param userId 用户 ID
   * @param permissionCode 权限代码（如 'view:cross_department:document'）
   * @returns 是否拥有该权限
   */
  async hasCrossDepartmentPermission(
    userId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const permissions = await this.prisma.userPermission.findMany({
      where: {
        userId,
        fineGrainedPermission: {
          code: permissionCode,
        },
      },
      include: {
        fineGrainedPermission: true,
      },
    });

    // 过滤掉已过期的权限
    const now = new Date();
    const validPermissions = permissions.filter(
      (up) => !up.expiresAt || new Date(up.expiresAt) > now,
    );

    return validPermissions.length > 0;
  }

  /**
   * 获取用户可访问的部门列表
   *
   * BR-356: 部门边界规则
   * - 默认返回用户本部门
   * - 有跨部门权限时返回所有部门
   * - 有全局权限时返回所有部门
   *
   * @param userId 用户 ID
   * @param resourceType 资源类型 ('document', 'record', 'task')
   * @returns 可访问的部门 ID 列表
   */
  async getAccessibleDepartments(
    userId: string,
    resourceType: string,
  ): Promise<string[]> {
    // 获取用户所属部门
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!user || !user.departmentId) {
      return [];
    }

    // 检查是否有跨部门或全局权限
    const permissions = await this.prisma.userPermission.findMany({
      where: {
        userId,
        fineGrainedPermission: {
          category: resourceType,
          scope: {
            in: ['cross_department', 'global'],
          },
        },
      },
      include: {
        fineGrainedPermission: true,
      },
    });

    // 过滤掉已过期的权限
    const now = new Date();
    const validPermissions = permissions.filter(
      (up) => !up.expiresAt || new Date(up.expiresAt) > now,
    );

    // 如果有跨部门或全局权限，返回所有部门
    const hasCrossDepartmentOrGlobal = validPermissions.some(
      (up) =>
        up.fineGrainedPermission.scope === 'cross_department' ||
        up.fineGrainedPermission.scope === 'global',
    );

    if (hasCrossDepartmentOrGlobal) {
      const allDepartments = await this.prisma.department.findMany({
        select: { id: true },
      });
      return allDepartments.map((dept) => dept.id);
    }

    // 默认只返回用户本部门
    return [user.departmentId];
  }
}
