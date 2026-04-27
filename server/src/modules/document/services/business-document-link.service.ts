import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface BusinessDocumentLinkInput {
  documentId: string;
  businessType: string;
  businessId: string;
  documentKind: string;
  required?: boolean;
  issuedAt?: Date;
  expiresAt?: Date;
  warningDays?: number;
  status?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class BusinessDocumentLinkService {
  constructor(private readonly prisma: PrismaService) {}

  link(input: BusinessDocumentLinkInput) {
    const data = {
      documentId: input.documentId,
      businessType: input.businessType,
      businessId: input.businessId,
      documentKind: input.documentKind,
      required: input.required ?? false,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      warningDays: input.warningDays ?? 30,
      status: input.status ?? 'valid',
      metadata: input.metadata,
    };

    return this.prisma.businessDocumentLink.upsert({
      where: {
        businessType_businessId_documentKind_documentId: {
          businessType: input.businessType,
          businessId: input.businessId,
          documentKind: input.documentKind,
          documentId: input.documentId,
        },
      },
      create: data,
      update: {
        required: data.required,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        warningDays: data.warningDays,
        status: data.status,
        metadata: data.metadata,
      },
    });
  }
}
