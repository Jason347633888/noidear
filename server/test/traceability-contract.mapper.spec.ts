import { mapForwardTraceResult } from '../src/modules/traceability/traceability-contract.mapper';

describe('TraceabilityContractMapper', () => {
  describe('mapForwardTraceResult', () => {
    it('should map material batch with empty usages to expected structure', () => {
      const materialBatch = {
        id: 'batch-123',
        batch_no: 'BATCH-2024-001',
        batchMaterialUsages: [],
      };

      const permission = {
        visible: true,
        masked: false,
        expandable: true,
        actionable: true,
      };

      const result = mapForwardTraceResult(materialBatch, permission);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('permission');
      expect(result).toHaveProperty('ledger');
      expect(result).toHaveProperty('graph');
      expect(result).toHaveProperty('meta');

      expect(result.summary.queryId).toBe('forward:batch-123');
      expect(result.summary.traceMode).toBe('forward');
      expect(result.summary.resultStatus).toBe('ok');

      expect(result.ledger.rows).toHaveLength(1);
      expect(result.ledger.rows[0].label).toBe('BATCH-2024-001');
    });

    it('should include snapshotId in meta as null by default', () => {
      const materialBatch = {
        id: 'batch-456',
        batch_no: 'BATCH-2024-002',
        batchMaterialUsages: [],
      };

      const result = mapForwardTraceResult(materialBatch, {});

      expect(result.meta).toHaveProperty('snapshotId');
      expect(result.meta.snapshotId).toBeNull();
    });

    it('should include sourceVersion in meta', () => {
      const materialBatch = {
        id: 'batch-789',
        batch_no: 'BATCH-2024-003',
        batchMaterialUsages: [],
      };

      const result = mapForwardTraceResult(materialBatch, {});

      expect(result.meta.sourceVersion).toBe('traceability-query-contract/v1');
    });

    it('should map production batch and finished goods hierarchy', () => {
      const materialBatch = {
        id: 'mat-batch-001',
        batch_no: 'MATERIAL-001',
        batchMaterialUsages: [
          {
            id: 'usage-001',
            quantity: 100,
            productionBatch: {
              id: 'prod-batch-001',
              batch_no: 'PROD-001',
              finishedGoods: [
                {
                  id: 'fg-001',
                  batch_no: 'FG-BATCH-001',
                },
              ],
              delivery_notes: [],
            },
          },
        ],
      };

      const result = mapForwardTraceResult(materialBatch, {});

      const rows = result.ledger.rows;
      expect(rows.length).toBeGreaterThan(1);

      const nodeTypes = rows.map((r: any) => r.nodeType);
      expect(nodeTypes).toContain('materialLot');
      expect(nodeTypes).toContain('ingredientUsage');
      expect(nodeTypes).toContain('productionBatch');
      expect(nodeTypes).toContain('productionBatch');
    });

    it('should create edges for graph representation', () => {
      const materialBatch = {
        id: 'mat-batch-002',
        batch_no: 'MATERIAL-002',
        batchMaterialUsages: [
          {
            id: 'usage-002',
            quantity: 50,
            productionBatch: {
              id: 'prod-batch-002',
              batch_no: 'PROD-002',
              finishedGoods: [],
              delivery_notes: [],
            },
          },
        ],
      };

      const result = mapForwardTraceResult(materialBatch, {});

      expect(result.graph.edges.length).toBeGreaterThan(0);
      expect(result.graph.edges[0]).toHaveProperty('edgeId');
      expect(result.graph.edges[0]).toHaveProperty('sourceNodeId');
      expect(result.graph.edges[0]).toHaveProperty('targetNodeId');
      expect(result.graph.edges[0].direction).toBe('forward');
    });

    it('should set ok status when rows exist', () => {
      const materialBatch = {
        id: 'batch-ok',
        batch_no: 'BATCH-OK',
        batchMaterialUsages: [
          {
            id: 'usage-ok',
            quantity: 10,
            productionBatch: {
              id: 'prod-ok',
              batch_no: 'PROD-OK',
              finishedGoods: [],
              delivery_notes: [],
            },
          },
        ],
      };

      const result = mapForwardTraceResult(materialBatch, {});

      expect(result.summary.resultStatus).toBe('ok');
    });

    it('should include permission in result', () => {
      const materialBatch = {
        id: 'batch-perm',
        batch_no: 'BATCH-PERM',
        batchMaterialUsages: [],
      };

      const permission = {
        visible: false,
        masked: true,
      };

      const result = mapForwardTraceResult(materialBatch, permission);

      expect(result.permission).toEqual(permission);
    });

    it('should have generated timestamp in meta', () => {
      const materialBatch = {
        id: 'batch-time',
        batch_no: 'BATCH-TIME',
        batchMaterialUsages: [],
      };

      const result = mapForwardTraceResult(materialBatch, {});

      expect(result.meta.generatedAt).toBeDefined();
      expect(typeof result.meta.generatedAt).toBe('string');
      expect(new Date(result.meta.generatedAt)).toBeInstanceOf(Date);
    });
  });
});
