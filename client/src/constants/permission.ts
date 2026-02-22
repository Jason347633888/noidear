export const PERMISSION_RESOURCES = [
  { value: 'document', label: '文档管理' },
  { value: 'template', label: '模板管理' },
  { value: 'task', label: '任务管理' },
  { value: 'approval', label: '审批管理' },
  { value: 'user', label: '用户管理' },
  { value: 'role', label: '角色管理' },
  { value: 'permission', label: '权限管理' },
  { value: 'warehouse', label: '仓库管理' },
  { value: 'record', label: '记录管理' },
  { value: 'workflow', label: '工作流管理' },
  { value: 'batch', label: '批次管理' },
  { value: 'deviation', label: '偏离检测' },
  { value: 'statistics', label: '统计分析' },
];

export const RESOURCE_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_RESOURCES.map((r) => [r.value, r.label]),
);
