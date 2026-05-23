import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MODULE_KEYS,
  MODULE_LABELS,
  ROLE_CODES_WITH_TOGGLE,
  isModuleKey,
  type ModuleKey,
  type RoleCodeWithToggle,
} from './module-access.constants';

export interface MatrixRow {
  moduleKey: ModuleKey;
  moduleLabel: string;
  leader: boolean;
  user: boolean;
}

export interface MatrixWriteInput {
  moduleKey: ModuleKey;
  leader: boolean;
  user: boolean;
}

@Injectable()
export class ModuleAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getEnabledModulesFor(opts: { roleCode: string }): Promise<ModuleKey[]> {
    if (opts.roleCode === 'admin') return [...MODULE_KEYS];
    if (!ROLE_CODES_WITH_TOGGLE.includes(opts.roleCode as RoleCodeWithToggle)) return [];

    const rows = await this.prisma.moduleAccessConfig.findMany({
      where: { roleCode: opts.roleCode, enabled: true },
      select: { moduleKey: true },
    });
    return rows
      .filter((r: { moduleKey: string; enabled?: boolean }) => r.enabled !== false)
      .map((r: { moduleKey: string }) => r.moduleKey as ModuleKey)
      .filter((k: ModuleKey) => MODULE_KEYS.includes(k));
  }

  async listMatrix(): Promise<MatrixRow[]> {
    const rows = await this.prisma.moduleAccessConfig.findMany();
    const lookup = new Map<string, boolean>();
    rows.forEach((r: any) => lookup.set(`${r.moduleKey}:${r.roleCode}`, r.enabled));
    return MODULE_KEYS.map((moduleKey) => ({
      moduleKey,
      moduleLabel: MODULE_LABELS[moduleKey],
      leader: lookup.get(`${moduleKey}:leader`) ?? true,
      user: lookup.get(`${moduleKey}:user`) ?? true,
    }));
  }

  async saveMatrix(rows: MatrixWriteInput[]): Promise<void> {
    for (const row of rows) {
      if (!isModuleKey(row.moduleKey)) {
        throw new BadRequestException(`Unknown moduleKey: ${row.moduleKey}`);
      }
    }
    for (const row of rows) {
      for (const roleCode of ROLE_CODES_WITH_TOGGLE) {
        const enabled = row[roleCode];
        await this.prisma.moduleAccessConfig.upsert({
          where: { moduleKey_roleCode: { moduleKey: row.moduleKey, roleCode } },
          update: { enabled },
          create: { moduleKey: row.moduleKey, roleCode, enabled },
        });
      }
    }
  }
}
