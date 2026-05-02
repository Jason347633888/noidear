import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { mapForwardTraceResult, SOURCE_VERSION } from './traceability-contract.mapper';
import { TraceabilityExportService } from './traceability-export.service';

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

const HIGH_RISK_DEPARTMENTS = ['品质', '管理层'];

const buildPermission = (currentUser: TraceCurrentUser, isHighRisk: boolean) => ({
  departmentScope: currentUser?.department ?? 'unknown',
  scenarioPermissions: currentUser?.scenarioPermissions ?? [],
  canViewSummary: true,
  canViewDetail: true,
  canViewEvidence: true,
  canInitiateLinkage: true,
  canExportSimple: true,
  canExportFullPackage: true,
  canUseAsOfPlayback: true,
  canExecuteHighRiskAction: isHighRisk,
});

const buildEmptyResult = (dto: TraceQueryDto, currentUser: TraceCurrentUser) => ({
  summary: {
    queryId: `missing:${dto.objectId ?? 'unknown'}`,
    entryMode: dto.entryMode,
    objectType: dto.objectType,
    objectId: dto.objectId,
    traceMode: dto.traceMode,
    viewMode: dto.viewMode,
    timeMode: dto.timeMode,
    riskLevel: 'normal' as const,
    resultStatus: 'empty' as const,
  },
  permission: buildPermission(currentUser, false),
  risk: { summaryRiskLevel: 'normal' as const, riskCount: 0, highRiskCount: 0, items: [] },
  ledger: { columns: [], rows: [], grouping: [], totals: {} },
  graph: { nodes: [], edges: [], layout: 'vertical', legend: [] },
  evidence: { count: 0, items: [] },
  actions: { available: [], recommended: [], created: [] },
  export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null as string | null },
  meta: {
    generatedAt: new Date().toISOString(),
    queryHash: `missing:${dto.objectId}`,
    degraded: false,
    snapshotId: null as string | null,
    sourceVersion: SOURCE_VERSION,
  },
  extensions: {},
});

const MATERIAL_LOT_INCLUDE = {
  batchMaterialUsages: {
    include: {
      productionBatch: {
        include: { delivery_notes: true },
      },
    },
  },
};

@Injectable()
export class TraceabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: TraceabilityExportService,
  ) {}

  async query(dto: TraceQueryDto, currentUser: TraceCurrentUser) {
    const isMaterialLotQuery =
      dto.entryMode === 'object' &&
      dto.objectType === 'materialLot' &&
      dto.objectId;

    if (!isMaterialLotQuery) return buildEmptyResult(dto, currentUser);

    try {
      const materialBatch = await this.prisma.materialBatch.findUnique({
        where: { id: dto.objectId },
        include: MATERIAL_LOT_INCLUDE,
      });

      if (!materialBatch) return buildEmptyResult(dto, currentUser);

      const isHighRisk = HIGH_RISK_DEPARTMENTS.includes(currentUser?.department ?? '');

      return mapForwardTraceResult(materialBatch, buildPermission(currentUser, isHighRisk));
    } catch (error) {
      throw new Error(`Traceability query failed: ${(error as Error).message}`);
    }
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
    return this.exportService.create(dto as any, currentUser);
  }

  async createSnapshot(dto: TraceSnapshotDto, currentUser: TraceCurrentUser) {
    return this.exportService.createSnapshot(dto as any, currentUser);
  }

  async getSnapshot(snapshotId: string) {
    return this.exportService.getSnapshot(snapshotId);
  }

  async getSnapshotResult(snapshotId: string) {
    return this.exportService.getSnapshotResult(snapshotId);
  }
}
