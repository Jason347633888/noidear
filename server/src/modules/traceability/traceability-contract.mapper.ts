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

export function mapForwardTraceResult(materialBatch: any, permission: any): any {
  const rows: any[] = [];

  rows.push({
    nodeId: materialBatch.id,
    nodeType: 'materialLot',
    businessObject: 'MaterialBatch',
    label: materialBatch.batch_no,
    batchNo: materialBatch.batch_no,
    riskLevel: 'normal',
    permission: defaultPermission(),
  });

  for (const usage of materialBatch.batchMaterialUsages ?? []) {
    rows.push({
      nodeId: usage.id,
      nodeType: 'ingredientUsage',
      businessObject: 'BatchMaterialUsage',
      label: `投料 ${usage.quantity}`,
      riskLevel: 'normal',
      permission: { ...defaultPermission(), actionable: false },
      attributes: { quantity: usage.quantity },
    });

    rows.push({
      nodeId: usage.productionBatch.id,
      nodeType: 'productionBatch',
      businessObject: 'ProductionBatch',
      label: usage.productionBatch.batch_no,
      batchNo: usage.productionBatch.batch_no,
      riskLevel: 'normal',
      permission: defaultPermission(),
    });

    for (const fg of usage.productionBatch.finishedGoods ?? []) {
      rows.push({
        nodeId: fg.id,
        nodeType: 'productionBatch',
        businessObject: 'ProductionBatch',
        label: fg.batch_no,
        batchNo: fg.batch_no,
        riskLevel: 'normal',
        permission: defaultPermission(),
      });
    }

    for (const dn of usage.productionBatch.delivery_notes ?? []) {
      rows.push({
        nodeId: dn.id,
        nodeType: 'deliveryNote',
        businessObject: 'DeliveryNote',
        label: dn.delivery_no,
        batchNo: dn.delivery_no,
        riskLevel: 'normal',
        permission: { ...defaultPermission(), actionable: false },
      });
    }
  }

  return {
    summary: {
      queryId: `forward:${materialBatch.id}`,
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: materialBatch.id,
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
      riskLevel: 'normal',
      resultStatus: rows.length ? 'ok' : 'empty',
    },
    permission,
    risk: { summaryRiskLevel: 'normal', riskCount: 0, highRiskCount: 0, items: [] },
    ledger: {
      columns: [{ key: 'label', label: '节点' }],
      rows,
      grouping: ['nodeType'],
      totals: { rowCount: rows.length },
    },
    graph: {
      nodes: rows,
      edges: rows.slice(1).map((row: any, index: number) => ({
        edgeId: `edge-${index + 1}`,
        sourceNodeId: rows[index].nodeId,
        targetNodeId: row.nodeId,
        relationType: 'linked',
        direction: 'forward',
        isMainChain: true,
        isAuxiliary: false,
      })),
      layout: 'vertical',
      legend: ['mainChain'],
    },
    evidence: { count: 0, items: [] },
    actions: { available: ['deviation', 'complaint'], recommended: [], created: [] },
    export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null },
    meta: baseMeta(),
    extensions: {},
  };
}
