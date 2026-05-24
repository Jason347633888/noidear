import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeEventRelationDto } from './dto/create-change-event.dto';

@Injectable()
export class ChangeEventRelationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateRelations(relations: ChangeEventRelationDto[]) {
    for (const relation of relations) {
      await this.assertTargetExists(relation);
    }
  }

  async createRelations(
    changeEventId: string,
    relations: ChangeEventRelationDto[] = [],
    tx?: Prisma.TransactionClient,
  ) {
    if (relations.length === 0) return { count: 0 };
    const db = tx ?? this.prisma;
    return db.changeEventRelation.createMany({
      data: relations.map((relation) => ({
        changeEventId,
        targetType: relation.targetType,
        targetId: relation.targetId ?? null,
        targetRoute: relation.targetRoute ?? null,
        targetLabel: relation.targetLabel,
        relationType: relation.relationType ?? null,
        impactLevel: relation.impactLevel ?? 'medium',
        requiredAction: relation.requiredAction ?? null,
        status: 'open',
      })),
    });
  }

  private async assertTargetExists(relation: ChangeEventRelationDto) {
    if (!relation.targetId) return;

    const modelByType: Record<string, any> = {
      document: this.prisma.document,
      product: this.prisma.product,
      recipe: this.prisma.recipe,
      process_step: this.prisma.processStep,
      material: this.prisma.material,
      supplier: this.prisma.supplier,
    };
    const model = modelByType[relation.targetType];
    if (!model) return;

    const target = await model.findUnique({ where: { id: relation.targetId } });
    if (!target || target.deletedAt) {
      throw new NotFoundException(`变更关联目标不存在: ${relation.targetType}/${relation.targetId}`);
    }
  }
}
