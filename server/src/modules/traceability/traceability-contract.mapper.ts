export const SOURCE_VERSION = 'traceability-query-contract/v1';

const baseMeta = () => ({
  generatedAt: new Date().toISOString(),
  queryHash: 'pending-hash',
  degraded: false,
  snapshotId: null as string | null,
  sourceVersion: SOURCE_VERSION,
});

const defaultPermission = () => ({
  visible: true,
  masked: false,
  expandable: true,
  actionable: true,
});

const toStringId = (value: unknown) => String(value ?? '');

const labelOf = (entity: any, keys: string[], fallback: string) => {
  for (const key of keys) {
    if (entity?.[key] !== undefined && entity?.[key] !== null && String(entity[key]).length > 0) {
      return String(entity[key]);
    }
  }
  return fallback;
};

const node = (
  nodeId: string,
  nodeType: string,
  businessObject: string,
  label: string,
  attributes: Record<string, unknown> = {},
) => ({
  nodeId,
  nodeType,
  businessObject,
  label,
  batchNo: label,
  riskLevel: 'normal' as const,
  permission: defaultPermission(),
  attributes,
});

export const edge = (
  sourceNodeId: string,
  targetNodeId: string,
  relationType: string,
  direction: 'forward' | 'backward' | 'bidirectional',
  index: number,
) => ({
  edgeId: `${relationType}:${sourceNodeId}:${targetNodeId}:${index}`,
  sourceNodeId,
  targetNodeId,
  relationType,
  direction,
  isMainChain: true,
  isAuxiliary: false,
  riskLevel: 'normal' as const,
});

export const materialLotNode = (materialBatch: any) =>
  node(
    materialBatch.id,
    'materialLot',
    'MaterialBatch',
    labelOf(materialBatch, ['batch_no', 'batchNumber', 'supplierBatchNo'], materialBatch.id),
    {
      materialId: materialBatch.materialId ?? materialBatch.material?.id,
      materialName: materialBatch.material?.name,
      supplierId: materialBatch.supplierId ?? materialBatch.supplier?.id,
      supplierName: materialBatch.supplier?.name,
    },
  );

export const ingredientUsageNode = (usage: any) =>
  node(usage.id, 'ingredientUsage', 'BatchMaterialUsage', `投料 ${usage.quantity}`, {
    quantity: usage.quantity,
    materialBatchId: usage.materialBatchId ?? usage.materialBatch?.id,
    productionBatchId: usage.productionBatchId ?? usage.productionBatch?.id,
  });

export const productionBatchNode = (productionBatch: any) =>
  node(
    productionBatch.id,
    'productionBatch',
    'ProductionBatch',
    labelOf(productionBatch, ['batch_no', 'batchNumber', 'productName'], productionBatch.id),
    {
      productId: productionBatch.productId,
      productName: productionBatch.productName,
      status: productionBatch.status,
    },
  );

export const deliveryNoteNode = (deliveryNote: any) =>
  node(
    toStringId(deliveryNote.id),
    'deliveryNote',
    'DeliveryNote',
    labelOf(deliveryNote, ['delivery_no', 'dn_no'], toStringId(deliveryNote.id)),
    {
      customerName: deliveryNote.customer_name,
      shippedQty: deliveryNote.shipped_qty,
      unit: deliveryNote.unit,
    },
  );

export function buildTraceResult(input: {
  queryId: string;
  entryMode: 'object' | 'scenario';
  objectType?: string;
  objectId?: string;
  scenario?: string;
  traceMode: 'forward' | 'backward' | 'bidirectional';
  viewMode: 'ledger' | 'graph';
  timeMode: 'current' | 'asOf';
  asOfAt?: string;
  permission: any;
  rows: any[];
  edges: any[];
}) {
  return {
    summary: {
      queryId: input.queryId,
      entryMode: input.entryMode,
      objectType: input.objectType,
      objectId: input.objectId,
      scenario: input.scenario,
      traceMode: input.traceMode,
      viewMode: input.viewMode,
      timeMode: input.timeMode,
      asOfAt: input.asOfAt,
      riskLevel: 'normal' as const,
      resultStatus: input.rows.length ? ('ok' as const) : ('empty' as const),
    },
    permission: input.permission,
    risk: { summaryRiskLevel: 'normal' as const, riskCount: 0, highRiskCount: 0, items: [] },
    ledger: {
      columns: [{ key: 'label', label: '节点' }],
      rows: input.rows,
      grouping: ['nodeType'],
      totals: { rowCount: input.rows.length },
    },
    graph: {
      nodes: input.rows,
      edges: input.edges,
      layout: 'vertical',
      legend: ['mainChain'],
    },
    evidence: {
      count: input.rows.length,
      items: input.rows.map((row) => ({ type: 'record' as const, label: row.label, refId: row.nodeId })),
    },
    actions: { available: ['deviation', 'complaint', 'recallAssessment'], recommended: [], created: [] },
    export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null as string | null },
    meta: baseMeta(),
    extensions: {},
  };
}

export function mapForwardTraceResult(materialBatch: any, permission: any): any {
  const rows = [materialLotNode(materialBatch)];
  const edges: any[] = [];

  for (const usage of materialBatch.batchMaterialUsages ?? []) {
    const usageNode = ingredientUsageNode(usage);
    const productionNode = productionBatchNode(usage.productionBatch);
    rows.push(usageNode, productionNode);
    edges.push(edge(materialBatch.id, usage.id, 'usedIn', 'forward', edges.length));
    edges.push(edge(usage.id, usage.productionBatch.id, 'produces', 'forward', edges.length));

    for (const dn of usage.productionBatch.delivery_notes ?? []) {
      const deliveryNode = deliveryNoteNode(dn);
      rows.push(deliveryNode);
      edges.push(edge(usage.productionBatch.id, toStringId(dn.id), 'shippedBy', 'forward', edges.length));
    }
  }

  return buildTraceResult({
    queryId: `forward:${materialBatch.id}`,
    entryMode: 'object',
    objectType: 'materialLot',
    objectId: materialBatch.id,
    traceMode: 'forward',
    viewMode: 'ledger',
    timeMode: 'current',
    permission,
    rows,
    edges,
  });
}
