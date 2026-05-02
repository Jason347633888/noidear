import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTraceabilityExportDto } from './dto/create-traceability-export.dto';
import { CreateTraceabilitySnapshotDto } from './dto/create-traceability-snapshot.dto';

type TraceCurrentUser = {
  id?: string;
};

type TraceabilitySnapshotRow = {
  id: string;
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

  async getSnapshot(snapshotId: string) {
    const row = await this.findSnapshot(snapshotId);
    return this.mapSnapshot(row);
  }

  async getSnapshotResult(snapshotId: string) {
    const row = await this.findSnapshot(snapshotId);
    const summary = asSummary(row.summary);

    if (!summary.resultPayload) {
      throw new ConflictException(`Traceability snapshot ${snapshotId} does not contain a replayable result payload`);
    }

    return summary.resultPayload;
  }

  private async findSnapshot(snapshotId: string): Promise<TraceabilitySnapshotRow> {
    const row = await this.prisma.traceabilitySnapshot.findUnique({ where: { id: snapshotId } });

    if (!row) {
      throw new NotFoundException(`Traceability snapshot ${snapshotId} not found`);
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
        sourceQueryHash: input.sourceQueryRef,
        exportMode: input.exportMode,
        requesterId,
        status: input.status,
        snapshotType: input.snapshotType,
        summary: summary as unknown as Prisma.InputJsonValue,
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
