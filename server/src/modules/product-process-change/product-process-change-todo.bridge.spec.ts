import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductProcessChangeTodoBridge } from './product-process-change-todo.bridge';

describe('ProductProcessChangeTodoBridge', () => {
  let bridge: ProductProcessChangeTodoBridge;
  let prisma: { todoTask: { upsert: jest.Mock; updateMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { todoTask: { upsert: jest.fn(), updateMany: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductProcessChangeTodoBridge,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    bridge = moduleRef.get(ProductProcessChangeTodoBridge);
  });

  it('createFailureTodo upserts a pending todo for plan creator', async () => {
    await bridge.createFailureTodo({
      plan: { id: 'plan-1', product_id: 'prod-1', createdById: 'user-9' },
      actorId: 'approver-2',
      errorMessage: 'recipe area missing',
      productName: '椰丝咸蛋糕',
    });
    expect(prisma.todoTask.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type_relatedId: {
            userId: 'user-9',
            type: 'change_execution_failed',
            relatedId: 'plan-1',
          },
        },
        create: expect.objectContaining({
          userId: 'user-9',
          type: 'change_execution_failed',
          relatedId: 'plan-1',
          status: 'pending',
          priority: 'high',
          title: '产品工艺变更落库失败：椰丝咸蛋糕',
          description: 'recipe area missing',
        }),
        update: expect.objectContaining({
          status: 'pending',
          description: 'recipe area missing',
          completedAt: null,
          completedBy: null,
        }),
      }),
    );
  });

  it('createFailureTodo falls back to actorId when createdById is null', async () => {
    await bridge.createFailureTodo({
      plan: { id: 'plan-2', product_id: 'p2', createdById: null },
      actorId: 'approver-2',
      errorMessage: 'x',
      productName: 'p',
    });
    const call = prisma.todoTask.upsert.mock.calls[0][0];
    expect(call.where.userId_type_relatedId.userId).toBe('approver-2');
  });

  it('createFailureTodo swallows storage errors so the original exception survives', async () => {
    prisma.todoTask.upsert.mockRejectedValue(new Error('db down'));
    await expect(
      bridge.createFailureTodo({
        plan: { id: 'plan-3', product_id: 'p3', createdById: 'u' },
        actorId: 'a',
        errorMessage: 'x',
        productName: 'p',
      }),
    ).resolves.toBeUndefined();
  });

  it('closeFailureTodo marks all pending todos for the plan as completed', async () => {
    await bridge.closeFailureTodo('plan-1', 'user-3');
    expect(prisma.todoTask.updateMany).toHaveBeenCalledWith({
      where: { type: 'change_execution_failed', relatedId: 'plan-1', status: 'pending' },
      data: expect.objectContaining({
        status: 'completed',
        completedBy: 'user-3',
      }),
    });
    expect(prisma.todoTask.updateMany.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
  });
});
