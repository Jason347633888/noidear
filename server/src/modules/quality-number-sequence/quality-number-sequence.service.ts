import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

type SequenceScope = 'non_conformance' | 'corrective_action';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class QualityNumberSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  generateNonConformanceNo(companyId: string, now = new Date(), tx?: TxClient): Promise<string> {
    return this.generate({
      companyId,
      scope: 'non_conformance',
      prefix: 'NC',
      period: String(now.getFullYear()),
    }, tx);
  }

  generateCorrectiveActionNo(companyId: string, now = new Date(), tx?: TxClient): Promise<string> {
    return this.generate({
      companyId,
      scope: 'corrective_action',
      prefix: 'CAPA',
      period: String(now.getFullYear()),
    }, tx);
  }

  private async generate(input: {
    companyId: string;
    scope: SequenceScope;
    prefix: 'NC' | 'CAPA';
    period: string;
  }, tx?: TxClient): Promise<string> {
    if (tx) {
      return this.generateInTransaction(tx, input);
    }

    return this.prisma.$transaction((client: TxClient) => this.generateInTransaction(client, input));
  }

  private async generateInTransaction(
    tx: TxClient,
    input: {
      companyId: string;
      scope: SequenceScope;
      prefix: 'NC' | 'CAPA';
      period: string;
    },
  ): Promise<string> {
    const sequence = await this.lockOrCreateSequence(tx, input.companyId, input.scope, input.period);
    const nextValue = sequence.current_value + 1;
    await tx.businessNumberSequence.update({
      where: { id: sequence.id },
      data: { current_value: nextValue },
    });
    return `${input.prefix}-${input.period}-${String(nextValue).padStart(4, '0')}`;
  }

  private async lockOrCreateSequence(
    tx: TxClient,
    companyId: string,
    scope: SequenceScope,
    period: string,
  ): Promise<{ id: string; current_value: number }> {
    const existing = await this.lockSequence(tx, companyId, scope, period);
    if (existing) return existing;

    const currentValue = await this.findCurrentMaxValue(tx, companyId, scope, period);
    const newId = randomUUID();
    await tx.$executeRaw`
      INSERT INTO business_number_sequences (id, company_id, scope, period, current_value, created_at, updated_at)
      VALUES (${newId}, ${companyId}, ${scope}, ${period}, ${currentValue}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (company_id, scope, period) DO NOTHING
    `;

    const created = await this.lockSequence(tx, companyId, scope, period);
    if (!created) {
      throw new Error(`Failed to initialize sequence ${scope} for company ${companyId} and period ${period}`);
    }
    return created;
  }

  private async lockSequence(
    tx: TxClient,
    companyId: string,
    scope: SequenceScope,
    period: string,
  ): Promise<{ id: string; current_value: number } | null> {
    const rows = await tx.$queryRaw<Array<{ id: string; current_value: number }>>`
      SELECT id, current_value
      FROM business_number_sequences
      WHERE company_id = ${companyId}
        AND scope = ${scope}
        AND period = ${period}
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  private async findCurrentMaxValue(
    tx: TxClient,
    companyId: string,
    scope: SequenceScope,
    period: string,
  ): Promise<number> {
    if (scope === 'non_conformance') {
      const latest = await tx.nonConformance.findFirst({
        where: {
          company_id: companyId,
          nc_no: { startsWith: `NC-${period}-` },
        },
        orderBy: { nc_no: 'desc' },
        select: { nc_no: true },
      });
      return this.parseSequence(latest?.nc_no);
    }

    const latest = await tx.correctiveAction.findFirst({
      where: {
        company_id: companyId,
        capa_no: { startsWith: `CAPA-${period}-` },
      },
      orderBy: { capa_no: 'desc' },
      select: { capa_no: true },
    });
    return this.parseSequence(latest?.capa_no);
  }

  private parseSequence(value?: string | null): number {
    if (!value) return 0;
    const match = value.match(/-(\d+)$/);
    return match ? Number.parseInt(match[1], 10) : 0;
  }
}
