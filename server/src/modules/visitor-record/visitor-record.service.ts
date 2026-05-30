import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';

export interface LinkDeclarationItem {
  access_declaration_id: string;
  declaration_type: string;
}

export interface CheckInOptions {
  requireApprovedHealth?: boolean;
}

@Injectable()
export class VisitorRecordService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVisitorDto, userId: string) {
    return this.prisma.visitorRecord.create({
      data: {
        ...dto,
        company_id: '1',
        visit_date: new Date(dto.visit_date),
        created_by: userId,
      },
    });
  }

  async findAll(date?: string) {
    let where: Record<string, unknown> = { deleted_at: null };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where = {
        ...where,
        visit_date: {
          gte: start,
          lte: end,
        },
      };
    }

    return this.prisma.visitorRecord.findMany({
      where,
      orderBy: { visit_date: 'desc' },
    });
  }

  async linkDeclarations(
    visitorRecordId: string,
    items: LinkDeclarationItem[],
  ) {
    const record = await this.prisma.visitorRecord.findUnique({
      where: { id: visitorRecordId },
    });

    if (!record) {
      throw new NotFoundException(`VisitorRecord not found: ${visitorRecordId}`);
    }

    const declarationIds = items.map((i) => i.access_declaration_id);
    const found = await this.prisma.accessDeclaration.findMany({
      where: { id: { in: declarationIds } },
    });

    const foundIds = new Set(found.map((d) => d.id));
    const missing = declarationIds.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new NotFoundException(
        `AccessDeclarations not found: ${missing.join(', ')}`,
      );
    }

    return this.prisma.visitorAccessDeclaration.createMany({
      data: items.map((item) => ({
        visitor_record_id: visitorRecordId,
        access_declaration_id: item.access_declaration_id,
        declaration_type: item.declaration_type,
      })),
      skipDuplicates: true,
    });
  }

  async checkIn(visitorRecordId: string, options: CheckInOptions = {}) {
    const record = await this.prisma.visitorRecord.findUnique({
      where: { id: visitorRecordId },
    });

    if (!record) {
      throw new NotFoundException(`VisitorRecord not found: ${visitorRecordId}`);
    }

    if (record.check_in_time) {
      throw new BadRequestException(
        `Visitor ${visitorRecordId} has already checked in.`,
      );
    }

    if (options.requireApprovedHealth) {
      await this.assertApprovedHealthDeclaration(visitorRecordId);
    }

    return this.prisma.visitorRecord.update({
      where: { id: visitorRecordId },
      data: { check_in_time: new Date() },
    });
  }

  async recordExit(visitorRecordId: string) {
    const record = await this.prisma.visitorRecord.findUnique({
      where: { id: visitorRecordId },
    });

    if (!record) {
      throw new NotFoundException(`VisitorRecord not found: ${visitorRecordId}`);
    }

    if (!record.check_in_time) {
      throw new BadRequestException(
        `Visitor ${visitorRecordId} has not checked in yet.`,
      );
    }

    if (record.exit_time) {
      throw new BadRequestException(
        `Exit time for visitor ${visitorRecordId} has already been recorded.`,
      );
    }

    return this.prisma.visitorRecord.update({
      where: { id: visitorRecordId },
      data: { exit_time: new Date() },
    });
  }

  private async assertApprovedHealthDeclaration(
    visitorRecordId: string,
  ): Promise<void> {
    const healthLinks = await this.prisma.visitorAccessDeclaration.findMany({
      where: {
        visitor_record_id: visitorRecordId,
        declaration_type: 'visitor_health',
      },
      include: { access_declaration: true },
    });

    const hasApproved = healthLinks.some(
      (link) => link.access_declaration.status === 'approved',
    );

    if (!hasApproved) {
      throw new BadRequestException(
        `Check-in requires an approved visitor_health declaration for visitor ${visitorRecordId}.`,
      );
    }
  }
}
