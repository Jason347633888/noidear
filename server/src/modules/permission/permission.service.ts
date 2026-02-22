import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { QueryPermissionDto } from './dto/query-permission.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDto) {
    try {
      const existingPermission = await this.prisma.permission.findUnique({
        where: {
          resource_action: {
            resource: dto.resource,
            action: dto.action,
          },
        },
      });

      if (existingPermission) {
        throw new ConflictException(`权限 ${dto.resource}:${dto.action} 已存在`);
      }

      const permission = await this.prisma.permission.create({
        data: {
          id: nanoid(),
          resource: dto.resource,
          action: dto.action,
          description: dto.description,
        },
      });

      return {
        success: true,
        data: permission,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('创建权限失败');
    }
  }

  async findAll(query: QueryPermissionDto) {
    try {
      const { page = 1, limit = 10, resource, keyword } = query;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (resource) {
        where.resource = resource;
      }

      if (keyword) {
        where.OR = [
          { resource: { contains: keyword, mode: 'insensitive' } },
          { action: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ];
      }

      const [permissions, total] = await Promise.all([
        this.prisma.permission.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ resource: 'asc' }, { action: 'asc' }],
        }),
        this.prisma.permission.count({ where }),
      ]);

      return {
        success: true,
        data: permissions,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException('查询权限列表失败');
    }
  }

  async findOne(id: string) {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!permission) {
        throw new NotFoundException('权限不存在');
      }

      return {
        success: true,
        data: permission,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('查询权限详情失败');
    }
  }

  async update(id: string, dto: UpdatePermissionDto) {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!permission) {
        throw new NotFoundException('权限不存在');
      }

      const updatedPermission = await this.prisma.permission.update({
        where: { id },
        data: {
          description: dto.description,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        data: updatedPermission,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('更新权限失败');
    }
  }

  async remove(id: string) {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!permission) {
        throw new NotFoundException('权限不存在');
      }

      const rolesCount = await this.prisma.rolePermission.count({
        where: { permissionId: id },
      });

      if (rolesCount > 0) {
        throw new BadRequestException(`权限正在被 ${rolesCount} 个角色使用，无法删除`);
      }

      await this.prisma.permission.delete({
        where: { id },
      });

      return {
        success: true,
        message: '删除权限成功',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除权限失败');
    }
  }
}
