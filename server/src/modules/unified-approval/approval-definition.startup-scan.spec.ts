import { ApprovalDefinitionStartupScan } from './approval-definition.startup-scan';

describe('ApprovalDefinitionStartupScan', () => {
  it('demotes definitions with illegal assignments to disabled_legacy', async () => {
    const prisma = {
      approvalDefinition: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'good', status: 'active', steps: [{ stepKey: 's', stepName: 'n', mode: 'single',
            assignments: [{ type: 'ROLE', roleCode: 'leader' }] }] },
          { id: 'bad', status: 'active', steps: [{ stepKey: 's', stepName: 'n', mode: 'single',
            assignments: [{ type: 'permission', permissionCode: 'x' }] }] },
        ]),
        update: jest.fn(),
      },
    } as any;
    const logger = { log: jest.fn(), warn: jest.fn() } as any;
    const scan = new ApprovalDefinitionStartupScan(prisma, logger);
    await scan.run();
    expect(prisma.approvalDefinition.update).toHaveBeenCalledWith({
      where: { id: 'bad' }, data: { status: 'disabled_legacy' },
    });
    expect(prisma.approvalDefinition.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'good' } }),
    );
  });

  it('does not abort startup when scan errors', async () => {
    const prisma = {
      approvalDefinition: {
        findMany: jest.fn().mockRejectedValue(new Error('db down')),
        update: jest.fn(),
      },
    } as any;
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;
    const scan = new ApprovalDefinitionStartupScan(prisma, logger);
    await expect(scan.run()).resolves.not.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });
});
