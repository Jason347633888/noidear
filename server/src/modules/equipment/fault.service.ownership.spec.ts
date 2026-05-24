/**
 * FaultService.findAll with ownership filtering
 * EquipmentFault uses reporterId / assigneeId as user FKs.
 */
import { FaultService } from './fault.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const statsService: any = { clearCache: jest.fn().mockResolvedValue(undefined) };
  const prisma: any = {
    equipmentFault: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new FaultService(prisma, statsService), prisma };
}

describe('FaultService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all faults (no OR filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll({}, o);
    const callWhere = prisma.equipmentFault.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('OR');
  });

  it('user sees faults where reporterId or assigneeId = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll({}, o);
    const callWhere = prisma.equipmentFault.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('OR');
    expect(callWhere.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reporterId: 'u-1' }),
        expect.objectContaining({ assigneeId: 'u-1' }),
      ]),
    );
  });

  it('leader sees faults for managed dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll({}, o);
    const callWhere = prisma.equipmentFault.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('OR');
    expect(callWhere.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reporterId: { in: ['m-1', 'm-2'] } }),
        expect.objectContaining({ assigneeId: { in: ['m-1', 'm-2'] } }),
      ]),
    );
  });
});
