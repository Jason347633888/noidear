import { BadRequestException } from '@nestjs/common';
import { FragileItemLedgerService } from './fragile-item-ledger.service';

describe('FragileItemLedgerService', () => {
  describe('createLedger', () => {
    it('creates a ledger item with required fields', async () => {
      const mockLedger = {
        id: 'ledger-1',
        company_id: 'company-1',
        code: 'GBO-001',
        name: '玻璃量杯',
        material_type: 'glass',
        area_point_id: 'area-1',
        risk_level: 'high',
        status: 'active',
      };
      const prisma: any = {
        fragileItemLedger: {
          create: jest.fn().mockResolvedValue(mockLedger),
        },
      };
      const service = new FragileItemLedgerService(prisma, null as any);

      const result = await service.createLedger(
        {
          code: 'GBO-001',
          name: '玻璃量杯',
          material_type: 'glass',
          area_point_id: 'area-1',
          risk_level: 'high',
        },
        'company-1',
      );

      expect(result).toEqual(mockLedger);
      expect(prisma.fragileItemLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'GBO-001',
          name: '玻璃量杯',
          material_type: 'glass',
          area_point_id: 'area-1',
          risk_level: 'high',
          company_id: 'company-1',
        }),
      });
    });

    it('stores evidence_file_id for risk assessment on ledger item', async () => {
      const prisma: any = {
        fragileItemLedger: {
          create: jest.fn().mockResolvedValue({ id: 'ledger-2' }),
        },
      };
      const service = new FragileItemLedgerService(prisma, null as any);

      await service.createLedger(
        {
          code: 'GBO-002',
          name: '温度计',
          material_type: 'glass',
          area_point_id: 'area-1',
          risk_level: 'medium',
          risk_assessment_id: 'file-evidence-1',
        },
        'company-1',
      );

      expect(prisma.fragileItemLedger.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          risk_assessment_id: 'file-evidence-1',
        }),
      });
    });
  });

  describe('createUsageReturn', () => {
    it('creates usage return record normally', async () => {
      const mockReturn = { id: 'return-1', result: 'intact' };
      const prisma: any = {
        fragileItemLedger: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ledger-1',
            company_id: 'company-1',
            status: 'active',
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        fragileItemUsageReturn: {
          create: jest.fn().mockResolvedValue(mockReturn),
        },
        nonConformance: {
          create: jest.fn(),
        },
        $transaction: jest.fn((fn: any) => fn(prisma)),
      };
      const numberSequence: any = {
        generateNonConformanceNo: jest.fn(),
      };
      const service = new FragileItemLedgerService(prisma, numberSequence);

      const result = await service.createUsageReturn(
        {
          fragile_item_id: 'ledger-1',
          used_at: '2026-05-30T09:00:00',
          result: 'intact',
        },
        'company-1',
      );

      expect(result).toEqual(mockReturn);
      expect(prisma.fragileItemUsageReturn.create).toHaveBeenCalled();
      expect(prisma.nonConformance.create).not.toHaveBeenCalled();
    });

    it('result=missing creates NonConformance and sets fragile_item status to inactive', async () => {
      const mockReturn = { id: 'return-2', result: 'missing' };
      const prisma: any = {
        fragileItemLedger: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ledger-1',
            company_id: 'company-1',
            status: 'active',
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        fragileItemUsageReturn: {
          create: jest.fn().mockResolvedValue(mockReturn),
        },
        nonConformance: {
          create: jest.fn().mockResolvedValue({ id: 'nc-1' }),
        },
        $transaction: jest.fn((fn: any) => fn(prisma)),
      };
      const numberSequence: any = {
        generateNonConformanceNo: jest.fn().mockResolvedValue('NC-2026-001'),
      };
      const service = new FragileItemLedgerService(prisma, numberSequence);

      await service.createUsageReturn(
        {
          fragile_item_id: 'ledger-1',
          used_at: '2026-05-30T09:00:00',
          result: 'missing',
        },
        'company-1',
        'user-1',
      );

      expect(prisma.fragileItemLedger.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ledger-1' },
          data: expect.objectContaining({ status: 'inactive' }),
        }),
      );
      expect(prisma.nonConformance.create).toHaveBeenCalled();
    });

    it('result=broken creates NonConformance but does not change status to inactive', async () => {
      const mockReturn = { id: 'return-3', result: 'broken' };
      const prisma: any = {
        fragileItemLedger: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'ledger-1',
            company_id: 'company-1',
            status: 'active',
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        fragileItemUsageReturn: {
          create: jest.fn().mockResolvedValue(mockReturn),
        },
        nonConformance: {
          create: jest.fn().mockResolvedValue({ id: 'nc-2' }),
        },
        $transaction: jest.fn((fn: any) => fn(prisma)),
      };
      const numberSequence: any = {
        generateNonConformanceNo: jest.fn().mockResolvedValue('NC-2026-002'),
      };
      const service = new FragileItemLedgerService(prisma, numberSequence);

      await service.createUsageReturn(
        {
          fragile_item_id: 'ledger-1',
          used_at: '2026-05-30T09:00:00',
          result: 'broken',
        },
        'company-1',
        'user-1',
      );

      // broken: NC is created
      expect(prisma.nonConformance.create).toHaveBeenCalled();
      // broken: item is NOT set to inactive (only missing does that)
      const updateCall = prisma.fragileItemLedger.update.mock.calls.find(
        (c: any[]) => c[0]?.data?.status === 'inactive',
      );
      expect(updateCall).toBeUndefined();
    });

    it('throws BadRequestException when fragile item does not exist', async () => {
      const prisma: any = {
        fragileItemLedger: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        $transaction: jest.fn((fn: any) => fn(prisma)),
      };
      const service = new FragileItemLedgerService(prisma, null as any);

      await expect(
        service.createUsageReturn(
          { fragile_item_id: 'missing', used_at: '2026-05-30T09:00:00', result: 'intact' },
          'company-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when fragile item belongs to different company', async () => {
      const prisma: any = {
        fragileItemLedger: {
          findUnique: jest.fn().mockResolvedValue({ id: 'ledger-1', company_id: 'other-company', status: 'active' }),
        },
        $transaction: jest.fn((fn: any) => fn(prisma)),
      };
      const service = new FragileItemLedgerService(prisma, null as any);

      await expect(
        service.createUsageReturn(
          { fragile_item_id: 'ledger-1', used_at: '2026-05-30T09:00:00', result: 'intact' },
          'company-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
