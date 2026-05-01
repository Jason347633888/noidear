import { BadRequestException } from '@nestjs/common';
import { ProcessStepApprovalService } from './process-step-approval.service';

const SEVEN_STEPS = Array.from({ length: 7 }, (_, i) => ({ stepNumber: i + 1 }));

const makeTxStep6 = (recipeLines: any[]) => ({
  processStepData: {
    findUnique: jest.fn().mockResolvedValue({
      data: { recipeLines },
    }),
    update: jest.fn().mockResolvedValue({}),
  },
  processInstance: { update: jest.fn().mockResolvedValue({}) },
  workshopArea: {
    findFirst: jest.fn().mockResolvedValue({ id: 'area-1', name: '配料间A' }),
  },
  recipe: {
    create: jest.fn().mockResolvedValue({ id: 'recipe-1' }),
  },
  recipeLine: {
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
});

describe('ProcessStepApprovalService – applyApprovedStepEffects step 6', () => {
  const svc = new ProcessStepApprovalService(null as any);
  const instance = { id: 'pi-1', productId: 'prod-1' };

  it('writes area_id and area_name_snapshot for each recipe line', async () => {
    const tx = makeTxStep6([
      { materialId: 'mat-1', areaId: 'area-1', qtyPerBatch: '8', unit: 'kg' },
    ]);

    await (svc as any).applyApprovedStepEffects(tx, instance, 6, SEVEN_STEPS, 'approver-1');

    expect(tx.workshopArea.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'area-1' }) }),
    );
    expect(tx.recipeLine.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ area_id: 'area-1', area_name_snapshot: '配料间A' }),
      ]),
    });
  });

  it('throws BadRequestException when areaId is missing', async () => {
    const tx = makeTxStep6([{ materialId: 'mat-2', qtyPerBatch: '3', unit: 'kg' }]);

    await expect(
      (svc as any).applyApprovedStepEffects(tx, instance, 6, SEVEN_STEPS, 'approver-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when area is not found in DB', async () => {
    const tx = makeTxStep6([
      { materialId: 'mat-3', areaId: 'ghost-area', qtyPerBatch: '2', unit: 'kg' },
    ]);
    tx.workshopArea.findFirst.mockResolvedValue(null);

    await expect(
      (svc as any).applyApprovedStepEffects(tx, instance, 6, SEVEN_STEPS, 'approver-1'),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('ProcessStepApprovalService', () => {
  describe('checkAllApproved', () => {
    it('should return true when all required roles approved', () => {
      const required = [{ role: 'quality' }, { role: 'manufacture' }];
      const approvals = [
        { role: 'quality', status: 'APPROVED' },
        { role: 'manufacture', status: 'APPROVED' },
      ];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, approvals)).toBe(true);
    });

    it('should return false when one role is still PENDING', () => {
      const required = [{ role: 'quality' }, { role: 'manufacture' }];
      const approvals = [
        { role: 'quality', status: 'APPROVED' },
        { role: 'manufacture', status: 'PENDING' },
      ];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, approvals)).toBe(false);
    });

    it('should return false when no approvals exist', () => {
      const required = [{ role: 'gm' }];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, [])).toBe(false);
    });

    it('should return true when step has no required approvals (Step3)', () => {
      const required: unknown[] = [];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, [])).toBe(true);
    });
  });
});
