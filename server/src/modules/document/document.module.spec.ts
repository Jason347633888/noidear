import { DocumentModule } from './document.module';
import type { ApprovalCallback } from '../unified-approval/types';

describe('DocumentModule approval callbacks', () => {
  it('writes effective when unified approval approves a document', async () => {
    let registeredCallback: ApprovalCallback | undefined;
    const registry = {
      register: jest.fn((_key: string, callback: ApprovalCallback) => {
        registeredCallback = callback;
      }),
    };
    const tx = {
      document: {
        update: jest.fn(),
      },
    };

    const module = new DocumentModule(registry as any);
    module.onModuleInit();
    await registeredCallback?.({
      tx: tx as any,
      resourceId: 'doc1',
      resourceType: 'document',
      triggerKey: 'document_submit',
      actorId: 'admin1',
      instanceId: 'instance1',
      taskId: 'task1',
    });

    expect(tx.document.update).toHaveBeenCalledWith({
      where: { id: 'doc1' },
      data: expect.objectContaining({
        status: 'effective',
        approverId: 'admin1',
      }),
    });
  });
});
