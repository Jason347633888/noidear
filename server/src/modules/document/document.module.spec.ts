import { DocumentModule } from './document.module';
import type { ApprovalCallback } from '../unified-approval/types';

function makeRegistry() {
  const callbacks = new Map<string, ApprovalCallback>();
  return {
    register: jest.fn((key: string, cb: ApprovalCallback) => { callbacks.set(key, cb); }),
    get: (key: string) => callbacks.get(key),
  };
}

function makeTx(docData: Record<string, unknown> = {}) {
  return {
    document: {
      update: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(docData),
    },
  };
}

describe('DocumentModule approval callbacks', () => {
  describe('document.approvalApproved', () => {
    it('sets status effective, revisionStatus current, approverId, approvedAt', async () => {
      const registry = makeRegistry();
      const documentService = { supersedePreviousEffectiveRevision: jest.fn() };
      const tx = makeTx({ id: 'doc1', number: 'D001', lineage_key: null, revisionOfId: null });

      const module = new DocumentModule(registry as any, documentService as any);
      module.onModuleInit();

      await registry.get('document.approvalApproved')!({
        tx: tx as any,
        resourceId: 'doc1',
        resourceType: 'document',
        triggerKey: 'publish.level2',
        actorId: 'approver1',
        instanceId: 'inst1',
      });

      expect(tx.document.update).toHaveBeenCalledWith({
        where: { id: 'doc1' },
        data: expect.objectContaining({
          status: 'effective',
          revisionStatus: 'current',
          approverId: 'approver1',
          approvedAt: expect.any(Date),
        }),
      });
    });

    it('calls supersedePreviousEffectiveRevision after update', async () => {
      const registry = makeRegistry();
      const documentService = { supersedePreviousEffectiveRevision: jest.fn() };
      const docData = { id: 'doc1', number: 'D001', lineage_key: 'D001', revisionOfId: 'doc0' };
      const tx = makeTx(docData);

      const module = new DocumentModule(registry as any, documentService as any);
      module.onModuleInit();

      await registry.get('document.approvalApproved')!({
        tx: tx as any,
        resourceId: 'doc1',
        resourceType: 'document',
        triggerKey: 'publish.level2',
        actorId: 'approver1',
        instanceId: 'inst1',
      });

      expect(documentService.supersedePreviousEffectiveRevision).toHaveBeenCalledWith(
        tx,
        docData,
      );
    });
  });

  describe('document.approvalRejected', () => {
    it('sets document status to rejected', async () => {
      const registry = makeRegistry();
      const documentService = { supersedePreviousEffectiveRevision: jest.fn() };
      const tx = makeTx();

      const module = new DocumentModule(registry as any, documentService as any);
      module.onModuleInit();

      await registry.get('document.approvalRejected')!({
        tx: tx as any,
        resourceId: 'doc1',
        resourceType: 'document',
        triggerKey: 'publish.level2',
        actorId: 'approver1',
        instanceId: 'inst1',
      });

      expect(tx.document.update).toHaveBeenCalledWith({
        where: { id: 'doc1' },
        data: { status: 'rejected' },
      });
    });
  });
});
