import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { SupplierAccessService } from './supplier-access.service';

describe('SupplierAccessService', () => {
  let service: SupplierAccessService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierAccessService,
        {
          provide: PrismaService,
          useValue: {
            supplier: {
              findUnique: jest.fn(),
            },
            materialBatch: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(SupplierAccessService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assertSupplierUsable', () => {
    it('passes approved active suppliers', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-1',
        name: '合格供应商',
        status: 'active',
        supplier_status: 'approved',
        deletedAt: null,
      } as any);

      await expect(service.assertSupplierUsable('supplier-1', '创建来料单')).resolves.toBeUndefined();
    });

    it('rejects disabled suppliers', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-1',
        name: '停用供应商',
        status: 'disabled',
        supplier_status: 'approved',
        deletedAt: null,
      } as any);

      await expect(service.assertSupplierUsable('supplier-1', '创建来料单')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects eliminated suppliers', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-1',
        name: '淘汰供应商',
        status: 'active',
        supplier_status: 'eliminated',
        deletedAt: null,
      } as any);

      await expect(service.assertSupplierUsable('supplier-1', '创建来料单')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not reject suspended suppliers in GAP-103', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-1',
        name: '暂停供应商',
        status: 'active',
        supplier_status: 'suspended',
        deletedAt: null,
      } as any);

      await expect(service.assertSupplierUsable('supplier-1', '创建来料单')).resolves.toBeUndefined();
    });

    it('rejects missing suppliers', async () => {
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue(null);

      await expect(service.assertSupplierUsable('missing', '创建来料单')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertBatchSupplierUsable', () => {
    it('passes batches without supplier for legacy data', async () => {
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue({
        id: 'batch-1',
        deletedAt: null,
        supplierId: null,
        supplier: null,
      } as any);

      await expect(service.assertBatchSupplierUsable('batch-1', '完成领料')).resolves.toBeUndefined();
    });

    it('rejects batches from eliminated suppliers', async () => {
      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue({
        id: 'batch-1',
        deletedAt: null,
        supplierId: 'supplier-1',
        supplier: {
          id: 'supplier-1',
          name: '淘汰供应商',
          status: 'active',
          supplier_status: 'eliminated',
          deletedAt: null,
        },
      } as any);

      await expect(service.assertBatchSupplierUsable('batch-1', '完成领料')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
