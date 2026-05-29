/**
 * Task 9: pure helpers for building a bounded trace-context snapshot.
 *
 * A TraceabilitySnapshot is an immutable trace RESULT (frozen readable facts),
 * not a drill and not a recall. These helpers shape the `snapshotData` JSON and
 * compute readiness from data that is checkable in the first release.
 */

export const DEFAULT_TRACE_DEPTH = 3;
export const MAX_TRACE_DEPTH = 6;

export const FIRST_RELEASE_ROOT_TYPE = 'production_batch';

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

const toIso = (value?: Date | string | null): string | null => {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

/**
 * Builds the frozen `snapshotData` JSON: the root production batch plus its
 * upstream material-batch chain. Stores BOTH ids AND human-readable facts so
 * the snapshot stays meaningful even if the live records later change.
 * `downstream` is `[]` in the first release.
 */
export function buildSnapshotData(input: {
  batch: ProductionBatchFacts;
  usages: UsageFacts[];
  materialBatches: MaterialBatchFacts[];
  depth: number;
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

  return {
    depth: input.depth,
    root: {
      type: 'production_batch',
      id: input.batch.id,
      display: {
        batchNumber: input.batch.batchNumber,
        status: input.batch.status,
        productId: input.batch.productId ?? null,
        productName: input.batch.productName ?? null,
        actualQuantity: input.batch.actualQuantity ?? null,
        plannedQuantity: input.batch.plannedQuantity ?? null,
        unit: input.batch.unit ?? null,
        productionDate: toIso(input.batch.productionDate),
      },
    },
    upstream,
    // first release: downstream (distribution / delivery) not traced here
    downstream: [] as unknown[],
  };
}

export type SnapshotData = ReturnType<typeof buildSnapshotData>;

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
