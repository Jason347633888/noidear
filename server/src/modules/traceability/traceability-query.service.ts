import { ForbiddenException, Injectable } from '@nestjs/common';
import { ModelLandingService } from '../model-landing/model-landing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryTraceabilityDto } from './dto/query-traceability.dto';

type TraceRiskLevel = 'normal' | 'minor' | 'important' | 'high';

interface TraceLedgerRow {
  nodeType: string;
  nodeId: string;
  label: string;
  batchNo?: string;
  status?: string;
  riskLevel?: TraceRiskLevel;
  upstreamNodeId?: string;
  downstreamNodeId?: string;
}

interface TraceQueryResult {
  summary: {
    entryMode?: string;
    objectType?: string;
    objectId?: string;
    scenario?: string;
    traceMode?: string;
    viewMode?: string;
    timeMode?: string;
    asOfAt?: string;
  };
  ledger: TraceLedgerRow[];
  graph: { nodes: Array<{ id: string; type: string; label: string; riskLevel?: TraceRiskLevel }>; edges: Array<{ id: string; source: string; target: string; relation: string }> };
  risks: Array<{ code: string; level: TraceRiskLevel; message: string }>;
  evidence: Array<{ type: 'record'; label: string; refId: string }>;
  permission: { canViewSummary: boolean; canViewDetail: boolean; canInitiateAction: boolean; canExecuteHighRiskAction: boolean };
}

@Injectable()
export class TraceabilityQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelLandingService: ModelLandingService,
  ) {}

  async query(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
    this.assertScenarioPermission(dto, currentUser);

    const summary = {
      entryMode: dto.entryMode,
      objectType: dto.objectType,
      objectId: dto.objectId,
      scenario: dto.scenario,
      traceMode: dto.traceMode,
      viewMode: dto.viewMode,
      timeMode: dto.timeMode,
      asOfAt: dto.asOfAt,
    };

    const ledger = await this.buildLedger(dto);
    const graph = this.buildGraph(ledger);

    return {
      summary,
      ledger,
      graph,
      risks: this.buildRisks(ledger),
      evidence: this.buildEvidenceRefs(ledger),
      permission: this.buildPermissionView(currentUser),
    };
  }

  private assertScenarioPermission(dto: QueryTraceabilityDto, currentUser: any): void {
    const needed =
      dto.traceMode === 'forward'
        ? 'forwardTrace'
        : dto.traceMode === 'backward'
        ? 'backwardTrace'
        : 'bidirectionalTrace';

    if (!currentUser?.scenarioPermissions?.includes(needed)) {
      throw new ForbiddenException(`Missing scenario permission: ${needed}`);
    }
  }

  private async buildLedger(dto: QueryTraceabilityDto): Promise<TraceLedgerRow[]> {
    if (dto.objectType === 'materialLot' && dto.objectId) {
      return this.buildForwardLedgerFromMaterialLot(dto.objectId);
    }
    return [];
  }

  private async buildForwardLedgerFromMaterialLot(objectId: string): Promise<TraceLedgerRow[]> {
    const materialLot: any = await this.prisma.materialBatch.findFirst({
      where: { id: objectId },
      include: { batchMaterialUsages: true },
    });

    if (!materialLot) return [];

    const batchLabel: string = materialLot.batch_no ?? materialLot.batchNumber ?? materialLot.id;

    const rows: TraceLedgerRow[] = [
      {
        nodeType: 'materialLot',
        nodeId: materialLot.id,
        label: batchLabel,
        batchNo: batchLabel,
      },
    ];

    const usages: any[] = materialLot.batchMaterialUsages ?? [];
    const productionBatchIds = usages.map((u: any) => u.productionBatchId);

    for (const usage of usages) {
      rows.push({
        nodeType: 'ingredientUsage',
        nodeId: usage.id,
        label: `投料 ${usage.quantity}`,
        upstreamNodeId: materialLot.id,
        downstreamNodeId: usage.productionBatchId,
      });
    }

    if (productionBatchIds.length > 0) {
      const productionBatches = await this.prisma.productionBatch.findMany({
        where: { id: { in: productionBatchIds } },
        include: {
          finishedGoods: true,
          delivery_notes: true,
        },
      });

      for (const pb of productionBatches as any[]) {
        rows.push({
          nodeType: 'productionBatch',
          nodeId: pb.id,
          label: pb.batch_no,
          batchNo: pb.batch_no,
        });

        for (const fg of pb.finishedGoods as any[]) {
          rows.push({
            nodeType: 'finishedGoodsBatch',
            nodeId: fg.id,
            label: fg.batch_no,
            batchNo: fg.batch_no,
            upstreamNodeId: pb.id,
          });
        }

        for (const dn of pb.delivery_notes as any[]) {
          rows.push({
            nodeType: 'deliveryNote',
            nodeId: dn.id,
            label: dn.delivery_no,
            upstreamNodeId: pb.id,
          });
        }
      }
    }

    return rows;
  }

  private buildGraph(ledger: TraceLedgerRow[]) {
    return {
      nodes: ledger.map((row) => ({
        id: row.nodeId,
        type: row.nodeType,
        label: row.label,
        riskLevel: row.riskLevel,
      })),
      edges: ledger
        .filter((row) => row.upstreamNodeId && row.downstreamNodeId)
        .map((row) => ({
          id: `${row.upstreamNodeId}:${row.downstreamNodeId}`,
          source: row.upstreamNodeId as string,
          target: row.downstreamNodeId as string,
          relation: row.nodeType,
        })),
    };
  }

  private buildRisks(ledger: TraceLedgerRow[]) {
    return ledger
      .filter((row) => row.riskLevel && row.riskLevel !== 'normal')
      .map((row) => ({
        code: row.nodeType,
        level: row.riskLevel as TraceRiskLevel,
        message: `${row.label} 存在风险标记`,
      }));
  }

  private buildEvidenceRefs(ledger: TraceLedgerRow[]) {
    return ledger.map((row) => ({
      type: 'record' as const,
      label: row.label,
      refId: row.nodeId,
    }));
  }

  getTraceabilityPermissionView(currentUser: any) {
    return this.buildPermissionView(currentUser);
  }

  private buildPermissionView(currentUser: any) {
    return {
      canViewSummary: true,
      canViewDetail: currentUser?.department !== '访客',
      canInitiateAction: Boolean(currentUser?.scenarioPermissions?.length),
      canExecuteHighRiskAction:
        currentUser?.department === '品质' || currentUser?.department === '管理层',
    };
  }
}
