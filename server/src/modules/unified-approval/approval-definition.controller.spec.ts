import { Test } from '@nestjs/testing';
import { ApprovalDefinitionController } from './approval-definition.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('ApprovalDefinitionController status flow', () => {
  let controller: ApprovalDefinitionController;
  let prisma: any;
  const adminReq = { user: { roleCode: 'admin' } } as any;

  beforeEach(async () => {
    prisma = {
      approvalDefinition: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const mod = await Test.createTestingModule({
      controllers: [ApprovalDefinitionController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    controller = mod.get(ApprovalDefinitionController);
  });

  it('activate rejects when current steps are invalid', async () => {
    prisma.approvalDefinition.findUnique.mockResolvedValue({
      id: 'd1', status: 'disabled_legacy',
      steps: [{ assignments: [{ type: 'permission', permissionCode: 'x' }] }],
    });
    await expect(controller.activate('d1', adminReq)).rejects.toThrow(/失效|invalid/i);
    expect(prisma.approvalDefinition.update).not.toHaveBeenCalled();
  });

  it('activate succeeds when current steps are valid', async () => {
    prisma.approvalDefinition.findUnique.mockResolvedValue({
      id: 'd1', status: 'disabled_legacy',
      steps: [{ stepKey: 's', stepName: 'n', mode: 'single',
                assignments: [{ type: 'ROLE', roleCode: 'leader' }] }],
    });
    prisma.approvalDefinition.update.mockResolvedValue({ id: 'd1', status: 'active' });
    await controller.activate('d1', adminReq);
    expect(prisma.approvalDefinition.update).toHaveBeenCalledWith({
      where: { id: 'd1' }, data: { status: 'active' },
    });
  });

  it('deactivate refuses to overwrite disabled_legacy', async () => {
    prisma.approvalDefinition.findUnique.mockResolvedValue({ id: 'd1', status: 'disabled_legacy' });
    await expect(controller.deactivate('d1', adminReq)).rejects.toThrow(/disabled_legacy/);
    expect(prisma.approvalDefinition.update).not.toHaveBeenCalled();
  });
});
