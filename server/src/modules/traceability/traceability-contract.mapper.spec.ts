import { mapForwardTraceResult } from './traceability-contract.mapper';

describe('traceability contract mapper', () => {
  it('maps a material batch chain into the frozen TraceQueryResult shape', () => {
    const result = mapForwardTraceResult({
      id: 'mb-1',
      batch_no: 'RM-001',
      batchMaterialUsages: [
        {
          id: 'use-1',
          quantity: 10,
          productionBatch: {
            id: 'pb-1',
            batch_no: 'PB-001',
            delivery_notes: [{ id: 'dn-1', delivery_no: 'DN-001' }],
          },
        },
      ],
    } as any, {
      departmentScope: '品质',
      scenarioPermissions: ['forwardTrace'],
      canViewSummary: true,
      canViewDetail: true,
      canViewEvidence: true,
      canInitiateLinkage: true,
      canExportSimple: true,
      canExportFullPackage: true,
      canUseAsOfPlayback: true,
      canExecuteHighRiskAction: false,
    });

    expect(result.summary.objectType).toBe('materialLot');
    expect(result.ledger.rows.map((row: any) => row.nodeType)).toEqual([
      'materialLot',
      'ingredientUsage',
      'productionBatch',
      'deliveryNote',
    ]);
    expect(result.graph.nodes).toHaveLength(4);
  });
});
