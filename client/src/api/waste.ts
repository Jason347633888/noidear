import request from './request';

export interface WasteDisposalRecord {
  id: string;
  company_id: string;
  material_name: string;
  lot_no: string | null;
  disposal_reason: string;
  qty: number;
  unit: string;
  disposal_method: string;
  disposal_date: string;
  operator_id: string | null;
  witness_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface WasteRecord {
  id: string;
  company_id: string;
  production_batch_id: string | null;
  waste_type: string;
  qty: number;
  unit: string;
  shift: string | null;
  disposal_destination: string | null;
  recorded_at: string;
  operator_id: string | null;
  created_at: string;
}

export interface CreateDisposalPayload {
  material_name: string;
  lot_no?: string;
  disposal_reason: string;
  qty: number;
  unit: string;
  disposal_method: string;
  disposal_date: string;
  operator_id?: string;
  witness_id?: string;
  notes?: string;
}

export interface CreateWasteRecordPayload {
  waste_type: string;
  qty: number;
  unit: string;
  recorded_at: string;
  production_batch_id?: string;
  shift?: string;
  disposal_destination?: string;
  operator_id?: string;
}

export function getWasteTypeText(type: string): string {
  const map: Record<string, string> = {
    chemical: '化学废弃物',
    biological: '生物废弃物',
    physical: '物理废弃物',
    packaging: '包装废弃物',
    other: '其他',
  };
  return map[type] ?? type;
}

export function getDisposalReasonText(reason: string): string {
  const map: Record<string, string> = {
    expired: '过期',
    non_conforming: '不合格',
    damaged: '损坏',
    other: '其他',
  };
  return map[reason] ?? reason;
}

const wasteApi = {
  getDisposals() {
    return request.get<{ data: WasteDisposalRecord[]; total?: number }>('/waste/disposals');
  },

  createDisposal(payload: CreateDisposalPayload) {
    return request.post<WasteDisposalRecord>('/waste/disposals', payload);
  },

  getWasteRecords(wasteType?: string) {
    return request.get<{ data: WasteRecord[]; total?: number }>('/waste/records', {
      params: wasteType ? { waste_type: wasteType } : {},
    });
  },

  createWasteRecord(payload: CreateWasteRecordPayload) {
    return request.post<WasteRecord>('/waste/records', payload);
  },
};

export default wasteApi;
