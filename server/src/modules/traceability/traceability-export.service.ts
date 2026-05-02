import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';
import { CreateTraceabilitySnapshotDto } from './dto/create-traceability-snapshot.dto';

type TraceCurrentUser = {
  id?: string;
  companyId?: string;
};

type TraceabilitySnapshotRow = {
  id: string;
  company_id: string | null;
  sourceQueryHash: string;
  exportMode: string;
  requesterId: string;
  status: string;
  snapshotType: string;
  summary: unknown;
  filePath: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SnapshotSummary = {
  sourceQueryRef?: string;
  snapshotType?: 'query' | 'balance' | 'export';
  exportMode?: 'simple' | 'fullPackage' | 'snapshot';
  retention?: {
    retentionPolicy?: string;
    expiresAt?: string | null;
  };
  payloadRef?: string | null;
  resultSummary?: Record<string, unknown>;
  resultPayload?: Record<string, unknown>;
  createdBy?: string;
  meta?: Record<string, unknown>;
};

const asSummary = (summary: unknown): SnapshotSummary =>
  summary && typeof summary === 'object' && !Array.isArray(summary) ? (summary as SnapshotSummary) : {};

@Injectable()
export class TraceabilityExportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTraceabilityExportDto, currentUser: TraceCurrentUser) {
    const status = dto.exportMode === 'simple' ? 'ready' : 'queued';
    const row = await this.persistSnapshot({
      sourceQueryRef: dto.sourceQueryRef,
      snapshotType: 'export',
      exportMode: dto.exportMode,
      status,
      currentUser,
      retentionPolicy: 'audit-default',
      resultSummary: {
        sourceQueryRef: dto.sourceQueryRef,
        exportMode: dto.exportMode,
        includeEvidence: dto.includeEvidence ?? false,
        includeMaskedData: dto.includeMaskedData ?? false,
      },
    });

    return {
      exportId: row.id,
      exportMode: dto.exportMode,
      status,
      sourceQueryRef: row.sourceQueryHash,
      createdAt: row.createdAt.toISOString(),
      requestedBy: row.requesterId,
      downloadRef: row.filePath,
      snapshotId: row.id,
      meta: {
        snapshotType: row.snapshotType,
      },
    };
  }

  async createSnapshot(dto: CreateTraceabilitySnapshotDto, currentUser: TraceCurrentUser) {
    const row = await this.persistSnapshot({
      sourceQueryRef: dto.sourceQueryRef,
      snapshotType: dto.snapshotType,
      exportMode: 'snapshot',
      status: 'ready',
      currentUser,
      retentionPolicy: dto.retentionPolicy ?? 'audit-default',
      resultSummary: {
        sourceQueryRef: dto.sourceQueryRef,
        snapshotType: dto.snapshotType,
      },
    });

    return this.mapSnapshot(row);
  }

  async getSnapshot(snapshotId: string, currentUser: TraceCurrentUser) {
    const row = await this.findSnapshot(snapshotId, currentUser);
    return this.mapSnapshot(row);
  }

  async getSnapshotResult(snapshotId: string, currentUser: TraceCurrentUser) {
    const row = await this.findSnapshot(snapshotId, currentUser);
    const summary = asSummary(row.summary);

    if (!summary.resultPayload) {
      throw new ConflictException(`Traceability snapshot ${snapshotId} does not contain a replayable result payload`);
    }

    return summary.resultPayload;
  }

  private async findSnapshot(snapshotId: string, currentUser: TraceCurrentUser): Promise<TraceabilitySnapshotRow> {
    const row = await this.prisma.traceabilitySnapshot.findUnique({ where: { id: snapshotId } });

    if (!row) {
      throw new NotFoundException(`Traceability snapshot ${snapshotId} not found`);
    }

    const companyId = currentUser?.companyId;
    if (companyId && (row as any).company_id && (row as any).company_id !== companyId) {
      throw new ForbiddenException(`Traceability snapshot ${snapshotId} does not belong to the current tenant`);
    }

    return row as TraceabilitySnapshotRow;
  }

  private async persistSnapshot(input: {
    sourceQueryRef: string;
    snapshotType: 'query' | 'balance' | 'export';
    exportMode: 'simple' | 'fullPackage' | 'snapshot';
    status: 'ready' | 'queued';
    currentUser: TraceCurrentUser;
    retentionPolicy: string;
    resultSummary: Record<string, unknown>;
    resultPayload?: Record<string, unknown>;
  }): Promise<TraceabilitySnapshotRow> {
    const requesterId = input.currentUser?.id ?? 'system';
    const summary: SnapshotSummary = {
      sourceQueryRef: input.sourceQueryRef,
      snapshotType: input.snapshotType,
      exportMode: input.exportMode,
      retention: {
        retentionPolicy: input.retentionPolicy,
        expiresAt: null,
      },
      payloadRef: input.sourceQueryRef,
      resultSummary: input.resultSummary,
      resultPayload: input.resultPayload,
      createdBy: requesterId,
      meta: {
        createdByGap: 'GAP-308',
      },
    };

    return this.prisma.traceabilitySnapshot.create({
      data: {
        company_id: input.currentUser?.companyId ?? null,
        sourceQueryHash: input.sourceQueryRef,
        exportMode: input.exportMode,
        requesterId,
        status: input.status,
        snapshotType: input.snapshotType,
        summary: summary as unknown as object,
      },
    }) as Promise<TraceabilitySnapshotRow>;
  }

  private mapSnapshot(row: TraceabilitySnapshotRow) {
    const summary = asSummary(row.summary);
    const snapshotType = summary.snapshotType ?? (row.snapshotType as 'query' | 'balance' | 'export');

    return {
      snapshotId: row.id,
      sourceQueryRef: summary.sourceQueryRef ?? row.sourceQueryHash,
      snapshotType,
      status: row.status as 'queued' | 'building' | 'ready' | 'failed' | 'expired',
      createdAt: row.createdAt.toISOString(),
      expiresAt: summary.retention?.expiresAt ?? null,
      payloadRef: summary.payloadRef ?? row.sourceQueryHash,
      meta: {
        exportMode: summary.exportMode ?? row.exportMode,
        retentionPolicy: summary.retention?.retentionPolicy ?? null,
        filePath: row.filePath,
        legacyShape: !summary.sourceQueryRef,
        ...(summary.meta ?? {}),
      },
    };
  }
}
