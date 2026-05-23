import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { StepDto } from './dto/approval-definition.dto';

interface SimpleLogger {
  log(msg: string): void;
  warn(msg: string): void;
  error(msg: string, ...args: unknown[]): void;
}

@Injectable()
export class ApprovalDefinitionStartupScan implements OnModuleInit {
  private readonly logger: SimpleLogger;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() loggerOverride?: SimpleLogger,
  ) {
    this.logger = loggerOverride ?? new Logger(ApprovalDefinitionStartupScan.name);
  }

  async onModuleInit() {
    await this.run();
  }

  async run(): Promise<void> {
    try {
      const rows = await this.prisma.approvalDefinition.findMany({ where: { status: 'active' } });
      const failed: string[] = [];
      for (const row of rows) {
        const ok = await this.stepsValid((row as any).steps);
        if (!ok) {
          await this.prisma.approvalDefinition.update({
            where: { id: row.id },
            data: { status: 'disabled_legacy' },
          });
          failed.push(row.id);
        }
      }
      if (failed.length > 0) {
        this.logger.warn(
          `Demoted ${failed.length} ApprovalDefinitions to disabled_legacy: ${failed.join(', ')}`,
        );
      } else {
        this.logger.log('All active ApprovalDefinitions pass new contract.');
      }
    } catch (err) {
      this.logger.error('ApprovalDefinitionStartupScan failed', err as any);
    }
  }

  private async stepsValid(steps: unknown): Promise<boolean> {
    if (!Array.isArray(steps) || steps.length === 0) return false;
    for (const raw of steps) {
      try {
        await validateOrReject(plainToInstance(StepDto, raw), {
          whitelist: true,
          forbidNonWhitelisted: true,
        });
      } catch {
        return false;
      }
    }
    return true;
  }
}
