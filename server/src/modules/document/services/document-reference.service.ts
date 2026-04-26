import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateGenericDocumentReferenceDto } from '../dto/document-control.dto';

/**
 * 跨文档引用服务（BR-305/306）
 * - 循环引用检测（BFS，禁止 A→B→A）
 * - 最大引用深度 2 层限制
 * - 创建/查询/影响范围分析
 */
@Injectable()
export class DocumentReferenceService {
  private readonly logger = new Logger(DocumentReferenceService.name);
  private readonly MAX_DEPTH = 2;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建文档引用（BR-305）
   * POST /documents/:id/references
   */
  async createReference(sourceDocId: string, dto: CreateGenericDocumentReferenceDto) {
    try {
      const source = await this.prisma.document.findUnique({ where: { id: sourceDocId, deletedAt: null } });
      if (!source) throw new NotFoundException(`源文档 ${sourceDocId} 不存在`);

      let target: any = null;
      if (dto.targetType === 'document') {
        if (!dto.targetDocId) throw new BadRequestException('document target requires targetDocId');
        target = await this.prisma.document.findUnique({ where: { id: dto.targetDocId, deletedAt: null } });
        if (!target) throw new NotFoundException(`目标文档 ${dto.targetDocId} 不存在`);
        if (sourceDocId === dto.targetDocId) throw new BadRequestException('不能引用自身文档');
        await this.validateNoCircularReference(sourceDocId, dto.targetDocId);
        await this.validateDepthLimit(sourceDocId, dto.targetDocId);
      } else if (!dto.targetId && !dto.targetRoute) {
        throw new BadRequestException('non-document target requires targetId or targetRoute');
      }

      const reference = await this.prisma.documentReference.create({
        data: {
          sourceDocId,
          targetDocId: dto.targetType === 'document' ? dto.targetDocId : null,
          targetType: dto.targetType,
          targetId: dto.targetId ?? dto.targetDocId ?? null,
          targetRoute: dto.targetRoute ?? null,
          targetLabel: dto.targetLabel ?? target?.title ?? null,
          relationType: dto.relationType,
          sectionId: dto.sectionId,
          snapshot: dto.snapshot as any ?? null,
          syncedAt: dto.snapshot ? new Date() : null,
        },
        include: {
          sourceDoc: { select: { id: true, title: true } },
          targetDoc: { select: { id: true, title: true } },
        },
      });

      return { success: true, data: reference };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(`创建文档引用失败: ${error.message}`);
    }
  }

  /**
   * 查询文档的所有引用（BR-305）
   * GET /documents/:id/references
   */
  async getReferences(docId: string) {
    try {
      const [sourceRefs, targetRefs] = await Promise.all([
        this.prisma.documentReference.findMany({
          where: { sourceDocId: docId },
          include: { targetDoc: { select: { id: true, title: true, status: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.documentReference.findMany({
          where: { targetDocId: docId },
          include: { sourceDoc: { select: { id: true, title: true, status: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        success: true,
        data: {
          outgoingRefs: sourceRefs,
          incomingRefs: targetRefs,
        },
      };
    } catch (error) {
      throw new BadRequestException(`查询文档引用失败: ${error.message}`);
    }
  }

  /**
   * 查询文档的影响范围（BR-306）
   * GET /documents/:id/reference-impact
   */
  async getReferenceImpact(docId: string) {
    try {
      const incomingRefs = await this.prisma.documentReference.findMany({
        where: { targetDocId: docId },
        include: { sourceDoc: { select: { id: true, title: true, status: true } } },
      });

      return {
        success: true,
        data: {
          docId,
          impactedCount: incomingRefs.length,
          impactedDocs: incomingRefs.map((r) => ({
            id: r.sourceDoc.id,
            title: r.sourceDoc.title,
            status: r.sourceDoc.status,
            sectionId: r.sectionId,
            syncedAt: r.syncedAt,
          })),
          message:
            incomingRefs.length > 0
              ? `共 ${incomingRefs.length} 个文档引用了此文档，修改后需同步更新`
              : '无文档引用此文档',
        },
      };
    } catch (error) {
      throw new BadRequestException(`查询影响范围失败: ${error.message}`);
    }
  }

  /**
   * 异步同步引用块快照（BR-306）
   * 源文档审批后调用，更新所有引用此文档的快照
   */
  async syncReferenceSnapshots(targetDocId: string, snapshot: Record<string, unknown>) {
    try {
      const result = await this.prisma.documentReference.updateMany({
        where: { targetDocId },
        data: { snapshot: snapshot as any, syncedAt: new Date() },
      });
      this.logger.log(`文档 ${targetDocId} 引用快照同步: 更新 ${result.count} 条`);
      return { success: true, updatedCount: result.count };
    } catch (error) {
      this.logger.error(`引用快照同步失败: ${error.message}`, error.stack);
      throw new BadRequestException(`引用快照同步失败: ${error.message}`);
    }
  }

  /**
   * BR-305: BFS 循环引用检测
   * 检查是否存在 sourceDocId → ... → targetDocId → sourceDocId 的环路
   */
  private async validateNoCircularReference(sourceDocId: string, targetDocId: string): Promise<void> {
    const visited = new Set<string>();
    const queue = [targetDocId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      if (current === sourceDocId) {
        throw new BadRequestException(
          `检测到循环引用：文档 ${sourceDocId} → ${targetDocId} 会产生引用环路`,
        );
      }

      const nextRefs = await this.prisma.documentReference.findMany({
        where: { sourceDocId: current },
        select: { targetDocId: true },
      });

      for (const ref of nextRefs) {
        if (ref.targetDocId && !visited.has(ref.targetDocId)) {
          queue.push(ref.targetDocId);
        }
      }
    }
  }

  /**
   * BR-305: 引用深度不超过 2 层
   */
  private async validateDepthLimit(sourceDocId: string, targetDocId: string): Promise<void> {
    const depth = await this.calculateDepth(targetDocId, 0);
    if (depth >= this.MAX_DEPTH) {
      throw new BadRequestException(
        `引用深度超过限制（最大 ${this.MAX_DEPTH} 层），当前目标文档引用链深度已为 ${depth}`,
      );
    }
  }

  private async calculateDepth(docId: string, currentDepth: number): Promise<number> {
    if (currentDepth >= this.MAX_DEPTH) return currentDepth;

    const outgoing = await this.prisma.documentReference.findMany({
      where: { sourceDocId: docId },
      select: { targetDocId: true },
    });

    if (outgoing.length === 0) return currentDepth;

    let maxDepth = currentDepth;
    for (const ref of outgoing) {
      if (!ref.targetDocId) continue;
      const d = await this.calculateDepth(ref.targetDocId, currentDepth + 1);
      if (d > maxDepth) maxDepth = d;
    }

    return maxDepth;
  }
}
