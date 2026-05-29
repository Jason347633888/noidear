import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';
import { BatchNumberGeneratorService } from '../batch-trace/services/batch-number-generator.service';
import { InventoryMovementLedgerService } from '../warehouse/services/inventory-movement-ledger.service';
import { IncomingInspectionService } from './incoming-inspection.service';

describe('IncomingInspectionService report documents', () => {
  let service: IncomingInspectionService;
  let prisma: PrismaService;
  let storage: jest.Mocked<StorageService>;
  let businessDocumentLinkService: jest.Mocked<BusinessDocumentLinkService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomingInspectionService,
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: PrismaService,
          useValue: {
            incomingInspection: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
            document: { create: jest.fn() },
            businessDocumentLink: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            getSignedUrl: jest.fn(),
          },
        },
        {
          provide: BusinessDocumentLinkService,
          useValue: { link: jest.fn() },
        },
        {
          provide: BatchNumberGeneratorService,
          useValue: { generateBatchNumber: jest.fn() },
        },
        {
          provide: InventoryMovementLedgerService,
          useValue: { recordMaterialBatchMovement: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(IncomingInspectionService);
    prisma = module.get(PrismaService);
    storage = module.get(StorageService);
    businessDocumentLinkService = module.get(BusinessDocumentLinkService);
  });

  it('uploads an incoming inspection report as Document and BusinessDocumentLink', async () => {
    const file = {
      originalname: 'inspection-report.pdf',
      mimetype: 'application/pdf',
      size: 2048,
      buffer: Buffer.from('pdf'),
    } as Express.Multer.File;
    const testedAt = new Date('2026-04-02');
    const expiresAt = new Date('2027-04-02');

    jest.spyOn(prisma.incomingInspection, 'findFirst').mockResolvedValue({
      id: 'inspection-001',
      material_batch_id: 'batch-001',
      overall_result: 'pass',
    } as any);
    storage.uploadFile.mockResolvedValue({ path: 'incoming-inspection-reports/report.pdf' } as any);
    storage.getSignedUrl.mockResolvedValue('https://preview.local/inspection-report.pdf');
    (prisma.document.create as jest.Mock).mockResolvedValue({ id: 'doc-002' });
    businessDocumentLinkService.link.mockResolvedValue({ id: 'link-002' } as any);

    const result = await service.uploadReport('inspection-001', {
      reportName: '来料检验报告',
      reportNo: 'IR-001',
      testedAt,
      conclusion: 'pass',
      expiresAt,
    }, file, 'user-1', '1');

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: '来料检验报告',
        filePath: 'incoming-inspection-reports/report.pdf',
        fileName: 'inspection-report.pdf',
        document_type: 'EXTERNAL_FILE',
        creatorId: 'user-1',
      }),
    });
    expect(businessDocumentLinkService.link).toHaveBeenCalledWith(expect.objectContaining({
      documentId: 'doc-002',
      businessType: 'incoming_inspection',
      businessId: 'inspection-001',
      documentKind: 'external_inspection_report',
      expiresAt,
      metadata: expect.objectContaining({ reportNo: 'IR-001', testedAt: testedAt.toISOString(), conclusion: 'pass' }),
    }));
    expect(result.preview).toEqual({
      type: 'pdf',
      url: 'https://preview.local/inspection-report.pdf',
      fileName: 'inspection-report.pdf',
    });
  });
});

describe('IncomingInspectionService incoming inspection gate', () => {
  let service: IncomingInspectionService;
  let prisma: any;
  let batchNumberGenerator: jest.Mocked<BatchNumberGeneratorService>;
  let inventoryMovementLedger: jest.Mocked<InventoryMovementLedgerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomingInspectionService,
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: PrismaService,
          useValue: {
            incomingInspection: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            materialInboundItem: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
            material: { findUnique: jest.fn() },
            materialBatch: { create: jest.fn() },
            stockRecord: { create: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        { provide: StorageService, useValue: { uploadFile: jest.fn(), getSignedUrl: jest.fn() } },
        { provide: BusinessDocumentLinkService, useValue: { link: jest.fn() } },
        { provide: BatchNumberGeneratorService, useValue: { generateBatchNumber: jest.fn() } },
        { provide: InventoryMovementLedgerService, useValue: { recordMaterialBatchMovement: jest.fn() } },
      ],
    }).compile();

    service = module.get(IncomingInspectionService);
    prisma = module.get(PrismaService);
    batchNumberGenerator = module.get(BatchNumberGeneratorService);
    inventoryMovementLedger = module.get(InventoryMovementLedgerService);
  });

  describe('create', () => {
    it('creates an inspection without a material_batch_id (always null on creation)', async () => {
      prisma.incomingInspection.create.mockImplementation(async (args: any) => ({
        id: 'insp-1',
        ...args.data,
        results: [],
      }));

      await service.create(
        {
          material_inbound_item_id: 'item-1',
          overall_result: 'pass',
          is_final: true,
          results: [{ item_name: '外观', is_pass: true }],
        } as any,
        '1',
        'inspector-1',
      );

      const callArg = prisma.incomingInspection.create.mock.calls[0][0];
      expect(callArg.data.material_batch_id).toBeNull();
      expect(callArg.data.material_inbound_item_id).toBe('item-1');
      expect(callArg.data.is_final).toBe(true);
      expect(callArg.data.company_id).toBe('1');
    });

    it('rejects creation payloads that provide a material_batch_id', async () => {
      await expect(
        service.create(
          {
            material_inbound_item_id: 'item-1',
            material_batch_id: 'batch-x',
            overall_result: 'pass',
            results: [{ item_name: '外观', is_pass: true }],
          } as any,
          '1',
          'inspector-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.incomingInspection.create).not.toHaveBeenCalled();
    });
  });

  describe('releaseFinalInspection', () => {
    const baseInspection = {
      id: 'insp-1',
      company_id: '1',
      material_inbound_item_id: 'item-1',
      is_final: true,
      material_batch_id: null,
      disposition: null,
      overall_result: 'pass',
    };
    const baseItem = {
      id: 'item-1',
      materialId: 'mat-1',
      quantity: 100,
      supplierBatchNo: 'SUP-1',
      productionDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-07-01'),
      createdBatchId: null,
      inbound: { id: 'inbound-1', supplierId: 'supplier-1' },
    };

    function mockTx(txClient: any) {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txClient));
    }

    it('creates batch + ledger + stock projection and backlinks on a passing final inspection', async () => {
      prisma.incomingInspection.findFirst.mockResolvedValue({ ...baseInspection });
      prisma.materialInboundItem.findUnique.mockResolvedValue({ ...baseItem });
      prisma.material.findUnique.mockResolvedValue({ unit: 'kg' });
      batchNumberGenerator.generateBatchNumber.mockResolvedValue('MB-20260529-001');

      const txClient = {
        materialBatch: { create: jest.fn().mockResolvedValue({ id: 'batch-1' }) },
        materialInboundItem: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        stockRecord: { create: jest.fn() },
        incomingInspection: { update: jest.fn() },
      };
      mockTx(txClient);

      const result = await service.releaseFinalInspection('item-1', '1', 'user-1');

      expect(result).toEqual({ released: true, batchId: 'batch-1' });
      expect(txClient.materialBatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          batchNumber: 'MB-20260529-001',
          materialId: 'mat-1',
          supplierId: 'supplier-1',
          quantity: 100,
          status: 'normal',
        }),
      });
      expect(inventoryMovementLedger.recordMaterialBatchMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: 'receive',
          batchId: 'batch-1',
          refType: 'incoming_inspection',
          refId: 'insp-1',
        }),
        txClient,
      );
      expect(txClient.stockRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          batchId: 'batch-1',
          recordType: 'in',
          quantity: 100,
          relatedType: 'incoming_inspection',
        }),
      });
      expect(txClient.materialInboundItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1', createdBatchId: null },
          data: expect.objectContaining({ createdBatchId: 'batch-1' }),
        }),
      );
      expect(txClient.incomingInspection.update).toHaveBeenCalledWith({
        where: { id: 'insp-1' },
        data: { material_batch_id: 'batch-1' },
      });
    });

    it('throws and creates nothing on a failed final inspection', async () => {
      prisma.incomingInspection.findFirst.mockResolvedValue({ ...baseInspection, overall_result: 'fail' });
      prisma.materialInboundItem.findUnique.mockResolvedValue({ ...baseItem });

      await expect(service.releaseFinalInspection('item-1', '1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(inventoryMovementLedger.recordMaterialBatchMovement).not.toHaveBeenCalled();
    });

    it('is idempotent: does not create a second batch when the item already has createdBatchId', async () => {
      prisma.incomingInspection.findFirst.mockResolvedValue({ ...baseInspection });
      prisma.materialInboundItem.findUnique.mockResolvedValue({ ...baseItem, createdBatchId: 'batch-existing' });

      const result = await service.releaseFinalInspection('item-1', '1', 'user-1');

      expect(result).toEqual({ released: false, batchId: 'batch-existing' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(batchNumberGenerator.generateBatchNumber).not.toHaveBeenCalled();
      expect(inventoryMovementLedger.recordMaterialBatchMovement).not.toHaveBeenCalled();
    });

    it('concurrency loser: in-tx claim matches zero rows → throws and writes no ledger/stock/backlink', async () => {
      prisma.incomingInspection.findFirst.mockResolvedValue({ ...baseInspection });
      prisma.materialInboundItem.findUnique.mockResolvedValue({ ...baseItem });
      prisma.material.findUnique.mockResolvedValue({ unit: 'kg' });
      batchNumberGenerator.generateBatchNumber.mockResolvedValue('MB-20260529-002');

      // A concurrent transaction already claimed the inbound item: the
      // conditional updateMany matches 0 rows, so the claim fails.
      const txClient = {
        materialBatch: { create: jest.fn().mockResolvedValue({ id: 'batch-2' }) },
        materialInboundItem: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
        stockRecord: { create: jest.fn() },
        incomingInspection: { update: jest.fn() },
      };
      mockTx(txClient);

      await expect(service.releaseFinalInspection('item-1', '1', 'user-1')).rejects.toThrow(
        ConflictException,
      );

      // The claim fails BEFORE any ledger / stock / backlink writes happen, so
      // no second batch/movement/stockRecord can ever be created.
      expect(inventoryMovementLedger.recordMaterialBatchMovement).not.toHaveBeenCalled();
      expect(txClient.stockRecord.create).not.toHaveBeenCalled();
      expect(txClient.incomingInspection.update).not.toHaveBeenCalled();
    });
  });
});
