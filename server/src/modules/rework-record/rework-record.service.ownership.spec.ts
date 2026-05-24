/**
 * ReworkRecordService.findAll with ownership filtering
 * ReworkRecord.operator_id (nullable) is the user FK.
 */
import { ReworkRecordService } from './rework-record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    reworkRecord: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
    nonConformance: {},
  };
  return { svc: new ReworkRecordService(prisma), prisma };
}

describe('ReworkRecordService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all rework records (no operator_id filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll('company-1', o);
    const callWhere = prisma.reworkRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('operator_id');
  });

  it('user sees only rework records they operated', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll('company-1', o);
    expect(prisma.reworkRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ operator_id: 'u-1' }) }),
    );
  });

  it('leader sees rework records of managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll('company-1', o);
    expect(prisma.reworkRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ operator_id: { in: ['m-1', 'm-2'] } }) }),
    );
  });
});

describe('ReworkRecordService.create writes operator_id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create falls back to creatorId as operator_id when dto does not provide it', async () => {
    const capturedData: any = {};
    const prisma: any = {
      reworkRecord: {
        create: jest.fn().mockImplementation((args: any) => {
          Object.assign(capturedData, args.data);
          return Promise.resolve({ id: 'rw-new', operator_id: 'u-55' });
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      nonConformance: {
        findFirst: jest.fn().mockResolvedValue({ id: 'nc-1', source_type: 'manual', source_id: null }),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new ReworkRecordService(prisma);
    const dto = {
      nc_id: 'nc-1',
      rework_date: '2026-05-24',
      rework_qty: 10,
    } as any;
    await svc.create(dto, 'company-1', 'u-55');
    expect(capturedData).toHaveProperty('operator_id', 'u-55');
  });

  it('create preserves dto.operator_id when explicitly provided', async () => {
    const capturedData: any = {};
    const prisma: any = {
      reworkRecord: {
        create: jest.fn().mockImplementation((args: any) => {
          Object.assign(capturedData, args.data);
          return Promise.resolve({ id: 'rw-new', operator_id: 'explicit-op' });
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      nonConformance: {
        findFirst: jest.fn().mockResolvedValue({ id: 'nc-1', source_type: 'manual', source_id: null }),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new ReworkRecordService(prisma);
    const dto = {
      nc_id: 'nc-1',
      rework_date: '2026-05-24',
      rework_qty: 10,
      operator_id: 'explicit-op',
    } as any;
    await svc.create(dto, 'company-1', 'u-55');
    expect(capturedData).toHaveProperty('operator_id', 'explicit-op');
  });

  it('user can see own rework record via findAll after create with operator_id fallback', async () => {
    const prisma: any = {
      reworkRecord: {
        create: jest.fn().mockResolvedValue({ id: 'rw-new', operator_id: 'u-66' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'rw-new', operator_id: 'u-66' }]),
      },
      nonConformance: {
        findFirst: jest.fn().mockResolvedValue({ id: 'nc-2', source_type: 'manual', source_id: null }),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new ReworkRecordService(prisma);
    const dto = { nc_id: 'nc-2', rework_date: '2026-05-24', rework_qty: 5 } as any;
    await svc.create(dto, 'company-1', 'u-66');
    const o: OwnershipContext = { userId: 'u-66', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    const results = await svc.findAll('company-1', o);
    expect(results.length).toBeGreaterThan(0);
    const callWhere = prisma.reworkRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('operator_id', 'u-66');
  });
});
