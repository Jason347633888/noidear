export type TraceEntryMode = 'object' | 'scenario';
export type TraceMode = 'forward' | 'backward' | 'bidirectional';
export type TraceViewMode = 'ledger' | 'graph';
export type TraceTimeMode = 'current' | 'asOf';
export type TraceRiskLevel = 'normal' | 'minor' | 'important' | 'high';

export interface TraceSummary {
  entryMode: TraceEntryMode;
  objectType?: string;
  objectId?: string;
  scenario?: string;
  traceMode: TraceMode;
  viewMode: TraceViewMode;
  timeMode: TraceTimeMode;
  asOfAt?: string;
}

export interface TraceLedgerRow {
  nodeType: string;
  nodeId: string;
  label: string;
  batchNo?: string;
  status?: string;
  riskLevel?: TraceRiskLevel;
  upstreamNodeId?: string;
  downstreamNodeId?: string;
}

export interface TraceGraphNode {
  id: string;
  type: string;
  label: string;
  riskLevel?: TraceRiskLevel;
}

export interface TraceGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface TraceEvidenceRef {
  type: 'record' | 'attachment' | 'document';
  label: string;
  refId: string;
}

export interface TracePermissionView {
  canViewSummary: boolean;
  canViewDetail: boolean;
  canInitiateAction: boolean;
  canExecuteHighRiskAction: boolean;
}

export interface TraceQueryResult {
  summary: TraceSummary;
  ledger: TraceLedgerRow[];
  graph: { nodes: TraceGraphNode[]; edges: TraceGraphEdge[] };
  risks: Array<{ code: string; level: TraceRiskLevel; message: string }>;
  evidence: TraceEvidenceRef[];
  permission: TracePermissionView;
}

export interface MaterialBalanceRow {
  materialId: string;
  materialName: string;
  inputQty: number;
  outputQty: number;
  lossQty: number;
  diffQty: number;
  riskLevel: TraceRiskLevel;
}
