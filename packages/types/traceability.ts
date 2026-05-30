export type TraceEntryMode = 'object' | 'scenario';
export type TraceMode = 'forward' | 'backward' | 'bidirectional';
export type TraceViewMode = 'ledger' | 'graph';
export type TraceTimeMode = 'current' | 'asOf';
export type TraceRiskLevel = 'normal' | 'minor' | 'important' | 'high';
export type TraceResultStatus = 'ok' | 'partial' | 'empty' | 'degraded' | 'pending';
export type TraceActionStatus = 'created' | 'pendingReview' | 'inProgress' | 'closed' | 'rejected';
export type TraceExportStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'expired';
export type TraceSnapshotStatus = 'queued' | 'building' | 'ready' | 'failed' | 'expired';

export interface TracePermissionContext {
  departmentScope: string;
  scenarioPermissions: string[];
  canViewSummary: boolean;
  canViewDetail: boolean;
  canViewEvidence: boolean;
  canInitiateLinkage: boolean;
  canExportSimple: boolean;
  canExportFullPackage: boolean;
  canUseAsOfPlayback: boolean;
  canExecuteHighRiskAction: boolean;
}

export interface TraceLocalPermission {
  visible: boolean;
  masked: boolean;
  expandable: boolean;
  actionable: boolean;
}

export interface TraceEvidenceRef {
  type: 'record' | 'attachment' | 'document';
  label: string;
  refId: string;
  permission?: TraceLocalPermission;
}

export interface TraceNode {
  nodeId: string;
  nodeType: string;
  businessObject: string;
  label: string;
  batchNo?: string | null;
  status?: string | null;
  riskLevel?: TraceRiskLevel | null;
  timeContext?: { timeMode: TraceTimeMode; asOfAt?: string | null };
  permission?: TraceLocalPermission;
  evidenceRefs?: string[];
  attributes?: Record<string, unknown>;
}

export interface TraceEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  direction: 'forward' | 'backward' | 'bidirectional';
  isMainChain: boolean;
  isAuxiliary: boolean;
  riskLevel?: TraceRiskLevel | null;
  attributes?: Record<string, unknown>;
}

export interface TraceRisk {
  riskId: string;
  riskCode: string;
  riskLevel: TraceRiskLevel;
  title: string;
  message: string;
  sourceType: string;
  sourceRefId: string;
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  recommendedActions: string[];
  linkedActionIds: string[];
  status: 'open' | 'acknowledged' | 'linked' | 'closed';
  permission?: TraceLocalPermission;
  createdAt: string;
}

export interface TraceQueryRequest {
  entryMode: TraceEntryMode;
  traceMode: TraceMode;
  viewMode: TraceViewMode;
  timeMode: TraceTimeMode;
  objectType?: string;
  objectId?: string;
  scenario?: string;
  asOfAt?: string;
  departmentScope?: string;
  includeEvidence?: boolean;
  includeAuxiliaryNodes?: boolean;
  includeRiskDetails?: boolean;
  filters?: Record<string, unknown>;
}

export interface TraceQueryResult {
  summary: {
    queryId: string;
    entryMode: TraceEntryMode;
    objectType?: string;
    objectId?: string;
    scenario?: string;
    traceMode: TraceMode;
    viewMode: TraceViewMode;
    timeMode: TraceTimeMode;
    asOfAt?: string;
    riskLevel: TraceRiskLevel;
    resultStatus: TraceResultStatus;
  };
  permission: TracePermissionContext;
  risk: {
    summaryRiskLevel: TraceRiskLevel;
    riskCount: number;
    highRiskCount: number;
    items: TraceRisk[];
  };
  ledger: {
    columns: Array<{ key: string; label: string }>;
    rows: TraceNode[];
    grouping: string[];
    totals: Record<string, unknown>;
  };
  graph: {
    nodes: TraceNode[];
    edges: TraceEdge[];
    layout: string;
    legend: string[];
  };
  evidence: {
    count: number;
    items: TraceEvidenceRef[];
  };
  actions: {
    available: string[];
    recommended: string[];
    created: Array<{ actionId: string; actionType: string; status: TraceActionStatus }>;
  };
  export: {
    simpleExportAvailable: boolean;
    fullPackageAvailable: boolean;
    latestExportId: string | null;
  };
  meta: {
    generatedAt: string;
    queryHash: string;
    degraded: boolean;
    snapshotId: string | null;
    sourceVersion: string;
  };
  extensions: Record<string, unknown>;
}

export interface BalanceQueryRequest {
  materialLotId?: string;
  productionBatchId?: string;
  from?: string;
  to?: string;
  timeMode?: TraceTimeMode;
  asOfAt?: string;
  includeEvidence?: boolean;
  includeRecommendations?: boolean;
}

export interface BalanceQueryResult {
  summary: {
    analysisId: string;
    scopeType: string;
    scopeRefId: string;
    status: TraceResultStatus;
    totalInput: number;
    totalOutput: number;
    totalLoss: number;
    diffQty: number;
    riskLevel: TraceRiskLevel;
  };
  rows: Array<{
    materialId: string;
    materialName: string;
    inputQty: number;
    outputQty: number;
    lossQty: number;
    diffQty: number;
    riskLevel: TraceRiskLevel;
  }>;
  discrepancies: Array<{ code: string; message: string; riskLevel: TraceRiskLevel }>;
  recommendations: string[];
  evidence: { count: number; items: TraceEvidenceRef[] };
  meta: { generatedAt: string; queryHash: string; snapshotId: string | null; sourceVersion: string };
}

export interface LinkageCreateRequest {
  actionType: 'deviation' | 'complaint' | 'recallAssessment' | 'traceabilityDrill' | 'capa';
  sourceQueryRef: string;
  sourceNodeIds?: string[];
  sourceRiskIds?: string[];
  note?: string;
}

export interface TraceActionResult {
  actionId: string;
  actionType: LinkageCreateRequest['actionType'];
  status: TraceActionStatus;
  sourceQueryRef: string;
  createdAt: string;
  requestedBy: string;
  linkedObjectType?: string;
  linkedObjectId?: string;
  writeback: Record<string, unknown>;
}

export interface ExportCreateRequest {
  exportMode: 'simple' | 'fullPackage';
  sourceQueryRef: string;
  includeEvidence?: boolean;
  includeMaskedData?: boolean;
}

export interface TraceExportResult {
  exportId: string;
  exportMode: ExportCreateRequest['exportMode'];
  status: TraceExportStatus;
  sourceQueryRef: string;
  createdAt: string;
  requestedBy: string;
  downloadRef: string | null;
  snapshotId: string | null;
  meta: Record<string, unknown>;
}

export type TraceRootObjectType = 'production_batch' | 'material_batch' | 'product_recall' | 'traceability_drill';

export interface TraceContextSnapshotRoot {
  type: TraceRootObjectType;
  id: string;
  label: string;
  display: Record<string, unknown>;
}

export interface TraceContextSnapshotInspection {
  id: string;
  recordNo: string | null;
  result: string | null;
  inspectedAt: string | null;
}

export interface TraceContextSnapshotNonConformance {
  id: string;
  ncNo: string | null;
  status: string | null;
  sourceType: string | null;
  sourceId: string | null;
}

export interface TraceContextSnapshotCorrectiveAction {
  id: string;
  capaNo: string | null;
  status: string | null;
}

export interface TraceContextSnapshotApproval {
  id: string;
  approverId: string | null;
  status: string | null;
  approvedAt: string | null;
}

export interface TraceContextSnapshotEvidenceFile {
  id: string;
  fileName: string | null;
  filePath: string | null;
  mimeType: string | null;
}

/**
 * Full snapshot output shape for createTraceContextSnapshot.
 * All rootObjectType values produce this same structure.
 */
export interface TraceContextSnapshotData {
  depth: number;
  root: TraceContextSnapshotRoot;
  upstream: unknown[];
  downstream: unknown[];
  inspections: TraceContextSnapshotInspection[];
  nonConformances: TraceContextSnapshotNonConformance[];
  correctiveActions: TraceContextSnapshotCorrectiveAction[];
  approvals: TraceContextSnapshotApproval[];
  evidenceFiles: TraceContextSnapshotEvidenceFile[];
  generatedAt: string;
}

export interface SnapshotCreateRequest {
  sourceQueryRef: string;
  snapshotType: 'query' | 'balance' | 'export';
  retentionPolicy?: string;
}

export interface SnapshotQueryRequest {
  snapshotId: string;
}

export interface TraceSnapshotResult {
  snapshotId: string;
  sourceQueryRef: string;
  snapshotType: SnapshotCreateRequest['snapshotType'];
  status: TraceSnapshotStatus;
  createdAt: string;
  expiresAt?: string | null;
  payloadRef?: string | null;
  meta: Record<string, unknown>;
}
