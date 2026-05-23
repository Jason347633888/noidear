import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface OwnershipContext {
  userId: string;
  roleCode: 'admin' | 'leader' | 'user';
  departmentId: string | null;
  /** undefined = admin (no filter applied — full access); string[] for leader/user. */
  managedDepartmentIds: string[] | undefined;
}

@Injectable()
export class OwnershipContextResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(user: {
    id: string;
    roleCode: string;
    departmentId: string | null;
  }): Promise<OwnershipContext> {
    const base = { userId: user.id, departmentId: user.departmentId };

    if (user.roleCode === 'admin') {
      return { ...base, roleCode: 'admin', managedDepartmentIds: undefined };
    }

    if (user.roleCode === 'leader') {
      const depts = await this.prisma.department.findMany({
        where: { managerId: user.id },
        select: { id: true },
      });
      return {
        ...base,
        roleCode: 'leader',
        managedDepartmentIds: depts.map((d: { id: string }) => d.id),
      };
    }

    return { ...base, roleCode: 'user', managedDepartmentIds: [] };
  }
}
