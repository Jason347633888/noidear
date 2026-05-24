/**
 * MixingService ownership tests
 * mixingExecution.operatorId is the user FK for ownership scoping.
 * admin → all; user → operatorId = userId; create writes operatorId from caller.
 */
import { MixingService } from './mixing.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    mixingExecution: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new MixingService(prisma), prisma };
}

describe('MixingService.listExecutions with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all executions (no operatorId filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listExecutions({} as any, o);
    const callWhere = prisma.mixingExecution.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('operatorId');
  });

  it('user sees executions where operatorId = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listExecutions({} as any, o);
    const callWhere = prisma.mixingExecution.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('operatorId', 'u-1');
  });

  it('leader sees executions where operatorId IN managed dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listExecutions({} as any, o);
    const callWhere = prisma.mixingExecution.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('operatorId', { in: ['m-1', 'm-2'] });
  });
});

// Helper to build a minimal transaction mock (no shiftTypeId so shiftType table is not accessed)
function buildTxMock(capturedData?: Record<string, any>) {
  return {
    recipe: { findFirst: jest.fn().mockResolvedValue({ id: 'r-1', product_id: 'p-1' }) },
    recipeLine: { findMany: jest.fn().mockResolvedValue([]) },
    mixingExecution: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((args: any) => {
        if (capturedData) Object.assign(capturedData, args.data);
        return Promise.resolve({ id: 'exec-new', ...(args.data.operatorId ? { operatorId: args.data.operatorId } : {}) });
      }),
      findUnique: jest.fn().mockResolvedValue({ id: 'exec-new', shift_type: null, lines: [] }),
    },
    mixingExecutionLine: { create: jest.fn().mockResolvedValue({}) },
    stagingAreaStock: { findFirst: jest.fn(), updateMany: jest.fn() },
  };
}

// Base DTO without shiftTypeId to avoid shiftType / stagingAreaStocktake table access
const baseDto = {
  recipeId: 'r-1',
  productId: 'p-1',
  areaId: 'area-1',
  workDate: '2026-05-24',
  actualWeight: 100,
  lines: [],
} as any;

describe('MixingService.createExecution writes operatorId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('createExecution without operatorId does not set operatorId field', async () => {
    const capturedData: any = {};
    const prisma: any = {
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(buildTxMock(capturedData))),
    };
    const svc = new MixingService(prisma);
    await svc.createExecution(baseDto);
    expect(capturedData).not.toHaveProperty('operatorId');
  });

  it('createExecution with operatorId sets operatorId in data', async () => {
    const capturedData: any = {};
    const prisma: any = {
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(buildTxMock(capturedData))),
    };
    const svc = new MixingService(prisma);
    await svc.createExecution(baseDto, 'u-42');
    expect(capturedData).toHaveProperty('operatorId', 'u-42');
  });

  it('user can see own execution via listExecutions after create with operatorId', async () => {
    const prisma: any = {
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(buildTxMock())),
      mixingExecution: {
        findMany: jest.fn().mockResolvedValue([{ id: 'exec-new', operatorId: 'u-77' }]),
        count: jest.fn().mockResolvedValue(1),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new MixingService(prisma);
    const o: OwnershipContext = { userId: 'u-77', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    const result = await svc.listExecutions({} as any, o);
    const callWhere = prisma.mixingExecution.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('operatorId', 'u-77');
  });
});
