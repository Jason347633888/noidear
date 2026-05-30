import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VALID_DECLARATION_TYPES } from './dto/access-declaration.dto';

export interface CreateDeclarationInput {
  company_id: string;
  declaration_type: string;
  subject_type: string;
  subject_id?: string;
  subject_snapshot?: Prisma.InputJsonValue;
  declaration_content: Prisma.InputJsonValue;
  declared_by?: string;
  declared_at: Date;
  evidence_file_id?: string;
}

@Injectable()
export class AccessDeclarationService {
  constructor(private readonly prisma: PrismaService) {}

  async createDeclaration(input: CreateDeclarationInput) {
    this.validateDeclarationType(input.declaration_type);

    return this.prisma.accessDeclaration.create({
      data: {
        company_id: input.company_id,
        declaration_type: input.declaration_type,
        subject_type: input.subject_type,
        subject_id: input.subject_id ?? null,
        subject_snapshot: input.subject_snapshot ?? Prisma.JsonNull,
        declaration_content: input.declaration_content,
        declared_by: input.declared_by ?? null,
        declared_at: input.declared_at,
        evidence_file_id: input.evidence_file_id ?? null,
        status: 'declared',
      },
    });
  }

  async approveDeclaration(
    id: string,
    companyId: string,
    approverId: string,
    conclusion: string,
    opinion?: string,
  ) {
    const declaration = await this.findOneOrFail(id, companyId);

    if (declaration.status !== 'declared') {
      throw new BadRequestException(
        `Cannot approve declaration with status "${declaration.status}". Only declared declarations can be approved.`,
      );
    }

    return this.prisma.accessDeclaration.update({
      where: { id },
      data: {
        approved_by: approverId,
        approved_at: new Date(),
        approval_conclusion: conclusion,
        approval_opinion: opinion ?? null,
        status: 'approved',
      },
    });
  }

  async expireDeclaration(id: string, companyId: string) {
    const declaration = await this.findOneOrFail(id, companyId);

    if (declaration.status !== 'declared') {
      throw new BadRequestException(
        `Cannot expire declaration with status "${declaration.status}". Only declared declarations can be expired.`,
      );
    }

    return this.prisma.accessDeclaration.update({
      where: { id },
      data: { status: 'expired' },
    });
  }

  async linkToVisitorRecord(
    declarationId: string,
    visitorRecordId: string,
    companyId: string,
  ) {
    const declaration = await this.findOneOrFail(declarationId, companyId);

    const visitorRecord = await this.prisma.visitorRecord.findFirst({
      where: { id: visitorRecordId, company_id: companyId },
    });

    if (!visitorRecord) {
      throw new NotFoundException(`VisitorRecord not found: ${visitorRecordId}`);
    }

    const existing = await this.prisma.visitorAccessDeclaration.findUnique({
      where: {
        visitor_record_id_access_declaration_id: {
          visitor_record_id: visitorRecordId,
          access_declaration_id: declarationId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Link between declaration and visitor record already exists',
      );
    }

    return this.prisma.visitorAccessDeclaration.create({
      data: {
        visitor_record_id: visitorRecordId,
        access_declaration_id: declarationId,
        declaration_type: declaration.declaration_type,
      },
    });
  }

  async findAll(companyId: string, declarationType?: string, status?: string) {
    const where: Record<string, unknown> = { company_id: companyId };

    if (declarationType) {
      where.declaration_type = declarationType;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.accessDeclaration.findMany({
      where,
      orderBy: { declared_at: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    return this.findOneOrFail(id, companyId);
  }

  private async findOneOrFail(id: string, companyId: string) {
    const declaration = await this.prisma.accessDeclaration.findFirst({
      where: { id, company_id: companyId },
    });

    if (!declaration) {
      throw new NotFoundException(`AccessDeclaration not found: ${id}`);
    }

    return declaration;
  }

  private validateDeclarationType(declarationType: string): void {
    const valid = VALID_DECLARATION_TYPES as readonly string[];

    if (!valid.includes(declarationType)) {
      throw new BadRequestException(
        `Invalid declaration_type: "${declarationType}". Must be one of: ${valid.join(', ')}`,
      );
    }
  }
}
