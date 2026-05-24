import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type ReferenceHealthStatus = 'healthy' | 'dangling' | 'unimplemented' | 'invalid' | 'conflict' | 'superseded';

export interface DocumentReferenceHealthIssue {
  sourceDocId: string;
  sourceNumber?: string | null;
  sourceTitle: string;
  referenceId: string;
  label: string;
  status: ReferenceHealthStatus;
  reason: string;
  targetDocId?: string;
  targetTitle?: string;
  supersededById?: string;
  supersededByTitle?: string;
  candidates?: Array<{ id: string; number?: string | null; title: string }>;
}

export interface DocumentReferenceHealthResult {
  totals: {
    total: number;
    healthy: number;
    dangling: number;
    unimplemented: number;
    invalid: number;
    conflict: number;
    superseded: number;
  };
  issues: DocumentReferenceHealthIssue[];
}

type ReferenceWithDocs = {
  id: string;
  sourceDocId: string;
  targetDocId?: string | null;
  targetType: string;
  targetLabel?: string | null;
  targetRoute?: string | null;
  targetId?: string | null;
  snapshot?: unknown;
  sourceDoc?: { id: string; title: string; number?: string | null } | null;
  targetDoc?: {
    id: string;
    title: string;
    number?: string | null;
    status: string;
    deletedAt?: Date | null;
    archivedAt?: Date | null;
    obsoletedAt?: Date | null;
    superseded_by_id?: string | null;
    superseded_by?: { id: string; title: string } | null;
  } | null;
};

@Injectable()
export class DocumentReferenceHealthService {
  private readonly currentBasisStatuses = new Set(['approved', 'effective']);
  private readonly invalidStatuses = new Set([
    'archived',
    'archive',
    'obsolete',
    'obsoleted',
    'inactive',
    'disabled',
    'deactivated',
    'void',
    'voided',
    'deleted',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  async getDocumentHealth(documentId: string): Promise<DocumentReferenceHealthResult> {
    const references = await this.findReferences({ sourceDocId: documentId });
    return this.toHealthResult(references, false);
  }

  async listIssues(): Promise<DocumentReferenceHealthResult> {
    const references = await this.findReferences({});
    return this.toHealthResult(references, true);
  }

  private async findReferences(where: { sourceDocId?: string }) {
    return this.prisma.documentReference.findMany({
      where: {
        ...where,
        OR: [
          { targetType: { in: ['document', 'unresolved_document', 'conflict_document'] } },
          { targetDocId: { not: null } },
        ],
      },
      include: {
        sourceDoc: { select: { id: true, title: true, number: true } },
        targetDoc: {
          select: {
            id: true,
            title: true,
            number: true,
            status: true,
            deletedAt: true,
            archivedAt: true,
            obsoletedAt: true,
            superseded_by_id: true,
            superseded_by: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as ReferenceWithDocs[];
  }

  private toHealthResult(references: ReferenceWithDocs[], onlyIssues: boolean): DocumentReferenceHealthResult {
    const evaluated = references.map((reference) => this.evaluate(reference));
    const totals = evaluated.reduce<DocumentReferenceHealthResult['totals']>(
      (acc, issue) => {
        acc.total += 1;
        acc[issue.status] += 1;
        return acc;
      },
      { total: 0, healthy: 0, dangling: 0, unimplemented: 0, invalid: 0, conflict: 0, superseded: 0 },
    );

    return {
      totals,
      issues: onlyIssues ? evaluated.filter((issue) => issue.status !== 'healthy') : evaluated,
    };
  }

  private evaluate(reference: ReferenceWithDocs): DocumentReferenceHealthIssue {
    const base = this.toBaseIssue(reference);

    if (reference.targetType === 'conflict_document') {
      return {
        ...base,
        status: 'conflict',
        reason: '引用文本匹配到多个候选文件，需要文控人员确认目标。',
        candidates: this.extractCandidates(reference.snapshot),
      };
    }

    if (reference.targetType === 'unresolved_document' || !reference.targetDocId || !reference.targetDoc) {
      return {
        ...base,
        status: 'dangling',
        reason: '引用文本未匹配到受控文件。',
      };
    }

    const targetDoc = reference.targetDoc;
    if (targetDoc.superseded_by_id || targetDoc.superseded_by) {
      return {
        ...base,
        status: 'superseded',
        reason: '目标文件已被新版本替代，需要更新引用。',
        targetDocId: targetDoc.id,
        targetTitle: targetDoc.title,
        supersededById: targetDoc.superseded_by?.id || targetDoc.superseded_by_id || undefined,
        supersededByTitle: targetDoc.superseded_by?.title,
      };
    }

    const targetStatus = targetDoc.status.toLowerCase();
    if (
      targetDoc.deletedAt ||
      targetDoc.archivedAt ||
      targetDoc.obsoletedAt ||
      this.invalidStatuses.has(targetStatus) ||
      !this.currentBasisStatuses.has(targetStatus)
    ) {
      return {
        ...base,
        status: 'invalid',
        reason: '目标文件已删除、归档、作废、停用或尚未生效，不能作为当前依据。',
        targetDocId: targetDoc.id,
        targetTitle: targetDoc.title,
      };
    }

    return {
      ...base,
      status: 'healthy',
      reason: '目标文件可作为当前引用依据。',
      targetDocId: targetDoc.id,
      targetTitle: targetDoc.title,
    };
  }

  private toBaseIssue(reference: ReferenceWithDocs): Omit<DocumentReferenceHealthIssue, 'status' | 'reason'> {
    return {
      sourceDocId: reference.sourceDocId,
      sourceNumber: reference.sourceDoc?.number,
      sourceTitle: reference.sourceDoc?.title || reference.sourceDoc?.number || reference.sourceDocId,
      referenceId: reference.id,
      label: reference.targetLabel || reference.targetRoute || reference.targetId || '-',
    };
  }

  private extractCandidates(snapshot: unknown): Array<{ id: string; number?: string | null; title: string }> {
    const candidates = this.isRecord(snapshot) && Array.isArray(snapshot.candidates) ? snapshot.candidates : [];
    return candidates
      .filter((candidate): candidate is Record<string, unknown> => this.isRecord(candidate) && typeof candidate.id === 'string')
      .map((candidate) => ({
        id: String(candidate.id),
        number: typeof candidate.number === 'string' ? candidate.number : null,
        title: typeof candidate.title === 'string' ? candidate.title : String(candidate.id),
      }));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
