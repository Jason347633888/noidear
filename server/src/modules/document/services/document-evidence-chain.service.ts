import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
// Types inlined from @noidear/types to avoid workspace resolution issues
type EvidenceSourceType =
  | 'document'
  | 'record_template'
  | 'record'
  | 'change_event'
  | 'audit_finding'
  | 'corrective_action';

type EvidenceNodeType =
  | EvidenceSourceType
  | 'approval_instance'
  | 'approval_task'
  | 'legacy_approval'
  | 'document_reference'
  | 'record_form_landing'
  | 'read_requirement'
  | 'read_confirmation'
  | 'training_need'
  | 'training_project'
  | 'change_event_relation'
  | 'change_event_form_task'
  | 'document_impact_review'
  | 'document_impact_item'
  | 'verification_record'
  | 'unknown';

type EvidenceRelationStrength = 'strong' | 'validated' | 'weak' | 'missing';

interface EvidenceNode {
  id: string;
  nodeId: string;
  type: EvidenceNodeType;
  label: string;
  status?: string | null;
  route?: string | null;
  depth: number;
  metadata?: Record<string, unknown>;
}

interface EvidenceEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
  strength: EvidenceRelationStrength;
  label: string;
  metadata?: Record<string, unknown>;
}

interface EvidenceWarning {
  id: string;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  sourceNodeId?: string;
  targetType?: string;
  targetId?: string | null;
  relationType?: string;
}

interface EvidenceChainMeta {
  sourceType: EvidenceSourceType;
  sourceId: string;
  maxDepth: number;
  generatedAt: string;
  truncated: boolean;
}

interface EvidenceChainResult {
  root: EvidenceNode;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  warnings: EvidenceWarning[];
  meta: EvidenceChainMeta;
}

interface EvidenceChainQuery {
  sourceType: EvidenceSourceType;
  sourceId: string;
  maxDepth?: number;
}
import { PrismaService } from '../../../prisma/prisma.service';

class EvidenceChainBuilder {
  private nodes: Map<string, EvidenceNode> = new Map();
  private edges: Map<string, EvidenceEdge> = new Map();
  private warnings: EvidenceWarning[] = [];
  private _root: EvidenceNode | null = null;

  constructor(
    private readonly sourceType: EvidenceSourceType,
    private readonly sourceId: string,
    public readonly maxDepth: number,
  ) {}

  addNode(node: EvidenceNode): void {
    if (!this._root) this._root = node;
    this.nodes.set(node.nodeId, node);
  }

  setRoot(node: EvidenceNode): void {
    this._root = node;
    this.nodes.set(node.nodeId, node);
  }

  addEdge(edge: EvidenceEdge): void {
    const key = `${edge.source}|${edge.target}|${edge.relationType}`;
    this.edges.set(key, edge);
  }

  addWarning(warning: EvidenceWarning): void {
    this.warnings = [...this.warnings, warning];
  }

  canExpand(depth: number): boolean {
    return depth < this.maxDepth;
  }

  result(): EvidenceChainResult {
    if (!this._root) throw new InternalServerErrorException('No root node set');
    return {
      root: this._root,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      warnings: this.warnings,
      meta: {
        sourceType: this.sourceType,
        sourceId: this.sourceId,
        maxDepth: this.maxDepth,
        generatedAt: new Date().toISOString(),
        truncated: false,
      },
    };
  }
}

@Injectable()
export class DocumentEvidenceChainService {
  constructor(private readonly prisma: PrismaService) {}

  async getChain(query: EvidenceChainQuery): Promise<EvidenceChainResult> {
    const maxDepth = this.normalizeDepth(query.maxDepth);
    const builder = new EvidenceChainBuilder(query.sourceType, query.sourceId, maxDepth);

    switch (query.sourceType) {
      case 'document':
        await this.expandDocumentRoot(builder, query.sourceId);
        break;
      case 'record_template':
        await this.expandRecordTemplateRoot(builder, query.sourceId);
        break;
      case 'record':
        await this.expandRecordRoot(builder, query.sourceId);
        break;
      case 'change_event':
        await this.expandChangeEventRoot(builder, query.sourceId);
        break;
      case 'audit_finding':
        await this.expandAuditFindingRoot(builder, query.sourceId);
        break;
      case 'corrective_action':
        await this.expandCorrectiveActionRoot(builder, query.sourceId);
        break;
      default:
        throw new BadRequestException('Unsupported evidence source type');
    }

    return builder.result();
  }

  private normalizeDepth(maxDepth?: number): number {
    if (maxDepth === undefined || maxDepth === null) return 4;
    if (maxDepth > 8) return 8;
    if (maxDepth < 1) return 1;
    return maxDepth;
  }

  private async expandDocumentRoot(
    builder: EvidenceChainBuilder,
    documentId: string,
  ): Promise<void> {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

    const rootNodeId = `document:${documentId}`;
    const rootNode: EvidenceNode = {
      id: documentId,
      nodeId: rootNodeId,
      type: 'document',
      label: doc.number ? `${doc.number} ${doc.title}` : doc.title,
      route: `/documents/${documentId}`,
      depth: 0,
    };
    builder.setRoot(rootNode);

    await this.expandDocumentLandingEntries(builder, documentId, rootNodeId);
    await this.expandDocumentReadRequirements(builder, documentId, rootNodeId);
    await this.expandDocumentTrainingNeeds(builder, documentId, rootNodeId);
    await this.expandDocumentApprovals(builder, documentId, rootNodeId);
    await this.expandDocumentAuditFindings(builder, documentId, rootNodeId);
    await this.expandDocumentImpactReviews(builder, documentId, rootNodeId);
  }

  private async expandDocumentLandingEntries(
    builder: EvidenceChainBuilder,
    documentId: string,
    rootNodeId: string,
  ): Promise<void> {
    type LandingEntry = { id: string; name?: string | null; targetTemplateId?: string | null };
    type Template = { id: string; name?: string | null };
    type RecordRow = { id: string; number?: string | null };

    const landingEntries = await this.prisma.recordFormLandingEntry.findMany({
      where: { relatedDocIds: { has: documentId } },
    });
    for (const entry of landingEntries as unknown as LandingEntry[]) {
      const landingNodeId = `record_form_landing:${entry.id}`;
      builder.addNode({
        id: entry.id,
        nodeId: landingNodeId,
        type: 'record_form_landing',
        label: entry.name ?? entry.id,
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${landingNodeId}`,
        source: rootNodeId,
        target: landingNodeId,
        relationType: 'has_landing_entry',
        strength: 'validated',
        label: '关联入口',
      });

      if (!entry.targetTemplateId) {
        builder.addWarning({
          id: `warn-landing-${entry.id}`,
          severity: 'warning',
          message: '记录表单入口未绑定表单template',
          sourceNodeId: landingNodeId,
          relationType: 'has_template',
        });
      } else {
        const template = (await this.prisma.recordTemplate.findUnique({
          where: { id: entry.targetTemplateId },
        })) as unknown as Template | null;
        if (!template) {
          builder.addWarning({
            id: `warn-template-${entry.targetTemplateId}`,
            severity: 'warning',
            message: `关联的表单template ${entry.targetTemplateId} 不存在`,
            sourceNodeId: landingNodeId,
            targetId: entry.targetTemplateId,
            relationType: 'has_template',
          });
        } else {
          const templateNodeId = `record_template:${template.id}`;
          builder.addNode({
            id: template.id,
            nodeId: templateNodeId,
            type: 'record_template',
            label: template.name ?? template.id,
            route: null,
            depth: 2,
          });
          builder.addEdge({
            id: `${landingNodeId}->${templateNodeId}`,
            source: landingNodeId,
            target: templateNodeId,
            relationType: 'has_template',
            strength: 'strong',
            label: '绑定模板',
          });

          if (builder.canExpand(2)) {
            const records = (await this.prisma.record.findMany({
              where: { templateId: template.id },
            })) as unknown as RecordRow[];
            for (const rec of records) {
              const recNodeId = `record:${rec.id}`;
              builder.addNode({
                id: rec.id,
                nodeId: recNodeId,
                type: 'record',
                label: rec.number ?? rec.id,
                route: `/records/${rec.id}`,
                depth: 3,
              });
              builder.addEdge({
                id: `${templateNodeId}->${recNodeId}`,
                source: templateNodeId,
                target: recNodeId,
                relationType: 'has_record',
                strength: 'validated',
                label: '填写记录',
              });
            }
          }
        }
      }
    }
  }

  private async expandDocumentReadRequirements(
    builder: EvidenceChainBuilder,
    documentId: string,
    rootNodeId: string,
  ): Promise<void> {
    type ReadReq = { id: string };
    const readReqs = (await this.prisma.documentReadRequirement.findMany({
      where: { documentId },
    })) as unknown as ReadReq[];
    for (const req of readReqs) {
      const reqNodeId = `read_requirement:${req.id}`;
      builder.addNode({
        id: req.id,
        nodeId: reqNodeId,
        type: 'read_requirement',
        label: '阅读要求',
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${reqNodeId}`,
        source: rootNodeId,
        target: reqNodeId,
        relationType: 'has_read_requirement',
        strength: 'validated',
        label: '阅读要求',
      });
    }
  }

  private async expandDocumentTrainingNeeds(
    builder: EvidenceChainBuilder,
    documentId: string,
    rootNodeId: string,
  ): Promise<void> {
    type TrainingNeed = { id: string; linkedTrainingProjectId?: string | null };
    type TrainingProject = { id: string; title?: string | null; name?: string | null };

    const trainingNeeds = (await this.prisma.documentTrainingNeed.findMany({
      where: { documentId },
    })) as unknown as TrainingNeed[];
    for (const need of trainingNeeds) {
      const needNodeId = `training_need:${need.id}`;
      builder.addNode({
        id: need.id,
        nodeId: needNodeId,
        type: 'training_need',
        label: '培训需求',
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${needNodeId}`,
        source: rootNodeId,
        target: needNodeId,
        relationType: 'has_training_need',
        strength: 'validated',
        label: '培训需求',
      });

      if (need.linkedTrainingProjectId) {
        const project = (await this.prisma.trainingProject.findUnique({
          where: { id: need.linkedTrainingProjectId },
        })) as unknown as TrainingProject | null;
        if (project) {
          const projectNodeId = `training_project:${project.id}`;
          builder.addNode({
            id: project.id,
            nodeId: projectNodeId,
            type: 'training_project',
            label: project.title ?? project.name ?? project.id,
            depth: 2,
          });
          builder.addEdge({
            id: `${needNodeId}->${projectNodeId}`,
            source: needNodeId,
            target: projectNodeId,
            relationType: 'linked_to',
            strength: 'strong',
            label: '关联培训项目',
          });
        }
      }
    }
  }

  private async expandDocumentApprovals(
    builder: EvidenceChainBuilder,
    documentId: string,
    rootNodeId: string,
  ): Promise<void> {
    type Approval = { id: string };
    const approvals = (await this.prisma.approval.findMany({
      where: { documentId },
    })) as unknown as Approval[];
    for (const appr of approvals) {
      const apprNodeId = `legacy_approval:${appr.id}`;
      builder.addNode({
        id: appr.id,
        nodeId: apprNodeId,
        type: 'legacy_approval',
        label: '审批记录',
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${apprNodeId}`,
        source: rootNodeId,
        target: apprNodeId,
        relationType: 'has_approval',
        strength: 'validated',
        label: '审批',
      });
    }
  }

  private async expandDocumentAuditFindings(
    builder: EvidenceChainBuilder,
    documentId: string,
    rootNodeId: string,
  ): Promise<void> {
    type AuditFinding = { id: string; description?: string | null };
    const findings = (await this.prisma.auditFinding.findMany({
      where: { documentId },
    })) as unknown as AuditFinding[];
    for (const finding of findings) {
      const findingNodeId = `audit_finding:${finding.id}`;
      builder.addNode({
        id: finding.id,
        nodeId: findingNodeId,
        type: 'audit_finding',
        label: finding.description ?? finding.id,
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${findingNodeId}`,
        source: rootNodeId,
        target: findingNodeId,
        relationType: 'has_audit_finding',
        strength: 'validated',
        label: '内审问题',
      });
    }
  }

  private async expandDocumentImpactReviews(
    builder: EvidenceChainBuilder,
    documentId: string,
    rootNodeId: string,
  ): Promise<void> {
    type ImpactItem = { id: string; description?: string | null; targetLabel?: string | null };
    type ImpactReview = { id: string; items?: ImpactItem[] | null };

    const impactReviews = (await this.prisma.documentImpactReview.findMany({
      where: { sourceType: 'document', sourceId: documentId },
      include: { items: true },
    })) as unknown as ImpactReview[];
    for (const review of impactReviews) {
      const reviewNodeId = `document_impact_review:${review.id}`;
      builder.addNode({
        id: review.id,
        nodeId: reviewNodeId,
        type: 'document_impact_review',
        label: '文控影响评审',
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${reviewNodeId}`,
        source: rootNodeId,
        target: reviewNodeId,
        relationType: 'has_impact_review',
        strength: 'validated',
        label: '影响评审',
      });

      for (const item of review.items ?? []) {
        const itemNodeId = `document_impact_item:${item.id}`;
        builder.addNode({
          id: item.id,
          nodeId: itemNodeId,
          type: 'document_impact_item',
          label: item.description ?? item.targetLabel ?? item.id,
          depth: 2,
        });
        builder.addEdge({
          id: `${reviewNodeId}->${itemNodeId}`,
          source: reviewNodeId,
          target: itemNodeId,
          relationType: 'has_item',
          strength: 'validated',
          label: '影响项',
        });
      }
    }
  }

  private async expandChangeEventRoot(
    builder: EvidenceChainBuilder,
    changeEventId: string,
  ): Promise<void> {
    const event = await this.prisma.changeEvent.findUnique({ where: { id: changeEventId } });
    if (!event) throw new NotFoundException(`ChangeEvent ${changeEventId} not found`);

    const rootNodeId = `change_event:${changeEventId}`;
    builder.setRoot({
      id: changeEventId,
      nodeId: rootNodeId,
      type: 'change_event',
      label: event.description ?? changeEventId,
      route: null,
      depth: 0,
    });

    type FormTask = { id: string; title?: string | null; name?: string | null };
    type RecordRow = { id: string; number?: string | null };
    type ImpactItem = { id: string; description?: string | null; targetLabel?: string | null };
    type ImpactReview = { id: string; items?: ImpactItem[] | null };
    type VerificationRecord = { id: string };
    type ApprovalInstance = { id: string };

    // Form tasks
    const formTasks = (await this.prisma.changeEventFormTask.findMany({
      where: { changeEventId },
    })) as unknown as FormTask[];
    for (const task of formTasks) {
      const taskNodeId = `change_event_form_task:${task.id}`;
      builder.addNode({
        id: task.id,
        nodeId: taskNodeId,
        type: 'change_event_form_task',
        label: task.title ?? task.name ?? task.id,
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${taskNodeId}`,
        source: rootNodeId,
        target: taskNodeId,
        relationType: 'has_form_task',
        strength: 'validated',
        label: '表单任务',
      });
    }

    // Records by changeEventId
    const records = (await this.prisma.record.findMany({
      where: { changeEventId },
    })) as unknown as RecordRow[];
    for (const rec of records) {
      const recNodeId = `record:${rec.id}`;
      builder.addNode({
        id: rec.id,
        nodeId: recNodeId,
        type: 'record',
        label: rec.number ?? rec.id,
        route: `/records/${rec.id}`,
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${recNodeId}`,
        source: rootNodeId,
        target: recNodeId,
        relationType: 'has_record',
        strength: 'validated',
        label: '关联记录',
      });
    }

    // Impact reviews
    const impactReviews = (await this.prisma.documentImpactReview.findMany({
      where: { changeEventId },
      include: { items: true },
    })) as unknown as ImpactReview[];
    for (const review of impactReviews) {
      const reviewNodeId = `document_impact_review:${review.id}`;
      builder.addNode({
        id: review.id,
        nodeId: reviewNodeId,
        type: 'document_impact_review',
        label: '文控影响评审',
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${reviewNodeId}`,
        source: rootNodeId,
        target: reviewNodeId,
        relationType: 'has_impact_review',
        strength: 'validated',
        label: '影响评审',
      });
      for (const item of review.items ?? []) {
        const itemNodeId = `document_impact_item:${item.id}`;
        builder.addNode({
          id: item.id,
          nodeId: itemNodeId,
          type: 'document_impact_item',
          label: item.description ?? item.targetLabel ?? item.id,
          depth: 2,
        });
        builder.addEdge({
          id: `${reviewNodeId}->${itemNodeId}`,
          source: reviewNodeId,
          target: itemNodeId,
          relationType: 'has_item',
          strength: 'validated',
          label: '影响项',
        });
      }
    }

    // Verification records
    const verifications = (await this.prisma.changeVerificationRecord.findMany({
      where: { change_event_id: changeEventId },
    })) as unknown as VerificationRecord[];
    for (const v of verifications) {
      const vNodeId = `verification_record:${v.id}`;
      builder.addNode({
        id: v.id,
        nodeId: vNodeId,
        type: 'verification_record',
        label: '验证记录',
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${vNodeId}`,
        source: rootNodeId,
        target: vNodeId,
        relationType: 'has_verification',
        strength: 'validated',
        label: '验证记录',
      });
    }

    // Approval instances
    const approvalInstances = (await this.prisma.approvalInstance.findMany({
      where: { resourceType: 'change_event', resourceId: changeEventId },
    })) as unknown as ApprovalInstance[];
    for (const inst of approvalInstances) {
      const instNodeId = `approval_instance:${inst.id}`;
      builder.addNode({
        id: inst.id,
        nodeId: instNodeId,
        type: 'approval_instance',
        label: '审批实例',
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${instNodeId}`,
        source: rootNodeId,
        target: instNodeId,
        relationType: 'has_approval',
        strength: 'validated',
        label: '审批',
      });
    }
  }

  private async expandRecordTemplateRoot(
    builder: EvidenceChainBuilder,
    templateId: string,
  ): Promise<void> {
    const template = await this.prisma.recordTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException(`RecordTemplate ${templateId} not found`);
    type RecordRow = { id: string; number?: string | null };
    const rootNodeId = `record_template:${templateId}`;
    builder.setRoot({
      id: templateId,
      nodeId: rootNodeId,
      type: 'record_template',
      label: template.name ?? templateId,
      route: null,
      depth: 0,
    });
    const records = (await this.prisma.record.findMany({ where: { templateId } })) as unknown as RecordRow[];
    for (const rec of records) {
      const recNodeId = `record:${rec.id}`;
      builder.addNode({
        id: rec.id,
        nodeId: recNodeId,
        type: 'record',
        label: rec.number ?? rec.id,
        route: `/records/${rec.id}`,
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${recNodeId}`,
        source: rootNodeId,
        target: recNodeId,
        relationType: 'has_record',
        strength: 'validated',
        label: '填写记录',
      });
    }
  }

  private async expandRecordRoot(
    builder: EvidenceChainBuilder,
    recordId: string,
  ): Promise<void> {
    type RecordRow = {
      id: string;
      number?: string | null;
      templateId?: string | null;
      changeEventId?: string | null;
      approvalInstanceId?: string | null;
    };
    const rec = (await this.prisma.record.findUnique({ where: { id: recordId } })) as unknown as RecordRow | null;
    if (!rec) throw new NotFoundException(`Record ${recordId} not found`);
    const rootNodeId = `record:${recordId}`;
    builder.setRoot({
      id: recordId,
      nodeId: rootNodeId,
      type: 'record',
      label: rec.number ?? recordId,
      route: `/records/${recordId}`,
      depth: 0,
    });

    if (rec.templateId) {
      type TemplateRow = { id: string; name?: string | null };
      const template = (await this.prisma.recordTemplate.findUnique({
        where: { id: rec.templateId },
      })) as unknown as TemplateRow | null;
      if (template) {
        const tmplNodeId = `record_template:${template.id}`;
        builder.addNode({ id: template.id, nodeId: tmplNodeId, type: 'record_template', label: template.name ?? template.id, route: null, depth: 1 });
        builder.addEdge({ id: `${rootNodeId}->${tmplNodeId}`, source: rootNodeId, target: tmplNodeId, relationType: 'from_template', strength: 'strong', label: '所属模板' });
      }
    }

    if (rec.changeEventId) {
      type ChangeEventRow = { id: string; title?: string | null };
      const event = (await this.prisma.changeEvent.findUnique({
        where: { id: rec.changeEventId },
      })) as unknown as ChangeEventRow | null;
      if (event) {
        const evtNodeId = `change_event:${event.id}`;
        builder.addNode({ id: event.id, nodeId: evtNodeId, type: 'change_event', label: event.title ?? event.id, route: null, depth: 1 });
        builder.addEdge({ id: `${rootNodeId}->${evtNodeId}`, source: rootNodeId, target: evtNodeId, relationType: 'triggered_by', strength: 'validated', label: '关联变更事件' });
      }
    }

    if (rec.approvalInstanceId) {
      const instNodeId = `approval_instance:${rec.approvalInstanceId}`;
      builder.addNode({ id: rec.approvalInstanceId, nodeId: instNodeId, type: 'approval_instance', label: '审批实例', depth: 1 });
      builder.addEdge({ id: `${rootNodeId}->${instNodeId}`, source: rootNodeId, target: instNodeId, relationType: 'has_approval', strength: 'validated', label: '审批' });
    }
  }

  private async expandAuditFindingRoot(
    builder: EvidenceChainBuilder,
    auditFindingId: string,
  ): Promise<void> {
    const finding = await this.prisma.auditFinding.findUnique({ where: { id: auditFindingId } });
    if (!finding) throw new NotFoundException(`AuditFinding ${auditFindingId} not found`);
    type CorrectiveActionRow = { id: string; description?: string | null };
    const rootNodeId = `audit_finding:${auditFindingId}`;
    builder.setRoot({
      id: auditFindingId,
      nodeId: rootNodeId,
      type: 'audit_finding',
      label: finding.description ?? auditFindingId,
      depth: 0,
    });
    const actions = (await this.prisma.correctiveAction.findMany({
      where: { trigger_type: 'internal_audit', trigger_id: auditFindingId },
    })) as unknown as CorrectiveActionRow[];
    for (const action of actions) {
      const actionNodeId = `corrective_action:${action.id}`;
      builder.addNode({
        id: action.id,
        nodeId: actionNodeId,
        type: 'corrective_action',
        label: action.description ?? action.id,
        depth: 1,
      });
      builder.addEdge({
        id: `${rootNodeId}->${actionNodeId}`,
        source: rootNodeId,
        target: actionNodeId,
        relationType: 'has_corrective_action',
        strength: 'validated',
        label: '整改动作',
      });
    }
  }

  private async expandCorrectiveActionRoot(
    builder: EvidenceChainBuilder,
    correctiveActionId: string,
  ): Promise<void> {
    type CorrectiveActionRow = {
      id: string;
      description?: string | null;
      trigger_type?: string | null;
      trigger_id?: string | null;
      approvalInstanceId?: string | null;
    };
    const action = (await this.prisma.correctiveAction.findUnique({
      where: { id: correctiveActionId },
    })) as unknown as CorrectiveActionRow | null;
    if (!action) throw new NotFoundException(`CorrectiveAction ${correctiveActionId} not found`);
    const rootNodeId = `corrective_action:${correctiveActionId}`;
    builder.setRoot({
      id: correctiveActionId,
      nodeId: rootNodeId,
      type: 'corrective_action',
      label: action.description ?? correctiveActionId,
      depth: 0,
    });

    if (action.trigger_type === 'internal_audit' && action.trigger_id) {
      type AuditFindingRow = { id: string; description?: string | null };
      const finding = (await this.prisma.auditFinding.findUnique({
        where: { id: action.trigger_id },
      })) as unknown as AuditFindingRow | null;
      if (finding) {
        const findingNodeId = `audit_finding:${finding.id}`;
        builder.addNode({ id: finding.id, nodeId: findingNodeId, type: 'audit_finding', label: finding.description ?? finding.id, depth: 1 });
        builder.addEdge({ id: `${rootNodeId}->${findingNodeId}`, source: rootNodeId, target: findingNodeId, relationType: 'triggered_by', strength: 'strong', label: '来源内审问题' });
      } else {
        builder.addWarning({ id: `warn-finding-${action.trigger_id}`, severity: 'warning', message: `关联内审问题 ${action.trigger_id} 不存在`, sourceNodeId: rootNodeId, targetId: action.trigger_id });
      }
    }

    if (action.approvalInstanceId) {
      const instNodeId = `approval_instance:${action.approvalInstanceId}`;
      builder.addNode({ id: action.approvalInstanceId, nodeId: instNodeId, type: 'approval_instance', label: '审批实例', depth: 1 });
      builder.addEdge({ id: `${rootNodeId}->${instNodeId}`, source: rootNodeId, target: instNodeId, relationType: 'has_approval', strength: 'validated', label: '审批' });
    }

    type VerificationRow = { id: string; result?: string | null };
    const verifications = (await this.prisma.verificationRecord.findMany({
      where: { corrective_action_id: correctiveActionId },
    })) as unknown as VerificationRow[];
    for (const v of verifications) {
      const vNodeId = `verification_record:${v.id}`;
      builder.addNode({ id: v.id, nodeId: vNodeId, type: 'verification_record', label: `验证记录 ${v.result ?? ''}`.trim(), depth: 1 });
      builder.addEdge({ id: `${rootNodeId}->${vNodeId}`, source: rootNodeId, target: vNodeId, relationType: 'has_verification', strength: 'validated', label: '验证记录' });
    }
  }
}
