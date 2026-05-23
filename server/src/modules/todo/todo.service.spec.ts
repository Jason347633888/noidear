import { Test, TestingModule } from '@nestjs/testing';
import { TodoService } from './todo.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { OwnershipContext } from '../module-access/ownership-context';

const mockPrisma = {
  todoTask: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
};

const makeTodo = (overrides = {}) => ({
  id: '1', type: 'training_attend', relatedId: 'proj1', status: 'pending',
  title: '参加培训', priority: 'normal', dueDate: null,
  completedAt: null, completedBy: null, createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TodoService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<TodoService>(TodoService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated items with computed actionRoute', async () => {
      mockPrisma.todoTask.findMany.mockResolvedValue([makeTodo()]);
      mockPrisma.todoTask.count.mockResolvedValue(1);

      const result = await service.findAll('user1', { status: 'all', type: 'all', page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].actionRoute).toBe('/training/projects/proj1');
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(mockPrisma.todoTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user1' }) }),
      );
    });

    it('sets actionRoute null for unmapped type (inventory)', async () => {
      mockPrisma.todoTask.findMany.mockResolvedValue([makeTodo({ type: 'inventory' })]);
      mockPrisma.todoTask.count.mockResolvedValue(1);

      const result = await service.findAll('user1', { status: 'all', type: 'all', page: 1, limit: 20 });
      expect(result.items[0].actionRoute).toBeNull();
    });

    it('sets actionRoute for document renewal todos to document detail', async () => {
      mockPrisma.todoTask.findMany.mockResolvedValue([makeTodo({ type: 'document_renewal', relatedId: 'doc1' })]);
      mockPrisma.todoTask.count.mockResolvedValue(1);

      const result = await service.findAll('user1', { status: 'all', type: 'all', page: 1, limit: 20 });
      expect(result.items[0].actionRoute).toBe('/documents/doc1');
    });

    it('routes change_execution_failed todos to product-by-plan redirect', async () => {
      mockPrisma.todoTask.findMany.mockResolvedValue([
        makeTodo({ type: 'change_execution_failed', relatedId: 'plan-99' }),
      ]);
      mockPrisma.todoTask.count.mockResolvedValue(1);

      const result = await service.findAll('user1', { status: 'all', type: 'all', page: 1, limit: 20 });
      expect(result.items[0].actionRoute).toBe('/products/by-plan/plan-99');
    });

    it('sets hasMore true when more pages exist', async () => {
      mockPrisma.todoTask.findMany.mockResolvedValue(new Array(5).fill(makeTodo()));
      mockPrisma.todoTask.count.mockResolvedValue(10);

      const result = await service.findAll('user1', { status: 'all', type: 'all', page: 1, limit: 5 });
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('returns all TodoType keys with zero-fill and byStatus counts', async () => {
      mockPrisma.todoTask.groupBy.mockResolvedValue([
        { type: 'training_attend', status: 'pending', _count: { id: 3 } },
        { type: 'approval', status: 'completed', _count: { id: 1 } },
      ]);

      const result = await service.getStatistics('user1');

      expect(result.byStatus.pending).toBe(3);
      expect(result.byStatus.completed).toBe(1);
      expect(result.total).toBe(4);
      expect(result.byType['training_attend']).toBe(3);
      expect(result.byType['approval']).toBe(1);
      expect(result.byType['equipment_maintain']).toBe(0);
      expect(result.byType['document_renewal']).toBe(0);
      expect(result.byType['change_execution_failed']).toBe(0);
      // audit_rectification was removed; key must be absent from the zero-fill map.
      expect((result.byType as Record<string, number>).audit_rectification).toBeUndefined();
    });
  });

  describe('complete', () => {
    it('marks pending todo as completed and writes completedBy', async () => {
      mockPrisma.todoTask.findFirst.mockResolvedValue(makeTodo({ id: 'todo1', userId: 'user1' }));
      mockPrisma.todoTask.update.mockResolvedValue({
        id: 'todo1', status: 'completed', completedAt: new Date(), completedBy: 'user1',
      });

      const result = await service.complete('todo1', 'user1');

      expect(result.status).toBe('completed');
      expect(mockPrisma.todoTask.update).toHaveBeenCalledWith({
        where: { id: 'todo1' },
        data: expect.objectContaining({ status: 'completed', completedBy: 'user1' }),
      });
    });

    it('throws NotFoundException when todo not found', async () => {
      mockPrisma.todoTask.findFirst.mockResolvedValue(null);
      await expect(service.complete('missing', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when already completed (non-idempotent)', async () => {
      mockPrisma.todoTask.findFirst.mockResolvedValue(makeTodo({ id: 'todo1', userId: 'user1', status: 'completed' }));
      await expect(service.complete('todo1', 'user1')).rejects.toThrow(ConflictException);
    });
  });
});

describe('TodoService.listForUser ownership', () => {
  const prisma = { todoTask: { findMany: jest.fn() }, user: { findMany: jest.fn() } } as any;
  const svc = new TodoService(prisma as any);

  beforeEach(() => jest.clearAllMocks());

  it('admin sees all', async () => {
    prisma.todoTask.findMany.mockResolvedValue([]);
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForUser(ownership);
    expect(prisma.todoTask.findMany).toHaveBeenCalledWith({});
  });

  it('user sees only own todos', async () => {
    prisma.todoTask.findMany.mockResolvedValue([]);
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-x', managedDepartmentIds: [] };
    await svc.listForUser(ownership);
    expect(prisma.todoTask.findMany).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
  });

  it('leader sees todos of users in managed depts', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);
    prisma.todoTask.findMany.mockResolvedValue([]);
    const ownership: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForUser(ownership);
    expect(prisma.todoTask.findMany).toHaveBeenCalledWith({ where: { userId: { in: ['u-1', 'u-2'] } } });
  });
});
