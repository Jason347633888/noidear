import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

type WikilinkPrismaClient = Pick<PrismaService, 'document' | 'documentReference' | 'recordFormLandingEntry'>;

@Injectable()
export class MarkdownWikilinkService {
  constructor(private readonly prisma: PrismaService) {}

  extractWikilinks(content: string): string[] {
    const targets = Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g))
      .map((match) => this.extractTarget(match[1]))
      .filter((target): target is string => Boolean(target));
    return Array.from(new Set(targets));
  }

  private extractTarget(raw: string): string | null {
    const target = raw.split('|')[0]?.trim();
    return target || null;
  }

  async syncDocumentWikilinks(sourceDocId: string, content: string, client: WikilinkPrismaClient = this.prisma) {
    const wikilinkEntries = this.parseWikilinks(content);

    await client.documentReference.deleteMany({
      where: { sourceDocId, relationType: 'WIKILINK' },
    });

    const sourceDocument = await client.document.findUnique({
      where: { id: sourceDocId },
      select: { id: true, title: true, number: true, doc_code: true },
    });

    for (const { target, displayLabel } of wikilinkEntries) {
      if (this.matchesDocumentLabel(sourceDocument, target)) {
        continue;
      }

      const targets = await client.document.findMany({
        where: {
          id: { not: sourceDocId },
          deletedAt: null,
          OR: [
            { number: target },
            { title: target },
            { doc_code: target },
          ],
        },
        select: { id: true, title: true, number: true, doc_code: true },
        take: 10,
      });

      const sectionId = `wikilink:${target}`;

      const formCode = this.extractSourceFormCode(target);
      if (formCode) {
        const entries = await client.recordFormLandingEntry.findMany({
          where: { sourceCode: formCode },
          take: 10,
        });

        if (entries.length === 1) {
          const entry = entries[0];
          await client.documentReference.create({
            data: {
              sourceDocId,
              targetDocId: null,
              targetType: 'record_form_landing',
              targetId: entry.sourceCode,
              targetRoute: (entry as any).primaryRoute || (entry as any).targetRoute,
              targetLabel: displayLabel || target,
              relationType: 'WIKILINK',
              sectionId,
              wikilinkTarget: target,
              snapshot: {
                landingStatus: (entry as any).landingStatus,
                confirmationStatus: (entry as any).confirmationStatus,
                targetTemplateId: (entry as any).targetTemplateId,
              },
              syncedAt: new Date(),
            },
          });
          continue;
        }

        await client.documentReference.create({
          data: {
            sourceDocId,
            targetDocId: null,
            targetType: entries.length > 1 ? 'conflict_record_form' : 'unresolved_record_form',
            targetId: formCode,
            targetLabel: displayLabel || target,
            relationType: 'WIKILINK',
            sectionId,
            wikilinkTarget: target,
            snapshot: entries.length > 1 ? { candidates: entries } : undefined,
            syncedAt: new Date(),
          },
        });
        continue;
      }

      if (targets.length === 1) {
        const resolvedTarget = targets[0];
        await client.documentReference.create({
          data: {
            sourceDocId,
            targetDocId: resolvedTarget.id,
            targetType: 'document',
            targetId: resolvedTarget.id,
            targetLabel: displayLabel || resolvedTarget.title || resolvedTarget.number || target,
            relationType: 'WIKILINK',
            sectionId,
            wikilinkTarget: target,
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
          targetLabel: displayLabel || target,
          relationType: 'WIKILINK',
          sectionId,
          wikilinkTarget: target,
          snapshot: targets.length > 1 ? { candidates: targets } : undefined,
          syncedAt: new Date(),
        },
      });
    }
  }

  private parseWikilinks(content: string): Array<{ target: string; displayLabel: string | null }> {
    const seen = new Set<string>();
    const entries: Array<{ target: string; displayLabel: string | null }> = [];

    for (const match of content.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const raw = match[1];
      const parts = raw.split('|');
      const target = parts[0]?.trim();
      if (!target) continue;
      if (seen.has(target)) continue;
      seen.add(target);
      const displayLabel = parts[1]?.trim() || null;
      entries.push({ target, displayLabel });
    }

    return entries;
  }

  private extractSourceFormCode(target: string): string | null {
    const match = target.match(/(GRSS-[A-Z]{2}-JL-\d+)/);
    return match?.[1] ?? null;
  }

  private matchesDocumentLabel(
    document: { title?: string | null; number?: string | null; doc_code?: string | null } | null,
    label: string,
  ): boolean {
    if (!document) return false;
    return [document.number, document.title, document.doc_code].some((value) => value === label);
  }
}
