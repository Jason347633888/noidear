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

describe('CorrectiveActionService.create writes responsible_id', () => {
  const numberSequenceMock = {
    generateCorrectiveActionNo: jest.fn().mockResolvedValue('CAPA-2026-0001'),
  };

  beforeEach(() => jest.clearAllMocks());

  it('create falls back to userId as responsible_id when dto does not provide it', async () => {
    const prisma: any = {
      correctiveAction: {
        create: jest.fn().mockResolvedValue({ id: 'capa-new', responsible_id: 'u-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new CorrectiveActionService(prisma, numberSequenceMock as any);
    // trigger_type: 'other' skips validateTriggerSource entirely
    const dto = { trigger_type: 'other' } as any;
    await svc.create(dto, 'u-1', 'company-1');
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsible_id: 'u-1' }),
      }),
    );
  });

  it('create preserves dto.responsible_id when explicitly provided', async () => {
    const prisma: any = {
      correctiveAction: {
        create: jest.fn().mockResolvedValue({ id: 'capa-new', responsible_id: 'other-user' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new CorrectiveActionService(prisma, numberSequenceMock as any);
    const dto = { trigger_type: 'other', responsible_id: 'other-user' } as any;
    await svc.create(dto, 'u-1', 'company-1');
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ responsible_id: 'other-user' }),
      }),
    );
  });

  it('user can see own CAPA via findAll after create with responsible_id fallback', async () => {
    const prisma: any = {
      correctiveAction: {
        create: jest.fn().mockResolvedValue({ id: 'capa-new', responsible_id: 'u-2' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'capa-new', responsible_id: 'u-2' }]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new CorrectiveActionService(prisma, numberSequenceMock as any);
    const dto = { trigger_type: 'other' } as any;
    await svc.create(dto, 'u-2', 'company-1');
    const o: OwnershipContext = { userId: 'u-2', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    const results = await svc.findAll('company-1', {}, o);
    expect(results.length).toBeGreaterThan(0);
    const callWhere = prisma.correctiveAction.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('responsible_id', 'u-2');
  });
});
