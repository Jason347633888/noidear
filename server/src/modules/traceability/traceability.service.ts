import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SOURCE_VERSION } from './traceability-contract.mapper';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';
import {
  buildMaterialBatchSnapshotData,
  buildProductionBatchSnapshotData,
  buildProductRecallSnapshotData,
  buildSnapshotData,
  buildSourceQueryHash,
  buildTraceabilityDrillSnapshotData,
  computeGenericReadiness,
  computeReadiness,
  isSupportedRootType,
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

interface ResolvedSnapshotInput {
  company_id: string;
  rootObjectType: string;
  rootObjectId: string;
  maxDepth?: number;
  requesterId?: string;
  depth: number;
}


@Injectable()
export class TraceabilityService {
  private readonly logger = new Logger(TraceabilityService.name);

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

  // ── Task 9 + Task 14-3: bounded trace-context snapshot + evidence export ──────────────

  /**
   * Always builds a FRESH immutable trace-context snapshot for any supported
   * rootObjectType: production_batch, material_batch, product_recall, or
   * traceability_drill.
   *
   * When the root object is ready (completed + no open NC + main chain present)
   * it also creates an EvidenceExport event; otherwise it returns a preview
   * snapshot and creates NO EvidenceExport.
   *
   * Performance: default depth=3, max depth=6, batch queries by ids, logs node counts.
   */
  async createTraceContextSnapshot(dto: CreateTraceContextSnapshotInput) {
    if (!dto.rootObjectType || !isSupportedRootType(dto.rootObjectType)) {
      throw new BadRequestException(
        `Unsupported rootObjectType "${dto.rootObjectType}"; supported values: production_batch, material_batch, product_recall, traceability_drill`,
      );
    }
    if (!dto.rootObjectId) {
      throw new BadRequestException('rootObjectId is required');
    }

    const companyId = dto.company_id ?? '1';
    const depth = normalizeTraceDepth(dto.maxDepth);
    const rootObjectType = dto.rootObjectType as string;
    const rootObjectId = dto.rootObjectId as string;
    const requesterId = dto.requesterId;

    const base = { company_id: companyId, rootObjectType, rootObjectId, maxDepth: dto.maxDepth, requesterId, depth };

    switch (rootObjectType) {
      case 'production_batch':
        return this.createProductionBatchSnapshot(base);
      case 'material_batch':
        return this.createMaterialBatchSnapshot(base);
      case 'product_recall':
        return this.createProductRecallSnapshot(base);
      case 'traceability_drill':
        return this.createTraceabilityDrillSnapshot(base);
    }
  }

  private async createProductionBatchSnapshot(dto: ResolvedSnapshotInput) {
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

    // Batch-load related records.
    const related = await this.loadRelatedFacts(dto.company_id, 'production_batch', [batch.id, ...materialBatchIds]);

    // Open non-conformances on the batch or any upstream material batch.
    const openNonConformances = await this.prisma.nonConformance.findMany({
      where: {
        company_id: dto.company_id,
        status: 'open',
        OR: [
          { source_type: 'production_batch', source_id: batch.id },
          ...(materialBatchIds.length
            ? [{ source_type: 'material_batch', source_id: { in: materialBatchIds } }]
            : []),
        ],
      },
    });

    this.logger.log(
      `[snapshot] production_batch=${batch.id} depth=${dto.depth} upstream=${materialBatches.length} nc=${openNonConformances.length} inspections=${related.inspections?.length ?? 0}`,
    );

    const snapshotData = buildProductionBatchSnapshotData({
      batch: batch as any,
      usages: usages as any,
      materialBatches: materialBatches as any,
      depth: dto.depth,
      related,
    });

    const { ready, reasons } = computeReadiness({
      batch: batch as any,
      hasMainChain: usages.length > 0,
      openNonConformanceCount: openNonConformances.length,
    });

    return this.persistSnapshot({
      companyId: dto.company_id,
      rootObjectType: dto.rootObjectType,
      rootObjectId: dto.rootObjectId,
      depth: dto.depth,
      snapshotData,
      ready,
      reasons,
      requesterId: dto.requesterId ?? 'system',
    });
  }

  private async createMaterialBatchSnapshot(dto: ResolvedSnapshotInput) {
    const batch = await this.prisma.materialBatch.findFirst({
      where: { id: dto.rootObjectId },
    });
    if (!batch) {
      throw new NotFoundException(`Material batch ${dto.rootObjectId} not found`);
    }

    const related = await this.loadRelatedFacts(dto.company_id, 'material_batch', [batch.id]);

    this.logger.log(
      `[snapshot] material_batch=${batch.id} depth=${dto.depth} inspections=${related.inspections?.length ?? 0}`,
    );

    const snapshotData = buildMaterialBatchSnapshotData({
      batch: batch as any,
      depth: dto.depth,
      related,
    });

    const { ready, reasons } = computeGenericReadiness();

    return this.persistSnapshot({
      companyId: dto.company_id,
      rootObjectType: dto.rootObjectType,
      rootObjectId: dto.rootObjectId,
      depth: dto.depth,
      snapshotData,
      ready,
      reasons,
      requesterId: dto.requesterId ?? 'system',
    });
  }

  private async createProductRecallSnapshot(dto: ResolvedSnapshotInput) {
    const recall = await this.prisma.productRecall.findFirst({
      where: { id: dto.rootObjectId },
    });
    if (!recall) {
      throw new NotFoundException(`Product recall ${dto.rootObjectId} not found`);
    }

    const related = await this.loadRelatedFacts(dto.company_id, 'product_recall', [recall.id]);

    this.logger.log(
      `[snapshot] product_recall=${recall.id} depth=${dto.depth} inspections=${related.inspections?.length ?? 0}`,
    );

    const snapshotData = buildProductRecallSnapshotData({
      recall: recall as any,
      depth: dto.depth,
      related,
    });

    const { ready, reasons } = computeGenericReadiness();

    return this.persistSnapshot({
      companyId: dto.company_id,
      rootObjectType: dto.rootObjectType,
      rootObjectId: dto.rootObjectId,
      depth: dto.depth,
      snapshotData,
      ready,
      reasons,
      requesterId: dto.requesterId ?? 'system',
    });
  }

  private async createTraceabilityDrillSnapshot(dto: ResolvedSnapshotInput) {
    const drill = await this.prisma.traceabilityDrill.findFirst({
      where: { id: dto.rootObjectId },
    });
    if (!drill) {
      throw new NotFoundException(`Traceability drill ${dto.rootObjectId} not found`);
    }

    const related = await this.loadRelatedFacts(dto.company_id, 'traceability_drill', [drill.id]);

    this.logger.log(
      `[snapshot] traceability_drill=${drill.id} depth=${dto.depth} inspections=${related.inspections?.length ?? 0}`,
    );

    const snapshotData = buildTraceabilityDrillSnapshotData({
      drill: drill as any,
      depth: dto.depth,
      related,
    });

    const { ready, reasons } = computeGenericReadiness();

    return this.persistSnapshot({
      companyId: dto.company_id,
      rootObjectType: dto.rootObjectType,
      rootObjectId: dto.rootObjectId,
      depth: dto.depth,
      snapshotData,
      ready,
      reasons,
      requesterId: dto.requesterId ?? 'system',
    });
  }

  /**
   * Batch-loads all related facts for the snapshot using id arrays (no per-node
   * query loops). This keeps the number of DB round-trips bounded.
   */
  private async loadRelatedFacts(
    companyId: string,
    sourceType: string,
    sourceIds: string[],
  ) {
    if (!sourceIds.length) {
      return { inspections: [], nonConformances: [], correctiveActions: [], approvals: [], evidenceFiles: [] };
    }

    const [inspections, nonConformances, correctiveActions, approvals, evidenceFiles] = await Promise.all([
      this.loadInspections(companyId, sourceType, sourceIds),
      this.loadNonConformances(companyId, sourceType, sourceIds),
      this.loadCorrectiveActions(companyId, sourceType, sourceIds),
      this.loadApprovals(companyId, sourceType, sourceIds),
      this.loadEvidenceFiles(companyId, sourceType, sourceIds),
    ]);

    return { inspections, nonConformances, correctiveActions, approvals, evidenceFiles };
  }

  private async loadInspections(companyId: string, _sourceType: string, sourceIds: string[]) {
    try {
      return await (this.prisma as any).inspectionRecord.findMany({
        where: { company_id: companyId, source_id: { in: sourceIds } },
        select: { id: true, record_no: true, result: true, inspectedAt: true },
      });
    } catch {
      return [];
    }
  }

  private async loadNonConformances(companyId: string, sourceType: string, sourceIds: string[]) {
    try {
      return await this.prisma.nonConformance.findMany({
        where: { company_id: companyId, source_type: sourceType, source_id: { in: sourceIds } },
        select: { id: true, nc_no: true, status: true, source_type: true, source_id: true },
      });
    } catch {
      return [];
    }
  }

  private async loadCorrectiveActions(companyId: string, _sourceType: string, sourceIds: string[]) {
    try {
      return await (this.prisma as any).correctiveAction.findMany({
        where: { company_id: companyId, source_id: { in: sourceIds } },
        select: { id: true, capa_no: true, status: true },
      });
    } catch {
      return [];
    }
  }

  private async loadApprovals(companyId: string, _sourceType: string, sourceIds: string[]) {
    try {
      return await (this.prisma as any).approvalRecord.findMany({
        where: { company_id: companyId, resource_id: { in: sourceIds } },
        select: { id: true, approverId: true, status: true, approvedAt: true },
      });
    } catch {
      return [];
    }
  }

  private async loadEvidenceFiles(companyId: string, sourceType: string, sourceIds: string[]) {
    try {
      return await this.prisma.evidenceFile.findMany({
        where: { company_id: companyId, resourceType: sourceType, resourceId: { in: sourceIds } },
        select: { id: true, fileName: true, filePath: true, mimeType: true },
      });
    } catch {
      return [];
    }
  }

  /**
   * Shared snapshot persistence + optional EvidenceExport creation.
   */
  private async persistSnapshot(input: {
    companyId: string;
    rootObjectType: string;
    rootObjectId: string;
    depth: number;
    snapshotData: unknown;
    ready: boolean;
    reasons: string[];
    requesterId: string;
  }) {
    const sourceQueryHash = buildSourceQueryHash({
      rootObjectType: input.rootObjectType,
      rootObjectId: input.rootObjectId,
      depth: input.depth,
    });

    const snapshotDataObj = input.snapshotData as any;
    const nodeCounts = {
      upstream: snapshotDataObj?.upstream?.length ?? 0,
      downstream: snapshotDataObj?.downstream?.length ?? 0,
      inspections: snapshotDataObj?.inspections?.length ?? 0,
      nonConformances: snapshotDataObj?.nonConformances?.length ?? 0,
      correctiveActions: snapshotDataObj?.correctiveActions?.length ?? 0,
      approvals: snapshotDataObj?.approvals?.length ?? 0,
      evidenceFiles: snapshotDataObj?.evidenceFiles?.length ?? 0,
    };

    this.logger.log(
      `[snapshot] persisting rootType=${input.rootObjectType} id=${input.rootObjectId} ready=${input.ready} nodes=${JSON.stringify(nodeCounts)}`,
    );

    const summary = {
      rootObjectType: input.rootObjectType,
      rootObjectId: input.rootObjectId,
      depth: input.depth,
      ...nodeCounts,
      readinessStatus: input.ready ? 'complete' : 'incomplete',
    };

    const snapshot = await this.prisma.traceabilitySnapshot.create({
      data: {
        company_id: input.companyId,
        sourceQueryHash,
        exportMode: 'snapshot',
        requesterId: input.requesterId,
        status: 'ready',
        snapshotType: 'query',
        summary: summary as unknown as object,
        rootObjectType: input.rootObjectType,
        rootObjectId: input.rootObjectId,
        snapshotData: input.snapshotData as unknown as object,
        snapshotPurpose: input.ready ? 'evidence_export' : 'preview',
        readinessStatus: input.ready ? 'complete' : 'incomplete',
        readinessReasons: input.ready ? undefined : (input.reasons as unknown as object),
      },
    });

    // Create an EvidenceExport ONLY when ready. Preview snapshots return without one.
    let evidenceExport: { id: string } | null = null;
    if (input.ready) {
      evidenceExport = await this.createExportFromSnapshot({
        companyId: input.companyId,
        resourceType: input.rootObjectType,
        resourceId: input.rootObjectId,
        snapshotId: snapshot.id,
        snapshotData: input.snapshotData as SnapshotData,
        exportedById: input.requesterId,
      });
    }

    return {
      ...snapshot,
      evidenceExportId: evidenceExport?.id ?? null,
      readinessReasons: input.ready ? [] : input.reasons,
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
    if (!isSupportedRootType((snapshot as any).rootObjectType)) {
      throw new BadRequestException(
        `Snapshot ${snapshotId} root object type "${(snapshot as any).rootObjectType}" is not supported`,
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
