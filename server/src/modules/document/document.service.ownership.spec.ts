/**
 * Task 38 — DocumentService.listForOwnership
 * Tests ownership-scoped list using actual schema fields:
 *   departmentId, creatorId (Document has no ownerDepartmentId/ownerUserId in schema)
 */
import { DocumentService } from './document.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(prismaOverrides: any = {}) {
  const prisma = {
    document: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    ...prismaOverrides,
  } as any;
  // DocumentService has many optional deps — pass nulls for unused ones
  const svc = new DocumentService(
    prisma,
    null as any, // storage
    null as any, // notification
    null as any, // operationLog
    null as any, // eventEmitter
    null as any, // metadataService
    null as any, // filePreviewService
    null as any, // markdownWikilinkService
    null as any, // numberRuleService
  );
  return { svc, prisma };
}

describe('DocumentService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all documents (no ownership filter)', async () => {
    const { svc, prisma } = freshService();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(ownership);
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
    const callWhere = prisma.document.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('creatorId');
    expect(callWhere).not.toHaveProperty('departmentId');
  });

  it('user sees only docs they created', async () => {
    const { svc, prisma } = freshService();
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-x', managedDepartmentIds: [] };
    await svc.listForOwnership(ownership);
    const callWhere = prisma.document.findMany.mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ creatorId: 'u-1', deletedAt: null });
  });

  it('leader sees docs belonging to managed departments', async () => {
    const { svc, prisma } = freshService();
    const ownership: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1', 'd-2'] };
    await svc.listForOwnership(ownership);
    const callWhere = prisma.document.findMany.mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ departmentId: { in: ['d-1', 'd-2'] }, deletedAt: null });
  });
});
