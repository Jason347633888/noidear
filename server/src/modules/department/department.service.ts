import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDTO } from './dto/create-department.dto';
import { UpdateDepartmentDTO } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async findAll(limit = 100) {
    const [list, total] = await Promise.all([
      this.prisma.department.findMany({
        where: { deletedAt: null },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.department.count({ where: { deletedAt: null } }),
    ]);
    return { list, total };
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id, deletedAt: null },
    });
    if (!department) {
      throw new NotFoundException('部门不存在');
    }
    return department;
  }

  async create(dto: CreateDepartmentDTO) {
    return this.prisma.department.create({
      data: {
        id: crypto.randomUUID(),
        code: dto.code,
        name: dto.name,
        parentId: dto.parentId || null,
        status: 'active',
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDTO) {
    await this.findOne(id);
    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        parentId: dto.parentId,
        status: dto.status,
      },
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
