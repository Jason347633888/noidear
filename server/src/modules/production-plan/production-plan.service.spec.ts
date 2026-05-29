import { ProductionPlanService } from './production-plan.service';

describe('ProductionPlanService', () => {
  it('releases a plan and derives production tasks per plan item', async () => {
    const prisma = {
      productionPlan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'plan-1',
          company_id: 'tenant-1',
          status: 'draft',
          items: [{ id: 'item-1', productId: 'product-1', recipeId: 'recipe-1' }],
        }),
        update: jest.fn().mockResolvedValue({ id: 'plan-1', status: 'released' }),
      },
      productionTask: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
      productionBatch: { create: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    const service = new ProductionPlanService(prisma as any);
    await service.releasePlan('plan-1', 'tenant-1', 'user-1');
    expect(prisma.productionTask.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ planItemId: 'item-1', taskType: 'mixing' }),
        expect.objectContaining({ planItemId: 'item-1', taskType: 'inspection' }),
        expect.objectContaining({ planItemId: 'item-1', taskType: 'packaging' }),
      ],
      skipDuplicates: true,
    });
    expect(prisma.productionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({ status: 'released' }),
      }),
    );
    expect(prisma.productionBatch.create).not.toHaveBeenCalled();
  });
});
