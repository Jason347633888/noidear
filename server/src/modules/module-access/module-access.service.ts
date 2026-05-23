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

    // Fetch all rows for this role (not just enabled ones) so we can apply default-true logic
    const rows = await this.prisma.moduleAccessConfig.findMany({
      where: { roleCode: opts.roleCode },
      select: { moduleKey: true, enabled: true },
    });
    const lookup = new Map<string, boolean>();
    rows.forEach((r: { moduleKey: string; enabled: boolean }) => lookup.set(r.moduleKey, r.enabled));

    // Default-deny is opt-in: a module with no DB row defaults to enabled (true).
    // Only explicit enabled=false rows disable a module.
    return MODULE_KEYS.filter((key) => lookup.get(key) !== false);
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
