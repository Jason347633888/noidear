import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateManagementReviewDto } from './dto/create-management-review.dto';
import { QueryManagementReviewDto } from './dto/query-management-review.dto';
import { CreateManagementReviewActionDto } from './dto/create-management-review-action.dto';
import { UpdateManagementReviewActionDto } from './dto/update-management-review-action.dto';

type Actor = { id: string; companyId: string };

@Injectable()
export class ManagementReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateManagementReviewDto, actor: Actor) {
    const existing = await this.prisma.managementReview.findFirst({
      where: { companyId: actor.companyId, year: dto.year },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('该年度管理评审已存在');
    }

    return this.prisma.managementReview.create({
      data: {
        companyId: actor.companyId,
        year: dto.year,
        title: dto.title,
        status: 'draft',
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        location: dto.location,
        materialDueDate: dto.materialDueDate ? new Date(dto.materialDueDate) : undefined,
        purpose: dto.purpose ?? '评审质量和食品安全管理体系的适宜性、充分性和有效性。',
        scope: dto.scope ?? [],
        participants: dto.participants ?? [],
        createdBy: actor.id,
      },
      include: { inputs: true, actions: true },
    });
  }

  findAll(companyId: string, query: QueryManagementReviewDto) {
    return this.prisma.managementReview.findMany({
      where: {
        companyId,
        ...(query.year ? { year: query.year } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      include: { inputs: true, actions: true },
    });
  }

  async findOne(id: string, companyId: string) {
    const review = await this.prisma.managementReview.findUnique({
      where: { id },
      include: { inputs: true, actions: true },
    });
    if (!review || review.companyId !== companyId) {
      throw new NotFoundException('管理评审不存在');
    }
    return review;
  }

  async collectSources(id: string, companyId: string) {
    const review = await this.findOwnedReview(id, companyId);
    const start = new Date(Date.UTC(review.year, 0, 1));
    const end = new Date(Date.UTC(review.year + 1, 0, 1));
    const companyUsers = await this.prisma.user.findMany({
      where: { company_id: companyId },
      select: { id: true },
    });
    const companyUserIds = companyUsers.map((user: { id: string }) => user.id);

    const auditReports = await this.prisma.auditReport.findMany({
      where: {
        plan: {
          startDate: { gte: start, lt: end },
          createdBy: { in: companyUserIds },
        },
      },
      include: {
        plan: { select: { title: true, startDate: true, endDate: true } },
      },
    });

    const trainingArchives = await this.prisma.trainingArchive.findMany({
      where: {
        project: {
          plan: {
            createdBy: { in: companyUserIds },
          },
          OR: [
            { plan: { year: review.year } },
            { scheduledDate: { gte: start, lt: end } },
          ],
        },
      },
      include: {
        project: {
          include: {
            plan: { select: { year: true, title: true } },
            learningRecords: { select: { passed: true } },
          },
        },
      },
    });

    for (const report of auditReports) {
      await this.prisma.managementReviewInput.upsert({
        where: {
          reviewId_sourceType_sourceId: {
            reviewId: id,
            sourceType: 'audit_report',
            sourceId: report.id,
          },
        },
        create: {
          reviewId: id,
          sourceType: 'audit_report',
          sourceId: report.id,
          department: '品质部',
          title: report.plan?.title ?? `${review.year} 年内审报告`,
          summary: {
            planStartDate: report.plan?.startDate,
            planEndDate: report.plan?.endDate,
            ...(report.summary as Record<string, unknown>),
          },
        },
        update: {
          title: report.plan?.title ?? `${review.year} 年内审报告`,
          summary: {
            planStartDate: report.plan?.startDate,
            planEndDate: report.plan?.endDate,
            ...(report.summary as Record<string, unknown>),
          },
        },
      });
    }

    for (const archive of trainingArchives) {
      const records = archive.project?.learningRecords ?? [];
      const attendeeCount = records.length;
      const passedCount = records.filter((r: any) => r.passed).length;
      const passRate = attendeeCount === 0 ? 0 : Math.round((passedCount / attendeeCount) * 10000) / 100;
      await this.prisma.managementReviewInput.upsert({
        where: {
          reviewId_sourceType_sourceId: {
            reviewId: id,
            sourceType: 'training_archive',
            sourceId: archive.id,
          },
        },
        create: {
          reviewId: id,
          sourceType: 'training_archive',
          sourceId: archive.id,
          department: archive.project?.department,
          title: archive.project?.title ?? `${review.year} 年培训档案`,
          summary: {
            projectId: archive.projectId,
            trainingDate: archive.project?.scheduledDate,
            attendeeCount,
            passedCount,
            passRate,
          },
        },
        update: {
          department: archive.project?.department,
          title: archive.project?.title ?? `${review.year} 年培训档案`,
          summary: {
            projectId: archive.projectId,
            trainingDate: archive.project?.scheduledDate,
            attendeeCount,
            passedCount,
            passRate,
          },
        },
      });
    }

    await this.prisma.managementReview.update({
      where: { id },
      data: { status: 'input_collection' },
    });

    return { auditReports: auditReports.length, trainingArchives: trainingArchives.length };
  }

  async createAction(reviewId: string, companyId: string, dto: CreateManagementReviewActionDto) {
    await this.findOwnedReview(reviewId, companyId);
    return this.prisma.managementReviewAction.create({
      data: {
        reviewId,
        action: dto.action,
        responsibleDepartment: dto.responsibleDepartment,
        ownerId: dto.ownerId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async updateAction(reviewId: string, actionId: string, companyId: string, dto: UpdateManagementReviewActionDto) {
    await this.findOwnedReview(reviewId, companyId);
    const action = await this.prisma.managementReviewAction.findFirst({
      where: { id: actionId, reviewId },
      select: { id: true },
    });
    if (!action) {
      throw new NotFoundException('管理评审改进措施不存在');
    }

    return this.prisma.managementReviewAction.update({
      where: { id: actionId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.verificationNote !== undefined ? { verificationNote: dto.verificationNote } : {}),
        ...(dto.status === 'completed' ? { completedAt: new Date() } : {}),
      },
    });
  }

  async complete(id: string, companyId: string, body: { reportDocumentId?: string; reportRecordId?: string }) {
    await this.findOwnedReview(id, companyId);
    return this.prisma.managementReview.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        reportDocumentId: body.reportDocumentId,
        reportRecordId: body.reportRecordId,
      },
      include: { inputs: true, actions: true },
    });
  }

  private async findOwnedReview(id: string, companyId: string) {
    const review = await this.prisma.managementReview.findUnique({ where: { id } });
    if (!review || review.companyId !== companyId) {
      throw new NotFoundException('管理评审不存在');
    }
    return review;
  }
}
