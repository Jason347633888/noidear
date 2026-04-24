export type TraceEntryMode = 'object' | 'scenario';
export type TraceMode = 'forward' | 'backward' | 'bidirectional';
export type TraceViewMode = 'ledger' | 'graph';
export type TraceTimeMode = 'current' | 'asOf';
export type TraceRiskLevel = 'normal' | 'minor' | 'important' | 'high';

export interface TraceQueryPayload {
  entryMode: TraceEntryMode;
  objectType?: string;
  objectId?: string;
  scenario?: string;
  traceMode: TraceMode;
  viewMode: TraceViewMode;
  timeMode: TraceTimeMode;
  asOfAt?: string;
}

export interface TraceQueryResult {
  summary: {
    entryMode: TraceEntryMode;
    objectType?: string;
    objectId?: string;
    scenario?: string;
    traceMode: TraceMode;
    viewMode: TraceViewMode;
    timeMode: TraceTimeMode;
    asOfAt?: string;
  };
  ledger: Array<{
    nodeType: string;
    nodeId: string;
    label: string;
    batchNo?: string;
    status?: string;
    riskLevel?: TraceRiskLevel;
  }>;
  graph: {
    nodes: Array<{ id: string; type: string; label: string; riskLevel?: TraceRiskLevel }>;
    edges: Array<{ id: string; source: string; target: string; relation: string }>;
  };
  risks: Array<{ code: string; level: TraceRiskLevel; message: string }>;
  evidence: Array<{ type: 'record' | 'attachment' | 'document'; label: string; refId: string }>;
  permission: {
    canViewSummary: boolean;
    canViewDetail: boolean;
    canInitiateAction: boolean;
    canExecuteHighRiskAction: boolean;
  };
}
