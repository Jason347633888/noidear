import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDTO } from './dto/create-department.dto';
import { UpdateDepartmentDTO } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  private readonly departmentInclude = {
    manager: {
      select: {
        id: true,
        username: true,
        name: true,
        status: true,
        roleId: true,
        roleObj: { select: { id: true, code: true, name: true } },
      },
    },
  };

  async findAll(limit = 100) {
    const [list, total] = await Promise.all([
      this.prisma.department.findMany({
        where: { deletedAt: null },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.departmentInclude,
      }),
      this.prisma.department.count({ where: { deletedAt: null } }),
    ]);
    return { list, total };
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id, deletedAt: null },
      include: this.departmentInclude,
    });
    if (!department) {
      throw new NotFoundException('部门不存在');
    }
    return department;
  }

  async create(dto: CreateDepartmentDTO) {
    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: {
          id: crypto.randomUUID(),
          code: dto.code,
          name: dto.name,
          parentId: dto.parentId || null,
          managerId: dto.managerId || null,
          status: 'active',
        },
        include: this.departmentInclude,
      });
      if (dto.managerId) {
        await tx.user.updateMany({
          where: { id: dto.managerId, departmentId: null },
          data: { departmentId: department.id },
        });
      }
      return department;
    });
  }

  async update(id: string, dto: UpdateDepartmentDTO) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.update({
        where: { id },
        data: {
          name: dto.name,
          parentId: dto.parentId,
          managerId: dto.managerId,
          status: dto.status,
        },
        include: this.departmentInclude,
      });
      if (dto.managerId) {
        await tx.user.updateMany({
          where: { id: dto.managerId, departmentId: null },
          data: { departmentId: department.id },
        });
      }
      return department;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
