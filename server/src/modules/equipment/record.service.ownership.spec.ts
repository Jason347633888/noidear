/**
 * RecordService (MaintenanceRecord).findAll with ownership filtering
 * MaintenanceRecord.performerId / reviewerId are the user FKs.
 */
import { RecordService } from './record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    maintenanceRecord: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const plan: any = {};
  const stats: any = { clearCache: jest.fn().mockResolvedValue(undefined) };
  return { svc: new RecordService(prisma, plan, stats), prisma };
}

describe('RecordService (MaintenanceRecord).findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all records (no OR filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll({}, o);
    const callWhere = prisma.maintenanceRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('OR');
  });

  it('user sees records where they performed or reviewed', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll({}, o);
    const callWhere = prisma.maintenanceRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('OR');
    expect(callWhere.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ performerId: 'u-1' }),
        expect.objectContaining({ reviewerId: 'u-1' }),
      ]),
    );
  });

  it('leader sees records where managed-dept members performed or reviewed', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll({}, o);
    const callWhere = prisma.maintenanceRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('OR');
    expect(callWhere.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ performerId: { in: ['m-1', 'm-2'] } }),
        expect.objectContaining({ reviewerId: { in: ['m-1', 'm-2'] } }),
      ]),
    );
  });
});
