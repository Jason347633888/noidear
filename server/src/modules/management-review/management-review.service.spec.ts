import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { ManagementReviewService } from './management-review.service';
import { UpdateManagementReviewActionDto } from './dto/update-management-review-action.dto';

describe('ManagementReviewService', () => {
  function createPrismaMock(overrides: Record<string, any> = {}) {
    const prisma = {
      managementReview: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      managementReviewInput: {
        upsert: jest.fn(),
      },
      managementReviewAction: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditReport: {
        findMany: jest.fn(),
      },
      trainingArchive: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };
    return { ...prisma, ...overrides } as any;
  }

  it('rejects duplicate management review year per company', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findFirst.mockResolvedValue({ id: 'mr-existing' });
    const service = new ManagementReviewService(prisma);

    await expect(
      service.create({ year: 2026, title: '2026 年管理评审' } as any, {
        id: 'user-1',
        companyId: 'company-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates one annual review with company and creator context', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findFirst.mockResolvedValue(null);
    prisma.managementReview.create.mockResolvedValue({ id: 'mr-1', year: 2026 });
    const service = new ManagementReviewService(prisma);

    await service.create(
      {
        year: 2026,
        title: '2026 年管理评审',
        reviewDate: '2026-12-15T00:00:00.000Z',
        location: '会议室',
        materialDueDate: '2026-12-14T00:00:00.000Z',
      } as any,
      { id: 'user-1', companyId: 'company-1' },
    );

    expect(prisma.managementReview.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-1',
        year: 2026,
        title: '2026 年管理评审',
        status: 'draft',
        reviewDate: new Date('2026-12-15T00:00:00.000Z'),
        location: '会议室',
        materialDueDate: new Date('2026-12-14T00:00:00.000Z'),
        purpose:
          '评审质量和食品安全管理体系的适宜性、充分性和有效性。',
        scope: [],
        participants: [],
        createdBy: 'user-1',
      },
      include: {
        inputs: true,
        actions: true,
      },
    });
  });

  it('collects audit reports and training archives as idempotent review inputs', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findUnique.mockResolvedValue({
      id: 'mr-1',
      companyId: 'company-1',
      year: 2026,
    });
    prisma.user.findMany.mockResolvedValue([{ id: 'user-company-1' }]);
    prisma.auditReport.findMany.mockResolvedValue([
      {
        id: 'audit-report-1',
        plan: {
          title: '2026 年度内审',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-10'),
        },
        summary: {
          totalDocuments: 10,
          conformCount: 8,
          nonConformCount: 2,
        },
      },
    ]);
    prisma.trainingArchive.findMany.mockResolvedValue([
      {
        id: 'archive-1',
        project: {
          title: 'FSSC22000 专项培训',
          department: '行政人事部',
          scheduledDate: new Date('2026-08-20'),
          learningRecords: [{ passed: true }, { passed: false }],
        },
      },
    ]);
    const service = new ManagementReviewService(prisma);

    const result = await service.collectSources('mr-1', 'company-1');

    expect(result).toEqual({ auditReports: 1, trainingArchives: 1 });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { company_id: 'company-1' },
      select: { id: true },
    });
    expect(prisma.auditReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          plan: {
            startDate: {
              gte: new Date(Date.UTC(2026, 0, 1)),
              lt: new Date(Date.UTC(2027, 0, 1)),
            },
            createdBy: { in: ['user-company-1'] },
          },
        },
      }),
    );
    expect(prisma.trainingArchive.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          project: {
            plan: { createdBy: { in: ['user-company-1'] } },
            OR: [
              { plan: { year: 2026 } },
              {
                scheduledDate: {
                  gte: new Date(Date.UTC(2026, 0, 1)),
                  lt: new Date(Date.UTC(2027, 0, 1)),
                },
              },
            ],
          },
        },
      }),
    );
    expect(prisma.managementReviewInput.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.managementReviewInput.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          reviewId_sourceType_sourceId: {
            reviewId: 'mr-1',
            sourceType: 'audit_report',
            sourceId: 'audit-report-1',
          },
        },
      }),
    );
    expect(prisma.managementReviewInput.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          reviewId_sourceType_sourceId: {
            reviewId: 'mr-1',
            sourceType: 'training_archive',
            sourceId: 'archive-1',
          },
        },
      }),
    );
  });

  it('does not collect audit reports or training archives from another company', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findUnique.mockResolvedValue({
      id: 'mr-1',
      companyId: 'company-1',
      year: 2026,
    });
    prisma.user.findMany.mockResolvedValue([{ id: 'company-1-user' }]);
    prisma.auditReport.findMany.mockResolvedValue([]);
    prisma.trainingArchive.findMany.mockResolvedValue([]);
    const service = new ManagementReviewService(prisma);

    const result = await service.collectSources('mr-1', 'company-1');

    expect(result).toEqual({ auditReports: 0, trainingArchives: 0 });
    expect(prisma.auditReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          plan: expect.objectContaining({
            createdBy: { in: ['company-1-user'] },
          }),
        }),
      }),
    );
    expect(prisma.trainingArchive.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          project: expect.objectContaining({
            plan: { createdBy: { in: ['company-1-user'] } },
          }),
        }),
      }),
    );
    expect(prisma.managementReviewInput.upsert).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when collecting sources for another company', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findUnique.mockResolvedValue({
      id: 'mr-1',
      companyId: 'company-2',
      year: 2026,
    });
    const service = new ManagementReviewService(prisma);

    await expect(service.collectSources('mr-1', 'company-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when collecting sources for a completed review', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findUnique.mockResolvedValue({
      id: 'mr-1',
      companyId: 'company-1',
      year: 2026,
      status: 'completed',
    });
    const service = new ManagementReviewService(prisma);

    await expect(service.collectSources('mr-1', 'company-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.managementReviewInput.upsert).not.toHaveBeenCalled();
    expect(prisma.managementReview.update).not.toHaveBeenCalled();
  });

  it('rejects invalid management review action status values', async () => {
    const dto = Object.assign(new UpdateManagementReviewActionDto(), {
      status: 'invalid-status',
    });

    const errors = await validate(dto);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'status',
          constraints: expect.objectContaining({
            isIn: expect.any(String),
          }),
        }),
      ]),
    );
  });

  it('does not update an action that does not belong to the review', async () => {
    const prisma = createPrismaMock();
    prisma.managementReview.findUnique.mockResolvedValue({
      id: 'mr-1',
      companyId: 'company-1',
      year: 2026,
    });
    prisma.managementReviewAction.findFirst.mockResolvedValue(null);
    const service = new ManagementReviewService(prisma);

    await expect(
      service.updateAction('mr-1', 'action-from-other-review', 'company-1', {
        status: 'completed',
      } as any),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.managementReviewAction.findFirst).toHaveBeenCalledWith({
      where: { id: 'action-from-other-review', reviewId: 'mr-1' },
      select: { id: true },
    });
    expect(prisma.managementReviewAction.update).not.toHaveBeenCalled();
  });
});
