/**
 * Task 9 + Task 14-3: pure helpers for building a bounded trace-context snapshot.
 *
 * A TraceabilitySnapshot is an immutable trace RESULT (frozen readable facts),
 * not a drill and not a recall. These helpers shape the `snapshotData` JSON and
 * compute readiness from data that is checkable in the current release.
 */

export const DEFAULT_TRACE_DEPTH = 3;
export const MAX_TRACE_DEPTH = 6;

/** All supported rootObjectType values. */
export const SUPPORTED_ROOT_TYPES = [
  'production_batch',
  'material_batch',
  'product_recall',
  'traceability_drill',
] as const;

export type RootObjectType = (typeof SUPPORTED_ROOT_TYPES)[number];

/**
 * @deprecated Use SUPPORTED_ROOT_TYPES / isSupportedRootType instead.
 * Kept for backward compatibility with existing callers.
 */
export const FIRST_RELEASE_ROOT_TYPE = 'production_batch';

export function isSupportedRootType(value: string): value is RootObjectType {
  return SUPPORTED_ROOT_TYPES.includes(value as RootObjectType);
}

export function normalizeTraceDepth(depth?: number): number {
  if (!depth || Number.isNaN(depth)) {
    return DEFAULT_TRACE_DEPTH;
  }
  return Math.min(Math.max(Math.trunc(depth), 1), MAX_TRACE_DEPTH);
}

/**
 * Deterministic, crypto-free hash of the query parameters. Two identical
 * requests produce the same string so the snapshot can be correlated.
 */
export function buildSourceQueryHash(input: {
  rootObjectType: string;
  rootObjectId: string;
  depth: number;
}): string {
  return JSON.stringify({
    rootObjectType: input.rootObjectType,
    rootObjectId: input.rootObjectId,
    depth: input.depth,
  });
}

type ProductionBatchFacts = {
  id: string;
  batchNumber: string;
  status: string;
  productId?: string | null;
  productName?: string | null;
  actualQuantity?: number | null;
  plannedQuantity?: number | null;
  unit?: string | null;
  productionDate?: Date | string | null;
};

type MaterialBatchFacts = {
  id: string;
  batchNumber: string;
  status?: string | null;
  materialId?: string | null;
  supplierBatchNo?: string | null;
  quantity?: number | null;
};

type UsageFacts = {
  materialBatchId: string;
  quantity?: number | null;
  usedAt?: Date | string | null;
};

type InspectionFact = {
  id: string;
  /** Maps to InspectionRecord.overall_result */
  overall_result?: string | null;
  /** Maps to InspectionRecord.inspected_at */
  inspected_at?: Date | string | null;
};

type NonConformanceFact = {
  id: string;
  nc_no?: string | null;
  status?: string | null;
  source_type?: string | null;
  source_id?: string | null;
};

type CorrectiveActionFact = {
  id: string;
  capa_no?: string | null;
  status?: string | null;
};

type ApprovalFact = {
  id: string;
  /** Maps to ApprovalInstance.createdById */
  createdById?: string | null;
  status?: string | null;
  /** Maps to ApprovalInstance.completedAt */
  completedAt?: Date | string | null;
};

type EvidenceFileFact = {
  id: string;
  fileName?: string | null;
  filePath?: string | null;
  mimeType?: string | null;
};

export type SnapshotRelatedFacts = {
  inspections?: InspectionFact[];
  nonConformances?: NonConformanceFact[];
  correctiveActions?: CorrectiveActionFact[];
  approvals?: ApprovalFact[];
  evidenceFiles?: EvidenceFileFact[];
};

const toIso = (value?: Date | string | null): string | null => {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

/**
 * Builds the frozen `snapshotData` JSON for a production_batch root.
 * Stores BOTH ids AND human-readable facts so the snapshot stays meaningful
 * even if the live records later change. `downstream` is `[]` in the first release.
 */
export function buildProductionBatchSnapshotData(input: {
  batch: ProductionBatchFacts;
  usages: UsageFacts[];
  materialBatches: MaterialBatchFacts[];
  depth: number;
  related?: SnapshotRelatedFacts;
}) {
  const materialById = new Map(input.materialBatches.map((mb) => [mb.id, mb]));

  const upstream = input.usages.map((usage) => {
    const material = materialById.get(usage.materialBatchId);
    return {
      type: 'material_batch',
      id: usage.materialBatchId,
      relation: 'consumed_by',
      display: {
        batchNumber: material?.batchNumber ?? null,
        materialId: material?.materialId ?? null,
        supplierBatchNo: material?.supplierBatchNo ?? null,
        status: material?.status ?? null,
        consumedQuantity: usage.quantity ?? null,
        usedAt: toIso(usage.usedAt),
      },
    };
  });

  return buildSnapshotOutput({
    rootType: 'production_batch',
    rootId: input.batch.id,
    rootLabel: input.batch.batchNumber,
    rootDisplay: {
      batchNumber: input.batch.batchNumber,
      status: input.batch.status,
      productId: input.batch.productId ?? null,
      productName: input.batch.productName ?? null,
      actualQuantity: input.batch.actualQuantity ?? null,
      plannedQuantity: input.batch.plannedQuantity ?? null,
      unit: input.batch.unit ?? null,
      productionDate: toIso(input.batch.productionDate),
    },
    depth: input.depth,
    upstream,
    downstream: [],
    related: input.related,
  });
}

/**
 * Builds the frozen `snapshotData` JSON for a material_batch root.
 */
export function buildMaterialBatchSnapshotData(input: {
  batch: MaterialBatchFacts;
  depth: number;
  related?: SnapshotRelatedFacts;
}) {
  return buildSnapshotOutput({
    rootType: 'material_batch',
    rootId: input.batch.id,
    rootLabel: input.batch.batchNumber,
    rootDisplay: {
      batchNumber: input.batch.batchNumber,
      materialId: input.batch.materialId ?? null,
      supplierBatchNo: input.batch.supplierBatchNo ?? null,
      status: input.batch.status ?? null,
      quantity: input.batch.quantity ?? null,
    },
    depth: input.depth,
    upstream: [],
    downstream: [],
    related: input.related,
  });
}

type ProductRecallBatchFact = {
  production_batch_id: string;
  batch_number_snapshot?: string | null;
  product_name_snapshot?: string | null;
};

type ProductRecallFacts = {
  id: string;
  recall_no: string;
  status?: string | null;
  /** Populated via include: { batches } — ProductRecall has no product_id scalar */
  batches?: ProductRecallBatchFact[] | null;
};

/**
 * Builds the frozen `snapshotData` JSON for a product_recall root.
 */
export function buildProductRecallSnapshotData(input: {
  recall: ProductRecallFacts;
  depth: number;
  related?: SnapshotRelatedFacts;
}) {
  const batches = (input.recall.batches ?? []).map((b) => ({
    productionBatchId: b.production_batch_id,
    batchNumberSnapshot: b.batch_number_snapshot ?? null,
    productNameSnapshot: b.product_name_snapshot ?? null,
  }));

  return buildSnapshotOutput({
    rootType: 'product_recall',
    rootId: input.recall.id,
    rootLabel: input.recall.recall_no,
    rootDisplay: {
      recallNo: input.recall.recall_no,
      status: input.recall.status ?? null,
      batches,
    },
    depth: input.depth,
    upstream: [],
    downstream: [],
    related: input.related,
  });
}

type TraceabilityDrillFacts = {
  id: string;
  /** TraceabilityDrill has no drill_no column; label is derived from drill_type + drill_date */
  status?: string | null;
  drill_type?: string | null;
  drill_date?: Date | string | null;
  root_object_type?: string | null;
  root_object_id?: string | null;
};

/**
 * Builds the frozen `snapshotData` JSON for a traceability_drill root.
 */
export function buildTraceabilityDrillSnapshotData(input: {
  drill: TraceabilityDrillFacts;
  depth: number;
  related?: SnapshotRelatedFacts;
}) {
  // TraceabilityDrill has no drill_no. Compose a human-readable label from drill_type + drill_date.
  const drillDateStr = input.drill.drill_date ? toIso(input.drill.drill_date)?.slice(0, 10) ?? null : null;
  const rootLabel =
    input.drill.drill_type && drillDateStr
      ? `${input.drill.drill_type}@${drillDateStr}`
      : input.drill.id;

  return buildSnapshotOutput({
    rootType: 'traceability_drill',
    rootId: input.drill.id,
    rootLabel,
    rootDisplay: {
      status: input.drill.status ?? null,
      drillType: input.drill.drill_type ?? null,
      drillDate: toIso(input.drill.drill_date),
      rootObjectType: input.drill.root_object_type ?? null,
      rootObjectId: input.drill.root_object_id ?? null,
    },
    depth: input.depth,
    upstream: [],
    downstream: [],
    related: input.related,
  });
}

/**
 * Shared builder for the full snapshot output shape. All root-type builders
 * delegate here so the output schema is uniform across all rootObjectTypes.
 */
function buildSnapshotOutput(input: {
  rootType: RootObjectType;
  rootId: string;
  rootLabel: string;
  rootDisplay: Record<string, unknown>;
  depth: number;
  upstream: unknown[];
  downstream: unknown[];
  related?: SnapshotRelatedFacts;
}) {
  return {
    depth: input.depth,
    root: {
      type: input.rootType,
      id: input.rootId,
      label: input.rootLabel,
      display: input.rootDisplay,
    },
    upstream: input.upstream,
    downstream: input.downstream,
    inspections: mapInspections(input.related?.inspections),
    nonConformances: mapNonConformances(input.related?.nonConformances),
    correctiveActions: mapCorrectiveActions(input.related?.correctiveActions),
    approvals: mapApprovals(input.related?.approvals),
    evidenceFiles: mapEvidenceFiles(input.related?.evidenceFiles),
    generatedAt: new Date().toISOString(),
  };
}

function mapInspections(items?: InspectionFact[]) {
  return (items ?? []).map((r) => ({
    id: r.id,
    result: r.overall_result ?? null,
    inspectedAt: toIso(r.inspected_at),
  }));
}

function mapNonConformances(items?: NonConformanceFact[]) {
  return (items ?? []).map((nc) => ({
    id: nc.id,
    ncNo: nc.nc_no ?? null,
    status: nc.status ?? null,
    sourceType: nc.source_type ?? null,
    sourceId: nc.source_id ?? null,
  }));
}

function mapCorrectiveActions(items?: CorrectiveActionFact[]) {
  return (items ?? []).map((ca) => ({
    id: ca.id,
    capaNo: ca.capa_no ?? null,
    status: ca.status ?? null,
  }));
}

function mapApprovals(items?: ApprovalFact[]) {
  return (items ?? []).map((a) => ({
    id: a.id,
    approverId: a.createdById ?? null,
    status: a.status ?? null,
    approvedAt: toIso(a.completedAt),
  }));
}

function mapEvidenceFiles(items?: EvidenceFileFact[]) {
  return (items ?? []).map((f) => ({
    id: f.id,
    fileName: f.fileName ?? null,
    filePath: f.filePath ?? null,
    mimeType: f.mimeType ?? null,
  }));
}

/**
 * @deprecated Use buildProductionBatchSnapshotData instead.
 * Kept for backward compatibility.
 */
export function buildSnapshotData(input: {
  batch: ProductionBatchFacts;
  usages: UsageFacts[];
  materialBatches: MaterialBatchFacts[];
  depth: number;
}) {
  return buildProductionBatchSnapshotData(input);
}

export type SnapshotData = ReturnType<typeof buildProductionBatchSnapshotData>;

/**
 * Bounded readiness check. A batch is "ready" (evidence_export) iff:
 *   - ProductionBatch.status === 'completed'
 *   - no OPEN NonConformance on the batch or any upstream material batch
 *   - the required main-chain nodes exist (at least one material usage)
 *
 * NOTE (deferred infra): the plan also wants the gate to require a finished-goods
 * InventoryMovement(production_in) and a batch-close confirmation. That intake/close
 * infrastructure was DEFERRED in Tasks 4 & 6 and does not exist yet, so it is NOT
 * checked here. This is a documented future addition — we do NOT fabricate intake
 * movements.
 */
export function computeReadiness(input: {
  batch: ProductionBatchFacts;
  hasMainChain: boolean;
  openNonConformanceCount: number;
}): { ready: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (input.batch.status !== 'completed') {
    reasons.push(`production_batch status is "${input.batch.status}", expected "completed"`);
  }
  if (!input.hasMainChain) {
    reasons.push('main-chain material usage is missing for this production batch');
  }
  if (input.openNonConformanceCount > 0) {
    reasons.push(`${input.openNonConformanceCount} open non-conformance(s) on the trace chain`);
  }

  return { ready: reasons.length === 0, reasons };
}

/**
 * Readiness check for non-production_batch root types.
 * These types are always considered "complete" in the current release
 * as they carry their own status and the snapshot is purely informational.
 */
export function computeGenericReadiness(): { ready: boolean; reasons: string[] } {
  return { ready: true, reasons: [] };
}
