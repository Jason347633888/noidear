import { Test } from '@nestjs/testing';
import { DocumentPeriodicReviewService } from './document-periodic-review.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('DocumentPeriodicReviewService', () => {
  let service: DocumentPeriodicReviewService;

  const mockPrisma = {
    document: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    documentVersion: {
      create: jest.fn(),
    },
    documentPeriodicReview: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DocumentPeriodicReviewService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(DocumentPeriodicReviewService);
  });

  // ── createDocumentVersion ────────────────────────────────────────────────

  describe('createDocumentVersion', () => {
    it('should throw when document does not exist', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);
      await expect(
        service.createDocumentVersion('nonexistent', {
          filePath: '/files/doc.pdf',
          fileName: 'doc.pdf',
          fileSize: 1024,
          creatorId: 'user-1',
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('should create a DocumentVersion record and return it', async () => {
      const doc = {
        id: 'doc-1',
        version: { toString: () => '1.0' },
        level: 3,
      };
      mockPrisma.document.findFirst.mockResolvedValue(doc);
      const created = {
        id: 'ver-1',
        documentId: 'doc-1',
        version: { toString: () => '1.0' },
        filePath: '/files/doc.pdf',
        fileName: 'doc.pdf',
        fileSize: 1024,
        notes: 'initial version',
        creatorId: 'user-1',
        createdAt: new Date(),
      };
      mockPrisma.documentVersion.create.mockResolvedValue(created);

      const result = await service.createDocumentVersion('doc-1', {
        filePath: '/files/doc.pdf',
        fileName: 'doc.pdf',
        fileSize: 1024,
        creatorId: 'user-1',
        notes: 'initial version',
      });

      expect(result).toMatchObject({ documentId: 'doc-1', fileName: 'doc.pdf' });
      expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documentId: 'doc-1',
            filePath: '/files/doc.pdf',
            fileName: 'doc.pdf',
            fileSize: 1024,
            creatorId: 'user-1',
            notes: 'initial version',
          }),
        }),
      );
    });

    it('should store current document version in the snapshot', async () => {
      const doc = { id: 'doc-2', version: { toString: () => '2.0' }, level: 3 };
      mockPrisma.document.findFirst.mockResolvedValue(doc);
      mockPrisma.documentVersion.create.mockResolvedValue({ id: 'ver-2', documentId: 'doc-2' });

      await service.createDocumentVersion('doc-2', {
        filePath: '/f.pdf',
        fileName: 'f.pdf',
        fileSize: 512,
        creatorId: 'user-2',
      });

      expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ documentId: 'doc-2' }),
        }),
      );
    });
  });

  // ── schedulePeriodicReview ───────────────────────────────────────────────

  describe('schedulePeriodicReview', () => {
    it('should throw when document does not exist', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);
      await expect(
        service.schedulePeriodicReview('nonexistent', new Date(), 'reviewer-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when document is not level 3', async () => {
      mockPrisma.document.findFirst.mockResolvedValue({ id: 'doc-1', level: 2, status: 'effective' });
      await expect(
        service.schedulePeriodicReview('doc-1', new Date(), 'reviewer-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should create a pending DocumentPeriodicReview for level-3 document', async () => {
      const dueAt = new Date('2026-12-31');
      mockPrisma.document.findFirst.mockResolvedValue({ id: 'doc-3', level: 3, status: 'effective' });
      const created = {
        id: 'review-1',
        documentId: 'doc-3',
        dueAt,
        reviewerId: 'reviewer-1',
        status: 'pending',
      };
      mockPrisma.documentPeriodicReview.create.mockResolvedValue(created);

      const result = await service.schedulePeriodicReview('doc-3', dueAt, 'reviewer-1');

      expect(result.status).toBe('pending');
      expect(result.documentId).toBe('doc-3');
      expect(mockPrisma.documentPeriodicReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documentId: 'doc-3',
            reviewerId: 'reviewer-1',
            status: 'pending',
            dueAt,
          }),
        }),
      );
    });
  });

  // ── completePeriodicReview ───────────────────────────────────────────────

  describe('completePeriodicReview', () => {
    it('should throw when review task does not exist', async () => {
      mockPrisma.documentPeriodicReview.findFirst.mockResolvedValue(null);
      await expect(
        service.completePeriodicReview('nonexistent', 'continue_use', null),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when review task is already completed', async () => {
      mockPrisma.documentPeriodicReview.findFirst.mockResolvedValue({
        id: 'review-1',
        status: 'completed',
      });
      await expect(
        service.completePeriodicReview('review-1', 'continue_use', null),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when conclusion is invalid', async () => {
      mockPrisma.documentPeriodicReview.findFirst.mockResolvedValue({
        id: 'review-1',
        status: 'pending',
      });
      await expect(
        service.completePeriodicReview('review-1', 'invalid_conclusion' as any, null),
      ).rejects.toThrow(BusinessException);
    });

    it('should store reviewer, reviewedAt, conclusion, and opinion on completion', async () => {
      mockPrisma.documentPeriodicReview.findFirst.mockResolvedValue({
        id: 'review-1',
        status: 'pending',
        reviewerId: 'reviewer-1',
      });
      const updated = {
        id: 'review-1',
        status: 'completed',
        conclusion: 'continue_use',
        opinion: 'No changes needed',
        reviewedAt: expect.any(Date),
      };
      mockPrisma.documentPeriodicReview.update.mockResolvedValue(updated);

      const result = await service.completePeriodicReview(
        'review-1',
        'continue_use',
        'No changes needed',
      );

      expect(result.status).toBe('completed');
      expect(result.conclusion).toBe('continue_use');
      expect(mockPrisma.documentPeriodicReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'review-1' },
          data: expect.objectContaining({
            status: 'completed',
            conclusion: 'continue_use',
            opinion: 'No changes needed',
            reviewedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should accept retire as conclusion', async () => {
      mockPrisma.documentPeriodicReview.findFirst.mockResolvedValue({
        id: 'review-2',
        status: 'pending',
      });
      mockPrisma.documentPeriodicReview.update.mockResolvedValue({
        id: 'review-2',
        status: 'completed',
        conclusion: 'retire',
        opinion: 'Document is outdated',
        reviewedAt: new Date(),
      });

      const result = await service.completePeriodicReview('review-2', 'retire', 'Document is outdated');
      expect(result.conclusion).toBe('retire');
    });
  });
});
