import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  /**
   * 确认候选负责人满足条件：active 状态 + leader 角色。
   * 写入非空 managerId 前必须调用。
   */
  private async assertManagerCandidate(tx: any, managerId: string): Promise<void> {
    const candidate = await tx.user.findUnique({
      where: { id: managerId },
      select: { status: true, roleObj: { select: { code: true } } },
    });
    if (!candidate) {
      throw new BadRequestException(`负责人用户 ${managerId} 不存在`);
    }
    if (candidate.status !== 'active') {
      throw new BadRequestException('负责人必须为 active 状态的用户');
    }
    if (candidate.roleObj?.code !== 'leader') {
      throw new BadRequestException('负责人必须为 leader 角色的用户');
    }
  }

  private addManagerStatus(dept: any): any {
    if (!dept.managerId) return { ...dept, managerStatus: null };
    const manager = dept.manager;
    const isValid =
      manager &&
      manager.status === 'active' &&
      manager.roleObj?.code === 'leader';
    return { ...dept, managerStatus: isValid ? 'valid' : 'invalid' };
  }

  async findAll(limit = 100) {
    const [rawList, total] = await Promise.all([
      this.prisma.department.findMany({
        where: { deletedAt: null },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.departmentInclude,
      }),
      this.prisma.department.count({ where: { deletedAt: null } }),
    ]);
    return { list: rawList.map((d) => this.addManagerStatus(d)), total };
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id, deletedAt: null },
      include: this.departmentInclude,
    });
    if (!department) {
      throw new NotFoundException('部门不存在');
    }
    return this.addManagerStatus(department);
  }

  async create(dto: CreateDepartmentDTO) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.managerId) {
        await this.assertManagerCandidate(tx as any, dto.managerId);
      }
      const department = await tx.department.create({
        data: {
          id: crypto.randomUUID(),
          code: dto.code,
          name: dto.name,
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
      return this.addManagerStatus(department);
    });
  }

  async update(id: string, dto: UpdateDepartmentDTO) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.managerId) {
        await this.assertManagerCandidate(tx as any, dto.managerId);
      }
      const department = await tx.department.update({
        where: { id },
        data: {
          name: dto.name,
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
      return this.addManagerStatus(department);
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
