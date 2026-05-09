import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BootstrapReason, BootstrapStep, OrgBootstrapStatusDto } from './dto/org-bootstrap-status.dto';

const BOOTSTRAP_CONFIG_KEY = 'org_permission_bootstrap_completed';

@Injectable()
export class OrgBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  private pending(step: BootstrapStep, reasons: BootstrapReason[]): OrgBootstrapStatusDto {
    return { completed: false, step, reasons };
  }

  async getStatus(): Promise<OrgBootstrapStatusDto> {
    const completedFlag = await this.prisma.systemConfig.findUnique({
      where: { key: BOOTSTRAP_CONFIG_KEY },
    });
    if (completedFlag?.value === 'true') {
      return { completed: true, step: 'completed', reasons: [] };
    }

    const [systemRoles, departments, managedDepartments, businessMembers] = await Promise.all([
      this.prisma.role.count({
        where: { code: { in: ['admin', 'leader', 'user'] }, deletedAt: null },
      }),
      this.prisma.department.count({ where: { deletedAt: null } }),
      this.prisma.department.count({
        where: {
          deletedAt: null,
          manager: {
            deletedAt: null,
            status: 'active',
            roleObj: { code: 'leader', deletedAt: null },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          status: 'active',
          username: { not: 'admin' },
          departmentId: { not: null },
          roleObj: { code: 'user', deletedAt: null },
        },
      }),
    ]);

    if (systemRoles < 3) return this.pending('system_role_baseline', ['missing_system_roles']);
    if (departments < 1) return this.pending('departments', ['missing_department']);
    if (managedDepartments < 1) return this.pending('department_manager', ['missing_department_manager']);
    if (businessMembers < 1) return this.pending('department_members', ['missing_business_member']);

    await this.markCompleted();
    return { completed: true, step: 'completed', reasons: [] };
  }

  private async markCompleted() {
    await this.prisma.systemConfig.upsert({
      where: { key: BOOTSTRAP_CONFIG_KEY },
      update: {
        value: 'true',
        valueType: 'boolean',
        category: 'system',
        description: '组织与权限初始化已完成',
      },
      create: {
        key: BOOTSTRAP_CONFIG_KEY,
        value: 'true',
        valueType: 'boolean',
        category: 'system',
        description: '组织与权限初始化已完成',
      },
    });
  }
}
