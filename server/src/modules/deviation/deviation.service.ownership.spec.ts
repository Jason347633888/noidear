/**
 * Task 41 — DeviationService.listForOwnership
 * DeviationReport.reporterId is the user FK.
 */
import { DeviationService } from './deviation.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    deviationReport: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new DeviationService(prisma, null as any), prisma };
}

describe('DeviationService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all reports (no reporterId filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.deviationReport.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('reporterId');
  });

  it('user sees only reports they submitted', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.deviationReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ reporterId: 'u-1' }) }),
    );
  });

  it('leader sees reports from managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.deviationReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ reporterId: { in: ['m-1', 'm-2'] } }) }),
    );
  });
});
