import request from './request';

// =========================================================================
// Types
// =========================================================================

export type EquipmentStatus = 'active' | 'inactive' | 'scrapped';
export type MaintenanceLevel = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type PlanStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type RecordStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type FaultUrgency = 'urgent' | 'normal' | 'low';
export type FaultStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface MaintenanceLevelConfig {
  enabled: boolean;
  cycle: number;
  reminderDays: number;
}

export interface MaintenanceConfig {
  daily: MaintenanceLevelConfig;
  weekly: MaintenanceLevelConfig;
  monthly: MaintenanceLevelConfig;
  quarterly: MaintenanceLevelConfig;
  annual: MaintenanceLevelConfig;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  model: string;
  category: string;
  location: string;
  purchaseDate: string | null;
  activationDate: string | null;
  warrantyExpiry: string | null;
  responsiblePerson: string;
  status: EquipmentStatus;
  maintenanceConfig: MaintenanceConfig;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  category?: string;
  status?: EquipmentStatus;
  responsiblePerson?: string;
}

export interface EquipmentListResponse {
  list: Equipment[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateEquipmentPayload {
  name: string;
  model: string;
  category: string;
  location: string;
  purchaseDate?: string;
  activationDate?: string;
  warrantyExpiry?: string;
  responsiblePerson: string;
  maintenanceConfig: MaintenanceConfig;
  description?: string;
}

export interface UpdateEquipmentPayload extends Partial<CreateEquipmentPayload> {}

export interface MaintenancePlan {
  id: string;
  planCode: string;
  equipmentId: string;
  equipment?: Equipment;
  maintenanceLevel: MaintenanceLevel;
  plannedDate: string;
  status: PlanStatus;
  responsiblePerson: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanListParams {
  page?: number;
  limit?: number;
  equipmentId?: string;
  maintenanceLevel?: MaintenanceLevel;
  status?: PlanStatus;
  startDate?: string;
  endDate?: string;
}

export interface PlanListResponse {
  list: MaintenancePlan[];
  total: number;
  page: number;
  limit: number;
}

export interface CalendarData {
  [date: string]: MaintenancePlan[];
}

export interface MaintenanceRecord {
  id: string;
  recordCode: string;
  equipmentId: string;
  equipment?: Equipment;
  planId: string | null;
  maintenanceLevel: MaintenanceLevel;
  maintenanceDate: string;
  content: string;
  beforeStatus: string;
  afterStatus: string;
  photos: string[];
  operatorSignature: string | null;
  reviewerSignature: string | null;
  operatorId: string;
  operator?: { id: string; name: string };
  reviewerId: string | null;
  reviewer?: { id: string; name: string } | null;
  status: RecordStatus;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordListParams {
  page?: number;
  limit?: number;
  equipmentId?: string;
  maintenanceLevel?: MaintenanceLevel;
  status?: RecordStatus;
  startDate?: string;
  endDate?: string;
}

export interface RecordListResponse {
  list: MaintenanceRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateRecordPayload {
  equipmentId: string;
  planId?: string;
  maintenanceLevel: MaintenanceLevel;
  maintenanceDate: string;
  content: string;
  beforeStatus: string;
  afterStatus: string;
  photos?: string[];
  operatorSignature?: string;
}

export interface UpdateRecordPayload extends Partial<CreateRecordPayload> {}

export interface EquipmentFault {
  id: string;
  faultCode: string;
  equipmentId: string;
  equipment?: Equipment;
  reporterId: string;
  reporter?: { id: string; name: string };
  description: string;
  urgencyLevel: FaultUrgency;
  photos: string[];
  status: FaultStatus;
  assigneeId: string | null;
  assignee?: { id: string; name: string } | null;
  faultCause: string | null;
  repairAction: string | null;
  repairSignature: string | null;
  reportTime: string;
  acceptTime: string | null;
  completeTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FaultListParams {
  page?: number;
  limit?: number;
  equipmentId?: string;
  status?: FaultStatus;
  urgencyLevel?: FaultUrgency;
  startDate?: string;
  endDate?: string;
}

export interface FaultListResponse {
  list: EquipmentFault[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateFaultPayload {
  equipmentId: string;
  description: string;
  urgencyLevel: FaultUrgency;
  photos?: string[];
}

export interface FaultStatsData {
  totalFaults: number;
  avgResponseTime: number;
  completionRate: number;
  monthlyTrend: Array<{ month: string; count: number }>;
  faultRateByEquipment: Array<{ equipmentName: string; faultCount: number; rate: number }>;
}

export interface EquipmentStatsOverview {
  total: number;
  active: number;
  inactive: number;
  scrapped: number;
}

export interface EquipmentStatsData {
  overview: EquipmentStatsOverview;
  maintenanceByLevel: Array<{ level: MaintenanceLevel; count: number }>;
  costByMonth: Array<{ month: string; cost: number }>;
  faultRateByCategory: Array<{ category: string; faultCount: number; total: number; rate: number }>;
}

// =========================================================================
// Status display helpers
// =========================================================================

const EQUIPMENT_STATUS_MAP: Record<string, { text: string; type: string }> = {
  active: { text: '启用', type: 'success' },
  inactive: { text: '停用', type: 'warning' },
  scrapped: { text: '报废', type: 'danger' },
};

export function getEquipmentStatusText(status: string): string {
  return EQUIPMENT_STATUS_MAP[status]?.text ?? status;
}

export function getEquipmentStatusType(status: string): string {
  return EQUIPMENT_STATUS_MAP[status]?.type ?? 'info';
}

const PLAN_STATUS_MAP: Record<string, { text: string; type: string }> = {
  pending: { text: '待执行', type: 'warning' },
  in_progress: { text: '进行中', type: 'primary' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'info' },
};

export function getPlanStatusText(status: string): string {
  return PLAN_STATUS_MAP[status]?.text ?? status;
}

export function getPlanStatusType(status: string): string {
  return PLAN_STATUS_MAP[status]?.type ?? 'info';
}

const RECORD_STATUS_MAP: Record<string, { text: string; type: string }> = {
  draft: { text: '草稿', type: 'info' },
  submitted: { text: '待审批', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
};

export function getRecordStatusText(status: string): string {
  return RECORD_STATUS_MAP[status]?.text ?? status;
}

export function getRecordStatusType(status: string): string {
  return RECORD_STATUS_MAP[status]?.type ?? 'info';
}

const FAULT_STATUS_MAP: Record<string, { text: string; type: string }> = {
  pending: { text: '待处理', type: 'danger' },
  in_progress: { text: '处理中', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'info' },
};

export function getFaultStatusText(status: string): string {
  return FAULT_STATUS_MAP[status]?.text ?? status;
}

export function getFaultStatusType(status: string): string {
  return FAULT_STATUS_MAP[status]?.type ?? 'info';
}

const URGENCY_MAP: Record<string, { text: string; type: string }> = {
  urgent: { text: '紧急', type: 'danger' },
  normal: { text: '普通', type: 'warning' },
  low: { text: '低', type: 'info' },
};

export function getUrgencyText(urgency: string): string {
  return URGENCY_MAP[urgency]?.text ?? urgency;
}

export function getUrgencyType(urgency: string): string {
  return URGENCY_MAP[urgency]?.type ?? 'info';
}

const LEVEL_MAP: Record<string, { text: string; color: string }> = {
  daily: { text: '日保养', color: '#67c23a' },
  weekly: { text: '周保养', color: '#409eff' },
  monthly: { text: '月保养', color: '#e6a23c' },
  quarterly: { text: '季保养', color: '#f56c6c' },
  annual: { text: '年保养', color: '#909399' },
};

export function getLevelText(level: string): string {
  return LEVEL_MAP[level]?.text ?? level;
}

export function getLevelColor(level: string): string {
  return LEVEL_MAP[level]?.color ?? '#909399';
}

// =========================================================================
// Default maintenance config
// =========================================================================

export function getDefaultMaintenanceConfig(): MaintenanceConfig {
  return {
    daily: { enabled: true, cycle: 1, reminderDays: 0 },
    weekly: { enabled: true, cycle: 7, reminderDays: 1 },
    monthly: { enabled: true, cycle: 30, reminderDays: 3 },
    quarterly: { enabled: false, cycle: 90, reminderDays: 7 },
    annual: { enabled: true, cycle: 365, reminderDays: 14 },
  };
}

// =========================================================================
// API functions
// =========================================================================

const equipmentApi = {
  // --- Equipment CRUD ---

  getEquipmentList(params: EquipmentListParams = {}) {
    return request.get<EquipmentListResponse>('/equipment', { params });
  },

  getEquipmentById(id: string) {
    return request.get<Equipment>(`/equipment/${id}`);
  },

  createEquipment(payload: CreateEquipmentPayload) {
    return request.post<Equipment>('/equipment', payload);
  },

  updateEquipment(id: string, payload: UpdateEquipmentPayload) {
    return request.put<Equipment>(`/equipment/${id}`, payload);
  },

  deleteEquipment(id: string) {
    return request.delete(`/equipment/${id}`);
  },

  updateEquipmentStatus(id: string, status: EquipmentStatus) {
    return request.put(`/equipment/${id}/status`, { status });
  },

  // --- Maintenance Plans ---

  getPlanList(params: PlanListParams = {}) {
    return request.get<PlanListResponse>('/maintenance-plans', { params });
  },

  getPlanById(id: string) {
    return request.get<MaintenancePlan>(`/maintenance-plans/${id}`);
  },

  getPlanCalendar(year: number, month: number) {
    return request.get<CalendarData>('/maintenance-plans/calendar', {
      params: { year, month },
    });
  },

  startPlan(id: string) {
    return request.post(`/maintenance-plans/${id}/start`);
  },

  completePlan(id: string) {
    return request.post(`/maintenance-plans/${id}/complete`);
  },

  cancelPlan(id: string) {
    return request.post(`/maintenance-plans/${id}/cancel`);
  },

  // --- Maintenance Records ---

  getRecordList(params: RecordListParams = {}) {
    return request.get<RecordListResponse>('/maintenance-records', { params });
  },

  getRecordById(id: string) {
    return request.get<MaintenanceRecord>(`/maintenance-records/${id}`);
  },

  createRecord(payload: CreateRecordPayload) {
    return request.post<MaintenanceRecord>('/maintenance-records', payload);
  },

  updateRecord(id: string, payload: UpdateRecordPayload) {
    return request.put<MaintenanceRecord>(`/maintenance-records/${id}`, payload);
  },

  submitRecord(id: string) {
    return request.post(`/maintenance-records/${id}/submit`);
  },

  approveRecord(id: string, comment?: string) {
    return request.post(`/maintenance-records/${id}/approve`, { comment });
  },

  rejectRecord(id: string, comment: string) {
    return request.post(`/maintenance-records/${id}/reject`, { comment });
  },

  // --- Equipment Faults ---

  getFaultList(params: FaultListParams = {}) {
    return request.get<FaultListResponse>('/equipment/faults', { params });
  },

  getMyFaults(params: FaultListParams = {}) {
    return request.get<FaultListResponse>('/equipment/faults/my', { params });
  },

  getFaultById(id: string) {
    return request.get<EquipmentFault>(`/equipment/faults/${id}`);
  },

  createFault(payload: CreateFaultPayload) {
    return request.post<EquipmentFault>('/equipment/faults', payload);
  },

  acceptFault(id: string) {
    return request.post(`/equipment/faults/${id}/accept`);
  },

  completeFault(id: string, data: { faultCause: string; repairAction: string; repairSignature?: string }) {
    return request.post(`/equipment/faults/${id}/complete`, data);
  },

  cancelFault(id: string) {
    return request.post(`/equipment/faults/${id}/cancel`);
  },

  getFaultStats(params?: { startDate?: string; endDate?: string }) {
    return request.get<FaultStatsData>('/equipment/faults/stats', { params });
  },

  // --- Equipment Statistics ---

  getStatsOverview() {
    return request.get<EquipmentStatsData>('/equipment/stats/overview');
  },

  getMaintenanceStats(params?: { startDate?: string; endDate?: string }) {
    return request.get('/equipment/stats/maintenance', { params });
  },

  getFaultRateStats() {
    return request.get('/equipment/stats/fault-rate');
  },

  getCostStats(params?: { startDate?: string; endDate?: string }) {
    return request.get('/equipment/stats/cost', { params });
  },

  getRepairStats(params?: { startDate?: string; endDate?: string }) {
    return request.get('/equipment/stats/repair', { params });
  },

  // --- File Upload ---

  uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return request.post<{ url: string }>('/upload/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadSignature(dataUrl: string) {
    return request.post<{ url: string }>('/upload/signature', { data: dataUrl });
  },
};

export default equipmentApi;
