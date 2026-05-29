import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SOURCE_VERSION } from './traceability-contract.mapper';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';
import {
  buildSnapshotData,
  buildSourceQueryHash,
  computeReadiness,
  FIRST_RELEASE_ROOT_TYPE,
  normalizeTraceDepth,
  type SnapshotData,
} from './evidence-snapshot.helpers';

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

interface CreateTraceContextSnapshotInput {
  company_id?: string;
  rootObjectType?: string;
  rootObjectId?: string;
  maxDepth?: number;
  requesterId?: string;
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

  async getSnapshot(snapshotId: string, currentUser: TraceCurrentUser) {
    return this.exportService.getSnapshot(snapshotId, currentUser);
  }

  async getSnapshotResult(snapshotId: string, currentUser: TraceCurrentUser) {
    return this.exportService.getSnapshotResult(snapshotId, currentUser);
  }

  // ── Task 9: bounded trace-context snapshot + evidence export ──────────────

  /**
   * Always builds a FRESH immutable trace-context snapshot for a production
   * batch. When the batch is ready (completed + no open NC + main chain present)
   * it also creates an EvidenceExport event; otherwise it returns a preview
   * snapshot and creates NO EvidenceExport. First release rejects any root
   * object type other than `production_batch`.
   */
  async createTraceContextSnapshot(dto: CreateTraceContextSnapshotInput) {
    if (dto.rootObjectType !== FIRST_RELEASE_ROOT_TYPE) {
      throw new BadRequestException(
        `Unsupported rootObjectType "${dto.rootObjectType}"; first release supports only "${FIRST_RELEASE_ROOT_TYPE}"`,
      );
    }
    if (!dto.rootObjectId) {
      throw new BadRequestException('rootObjectId is required');
    }

    const companyId = dto.company_id ?? '1';
    const depth = normalizeTraceDepth(dto.maxDepth);

    const batch = await this.prisma.productionBatch.findFirst({
      where: { id: dto.rootObjectId },
    });
    if (!batch) {
      throw new NotFoundException(`Production batch ${dto.rootObjectId} not found`);
    }

    // Batch-load the upstream main chain by id arrays (no per-node query loop).
    const usages = await this.prisma.batchMaterialUsage.findMany({
      where: { productionBatchId: batch.id },
    });
    const materialBatchIds = Array.from(new Set(usages.map((u: any) => u.materialBatchId).filter(Boolean)));
    const materialBatches = materialBatchIds.length
      ? await this.prisma.materialBatch.findMany({ where: { id: { in: materialBatchIds } } })
      : [];

    // Open non-conformances on the batch or any upstream material batch.
    const openNonConformances = await this.prisma.nonConformance.findMany({
      where: {
        company_id: companyId,
        status: 'open',
        OR: [
          { source_type: 'production_batch', source_id: batch.id },
          ...(materialBatchIds.length
            ? [{ source_type: 'material_batch', source_id: { in: materialBatchIds } }]
            : []),
        ],
      },
    });

    const snapshotData = buildSnapshotData({
      batch: batch as any,
      usages: usages as any,
      materialBatches: materialBatches as any,
      depth,
    });

    const { ready, reasons } = computeReadiness({
      batch: batch as any,
      hasMainChain: usages.length > 0,
      openNonConformanceCount: openNonConformances.length,
    });

    const requesterId = dto.requesterId ?? 'system';
    const sourceQueryHash = buildSourceQueryHash({
      rootObjectType: dto.rootObjectType,
      rootObjectId: dto.rootObjectId,
      depth,
    });

    const summary = {
      rootObjectType: dto.rootObjectType,
      rootObjectId: dto.rootObjectId,
      depth,
      upstreamCount: snapshotData.upstream.length,
      downstreamCount: snapshotData.downstream.length,
      readinessStatus: ready ? 'complete' : 'incomplete',
    };

    const snapshot = await this.prisma.traceabilitySnapshot.create({
      data: {
        company_id: companyId,
        sourceQueryHash,
        exportMode: 'snapshot',
        requesterId,
        status: 'ready',
        snapshotType: 'query',
        summary: summary as unknown as object,
        rootObjectType: dto.rootObjectType,
        rootObjectId: dto.rootObjectId,
        snapshotData: snapshotData as unknown as object,
        snapshotPurpose: ready ? 'evidence_export' : 'preview',
        readinessStatus: ready ? 'complete' : 'incomplete',
        readinessReasons: ready ? undefined : (reasons as unknown as object),
      },
    });

    // Create an EvidenceExport ONLY when ready. Preview snapshots return without one.
    let evidenceExport: { id: string } | null = null;
    if (ready) {
      evidenceExport = await this.createExportFromSnapshot({
        companyId,
        resourceType: dto.rootObjectType,
        resourceId: dto.rootObjectId,
        snapshotId: snapshot.id,
        snapshotData,
        exportedById: requesterId,
      });
    }

    return {
      ...snapshot,
      evidenceExportId: evidenceExport?.id ?? null,
      readinessReasons: ready ? [] : reasons,
    };
  }

  /**
   * Advanced page: create an EvidenceExport from an EXISTING complete snapshot
   * without recomputing the trace. Rejects preview/incomplete snapshots.
   */
  async exportFromExistingSnapshot(
    snapshotId: string,
    options: { companyId?: string; requesterId?: string; templateVersion?: string } = {},
  ) {
    const snapshot = await this.prisma.traceabilitySnapshot.findUnique({ where: { id: snapshotId } });
    if (!snapshot) {
      throw new NotFoundException(`Traceability snapshot ${snapshotId} not found`);
    }
    if ((snapshot as any).readinessStatus !== 'complete') {
      throw new ConflictException(
        `Snapshot ${snapshotId} is not ready for evidence export (readiness "${(snapshot as any).readinessStatus}")`,
      );
    }
    if ((snapshot as any).rootObjectType !== FIRST_RELEASE_ROOT_TYPE) {
      throw new BadRequestException(
        `Snapshot ${snapshotId} root object type is not "${FIRST_RELEASE_ROOT_TYPE}"`,
      );
    }

    return this.createExportFromSnapshot({
      companyId: options.companyId ?? (snapshot as any).company_id ?? '1',
      resourceType: (snapshot as any).rootObjectType,
      resourceId: (snapshot as any).rootObjectId,
      snapshotId: snapshot.id,
      snapshotData: (snapshot as any).snapshotData as SnapshotData,
      exportedById: options.requesterId ?? 'system',
      templateVersion: options.templateVersion,
    });
  }

  /**
   * Re-download path: returns an existing EvidenceExport WITHOUT recomputing or
   * overwriting anything. The authoritative payload is the JSON dataSnapshot;
   * the linked EvidenceFile (when present) holds the rendered binary.
   */
  async downloadEvidenceExport(exportId: string, options: { companyId?: string } = {}) {
    const evidenceExport = await this.prisma.evidenceExport.findUnique({ where: { id: exportId } });
    if (!evidenceExport) {
      throw new NotFoundException(`Evidence export ${exportId} not found`);
    }
    if (options.companyId && (evidenceExport as any).company_id !== options.companyId) {
      throw new NotFoundException(`Evidence export ${exportId} not found`);
    }

    const file = (evidenceExport as any).fileId
      ? await this.prisma.evidenceFile.findUnique({ where: { id: (evidenceExport as any).fileId } })
      : null;

    return {
      exportId: evidenceExport.id,
      snapshotId: (evidenceExport as any).snapshotId,
      resourceType: (evidenceExport as any).resourceType,
      resourceId: (evidenceExport as any).resourceId,
      summaryFormat: (evidenceExport as any).summaryFormat,
      exportedAt: (evidenceExport as any).exportedAt,
      file: file
        ? {
            id: file.id,
            fileName: (file as any).fileName,
            filePath: (file as any).filePath,
            mimeType: (file as any).mimeType ?? null,
          }
        : null,
      dataSnapshot: (evidenceExport as any).dataSnapshot,
    };
  }

  /**
   * Shared writer: creates the EvidenceFile pointer + EvidenceExport event.
   *
   * File generation is intentionally STUBBED. Building a full PDF layout is
   * deferred; the authoritative payload is the JSON dataSnapshot stored on the
   * export. We persist an EvidenceFile row with a deterministic placeholder
   * filePath so the download contract is exercisable. Binary rendering is a
   * documented follow-up.
   */
  private async createExportFromSnapshot(input: {
    companyId: string;
    resourceType: string;
    resourceId: string;
    snapshotId: string;
    snapshotData: SnapshotData;
    exportedById: string;
    templateVersion?: string;
  }) {
    const fileName = `evidence-${input.resourceType}-${input.resourceId}-${input.snapshotId}.pdf`;
    const evidenceFile = await this.prisma.evidenceFile.create({
      data: {
        company_id: input.companyId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        fileName,
        // STUB: placeholder path; actual binary rendering is a documented follow-up.
        filePath: `evidence/pending/${input.snapshotId}/${fileName}`,
        mimeType: 'application/pdf',
        createdById: input.exportedById,
      },
    });

    return this.prisma.evidenceExport.create({
      data: {
        company_id: input.companyId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        snapshotId: input.snapshotId,
        templateVersion: input.templateVersion ?? null,
        exportScope: 'main_chain_evidence',
        dataSnapshot: input.snapshotData as unknown as object,
        summaryFormat: 'pdf',
        fileId: evidenceFile.id,
        exportedById: input.exportedById,
      },
    });
  }
}
