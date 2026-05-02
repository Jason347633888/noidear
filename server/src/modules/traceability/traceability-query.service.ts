import { ForbiddenException, Injectable } from '@nestjs/common';
import { ModelLandingService } from '../model-landing/model-landing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryTraceabilityDto } from './dto/query-traceability.dto';
import type { TraceQueryResult } from '@noidear/types';
import {
  SOURCE_VERSION,
  buildTraceResult,
  deliveryNoteNode,
  edge,
  ingredientUsageNode,
  materialLotNode,
  productionBatchNode,
} from './traceability-contract.mapper';

@Injectable()
export class TraceabilityQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelLandingService: ModelLandingService,
  ) {}

  async query(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
    this.assertScenarioPermission(dto, currentUser);

    if (dto.entryMode === 'object' && dto.objectType === 'materialLot' && dto.objectId) {
      return this.queryMaterialLot(dto, currentUser);
    }
    if (dto.entryMode === 'object' && dto.objectType === 'productionBatch' && dto.objectId) {
      return this.queryProductionBatch(dto, currentUser);
    }
    if (dto.entryMode === 'object' && dto.objectType === 'deliveryNote' && dto.objectId) {
      return this.queryDeliveryNote(dto, currentUser);
    }
    if (dto.entryMode === 'scenario') {
      return this.queryScenario(dto, currentUser);
    }

    return this.emptyResult(dto, currentUser);
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

  private buildPermissionView(currentUser: any) {
    return {
      departmentScope: currentUser?.department ?? 'unknown',
      scenarioPermissions: currentUser?.scenarioPermissions ?? [],
      canViewSummary: true,
      canViewDetail: currentUser?.department !== '访客',
      canViewEvidence: currentUser?.department !== '访客',
      canInitiateLinkage: Boolean(currentUser?.scenarioPermissions?.length),
      canExportSimple: true,
      canExportFullPackage:
        currentUser?.department === '品质' || currentUser?.department === '管理层',
      canUseAsOfPlayback: true,
      canExecuteHighRiskAction:
        currentUser?.department === '品质' || currentUser?.department === '管理层',
    };
  }

  private emptyResult(dto: QueryTraceabilityDto, currentUser: any): TraceQueryResult {
    return {
      summary: {
        queryId: `empty:${dto.objectType ?? dto.scenario ?? 'unknown'}:${dto.objectId ?? 'none'}`,
        entryMode: dto.entryMode,
        objectType: dto.objectType,
        objectId: dto.objectId,
        scenario: dto.scenario,
        traceMode: dto.traceMode,
        viewMode: dto.viewMode,
        timeMode: dto.timeMode,
        asOfAt: dto.asOfAt,
        riskLevel: 'normal',
        resultStatus: 'empty',
      },
      permission: this.buildPermissionView(currentUser),
      risk: { summaryRiskLevel: 'normal', riskCount: 0, highRiskCount: 0, items: [] },
      ledger: {
        columns: [{ key: 'label', label: '节点' }],
        rows: [],
        grouping: ['nodeType'],
        totals: { rowCount: 0 },
      },
      graph: { nodes: [], edges: [], layout: 'vertical', legend: ['mainChain'] },
      evidence: { count: 0, items: [] },
      actions: { available: [], recommended: [], created: [] },
      export: { simpleExportAvailable: true, fullPackageAvailable: true, latestExportId: null },
      meta: {
        generatedAt: new Date().toISOString(),
        queryHash: `empty:${dto.objectId ?? dto.scenario ?? 'unknown'}`,
        degraded: false,
        snapshotId: null,
        sourceVersion: SOURCE_VERSION,
      },
      extensions: {},
    } as unknown as TraceQueryResult;
  }

  private async queryMaterialLot(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
    const materialLot = await this.prisma.materialBatch.findUnique({
      where: { id: dto.objectId },
      include: {
        material: true,
        supplier: true,
        batchMaterialUsages: {
          include: {
            productionBatch: {
              include: { delivery_notes: true },
            },
          },
        },
      },
    });

    if (!materialLot) return this.emptyResult(dto, currentUser);

    return buildTraceResult({
      queryId: `forward:${materialLot.id}`,
      entryMode: dto.entryMode as 'object',
      objectType: dto.objectType,
      objectId: dto.objectId,
      traceMode: dto.traceMode as 'forward' | 'backward' | 'bidirectional',
      viewMode: dto.viewMode as 'ledger' | 'graph',
      timeMode: dto.timeMode as 'current' | 'asOf',
      asOfAt: dto.asOfAt,
      permission: this.buildPermissionView(currentUser),
      ...this.materialLotChain(materialLot, dto.traceMode as 'forward' | 'backward' | 'bidirectional'),
    }) as unknown as TraceQueryResult;
  }

  private materialLotChain(
    materialLot: any,
    direction: 'forward' | 'backward' | 'bidirectional',
  ) {
    const rows = [materialLotNode(materialLot)];
    const edges: any[] = [];

    for (const usage of materialLot.batchMaterialUsages ?? []) {
      rows.push(ingredientUsageNode(usage));
      if (usage.productionBatch) rows.push(productionBatchNode(usage.productionBatch));
      edges.push(edge(materialLot.id, usage.id, 'usedIn', direction, edges.length));
      if (usage.productionBatch) {
        edges.push(edge(usage.id, usage.productionBatch.id, 'produces', direction, edges.length));
        for (const dn of usage.productionBatch.delivery_notes ?? []) {
          rows.push(deliveryNoteNode(dn));
          edges.push(edge(usage.productionBatch.id, String(dn.id), 'shippedBy', direction, edges.length));
        }
      }
    }

    return { rows, edges };
  }

  private async queryProductionBatch(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.objectId },
      include: {
        materialUsages: {
          include: {
            materialBatch: {
              include: { material: true, supplier: true },
            },
          },
        },
        delivery_notes: true,
      },
    });

    if (!productionBatch) return this.emptyResult(dto, currentUser);

    const rows: any[] = [];
    const edges: any[] = [];

    for (const usage of (productionBatch as any).materialUsages ?? []) {
      if (usage.materialBatch) rows.push(materialLotNode(usage.materialBatch));
      rows.push(ingredientUsageNode(usage));
      if (usage.materialBatch) {
        edges.push(edge(usage.materialBatch.id, usage.id, 'usedIn', dto.traceMode as any, edges.length));
      }
      edges.push(edge(usage.id, productionBatch.id, 'produces', dto.traceMode as any, edges.length));
    }

    rows.push(productionBatchNode(productionBatch));

    for (const dn of (productionBatch as any).delivery_notes ?? []) {
      rows.push(deliveryNoteNode(dn));
      edges.push(edge(productionBatch.id, String(dn.id), 'shippedBy', dto.traceMode as any, edges.length));
    }

    return buildTraceResult({
      queryId: `${dto.traceMode}:${productionBatch.id}`,
      entryMode: dto.entryMode as 'object',
      objectType: dto.objectType,
      objectId: dto.objectId,
      traceMode: dto.traceMode as 'forward' | 'backward' | 'bidirectional',
      viewMode: dto.viewMode as 'ledger' | 'graph',
      timeMode: dto.timeMode as 'current' | 'asOf',
      asOfAt: dto.asOfAt,
      permission: this.buildPermissionView(currentUser),
      rows,
      edges,
    }) as unknown as TraceQueryResult;
  }

  private async queryDeliveryNote(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
    const deliveryId = Number(dto.objectId);
    if (!Number.isInteger(deliveryId)) return this.emptyResult(dto, currentUser);

    const deliveryNote = await this.prisma.deliveryNote.findUnique({
      where: { id: deliveryId },
      include: {
        production_batch: {
          include: {
            materialUsages: {
              include: {
                materialBatch: {
                  include: { material: true, supplier: true },
                },
              },
            },
          },
        },
      },
    });

    if (!deliveryNote) return this.emptyResult(dto, currentUser);

    const rows: any[] = [deliveryNoteNode(deliveryNote)];
    const edges: any[] = [];
    const productionBatch = (deliveryNote as any).production_batch;
    rows.push(productionBatchNode(productionBatch));
    edges.push(edge(String(deliveryNote.id), productionBatch.id, 'shipsFrom', 'backward', edges.length));

    for (const usage of productionBatch.materialUsages ?? []) {
      rows.push(ingredientUsageNode(usage));
      if (usage.materialBatch) rows.push(materialLotNode(usage.materialBatch));
      edges.push(edge(productionBatch.id, usage.id, 'containsUsage', 'backward', edges.length));
      if (usage.materialBatch) {
        edges.push(edge(usage.id, usage.materialBatch.id, 'usesLot', 'backward', edges.length));
      }
    }

    return buildTraceResult({
      queryId: `backward:${deliveryNote.id}`,
      entryMode: dto.entryMode as 'object',
      objectType: dto.objectType,
      objectId: dto.objectId,
      traceMode: dto.traceMode as 'forward' | 'backward' | 'bidirectional',
      viewMode: dto.viewMode as 'ledger' | 'graph',
      timeMode: dto.timeMode as 'current' | 'asOf',
      asOfAt: dto.asOfAt,
      permission: this.buildPermissionView(currentUser),
      rows,
      edges,
    }) as unknown as TraceQueryResult;
  }

  private async queryScenario(dto: QueryTraceabilityDto, currentUser: any): Promise<TraceQueryResult> {
    const objectId =
      typeof (dto as any).filters?.objectId === 'string'
        ? (dto as any).filters.objectId
        : dto.objectId;
    const objectType =
      typeof (dto as any).filters?.objectType === 'string'
        ? (dto as any).filters.objectType
        : dto.objectType;

    if (!objectId || !objectType) return this.emptyResult(dto, currentUser);

    return this.query({ ...dto, entryMode: 'object', objectType, objectId }, currentUser);
  }

  getTraceabilityPermissionView(currentUser: any) {
    return this.buildPermissionView(currentUser);
  }
}
