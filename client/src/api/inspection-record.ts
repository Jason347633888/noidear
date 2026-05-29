import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface CreateInspectionRecordItemInput {
  inspectionItemId?: string;
  itemName: string;
  actualValue?: string;
  unit?: string;
  textResult?: string;
  judgment: 'pass' | 'fail' | 'conditional';
  standardSnapshot?: Record<string, unknown>;
  remark?: string;
  evidenceFileId?: string;
}

export interface CreateInspectionRecordInput {
  inspectionStandardId?: string;
  objectType: string;
  objectId: string;
  inspectedAt: string;
  inspectorId?: string;
  sourceTaskId?: string;
  items: CreateInspectionRecordItemInput[];
}

export interface InspectionRecord {
  id: string;
  company_id: string;
  standard_id: string | null;
  object_type: string;
  object_id: string;
  inspected_at: string;
  inspector_id: string | null;
  overall_result: string;
  status: string;
  source_task_id: string | null;
  created_at: string;
  updated_at: string;
}

// =========================================================================
// API functions
// =========================================================================

export function createInspectionRecord(data: CreateInspectionRecordInput) {
  return request.post<InspectionRecord>('/inspection-records', data);
}
