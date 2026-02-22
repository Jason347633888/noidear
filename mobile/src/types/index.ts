/** User info */
export interface UserInfo {
  id: string
  username: string
  realName: string
  department: string
  position: string
  avatar: string
  role: string
}

/** Login form */
export interface LoginForm {
  username: string
  password: string
}

/** Login response */
export interface LoginResult {
  token: string
  user: UserInfo
}

/** API response */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

/** Pagination params */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** Paginated response */
export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** Todo item */
export interface TodoItem {
  id: string
  title: string
  description: string
  type: 'training_attend' | 'approval' | 'equipment_maintain' | 'audit_rectification'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate: string
  assignee: string
  createdAt: string
  updatedAt: string
}

/** Record item */
export interface RecordItem {
  id: string
  title: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  submitter: string
  submittedAt: string
  data: Record<string, unknown>
}

/** Equipment item */
export interface EquipmentItem {
  id: string
  code: string
  name: string
  area: string
  status: 'normal' | 'fault' | 'maintenance'
  lastMaintenanceDate: string
  nextMaintenanceDate: string
  description: string
}

/** Equipment detail */
export interface EquipmentDetail extends EquipmentItem {
  model: string
  manufacturer: string
  purchaseDate: string
  maintenanceRecords: MaintenanceRecord[]
  maintenancePlans: MaintenancePlan[]
}

/** Maintenance record */
export interface MaintenanceRecord {
  id: string
  type: string
  date: string
  operator: string
  description: string
  result: string
}

/** Maintenance plan */
export interface MaintenancePlan {
  id: string
  title: string
  type: string
  scheduledDate: string
  status: 'pending' | 'completed' | 'overdue'
}

/** Calendar plan */
export interface CalendarPlan {
  id: string
  title: string
  type: 'maintenance' | 'training' | 'inspection' | 'cleaning'
  date: string
  time: string
  status: 'pending' | 'completed'
}

/** Form field definition */
export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'date' | 'time' | 'datetime' |
        'select' | 'multiselect' | 'radio' | 'checkbox' |
        'image' | 'signature' | 'scan'
  required: boolean
  placeholder?: string
  options?: { label: string; value: string | number }[]
  rules?: FormRule[]
  defaultValue?: unknown
  min?: number
  max?: number
  maxLength?: number
  pattern?: string
  patternMessage?: string
}

/** Form validation rule */
export interface FormRule {
  type: 'required' | 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength' | 'custom'
  value?: unknown
  message: string
  validator?: (value: unknown) => boolean
}

/** Offline sync queue item */
export interface SyncQueueItem {
  id: string
  type: 'form_submission' | 'image_upload' | 'signature_upload'
  data: Record<string, unknown>
  retries: number
  maxRetries: number
  createdAt: string
  lastAttempt?: string
  error?: string
}

/** Upload result */
export interface UploadResult {
  url: string
  thumbnailUrl?: string
  fileName: string
  fileSize: number
}
