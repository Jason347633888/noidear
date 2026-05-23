/**
 * DocumentService.findAll with role-based ownership filtering
 * Document schema uses creatorId + departmentId for ownership.
 * role='user' → creatorId filter; role='admin'/'leader' → no creatorId filter
 */
import { DocumentService } from './document.service';

function freshService() {
  const prisma = {
    document: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  } as any;
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

describe('DocumentService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all documents (no creatorId filter)', async () => {
    const { svc, prisma } = freshService();
    await svc.findAll({}, 'admin-id', 'admin');
    const callWhere = prisma.document.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('creatorId');
  });

  it('user sees only docs they created (creatorId = userId)', async () => {
    const { svc, prisma } = freshService();
    await svc.findAll({}, 'u-1', 'user');
    const callWhere = prisma.document.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('creatorId', 'u-1');
  });

  it('leader sees all documents (no creatorId filter)', async () => {
    const { svc, prisma } = freshService();
    await svc.findAll({}, 'l-1', 'leader');
    const callWhere = prisma.document.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('creatorId');
  });
});
