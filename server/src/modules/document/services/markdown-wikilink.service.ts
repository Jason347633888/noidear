import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

type WikilinkPrismaClient = Pick<PrismaService, 'document' | 'documentReference'>;

@Injectable()
export class MarkdownWikilinkService {
  constructor(private readonly prisma: PrismaService) {}

  extractWikilinks(content: string): string[] {
    const labels = Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g))
      .map((match) => match[1].trim())
      .filter(Boolean);
    return Array.from(new Set(labels));
  }

  async syncDocumentWikilinks(sourceDocId: string, content: string, client: WikilinkPrismaClient = this.prisma) {
    const labels = this.extractWikilinks(content);

    await client.documentReference.deleteMany({
      where: { sourceDocId, relationType: 'WIKILINK' },
    });

    for (const label of labels) {
      const targets = await client.document.findMany({
        where: {
          id: { not: sourceDocId },
          deletedAt: null,
          OR: [
            { number: label },
            { title: label },
            { doc_code: label },
          ],
        },
        select: { id: true, title: true, number: true, doc_code: true },
        take: 10,
      });

      const sectionId = `wikilink:${label}`;

      if (targets.length === 1) {
        const target = targets[0];
        await client.documentReference.create({
          data: {
            sourceDocId,
            targetDocId: target.id,
            targetType: 'document',
            targetId: target.id,
            targetLabel: target.title || target.number || label,
            relationType: 'WIKILINK',
            sectionId,
            syncedAt: new Date(),
          },
        });
        continue;
      }

      await client.documentReference.create({
        data: {
          sourceDocId,
          targetDocId: null,
          targetType: targets.length > 1 ? 'conflict_document' : 'unresolved_document',
          targetId: null,
          targetLabel: label,
          relationType: 'WIKILINK',
          sectionId,
          snapshot: targets.length > 1 ? { candidates: targets } : undefined,
          syncedAt: new Date(),
        },
      });
    }
  }
}
