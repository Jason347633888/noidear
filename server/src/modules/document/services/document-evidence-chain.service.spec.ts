import { NotFoundException } from '@nestjs/common';
import { DocumentEvidenceChainService } from './document-evidence-chain.service';

describe('DocumentEvidenceChainService', () => {
  let service: DocumentEvidenceChainService;
  let prisma: Record<string, any>;

  beforeEach(() => {
    prisma = {
      document: { findUnique: jest.fn() },
      recordFormLandingEntry: { findMany: jest.fn() },
      recordTemplate: { findUnique: jest.fn(), findMany: jest.fn() },
      record: { findUnique: jest.fn(), findMany: jest.fn() },
      approvalInstance: { findMany: jest.fn() },
      approval: { findMany: jest.fn() },
      documentReadRequirement: { findMany: jest.fn() },
      documentReadConfirmation: { findMany: jest.fn() },
      documentTrainingNeed: { findMany: jest.fn() },
      trainingProject: { findUnique: jest.fn() },
      changeEvent: { findUnique: jest.fn() },
      changeEventFormTask: { findMany: jest.fn() },
      documentImpactReview: { findMany: jest.fn() },
      changeVerificationRecord: { findMany: jest.fn() },
      auditFinding: { findUnique: jest.fn(), findMany: jest.fn() },
      correctiveAction: { findUnique: jest.fn(), findMany: jest.fn() },
    };

    service = new DocumentEvidenceChainService(prisma as any);
  });

  describe('Test Case 1: document root with template and records', () => {
    it('returns root node of type document, includes record_template and record nodes', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        code: 'SOP-001',
        title: 'Test Document',
      });
      prisma.recordFormLandingEntry.findMany.mockResolvedValue([
        { id: 'landing-1', targetTemplateId: 'tmpl-1' },
      ]);
      prisma.recordTemplate.findUnique.mockResolvedValue({
        id: 'tmpl-1',
        name: 'Test Template',
        code: 'TPL-001',
      });
      prisma.record.findMany.mockResolvedValue([
        { id: 'rec-1', code: 'REC-001', status: 'submitted' },
        { id: 'rec-2', code: 'REC-002', status: 'draft' },
      ]);
      prisma.approvalInstance.findMany.mockResolvedValue([]);
      prisma.approval.findMany.mockResolvedValue([]);
      prisma.documentReadRequirement.findMany.mockResolvedValue([]);
      prisma.documentReadConfirmation.findMany.mockResolvedValue([]);
      prisma.documentTrainingNeed.findMany.mockResolvedValue([]);
      prisma.trainingProject.findUnique.mockResolvedValue(null);
      prisma.changeEvent.findUnique.mockResolvedValue(null);
      prisma.changeEventFormTask.findMany.mockResolvedValue([]);
      prisma.documentImpactReview.findMany.mockResolvedValue([]);
      prisma.changeVerificationRecord.findMany.mockResolvedValue([]);
      prisma.auditFinding.findMany.mockResolvedValue([]);
      prisma.correctiveAction.findMany.mockResolvedValue([]);

      const result = await service.getChain({
        sourceType: 'document',
        sourceId: 'doc-1',
      });

      expect(result.root).toEqual(
        expect.objectContaining({ type: 'document' }),
      );
      expect(result.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'record_template' }),
        ]),
      );
      expect(result.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'record' }),
        ]),
      );
    });
  });

  describe('Test Case 2: document root with missing template binding', () => {
    it('produces a warning when landing entry has no targetTemplateId', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-2',
        code: 'SOP-002',
        title: 'No-Template Document',
      });
      prisma.recordFormLandingEntry.findMany.mockResolvedValue([
        { id: 'landing-2', targetTemplateId: null },
      ]);
      prisma.recordTemplate.findUnique.mockResolvedValue(null);
      prisma.recordTemplate.findMany.mockResolvedValue([]);
      prisma.record.findMany.mockResolvedValue([]);
      prisma.approvalInstance.findMany.mockResolvedValue([]);
      prisma.approval.findMany.mockResolvedValue([]);
      prisma.documentReadRequirement.findMany.mockResolvedValue([]);
      prisma.documentReadConfirmation.findMany.mockResolvedValue([]);
      prisma.documentTrainingNeed.findMany.mockResolvedValue([]);
      prisma.trainingProject.findUnique.mockResolvedValue(null);
      prisma.changeEvent.findUnique.mockResolvedValue(null);
      prisma.changeEventFormTask.findMany.mockResolvedValue([]);
      prisma.documentImpactReview.findMany.mockResolvedValue([]);
      prisma.changeVerificationRecord.findMany.mockResolvedValue([]);
      prisma.auditFinding.findMany.mockResolvedValue([]);
      prisma.correctiveAction.findMany.mockResolvedValue([]);

      const result = await service.getChain({
        sourceType: 'document',
        sourceId: 'doc-2',
      });

      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching(/template/i),
          }),
        ]),
      );
    });
  });

  describe('Test Case 3: change_event root', () => {
    it('returns root node of type change_event and includes change_event_form_task nodes', async () => {
      prisma.changeEvent.findUnique.mockResolvedValue({
        id: 'ce-1',
        title: 'Formula Change',
        status: 'open',
      });
      prisma.changeEventFormTask.findMany.mockResolvedValue([
        { id: 'task-1', changeEventId: 'ce-1', templateId: 'tmpl-2', status: 'pending' },
        { id: 'task-2', changeEventId: 'ce-1', templateId: 'tmpl-3', status: 'completed' },
      ]);
      prisma.record.findMany.mockResolvedValue([
        { id: 'rec-3', code: 'REC-003', status: 'submitted' },
      ]);
      prisma.documentImpactReview.findMany.mockResolvedValue([
        { id: 'dir-1', changeEventId: 'ce-1', items: [{ id: 'item-1' }] },
      ]);
      prisma.changeVerificationRecord.findMany.mockResolvedValue([
        { id: 'cvr-1', changeEventId: 'ce-1', status: 'verified' },
      ]);
      prisma.approvalInstance.findMany.mockResolvedValue([]);
      prisma.document.findUnique.mockResolvedValue(null);
      prisma.recordFormLandingEntry.findMany.mockResolvedValue([]);
      prisma.recordTemplate.findUnique.mockResolvedValue(null);
      prisma.recordTemplate.findMany.mockResolvedValue([]);
      prisma.approval.findMany.mockResolvedValue([]);
      prisma.documentReadRequirement.findMany.mockResolvedValue([]);
      prisma.documentReadConfirmation.findMany.mockResolvedValue([]);
      prisma.documentTrainingNeed.findMany.mockResolvedValue([]);
      prisma.trainingProject.findUnique.mockResolvedValue(null);
      prisma.auditFinding.findMany.mockResolvedValue([]);
      prisma.correctiveAction.findMany.mockResolvedValue([]);

      const result = await service.getChain({
        sourceType: 'change_event',
        sourceId: 'ce-1',
      });

      expect(result.root).toEqual(
        expect.objectContaining({ type: 'change_event' }),
      );
      expect(result.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'change_event_form_task' }),
        ]),
      );
    });
  });

  describe('Test Case 4: missing weak target does not throw', () => {
    it('returns a warning and valid document node when template is not found', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-3',
        code: 'SOP-003',
        title: 'Orphan-Template Document',
      });
      prisma.recordFormLandingEntry.findMany.mockResolvedValue([
        { id: 'landing-3', targetTemplateId: 'tmpl-missing' },
      ]);
      prisma.recordTemplate.findUnique.mockResolvedValue(null);
      prisma.recordTemplate.findMany.mockResolvedValue([]);
      prisma.record.findMany.mockResolvedValue([]);
      prisma.approvalInstance.findMany.mockResolvedValue([]);
      prisma.approval.findMany.mockResolvedValue([]);
      prisma.documentReadRequirement.findMany.mockResolvedValue([]);
      prisma.documentReadConfirmation.findMany.mockResolvedValue([]);
      prisma.documentTrainingNeed.findMany.mockResolvedValue([]);
      prisma.trainingProject.findUnique.mockResolvedValue(null);
      prisma.changeEvent.findUnique.mockResolvedValue(null);
      prisma.changeEventFormTask.findMany.mockResolvedValue([]);
      prisma.documentImpactReview.findMany.mockResolvedValue([]);
      prisma.changeVerificationRecord.findMany.mockResolvedValue([]);
      prisma.auditFinding.findMany.mockResolvedValue([]);
      prisma.correctiveAction.findMany.mockResolvedValue([]);

      await expect(
        service.getChain({ sourceType: 'document', sourceId: 'doc-3' }),
      ).resolves.not.toThrow();

      const result = await service.getChain({
        sourceType: 'document',
        sourceId: 'doc-3',
      });

      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'document' }),
        ]),
      );
    });
  });

  describe('Test Case 5: invalid root id throws NotFoundException', () => {
    it('rejects with NotFoundException when document is not found', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(
        service.getChain({ sourceType: 'document', sourceId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Test Case 6: maxDepth clamping', () => {
    beforeEach(() => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-4',
        code: 'SOP-004',
        title: 'Depth Test Document',
      });
      prisma.recordFormLandingEntry.findMany.mockResolvedValue([]);
      prisma.recordTemplate.findUnique.mockResolvedValue(null);
      prisma.recordTemplate.findMany.mockResolvedValue([]);
      prisma.record.findMany.mockResolvedValue([]);
      prisma.approvalInstance.findMany.mockResolvedValue([]);
      prisma.approval.findMany.mockResolvedValue([]);
      prisma.documentReadRequirement.findMany.mockResolvedValue([]);
      prisma.documentReadConfirmation.findMany.mockResolvedValue([]);
      prisma.documentTrainingNeed.findMany.mockResolvedValue([]);
      prisma.trainingProject.findUnique.mockResolvedValue(null);
      prisma.changeEvent.findUnique.mockResolvedValue(null);
      prisma.changeEventFormTask.findMany.mockResolvedValue([]);
      prisma.documentImpactReview.findMany.mockResolvedValue([]);
      prisma.changeVerificationRecord.findMany.mockResolvedValue([]);
      prisma.auditFinding.findMany.mockResolvedValue([]);
      prisma.correctiveAction.findMany.mockResolvedValue([]);
    });

    it('defaults maxDepth to 4 when not provided', async () => {
      const result = await service.getChain({
        sourceType: 'document',
        sourceId: 'doc-4',
      });

      expect(result.meta.maxDepth).toBe(4);
    });

    it('clamps maxDepth above 8 down to 8', async () => {
      const result = await service.getChain({
        sourceType: 'document',
        sourceId: 'doc-4',
        maxDepth: 100,
      });

      expect(result.meta.maxDepth).toBe(8);
    });

    it('clamps maxDepth below 1 up to 1', async () => {
      const result = await service.getChain({
        sourceType: 'document',
        sourceId: 'doc-4',
        maxDepth: 0,
      });

      expect(result.meta.maxDepth).toBe(1);
    });
  });
});
