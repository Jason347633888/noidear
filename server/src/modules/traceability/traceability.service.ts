import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SOURCE_VERSION } from './traceability-contract.mapper';
import { TraceabilityQueryService } from './traceability-query.service';

interface TraceCurrentUser {
  id?: string;
  department?: string;
  scenarioPermissions?: string[];
}

interface TraceQueryDto {
  entryMode?: string;
  objectType?: string;
  objectId?: string;
  traceMode?: string;
  viewMode?: string;
  timeMode?: string;
}

interface TraceActionDto {
  actionType?: string;
  sourceQueryRef?: string;
  sourceNodeIds?: string[];
  sourceRiskIds?: string[];
}

interface TraceExportDto {
  exportMode?: string;
  sourceQueryRef?: string;
}

interface TraceSnapshotDto {
  sourceQueryRef?: string;
  snapshotType?: string;
}

interface TraceBalanceDto {
  productionBatchId?: string;
  materialLotId?: string;
}


@Injectable()
export class TraceabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly traceabilityQueryService: TraceabilityQueryService,
  ) {}

  async query(dto: TraceQueryDto, currentUser: TraceCurrentUser) {
    return this.traceabilityQueryService.query(dto as any, currentUser);
  }

  async balance(dto: TraceBalanceDto, _currentUser: TraceCurrentUser) {
    return {
      summary: {
        analysisId: `balance:${dto.productionBatchId ?? dto.materialLotId ?? 'unknown'}`,
        scopeType: dto.productionBatchId ? 'productionBatch' : 'materialLot',
        scopeRefId: dto.productionBatchId ?? dto.materialLotId ?? 'unknown',
        status: 'ok' as const,
        totalInput: 0,
        totalOutput: 0,
        totalLoss: 0,
        diffQty: 0,
        riskLevel: 'normal' as const,
      },
      rows: [],
      discrepancies: [],
      recommendations: [],
      evidence: { count: 0, items: [] },
      meta: {
        generatedAt: new Date().toISOString(),
        queryHash: 'balance-hash',
        snapshotId: null as string | null,
        sourceVersion: SOURCE_VERSION,
      },
    };
  }

  async createAction(dto: TraceActionDto, currentUser: TraceCurrentUser) {
    const status = dto.actionType === 'recallAssessment' ? 'pendingReview' : 'created';
    return {
      actionId: `action:${Date.now()}`,
      actionType: dto.actionType,
      status: status as 'pendingReview' | 'created',
      sourceQueryRef: dto.sourceQueryRef,
      createdAt: new Date().toISOString(),
      requestedBy: currentUser?.id ?? 'system',
      writeback: {
        sourceNodeIds: dto.sourceNodeIds ?? [],
        sourceRiskIds: dto.sourceRiskIds ?? [],
      },
    };
  }

  async createExport(dto: TraceExportDto, currentUser: TraceCurrentUser) {
    const isSimple = dto.exportMode === 'simple';
    return {
      exportId: `export:${Date.now()}`,
      exportMode: dto.exportMode,
      status: (isSimple ? 'ready' : 'queued') as 'ready' | 'queued',
      sourceQueryRef: dto.sourceQueryRef,
      createdAt: new Date().toISOString(),
      requestedBy: currentUser?.id ?? 'system',
      downloadRef: isSimple ? `/traceability/export/download/${Date.now()}` : (null as string | null),
      snapshotId: null as string | null,
      meta: {},
    };
  }

  async createSnapshot(dto: TraceSnapshotDto, _currentUser: TraceCurrentUser) {
    return {
      snapshotId: `snapshot:${Date.now()}`,
      sourceQueryRef: dto.sourceQueryRef,
      snapshotType: dto.snapshotType,
      status: 'ready' as const,
      createdAt: new Date().toISOString(),
      expiresAt: null as string | null,
      payloadRef: dto.sourceQueryRef,
      meta: {},
    };
  }

  async getSnapshot(snapshotId: string) {
    return {
      snapshotId,
      sourceQueryRef: 'query-hash',
      snapshotType: 'query' as const,
      status: 'ready' as const,
      createdAt: new Date().toISOString(),
      expiresAt: null as string | null,
      payloadRef: 'query-hash',
      meta: {},
    };
  }

  async getSnapshotResult(snapshotId: string) {
    return { snapshotId, resultType: 'query' };
  }
}
