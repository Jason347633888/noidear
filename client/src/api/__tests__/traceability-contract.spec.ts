import type { TraceQueryRequest, TraceQueryResult } from '@noidear/types';

describe('traceability contract types', () => {
  it('exposes the frozen query request and result contracts', () => {
    const request: TraceQueryRequest = {
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
    };

    const result: TraceQueryResult = {
      summary: {
        queryId: 'q-1',
        entryMode: 'object',
        objectType: 'materialLot',
        objectId: 'mb-1',
        traceMode: 'forward',
        viewMode: 'ledger',
        timeMode: 'current',
        riskLevel: 'normal',
        resultStatus: 'ok',
      },
      permission: {
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
      },
      risk: { summaryRiskLevel: 'normal', riskCount: 0, highRiskCount: 0, items: [] },
      ledger: { columns: [], rows: [], grouping: [], totals: {} },
      graph: { nodes: [], edges: [], layout: 'vertical', legend: [] },
      evidence: { count: 0, items: [] },
      actions: { available: [], recommended: [], created: [] },
      export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null },
      meta: { generatedAt: '2026-04-24T00:00:00.000Z', queryHash: 'hash-1', degraded: false, snapshotId: null, sourceVersion: 'traceability-query-contract/v1' },
      extensions: {},
    };

    expect(request.entryMode).toBe('object');
    expect(result.summary.resultStatus).toBe('ok');
  });
});
