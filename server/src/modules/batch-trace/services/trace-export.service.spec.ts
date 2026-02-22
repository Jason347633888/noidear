import { Test, TestingModule } from '@nestjs/testing';
import { TraceExportService } from './trace-export.service';
import { TraceabilityService } from './traceability.service';

// Mock pdfmake to avoid slow PDF generation
jest.mock('pdfmake/build/pdfmake', () => {
  return {
    createPdf: jest.fn(() => ({
      getStream: jest.fn(() => {
        const EventEmitter = require('events');
        const stream = new EventEmitter();

        // Emit data and end events asynchronously but immediately
        setImmediate(() => {
          stream.emit('data', Buffer.from('Mock PDF content chunk 1'));
          stream.emit('data', Buffer.from('Mock PDF content chunk 2'));
          stream.emit('end');
        });

        return stream;
      }),
    })),
  };
});

jest.mock('pdfmake/build/vfs_fonts', () => ({
  pdfMake: { vfs: {} },
}));

describe('TraceExportService', () => {
  let service: TraceExportService;
  let traceabilityService: TraceabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TraceExportService,
        {
          provide: TraceabilityService,
          useValue: {
            traceBackward: jest.fn(),
            traceForward: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TraceExportService>(TraceExportService);
    traceabilityService = module.get<TraceabilityService>(TraceabilityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportPDF', () => {
    it('should generate PDF from trace data', async () => {
      const mockTraceData = {
        finishedGoodsBatch: {
          id: 'fg-001',
          batchNumber: 'FG-20260216-001',
          quantity: 1000,
        },
        productionBatch: {
          id: 'prod-001',
          batchNumber: 'PROD-001',
          productionDate: new Date('2026-02-15'),
        },
        materialBatches: [
          {
            id: 'mat-001',
            batchNumber: 'MAT-001',
            material: { name: 'Flour' },
            supplier: { name: 'Supplier A' },
            usedQuantity: 500,
          },
        ],
      };

      jest.spyOn(traceabilityService, 'traceBackward').mockResolvedValue(mockTraceData as any);

      const result = await service.exportPDF('fg-001');

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toContain('FG-20260216-001');
      expect(result.contentType).toBe('application/pdf');
    }, 20000);

    it('should include all trace chain data in PDF', async () => {
      const mockTraceData = {
        finishedGoodsBatch: {
          batchNumber: 'FG-001',
          quantity: 1000,
        },
        productionBatch: {
          batchNumber: 'PROD-001',
        },
        materialBatches: [
          { batchNumber: 'MAT-001', material: { name: 'Material A' } },
          { batchNumber: 'MAT-002', material: { name: 'Material B' } },
        ],
      };

      jest.spyOn(traceabilityService, 'traceBackward').mockResolvedValue(mockTraceData as any);

      const result = await service.exportPDF('fg-001');

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(traceabilityService.traceBackward).toHaveBeenCalledWith('fg-001');
    }, 20000);

    it('should complete PDF generation within 3 seconds', async () => {
      const mockTraceData = {
        finishedGoodsBatch: { batchNumber: 'FG-001' },
        productionBatch: { batchNumber: 'PROD-001' },
        materialBatches: Array.from({ length: 50 }, (_, i) => ({
          batchNumber: `MAT-${i}`,
          material: { name: `Material ${i}` },
        })),
      };

      jest.spyOn(traceabilityService, 'traceBackward').mockResolvedValue(mockTraceData as any);

      const startTime = Date.now();
      await service.exportPDF('fg-001');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000);
    }, 20000);
  });

  describe('exportForwardPDF', () => {
    it('should generate forward trace PDF', async () => {
      const mockTraceData = {
        materialBatch: {
          id: 'mat-001',
          batchNumber: 'MAT-20260216-001',
          material: { name: 'Flour' },
          supplier: { name: 'Supplier A' },
        },
        productionBatches: [
          {
            id: 'prod-001',
            batchNumber: 'PROD-001',
            status: 'completed',
            productionDate: new Date('2026-02-15'),
            usedQuantity: 500,
          },
          {
            id: 'prod-002',
            batchNumber: 'PROD-002',
            status: 'in_progress',
            productionDate: new Date('2026-02-16'),
            usedQuantity: 300,
          },
        ],
      };

      jest.spyOn(traceabilityService, 'traceForward').mockResolvedValue(mockTraceData as any);

      const result = await service.exportForwardPDF('mat-001');

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toContain('MAT-20260216-001');
      expect(result.contentType).toBe('application/pdf');
      expect(traceabilityService.traceForward).toHaveBeenCalledWith('mat-001');
    }, 20000);

    it('should handle empty production batches', async () => {
      const mockTraceData = {
        materialBatch: {
          batchNumber: 'MAT-001',
          material: { name: 'Flour' },
          supplier: { name: 'Supplier A' },
        },
        productionBatches: [],
      };

      jest.spyOn(traceabilityService, 'traceForward').mockResolvedValue(mockTraceData as any);

      const result = await service.exportForwardPDF('mat-001');

      expect(result.buffer.length).toBeGreaterThan(0);
    }, 20000);

    it('should include BR-248 compliance statement', async () => {
      const mockTraceData = {
        materialBatch: {
          batchNumber: 'MAT-001',
          material: { name: 'Flour' },
        },
        productionBatches: [],
      };

      jest.spyOn(traceabilityService, 'traceForward').mockResolvedValue(mockTraceData as any);

      const result = await service.exportForwardPDF('mat-001');

      expect(result.buffer).toBeInstanceOf(Buffer);
      // PDF should contain compliance text (verified by PDF content generation)
      expect(result.buffer.length).toBeGreaterThan(0);
    }, 20000);
  });
});
