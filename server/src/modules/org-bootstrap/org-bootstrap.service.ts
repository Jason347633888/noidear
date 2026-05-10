import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrgBootstrapStatusDto } from './dto/org-bootstrap-status.dto';

// Deprecated: kept for short-term authenticated diagnostic compatibility only.
// This service does NOT gate product access and does NOT write any system configuration.
@Injectable()
export class OrgBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<OrgBootstrapStatusDto> {
    const systemRoles = await this.prisma.role.count({
      where: { code: { in: ['admin', 'leader', 'user'] }, deletedAt: null },
    });

    if (systemRoles < 3) {
      return { deprecated: true, completed: false, step: 'system_role_baseline', reasons: ['missing_system_roles'] };
    }

    return { deprecated: true, completed: false, step: 'completed', reasons: [] };
  }
}
