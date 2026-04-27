import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReadRequirementDto } from '../dto/document-operations.dto';

@Injectable()
export class DocumentReadRequirementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(documentId: string, dto: CreateReadRequirementDto, requiredBy: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId, deletedAt: null } });
    if (!document) throw new NotFoundException('文件不存在');
    if (!['department', 'role', 'user'].includes(dto.scopeType)) {
      throw new BadRequestException('Unsupported read requirement scopeType');
    }

    await this.validateScopeTarget(dto.scopeType, dto.scopeId);

    const existing = await this.prisma.documentReadRequirement.findFirst({
      where: { documentId, scopeType: dto.scopeType, scopeId: dto.scopeId, status: 'active' },
    });
    if (existing) throw new ConflictException('Active read requirement already exists');

    return this.prisma.documentReadRequirement.create({
      data: {
        documentId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        requiredBy,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        reason: dto.reason,
      },
    });
  }

  private async validateScopeTarget(scopeType: string, scopeId: string) {
    if (scopeType === 'user') {
      const user = await this.prisma.user.findUnique({ where: { id: scopeId, deletedAt: null } });
      if (!user) throw new NotFoundException('阅读范围用户不存在');
      return;
    }

    if (scopeType === 'department') {
      const department = await this.prisma.department.findUnique({ where: { id: scopeId, deletedAt: null } });
      if (!department) throw new NotFoundException('阅读范围部门不存在');
      return;
    }

    if (scopeType === 'role') {
      const role = await this.prisma.role.findUnique({ where: { id: scopeId, deletedAt: null } });
      if (!role) throw new NotFoundException('阅读范围角色不存在');
      return;
    }

    throw new BadRequestException('Unsupported read requirement scopeType');
  }

  async getStatus(documentId: string) {
    const requirements = await this.prisma.documentReadRequirement.findMany({
      where: { documentId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    const confirmations = await this.prisma.documentReadConfirmation.findMany({
      where: { document_id: documentId },
    });
    const confirmedUserIds = new Set(confirmations.map((item: any) => item.user_id));
    const now = new Date();

    return requirements.map((requirement: any) => {
      const isUserScope = requirement.scopeType === 'user';
      const confirmed = isUserScope ? confirmedUserIds.has(requirement.scopeId) : null;
      const overdue = Boolean(
        requirement.dueAt &&
        new Date(requirement.dueAt) < now &&
        confirmed !== true,
      );
      return {
        ...requirement,
        confirmed,
        overdue,
        confirmedUserCount: confirmations.length,
      };
    });
  }
}
