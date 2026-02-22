import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  GrantPermissionDto,
  BatchGrantPermissionDto,
  QueryUserPermissionDto,
  BatchGrantMultipleUsersDto,
  BatchRevokePermissionsDto,
} from './dto';

@Injectable()
export class UserPermissionService {
  private readonly logger = new Logger(UserPermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 授予权限给用户
   * BR-352: 权限授予记录规则
   */
  async grantPermission(grantDto: GrantPermissionDto & { grantedBy: string }) {
    try {
      // 验证用户存在
      const user = await this.prisma.user.findUnique({
        where: { id: grantDto.userId },
      });
      if (!user) {
        throw new NotFoundException(`用户 ID ${grantDto.userId} 不存在`);
      }

      // 验证权限定义存在
      const permission = await this.prisma.fineGrainedPermission.findUnique({
        where: { id: grantDto.fineGrainedPermissionId },
      });
      if (!permission) {
        throw new NotFoundException(`权限 ID ${grantDto.fineGrainedPermissionId} 不存在`);
      }

      // 检查是否已授予该权限
      const existing = await this.prisma.userPermission.findFirst({
        where: {
          userId: grantDto.userId,
          fineGrainedPermissionId: grantDto.fineGrainedPermissionId,
          resourceType: grantDto.resourceType || null,
          resourceId: grantDto.resourceId || null,
        },
      });

      if (existing) {
        throw new ConflictException(
          `用户已拥有该权限${grantDto.resourceType ? `（资源：${grantDto.resourceType}/${grantDto.resourceId}）` : ''}`,
        );
      }

      // 创建权限授予记录
      const userPermission = await this.prisma.userPermission.create({
        data: {
          userId: grantDto.userId,
          fineGrainedPermissionId: grantDto.fineGrainedPermissionId,
          grantedBy: grantDto.grantedBy,
          reason: grantDto.reason,
          resourceType: grantDto.resourceType,
          resourceId: grantDto.resourceId,
          expiresAt: grantDto.expiresAt ? new Date(grantDto.expiresAt) : null,
        },
        include: {
          user: {
            select: { id: true, username: true, name: true },
          },
          fineGrainedPermission: {
            select: { id: true, code: true, name: true },
          },
        },
      });

      // P1-12: 授权后发送通知给被授权用户
      try {
        await this.notificationService.create({
          userId: grantDto.userId,
          type: 'permission_granted',
          title: '您获得了新的权限',
          content: `管理员已授予您权限 [${permission.name}]${grantDto.expiresAt ? `，有效期至 ${new Date(grantDto.expiresAt).toLocaleDateString()}` : ''}`,
        });
      } catch {
        // 通知发送失败不影响主流程
      }

      return {
        success: true,
        data: userPermission,
        message: '权限授予成功',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`授予权限失败: ${error.message}`);
    }
  }

  /**
   * 撤销用户权限
   * P1-13: 撤销权限需验证操作者为原授权人或管理员
   */
  async revokePermission(userPermissionId: string, revokedBy?: string) {
    try {
      // 验证权限记录存在
      const userPermission = await this.prisma.userPermission.findUnique({
        where: { id: userPermissionId },
      });

      if (!userPermission) {
        throw new NotFoundException(`权限记录 ID ${userPermissionId} 不存在`);
      }

      // P1-13: 检查撤销权限 - 仅原授权人或管理员可撤销
      if (revokedBy) {
        const revoker = await this.prisma.user.findUnique({
          where: { id: revokedBy },
        });

        if (revoker && revoker.role !== 'admin' && userPermission.grantedBy !== revokedBy) {
          throw new ForbiddenException('仅原授权人或管理员可撤销此权限');
        }
      }

      // 删除权限记录
      await this.prisma.userPermission.delete({
        where: { id: userPermissionId },
      });

      return {
        success: true,
        message: '权限已撤销',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`撤销权限失败: ${error.message}`);
    }
  }

  /**
   * 批量授予权限
   */
  async batchGrantPermissions(batchDto: BatchGrantPermissionDto & { grantedBy: string }) {
    try {
      // 验证用户存在
      const user = await this.prisma.user.findUnique({
        where: { id: batchDto.userId },
      });
      if (!user) {
        throw new NotFoundException(`用户 ID ${batchDto.userId} 不存在`);
      }

      // 验证所有权限定义存在
      const permissions = await this.prisma.fineGrainedPermission.findMany({
        where: {
          id: { in: batchDto.fineGrainedPermissionIds },
        },
      });

      if (permissions.length !== batchDto.fineGrainedPermissionIds.length) {
        const foundIds = permissions.map((p) => p.id);
        const missingIds = batchDto.fineGrainedPermissionIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(`权限 ID ${missingIds.join(', ')} 不存在`);
      }

      // 使用事务批量创建权限记录
      const userPermissions = await this.prisma.$transaction(
        batchDto.fineGrainedPermissionIds.map((permId) =>
          this.prisma.userPermission.create({
            data: {
              userId: batchDto.userId,
              fineGrainedPermissionId: permId,
              grantedBy: batchDto.grantedBy,
              reason: batchDto.reason,
              expiresAt: batchDto.expiresAt ? new Date(batchDto.expiresAt) : null,
            },
            include: {
              fineGrainedPermission: {
                select: { id: true, code: true, name: true },
              },
            },
          }),
        ),
      );

      return {
        success: true,
        data: userPermissions,
        message: `成功授予 ${userPermissions.length} 个权限`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`批量授予权限失败: ${error.message}`);
    }
  }

  /**
   * 查询用户权限列表
   */
  async findUserPermissions(query: QueryUserPermissionDto) {
    try {
      const { userId, fineGrainedPermissionId, resourceType, resourceId, page = 1, limit = 10 } = query;

      const where: any = {};
      if (userId) where.userId = userId;
      if (fineGrainedPermissionId) where.fineGrainedPermissionId = fineGrainedPermissionId;
      if (resourceType) where.resourceType = resourceType;
      if (resourceId) where.resourceId = resourceId;

      const [items, total] = await Promise.all([
        this.prisma.userPermission.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: {
              select: { id: true, username: true, name: true },
            },
            fineGrainedPermission: {
              select: { id: true, code: true, name: true, category: true, scope: true },
            },
          },
          orderBy: { grantedAt: 'desc' },
        }),
        this.prisma.userPermission.count({ where }),
      ]);

      return {
        success: true,
        data: items,
        meta: {
          total,
          page,
          limit,
        },
      };
    } catch (error) {
      throw new BadRequestException(`查询用户权限失败: ${error.message}`);
    }
  }

  /**
   * 检查并移除过期权限
   * BR-353: 权限过期检查规则
   */
  async checkExpiration() {
    try {
      const now = new Date();

      // 查找所有过期的权限
      const expiredPermissions = await this.prisma.userPermission.findMany({
        where: {
          expiresAt: {
            lte: now,
          },
        },
        select: {
          id: true,
          user: {
            select: { username: true },
          },
          fineGrainedPermission: {
            select: { code: true },
          },
        },
      });

      // 删除过期权限
      for (const perm of expiredPermissions) {
        await this.prisma.userPermission.delete({
          where: { id: perm.id },
        });
      }

      return {
        success: true,
        data: {
          removedCount: expiredPermissions.length,
          expiredPermissions,
        },
        message: `已移除 ${expiredPermissions.length} 个过期权限`,
      };
    } catch (error) {
      throw new BadRequestException(`权限过期检查失败: ${error.message}`);
    }
  }

  /**
   * P1-9: 权限过期检查定时任务
   * 每日凌晨 1 点自动检查并清理过期权限
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handlePermissionExpiryCheck() {
    try {
      const result = await this.checkExpiration();
      if (result.data.removedCount > 0) {
        this.logger.log(`定时权限过期检查: 移除 ${result.data.removedCount} 个过期权限`);
      }
    } catch (error) {
      this.logger.error(`定时权限过期检查失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取用户的有效权限（直接授予 + 角色继承）
   * BR-358: 权限继承规则
   * BR-359: 权限合并规则
   *
   * TODO: 当前 Prisma Schema 中 RolePermission 链接到旧的 Permission 模型
   * 需要创建 RoleFineGrainedPermission 模型来支持细粒度权限继承
   * 当前仅返回直接授予的权限
   */
  async getEffectivePermissions(userId: string) {
    const user: any = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        // 直接授予的权限（未过期）
        userPermissions: {
          where: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          include: {
            fineGrainedPermission: true,
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    // 提取直接权限
    const directPermissions = user.userPermissions.map((up: any) => up.fineGrainedPermission);

    // TODO: 角色继承需要 RoleFineGrainedPermission 映射表
    // 当前仅返回直接授予的权限
    return this.deduplicatePermissions(directPermissions);
  }

  /**
   * 检查用户是否拥有权限（含继承）
   * BR-358: 权限继承规则
   */
  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const effectivePermissions = await this.getEffectivePermissions(userId);
    return effectivePermissions.some((p) => p.code === permissionCode);
  }

  /**
   * 获取用户通过角色继承的权限
   * BR-358: 权限继承规则
   *
   * TODO: 需要在 Prisma Schema 中添加 RoleFineGrainedPermission 模型
   */
  async getInheritedPermissions(userId: string) {
    // TODO: 需要 RoleFineGrainedPermission 映射表
    // 当前角色系统使用旧的 Permission 模型（resource/action）
    // 返回空数组直到 schema 更新
    return [];
  }

  /**
   * 权限去重辅助方法
   * BR-359: 权限合并规则 - 相同权限只保留一个
   */
  private deduplicatePermissions(permissions: any[]) {
    const seen = new Set<string>();
    return permissions.filter((permission) => {
      if (seen.has(permission.code)) {
        return false;
      }
      seen.add(permission.code);
      return true;
    });
  }

  /**
   * 批量授予权限给多个用户
   * BR-360: 批量授权规则
   */
  async batchGrantMultipleUsers(batchDto: BatchGrantMultipleUsersDto & { grantedBy: string }) {
    try {
      // 验证所有用户存在
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: batchDto.userIds },
        },
      });

      const foundUserIds = users.map((u) => u.id);
      const missingUserIds = batchDto.userIds.filter((id) => !foundUserIds.includes(id));

      // 验证所有权限定义存在
      const permissions = await this.prisma.fineGrainedPermission.findMany({
        where: {
          id: { in: batchDto.fineGrainedPermissionIds },
        },
      });

      const foundPermIds = permissions.map((p) => p.id);
      const missingPermIds = batchDto.fineGrainedPermissionIds.filter((id) => !foundPermIds.includes(id));

      // 构建详细结果数组
      const details: Array<{
        userId: string;
        permissionId: string;
        status: 'success' | 'failed';
        error?: string;
      }> = [];

      // 为每个有效的用户-权限组合创建授权记录
      const createPromises: Promise<any>[] = [];
      for (const userId of foundUserIds) {
        for (const permissionId of foundPermIds) {
          createPromises.push(
            this.prisma.userPermission
              .create({
                data: {
                  userId,
                  fineGrainedPermissionId: permissionId,
                  grantedBy: batchDto.grantedBy,
                  reason: batchDto.reason,
                  expiresAt: batchDto.expiresAt ? new Date(batchDto.expiresAt) : null,
                },
              })
              .then(() => {
                details.push({ userId, permissionId, status: 'success' });
              })
              .catch((error) => {
                details.push({
                  userId,
                  permissionId,
                  status: 'failed',
                  error: error.message,
                });
              }),
          );
        }
      }

      // 为不存在的用户记录失败
      for (const userId of missingUserIds) {
        for (const permissionId of batchDto.fineGrainedPermissionIds) {
          details.push({
            userId,
            permissionId,
            status: 'failed',
            error: '用户不存在',
          });
        }
      }

      // 为不存在的权限记录失败
      for (const userId of foundUserIds) {
        for (const permissionId of missingPermIds) {
          details.push({
            userId,
            permissionId,
            status: 'failed',
            error: '权限不存在',
          });
        }
      }

      // 等待所有创建操作完成
      await Promise.all(createPromises);

      const successCount = details.filter((d) => d.status === 'success').length;
      const failedCount = details.filter((d) => d.status === 'failed').length;

      return {
        success: true,
        data: {
          success: successCount,
          failed: failedCount,
          details,
        },
      };
    } catch (error) {
      throw new BadRequestException(`批量授予权限失败: ${error.message}`);
    }
  }

  /**
   * 批量撤销权限
   * BR-360: 批量授权规则
   */
  async batchRevokePermissions(batchDto: BatchRevokePermissionsDto) {
    try {
      // 验证所有权限记录存在
      const userPermissions = await this.prisma.userPermission.findMany({
        where: {
          id: { in: batchDto.userPermissionIds },
        },
      });

      const foundIds = userPermissions.map((up) => up.id);
      const missingIds = batchDto.userPermissionIds.filter((id) => !foundIds.includes(id));

      // 构建详细结果数组
      const details: Array<{
        userPermissionId: string;
        status: 'success' | 'failed';
        error?: string;
      }> = [];

      // 删除存在的权限记录
      const deletePromises = foundIds.map((id) =>
        this.prisma.userPermission
          .delete({
            where: { id },
          })
          .then(() => {
            details.push({ userPermissionId: id, status: 'success' });
          })
          .catch((error) => {
            details.push({
              userPermissionId: id,
              status: 'failed',
              error: error.message,
            });
          }),
      );

      // 记录不存在的权限
      for (const id of missingIds) {
        details.push({
          userPermissionId: id,
          status: 'failed',
          error: '权限记录不存在',
        });
      }

      // 等待所有删除操作完成
      await Promise.all(deletePromises);

      const successCount = details.filter((d) => d.status === 'success').length;
      const failedCount = details.filter((d) => d.status === 'failed').length;

      return {
        success: true,
        data: {
          success: successCount,
          failed: failedCount,
          details,
        },
      };
    } catch (error) {
      throw new BadRequestException(`批量撤销权限失败: ${error.message}`);
    }
  }
}
