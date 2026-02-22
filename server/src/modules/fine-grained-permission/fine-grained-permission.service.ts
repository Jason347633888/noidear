import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateFineGrainedPermissionDto,
  UpdateFineGrainedPermissionDto,
  QueryFineGrainedPermissionDto,
  PermissionStatus,
} from './dto/fine-grained-permission.dto';

export interface PermissionMatrixItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

@Injectable()
export class FineGrainedPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询所有细粒度权限定义
   * TASK-237: GET /api/v1/fine-grained-permissions
   */
  async findAll(query: QueryFineGrainedPermissionDto) {
    try {
      const where: any = {};

      if (query.category) {
        where.category = query.category;
      }

      if (query.scope) {
        where.scope = query.scope;
      }

      if (query.status) {
        where.status = query.status;
      }

      const permissions = await this.prisma.fineGrainedPermission.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { scope: 'asc' },
          { code: 'asc' },
        ],
      });

      return {
        success: true,
        data: permissions,
        meta: {
          total: permissions.length,
        },
      };
    } catch (error) {
      throw new BadRequestException(`查询权限定义失败: ${error.message}`);
    }
  }

  /**
   * 查询权限详情
   * TASK-237: GET /api/v1/fine-grained-permissions/:id
   */
  async findOne(id: string) {
    try {
      const permission = await this.prisma.fineGrainedPermission.findUnique({
        where: { id },
      });

      if (!permission) {
        throw new NotFoundException(`权限 ID ${id} 不存在`);
      }

      return {
        success: true,
        data: permission,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`查询权限详情失败: ${error.message}`);
    }
  }

  /**
   * 创建细粒度权限定义
   * TASK-237: POST /api/v1/fine-grained-permissions
   */
  async create(createDto: CreateFineGrainedPermissionDto) {
    try {
      // 检查权限编码是否已存在
      const existing = await this.prisma.fineGrainedPermission.findUnique({
        where: { code: createDto.code },
      });

      if (existing) {
        throw new ConflictException(`权限编码 ${createDto.code} 已存在`);
      }

      const permission = await this.prisma.fineGrainedPermission.create({
        data: {
          ...createDto,
          status: PermissionStatus.ACTIVE,
        },
      });

      return {
        success: true,
        data: permission,
        message: '权限定义创建成功',
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`创建权限定义失败: ${error.message}`);
    }
  }

  /**
   * 更新细粒度权限定义
   * TASK-237: PUT /api/v1/fine-grained-permissions/:id
   */
  async update(id: string, updateDto: UpdateFineGrainedPermissionDto) {
    try {
      // 检查权限是否存在
      const existing = await this.prisma.fineGrainedPermission.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`权限 ID ${id} 不存在`);
      }

      const permission = await this.prisma.fineGrainedPermission.update({
        where: { id },
        data: updateDto,
      });

      return {
        success: true,
        data: permission,
        message: '权限定义更新成功',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`更新权限定义失败: ${error.message}`);
    }
  }

  /**
   * 停用权限
   * TASK-237: PUT /api/v1/fine-grained-permissions/:id/disable
   */
  async disable(id: string) {
    try {
      const existing = await this.prisma.fineGrainedPermission.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`权限 ID ${id} 不存在`);
      }

      const permission = await this.prisma.fineGrainedPermission.update({
        where: { id },
        data: { status: PermissionStatus.INACTIVE },
      });

      return {
        success: true,
        data: permission,
        message: '权限已停用',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`停用权限失败: ${error.message}`);
    }
  }

  /**
   * 启用权限
   * PUT /api/v1/fine-grained-permissions/:id/enable
   */
  async enable(id: string) {
    try {
      const existing = await this.prisma.fineGrainedPermission.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`权限 ID ${id} 不存在`);
      }

      const permission = await this.prisma.fineGrainedPermission.update({
        where: { id },
        data: { status: PermissionStatus.ACTIVE },
      });

      return {
        success: true,
        data: permission,
        message: '权限已启用',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`启用权限失败: ${error.message}`);
    }
  }

  /**
   * 删除权限定义（若已分配用户则拒绝）
   * DELETE /api/v1/fine-grained-permissions/:id
   */
  async remove(id: string) {
    try {
      const existing = await this.prisma.fineGrainedPermission.findUnique({
        where: { id },
        include: {
          _count: { select: { userPermissions: true } },
        },
      });

      if (!existing) {
        throw new NotFoundException(`权限 ID ${id} 不存在`);
      }

      if (existing._count.userPermissions > 0) {
        throw new ForbiddenException(
          `该权限已分配给 ${existing._count.userPermissions} 个用户，无法删除。请先撤销所有用户的该权限。`,
        );
      }

      await this.prisma.fineGrainedPermission.delete({ where: { id } });

      return {
        success: true,
        message: '权限定义已删除',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException(`删除权限定义失败: ${error.message}`);
    }
  }

  /**
   * 获取资源-操作权限矩阵
   * GET /api/v1/fine-grained-permissions/matrix/resource-action
   *
   * 返回按 category（资源类型）和 scope 分组的权限矩阵
   */
  async getPermissionMatrix() {
    try {
      const permissions = await this.prisma.fineGrainedPermission.findMany({
        where: { status: PermissionStatus.ACTIVE },
        orderBy: [{ category: 'asc' }, { scope: 'asc' }, { code: 'asc' }],
      });

      // 按 category 分组构建矩阵
      const matrix: Record<string, Record<string, PermissionMatrixItem[]>> = {};

      for (const perm of permissions) {
        if (!matrix[perm.category]) {
          matrix[perm.category] = {};
        }
        if (!matrix[perm.category][perm.scope]) {
          matrix[perm.category][perm.scope] = [];
        }
        matrix[perm.category][perm.scope].push({
          id: perm.id,
          code: perm.code,
          name: perm.name,
          description: perm.description,
        });
      }

      return {
        success: true,
        data: {
          matrix,
          totalPermissions: permissions.length,
          categories: Object.keys(matrix),
        },
      };
    } catch (error) {
      throw new BadRequestException(`获取权限矩阵失败: ${error.message}`);
    }
  }

  /**
   * 获取角色已绑定的细粒度权限列表
   * Critical 2: GET /api/v1/fine-grained-permissions/role/:roleId
   *
   * 直接查询 RoleFineGrainedPermission 中间表获取该角色已绑定的权限。
   * 返回所有权限定义，并标注该角色是否已绑定。
   */
  async getRolePermissions(roleId: string) {
    try {
      const role = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        throw new NotFoundException(`角色 ID ${roleId} 不存在`);
      }

      // 直接查询 RoleFineGrainedPermission 中间表
      const rolePerms = await this.prisma.roleFineGrainedPermission.findMany({
        where: { roleId, allowed: true },
        select: { resource: true, action: true },
      });

      // 构建已绑定的权限 code 集合（格式: resource:action）
      const assignedCodes = new Set(rolePerms.map((rp) => `${rp.resource}:${rp.action}`));

      // 返回所有权限定义，并标注是否已绑定到该角色
      const allPermissions = await this.prisma.fineGrainedPermission.findMany({
        where: { status: PermissionStatus.ACTIVE },
        orderBy: [{ category: 'asc' }, { scope: 'asc' }, { code: 'asc' }],
      });

      return {
        success: true,
        data: {
          roleId,
          roleName: role.name,
          permissions: allPermissions.map((p) => ({
            ...p,
            assigned: assignedCodes.has(p.code),
          })),
          assignedCount: assignedCodes.size,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`获取角色权限失败: ${error.message}`);
    }
  }

  /**
   * 批量保存角色的细粒度权限配置
   * Critical 2: PUT /api/v1/fine-grained-permissions/role/:roleId
   *
   * 传入权限 ID 数组，先清空该角色在 RoleFineGrainedPermission 的旧记录，
   * 再批量写入新记录（使用 Prisma transaction）。
   *
   * @param roleId 角色 ID
   * @param permissionIds 权限 ID 数组
   * @param operatorId 操作人 ID（从请求上下文获取）
   */
  async saveRolePermissions(roleId: string, permissionIds: string[], operatorId: string) {
    try {
      const role = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        throw new NotFoundException(`角色 ID ${roleId} 不存在`);
      }

      // 验证所有权限 ID 存在且处于激活状态
      const validPerms = await this.prisma.fineGrainedPermission.findMany({
        where: { id: { in: permissionIds }, status: PermissionStatus.ACTIVE },
        select: { id: true, code: true },
      });

      if (validPerms.length !== permissionIds.length) {
        const foundIds = validPerms.map((p) => p.id);
        const missing = permissionIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(`以下权限 ID 不存在或已停用: ${missing.join(', ')}`);
      }

      await this.prisma.$transaction(async (tx) => {
        // 清空该角色在 RoleFineGrainedPermission 中的旧记录
        await tx.roleFineGrainedPermission.deleteMany({
          where: { roleId },
        });

        // 批量写入新记录（解析 code 为 resource 和 action）
        if (validPerms.length > 0) {
          const createData = validPerms.map((perm) => {
            const [resource, ...actionParts] = perm.code.split(':');
            const action = actionParts.join(':') || perm.code;
            return {
              roleId,
              resource,
              action,
              allowed: true,
              grantedBy: operatorId,
            };
          });

          await tx.roleFineGrainedPermission.createMany({
            data: createData,
            skipDuplicates: true,
          });
        }
      });

      return {
        success: true,
        data: {
          roleId,
          roleName: role.name,
          permissionIds,
        },
        message: `角色权限配置已更新，共 ${permissionIds.length} 条权限`,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`保存角色权限失败: ${error.message}`);
    }
  }
}
