import request from './request';

// =========================================================================
// Types
// =========================================================================

export type PartyType = 'customer' | 'carrier' | 'waste_collector';
export type PartyStatus = 'active' | 'inactive';

export interface ExternalParty {
  id: string;
  company_id: string;
  party_type: PartyType;
  name: string;
  code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  address: string | null;
  license_no: string | null;
  approved_items: string | null;
  status: PartyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateExternalPartyPayload {
  party_type: PartyType;
  name: string;
  code?: string;
  contact_name?: string;
  contact_phone?: string;
  address?: string;
  license_no?: string;
  approved_items?: string;
  status?: PartyStatus;
  notes?: string;
}

export type UpdateExternalPartyPayload = Partial<CreateExternalPartyPayload>;

// =========================================================================
// Display helpers
// =========================================================================

export const PARTY_TYPE_MAP: Record<string, string> = {
  customer: '客户',
  carrier: '承运商',
  waste_collector: '废弃物收运单位',
};

export function getPartyTypeText(partyType: string): string {
  return PARTY_TYPE_MAP[partyType] ?? partyType;
}

const STATUS_MAP: Record<string, string> = {
  active: '启用',
  inactive: '停用',
};

export function getStatusText(status: string): string {
  return STATUS_MAP[status] ?? status;
}

// =========================================================================
// API functions
// =========================================================================

const externalPartyApi = {
  getList(partyType?: string) {
    return request.get<ExternalParty[]>('/external-parties', {
      params: partyType ? { party_type: partyType } : undefined,
    });
  },

  getOne(id: string) {
    return request.get<ExternalParty>(`/external-parties/${id}`);
  },

  create(payload: CreateExternalPartyPayload) {
    return request.post<ExternalParty>('/external-parties', payload);
  },

  update(id: string, payload: UpdateExternalPartyPayload) {
    return request.patch<ExternalParty>(`/external-parties/${id}`, payload);
  },

  remove(id: string) {
    return request.delete<void>(`/external-parties/${id}`);
  },
};

export default externalPartyApi;
