import request from './request';

// =========================================================================
// Types
// =========================================================================

export type AssetType = 'equipment' | 'tool' | 'vehicle' | 'furniture' | 'other';
export type LoanStatus = 'borrowed' | 'returned' | 'overdue';

export interface AssetLoanRecord {
  id: string;
  company_id: string;
  asset_type: AssetType;
  asset_name: string;
  asset_code: string | null;
  borrower_id: string | null;
  borrower_name: string | null;
  borrow_at: string;
  expected_return: string | null;
  actual_return: string | null;
  purpose: string | null;
  approver_id: string | null;
  status: LoanStatus;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateAssetLoanRecordPayload {
  asset_type: AssetType;
  asset_name: string;
  asset_code?: string;
  borrower_id?: string;
  borrower_name?: string;
  borrow_at?: string;
  expected_return?: string;
  purpose?: string;
  approver_id?: string;
  status?: LoanStatus;
  notes?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const ASSET_TYPE_MAP: Record<string, string> = {
  equipment: '设备',
  tool: '工具',
  vehicle: '车辆',
  furniture: '家具',
  other: '其他',
};

export function getAssetTypeText(assetType: string): string {
  return ASSET_TYPE_MAP[assetType] ?? assetType;
}

const STATUS_MAP: Record<string, string> = {
  borrowed: '借用中',
  returned: '已归还',
  overdue: '逾期',
};

export function getStatusText(status: string): string {
  return STATUS_MAP[status] ?? status;
}

// =========================================================================
// API functions
// =========================================================================

const assetLoanRecordApi = {
  getList() {
    return request.get<AssetLoanRecord[]>('/asset-loan-records');
  },

  create(payload: CreateAssetLoanRecordPayload) {
    return request.post<AssetLoanRecord>('/asset-loan-records', payload);
  },

  updateReturn(id: string) {
    return request.patch<AssetLoanRecord>(`/asset-loan-records/${id}/return`, {});
  },

  remove(id: string) {
    return request.delete<void>(`/asset-loan-records/${id}`);
  },
};

export default assetLoanRecordApi;
