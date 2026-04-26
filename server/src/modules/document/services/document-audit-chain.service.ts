import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentAuditChainService {
  constructor(private readonly prisma: PrismaService) {}

  async getChain(sourceType: string, sourceId: string, maxDepth = 4) {
    if (sourceType !== 'document') {
      return { sourceType, sourceId, nodes: [], edges: [] };
    }

    const nodes: Array<Record<string, unknown>> = [];
    const edges: Array<Record<string, unknown>> = [];
    const visited = new Set<string>();

    const walk = async (docId: string, depth: number) => {
      if (depth > maxDepth || visited.has(docId)) return;
      visited.add(docId);
      const doc = await this.prisma.document.findUnique({ where: { id: docId } });
      if (!doc) return;
      nodes.push({ type: 'document', id: doc.id, label: doc.title, depth });
      const refs = await this.prisma.documentReference.findMany({ where: { sourceDocId: docId } });
      for (const ref of refs as any[]) {
        const targetId = ref.targetDocId ?? ref.targetId ?? ref.targetRoute;
        edges.push({ from: docId, to: targetId, relationType: ref.relationType });
        if (ref.targetType === 'document' && ref.targetDocId) {
          await walk(ref.targetDocId, depth + 1);
        } else {
          nodes.push({ type: ref.targetType, id: targetId, label: ref.targetLabel ?? targetId, depth: depth + 1 });
        }
      }
    };

    await walk(sourceId, 0);
    return { sourceType, sourceId, nodes, edges };
  }
}
