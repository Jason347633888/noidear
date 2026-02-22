import { Injectable, ConflictException, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { nanoid } from 'nanoid';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';

// 系统保留角色（不可创建/修改/删除）
const SYSTEM_ROLES = ['admin', 'leader', 'user'];

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(dto: CreateRoleDto) {
    try {
      // 系统角色保护：禁止创建系统保留角色
      if (SYSTEM_ROLES.includes(dto.code)) {
        throw new BadRequestException(`系统保留角色 ${dto.code} 不可创建`);
      }

      // 检查角色代码是否已存在
      const existingRole = await this.prisma.role.findUnique({
        where: { code: dto.code },
      });

      if (existingRole && !existingRole.deletedAt) {
        throw new ConflictException(`角色代码 ${dto.code} 已存在`);
      }

      // 如果存在已删除的角色，先永久删除
      if (existingRole && existingRole.deletedAt) {
        await this.prisma.role.delete({
          where: { id: existingRole.id },
        });
      }

      // 创建新角色
      const role = await this.prisma.role.create({
        data: {
          id: nanoid(),
          code: dto.code,
          name: dto.name,
          description: dto.description,
        },
      });

      return {
        success: true,
        data: role,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('创建角色失败');
    }
  }

  async findAll(query: QueryRoleDto) {
    try {
      const { page = 1, limit = 10, keyword } = query;
      const skip = (page - 1) * limit;

      const where: any = {
        deletedAt: null,
      };

      // 关键词搜索
      if (keyword) {
        where.OR = [
          { code: { contains: keyword, mode: 'insensitive' } },
          { name: { contains: keyword, mode: 'insensitive' } },
        ];
      }

      const [roles, total] = await Promise.all([
        this.prisma.role.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.role.count({ where }),
      ]);

      return {
        success: true,
        data: roles,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException('查询角色列表失败');
    }
  }

  async findOne(id: string) {
    try {
      const role = await this.prisma.role.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!role) {
        throw new NotFoundException('角色不存在');
      }

      return {
        success: true,
        data: role,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('查询角色详情失败');
    }
  }

  async update(id: string, dto: UpdateRoleDto) {
    try {
      // 检查角色是否存在
      const role = await this.prisma.role.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!role) {
        throw new NotFoundException('角色不存在');
      }

      // 系统角色保护：禁止修改系统保留角色
      if (SYSTEM_ROLES.includes(role.code)) {
        throw new BadRequestException(`系统保留角色 ${role.code} 不可修改`);
      }

      // 更新角色
      const updatedRole = await this.prisma.role.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        data: updatedRole,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('更新角色失败');
    }
  }

  async remove(id: string) {
    try {
      // 检查角色是否存在
      const role = await this.prisma.role.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!role) {
        throw new NotFoundException('角色不存在');
      }

      // 系统角色保护：禁止删除系统保留角色
      if (SYSTEM_ROLES.includes(role.code)) {
        throw new BadRequestException(`系统保留角色 ${role.code} 不可删除`);
      }

      // 检查角色是否被用户使用
      const usersCount = await this.prisma.user.count({
        where: {
          roleId: id,
          deletedAt: null,
        },
      });

      if (usersCount > 0) {
        throw new BadRequestException(`角色正在被 ${usersCount} 个用户使用，无法删除`);
      }

      // 软删除角色
      await this.prisma.role.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      return {
        success: true,
        message: '删除角色成功',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除角色失败');
    }
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    try {
      const role = await this.prisma.role.findFirst({
        where: { id: roleId, deletedAt: null },
      });

      if (!role) {
        throw new NotFoundException('角色不存在');
      }

      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: dto.permissionIds } },
      });

      if (permissions.length !== dto.permissionIds.length) {
        throw new BadRequestException('部分权限ID不存在');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            id: nanoid(),
            roleId,
            permissionId,
          })),
          skipDuplicates: true,
        });
      });

      await this.clearUserPermissionsCache(roleId);

      return {
        success: true,
        message: '权限分配成功',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('权限分配失败');
    }
  }

  async revokePermission(roleId: string, permissionId: string) {
    try {
      const role = await this.prisma.role.findFirst({
        where: { id: roleId, deletedAt: null },
      });

      if (!role) {
        throw new NotFoundException('角色不存在');
      }

      const rolePermission = await this.prisma.rolePermission.findFirst({
        where: { roleId, permissionId },
      });

      if (!rolePermission) {
        throw new NotFoundException('角色权限关联不存在');
      }

      await this.prisma.rolePermission.delete({
        where: { id: rolePermission.id },
      });

      await this.clearUserPermissionsCache(roleId);

      return {
        success: true,
        message: '权限撤销成功',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('权限撤销失败');
    }
  }

  async getRolePermissions(roleId: string) {
    try {
      const role = await this.prisma.role.findFirst({
        where: { id: roleId, deletedAt: null },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!role) {
        throw new NotFoundException('角色不存在');
      }

      const permissions = role.permissions.map((rp) => rp.permission);

      return {
        success: true,
        data: permissions,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('查询角色权限失败');
    }
  }

  private async clearUserPermissionsCache(roleId: string) {
    try {
      const users = await this.prisma.user.findMany({
        where: { roleId, deletedAt: null },
        select: { id: true },
      });

      const keys = users.map((user) => `permissions:user:${user.id}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`清理 ${keys.length} 个用户权限缓存: roleId=${roleId}`);
      }
    } catch (error) {
      this.logger.error(
        `清理用户权限缓存失败: roleId=${roleId}, error=${error.message}`,
        error.stack,
      );
    }
  }
}
