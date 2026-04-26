import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentAuditChainService {
  constructor(private readonly prisma: PrismaService) {}

  async getChain(sourceType: string, sourceId: string, maxDepth = 4) {
    const safeMaxDepth = Math.min(maxDepth, 8);
    if (sourceType !== 'document') {
      return { sourceType, sourceId, nodes: [], edges: [] };
    }

    const nodes: Array<Record<string, unknown>> = [];
    const edges: Array<Record<string, unknown>> = [];
    const visited = new Set<string>();

    // Breadth-first: process one depth level per iteration
    let frontier = [sourceId];
    let depth = 0;

    while (frontier.length > 0 && depth <= safeMaxDepth) {
      const newFrontier: string[] = [];

      // Batch: fetch all docs and refs for this depth level
      const [docs, refs] = await Promise.all([
        this.prisma.document.findMany({ where: { id: { in: frontier } } }),
        this.prisma.documentReference.findMany({ where: { sourceDocId: { in: frontier } } }),
      ]);

      for (const doc of docs) {
        if (visited.has(doc.id)) continue;
        visited.add(doc.id);
        nodes.push({ type: 'document', id: doc.id, label: doc.title, depth });
      }

      for (const ref of refs as any[]) {
        const targetId = ref.targetDocId ?? ref.targetId ?? ref.targetRoute;
        edges.push({ from: ref.sourceDocId, to: targetId, relationType: ref.relationType });
        if (ref.targetType === 'document' && ref.targetDocId && !visited.has(ref.targetDocId)) {
          newFrontier.push(ref.targetDocId);
        } else if (ref.targetType !== 'document') {
          nodes.push({ type: ref.targetType, id: targetId, label: ref.targetLabel ?? targetId, depth: depth + 1 });
        }
      }

      frontier = newFrontier;
      depth++;
    }

    return { sourceType, sourceId, nodes, edges };
  }
}
