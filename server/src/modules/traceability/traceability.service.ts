import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SOURCE_VERSION } from './traceability-contract.mapper';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';

interface TraceCurrentUser {
  id?: string;
  companyId?: string;
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
    private readonly linkageService: TraceabilityLinkageService,
    private readonly exportService: TraceabilityExportService,
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
    if (dto.actionType === 'recallAssessment') {
      return this.linkageService.create(dto as any, currentUser);
    }

    return {
      actionId: `action:${Date.now()}`,
      actionType: dto.actionType,
      status: 'created' as const,
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
