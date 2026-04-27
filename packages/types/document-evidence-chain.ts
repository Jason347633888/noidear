export type EvidenceSourceType =
  | 'document'
  | 'record_template'
  | 'record'
  | 'change_event'
  | 'audit_finding'
  | 'corrective_action';

export type EvidenceNodeType =
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

export type EvidenceRelationStrength = 'strong' | 'validated' | 'weak' | 'missing';

export interface EvidenceNode {
  id: string;
  nodeId: string;
  type: EvidenceNodeType;
  label: string;
  status?: string | null;
  route?: string | null;
  depth: number;
  metadata?: Record<string, unknown>;
}

export interface EvidenceEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
  strength: EvidenceRelationStrength;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceWarning {
  id: string;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  sourceNodeId?: string;
  targetType?: string;
  targetId?: string | null;
  relationType?: string;
}

export interface EvidenceChainMeta {
  sourceType: EvidenceSourceType;
  sourceId: string;
  maxDepth: number;
  generatedAt: string;
  truncated: boolean;
}

export interface EvidenceChainResult {
  root: EvidenceNode;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  warnings: EvidenceWarning[];
  meta: EvidenceChainMeta;
}

export interface EvidenceChainQuery {
  sourceType: EvidenceSourceType;
  sourceId: string;
  maxDepth?: number;
}
