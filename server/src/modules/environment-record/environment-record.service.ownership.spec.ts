/**
 * EnvironmentRecordService.findAll with ownership filtering
 * EnvironmentRecord.operator_id — user FK filter.
 */
import { EnvironmentRecordService } from './environment-record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    environmentRecord: { findMany: jest.fn().mockResolvedValue([{ id: 'er-1' }]) },
    productionBatch: {},
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new EnvironmentRecordService(prisma), prisma };
}

describe('EnvironmentRecordService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('user gets records filtered by operator_id = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(o);
    expect(prisma.environmentRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ operator_id: 'u-1' }) }),
    );
  });

  it('admin gets all environment records (no operator_id filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.findAll(o);
    expect(result.length).toBeGreaterThan(0);
    const callWhere = prisma.environmentRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('operator_id');
  });
});
