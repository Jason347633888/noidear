import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryRoleDto } from './dto/query-role.dto';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';

// 系统保留角色（不可创建/修改/删除）
const SYSTEM_ROLE_BASELINE = [
  { code: 'admin', name: '系统管理员', description: '系统内置管理员角色' },
  { code: 'leader', name: '部门负责人', description: '系统内置部门负责人角色' },
  { code: 'user', name: '普通用户', description: '系统内置普通用户角色' },
] as const;
const SYSTEM_ROLES: string[] = SYSTEM_ROLE_BASELINE.map((role) => role.code);

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private async ensureSystemRoles() {
    await this.prisma.role.updateMany({
      where: {
        code: { in: [...SYSTEM_ROLES] },
        deletedAt: { not: null },
      },
      data: { deletedAt: null },
    });

    await this.prisma.role.createMany({
      data: SYSTEM_ROLE_BASELINE.map((role) => ({
        id: role.code,
        code: role.code,
        name: role.name,
        description: role.description,
      })),
      skipDuplicates: true,
    });
  }

  async findAll(query: QueryRoleDto) {
    try {
      await this.ensureSystemRoles();
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
        list: roles,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
      });

      if (!role) {
        throw new NotFoundException('角色不存在');
      }

      return role;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('查询角色详情失败');
    }
  }
}
