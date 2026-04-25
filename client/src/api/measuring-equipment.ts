import request from './request';

// =========================================================================
// Types
// =========================================================================

export type EquipmentStatus = 'normal' | 'overdue' | 'scrapped';
export type CalibrationResult = 'pass' | 'fail' | 'conditional';

export interface CalibrationRecord {
  id: string;
  company_id: string;
  measuring_equipment_id: string;
  calibrated_at: string;
  valid_until: string;
  calibration_body: string | null;
  certificate_no: string | null;
  result: CalibrationResult;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MeasuringEquipment {
  id: string;
  company_id: string;
  code: string;
  name: string;
  model: string | null;
  serial_no: string | null;
  location: string | null;
  calibration_cycle_days: number | null;
  last_calibrated_at: string | null;
  next_calibration_at: string | null;
  status: EquipmentStatus;
  calibration_records?: CalibrationRecord[];
  created_at: string;
  updated_at: string;
}

export interface CreateEquipmentPayload {
  code: string;
  name: string;
  model?: string;
  serial_no?: string;
  location?: string;
  calibration_cycle_days?: number;
}

export interface CreateCalibrationPayload {
  measuring_equipment_id: string;
  calibrated_at: string;
  valid_until: string;
  result: CalibrationResult;
  calibration_body?: string;
  certificate_no?: string;
  notes?: string;
}

// =========================================================================
// Status display helpers
// =========================================================================

const STATUS_MAP: Record<EquipmentStatus, { text: string; type: string }> = {
  normal: { text: '正常', type: 'success' },
  overdue: { text: '逾期', type: 'danger' },
  scrapped: { text: '报废', type: 'info' },
};

export function getEquipmentStatusText(status: string): string {
  return STATUS_MAP[status as EquipmentStatus]?.text ?? status;
}

export function getEquipmentStatusType(status: string): string {
  return STATUS_MAP[status as EquipmentStatus]?.type ?? 'info';
}

const RESULT_MAP: Record<CalibrationResult, { text: string; type: string }> = {
  pass: { text: '合格', type: 'success' },
  fail: { text: '不合格', type: 'danger' },
  conditional: { text: '有条件合格', type: 'warning' },
};

export function getCalibrationResultText(result: string): string {
  return RESULT_MAP[result as CalibrationResult]?.text ?? result;
}

export function getCalibrationResultType(result: string): string {
  return RESULT_MAP[result as CalibrationResult]?.type ?? 'info';
}

// =========================================================================
// API functions
// =========================================================================

const measuringEquipmentApi = {
  getList() {
    return request.get<{ data: MeasuringEquipment[]; total?: number }>('/measuring-equipment');
  },

  getOverdue() {
    return request.get<{ data: MeasuringEquipment[]; total?: number }>('/measuring-equipment/overdue');
  },

  create(payload: CreateEquipmentPayload) {
    return request.post<MeasuringEquipment>('/measuring-equipment', payload);
  },

  createCalibration(payload: CreateCalibrationPayload) {
    return request.post<CalibrationRecord>('/measuring-equipment/calibrations', payload);
  },

  getCalibrations(equipmentId: string) {
    return request.get<{ data: CalibrationRecord[]; total?: number }>(`/measuring-equipment/${equipmentId}/calibrations`);
  },
};

export default measuringEquipmentApi;
