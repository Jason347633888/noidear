/**
 * LineChangeCheckRecordService.findAll with ownership filtering
 * LineChangeCheckRecord.inspector_id is the user FK.
 */
import { LineChangeCheckRecordService } from './line-change-check-record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    lineChangeCheckRecord: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new LineChangeCheckRecordService(prisma), prisma };
}

describe('LineChangeCheckRecordService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all records (no inspector_id filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll(o);
    const callWhere = prisma.lineChangeCheckRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('inspector_id');
  });

  it('user sees records where inspector_id = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(o);
    const callWhere = prisma.lineChangeCheckRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('inspector_id', 'u-1');
  });

  it('leader sees records where inspector_id IN managed dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll(o);
    const callWhere = prisma.lineChangeCheckRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('inspector_id', { in: ['m-1', 'm-2'] });
  });
});
