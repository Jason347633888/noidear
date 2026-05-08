import { OrgBootstrapService } from './org-bootstrap.service';

describe('OrgBootstrapService', () => {
  const prisma = {
    role: { count: jest.fn() },
    department: { count: jest.fn() },
    user: { count: jest.fn() },
    systemConfig: { upsert: jest.fn(), findUnique: jest.fn() },
  } as any;

  it('缺部门时返回 departments 步骤', async () => {
    prisma.role.count.mockResolvedValue(3);
    prisma.department.count.mockResolvedValue(0);

    const service = new OrgBootstrapService(prisma);
    const status = await service.getStatus();

    expect(status.completed).toBe(false);
    expect(status.step).toBe('departments');
    expect(status.reasons).toContain('missing_department');
  });
});
