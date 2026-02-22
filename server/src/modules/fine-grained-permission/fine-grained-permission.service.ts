import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateFineGrainedPermissionDto,
  UpdateFineGrainedPermissionDto,
  QueryFineGrainedPermissionDto,
  PermissionStatus,
} from './dto/fine-grained-permission.dto';

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
}
