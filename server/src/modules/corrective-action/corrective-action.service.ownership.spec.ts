/**
 * CorrectiveActionService.findAll ownership filtering
 * CorrectiveAction.responsible_id (nullable) is the user FK.
 */
import { CorrectiveActionService } from './corrective-action.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    correctiveAction: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const seq: any = {};
  return { svc: new CorrectiveActionService(prisma, seq), prisma };
}

describe('CorrectiveActionService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all CAPA records (no responsible_id filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll('company-1', {}, o);
    const callWhere = prisma.correctiveAction.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('responsible_id');
  });

  it('user sees only CAPA where they are responsible', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll('company-1', {}, o);
    expect(prisma.correctiveAction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ responsible_id: 'u-1' }) }),
    );
  });

  it('leader sees CAPA of managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll('company-1', {}, o);
    expect(prisma.correctiveAction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ responsible_id: { in: ['m-1', 'm-2'] } }) }),
    );
  });
});
