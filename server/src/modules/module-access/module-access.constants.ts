export const MODULE_KEYS = [
  'work_execution',
  'document_approval',
  'production_execution',
  'product_rd',
  'quality_compliance',
  'equipment_site',
  'traceability_batch',
  'warehouse',
  'training',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  work_execution: '工作执行',
  document_approval: '文控与审批',
  production_execution: '生产执行',
  product_rd: '产品研发',
  quality_compliance: '质量与合规',
  equipment_site: '设备与现场',
  traceability_batch: '追溯与批次',
  warehouse: '仓库管理',
  training: '培训',
};

export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === 'string' && (MODULE_KEYS as readonly string[]).includes(value);
}

export const ROLE_CODES_WITH_TOGGLE = ['leader', 'user'] as const;
export type RoleCodeWithToggle = (typeof ROLE_CODES_WITH_TOGGLE)[number];
