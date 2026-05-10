import { OrgBootstrapService } from './org-bootstrap.service';

// Deprecated diagnostic endpoint tests.
// This endpoint is NOT a product initialization gate.
// It must never write org_permission_bootstrap_completed.
describe('OrgBootstrapService (deprecated diagnostic)', () => {
  let prisma: any;
  let service: OrgBootstrapService;

  beforeEach(() => {
    prisma = {
      role: { count: jest.fn() },
      systemConfig: { upsert: jest.fn(), update: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    };
    service = new OrgBootstrapService(prisma);
  });

  it('returns deprecated: true on every call', async () => {
    prisma.role.count.mockResolvedValue(3);

    const status = await service.getStatus();

    expect(status.deprecated).toBe(true);
  });

  it('does not write org_permission_bootstrap_completed when organization data is complete', async () => {
    prisma.role.count.mockResolvedValue(3);

    await service.getStatus();

    expect(prisma.systemConfig.upsert).not.toHaveBeenCalled();
    expect(prisma.systemConfig.update).not.toHaveBeenCalled();
    expect(prisma.systemConfig.create).not.toHaveBeenCalled();
  });

  it('does not write org_permission_bootstrap_completed even when system roles are missing', async () => {
    prisma.role.count.mockResolvedValue(0);

    await service.getStatus();

    expect(prisma.systemConfig.upsert).not.toHaveBeenCalled();
    expect(prisma.systemConfig.update).not.toHaveBeenCalled();
    expect(prisma.systemConfig.create).not.toHaveBeenCalled();
  });

  it('does not use missing departments as a product initialization gate', async () => {
    // Even if department data is absent, the endpoint must not gate product access.
    // The service does not query department data at all.
    prisma.role.count.mockResolvedValue(3);

    const status = await service.getStatus();

    expect(status).toMatchObject({ deprecated: true });
    expect(status.reasons ?? []).not.toContain('missing_department');
    expect(status.reasons ?? []).not.toContain('missing_department_manager');
    expect(status.reasons ?? []).not.toContain('missing_business_member');
  });

  it('returns system_role_baseline diagnostic when system roles are missing', async () => {
    prisma.role.count.mockResolvedValue(2);

    const status = await service.getStatus();

    expect(status.deprecated).toBe(true);
    expect(status.step).toBe('system_role_baseline');
    expect(status.reasons).toContain('missing_system_roles');
  });

  it('returns completed step when system roles are present', async () => {
    prisma.role.count.mockResolvedValue(3);

    const status = await service.getStatus();

    expect(status.deprecated).toBe(true);
    expect(status.step).toBe('completed');
    expect(status.reasons).toHaveLength(0);
  });
});
