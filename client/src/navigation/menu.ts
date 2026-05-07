import {
  HomeFilled, Bell, List, CircleCheck, Files, Grid, Monitor,
  Connection, Document, Box, Goods, DataAnalysis, Setting,
  UserFilled, WarnTriangleFilled, SetUp, Search, Odometer,
  Delete, Cloudy, Key, RefreshLeft, Message,
} from '@element-plus/icons-vue';

export interface MenuEntry {
  path?: string;
  title: string;
  icon: unknown;
  badge?: 'pendingTodoCount';
  children?: MenuEntry[];
}

export const menuGroups: MenuEntry[] = [
  {
    title: '工作执行',
    icon: HomeFilled,
    children: [
      { path: '/dashboard', title: '工作台', icon: HomeFilled },
      { path: '/my-todos', title: '我的待办', icon: Bell, badge: 'pendingTodoCount' },
      { path: '/record-tasks/my', title: '待填任务', icon: List },
      { path: '/approvals/pending', title: '待我审批', icon: CircleCheck },
    ],
  },
  {
    title: '文控与审批',
    icon: Files,
    children: [
      { path: '/documents', title: '体系文件中心', icon: Files },
      { path: '/documents/control/record-form-index', title: '记录表单索引', icon: List },
      { path: '/documents/control/number-rules', title: '编号规则', icon: List },
      { path: '/documents/control/workbench', title: '文控工作台', icon: Monitor },
      { path: '/documents/operations/read-confirmations', title: '阅读确认', icon: List },
      { path: '/documents/operations/training-needs', title: '培训需求', icon: UserFilled },
      { path: '/documents/operations/health', title: '文控健康度', icon: DataAnalysis },
      { path: '/documents/operations/audit-coverage', title: '审核覆盖', icon: CircleCheck },
      { path: '/documents/operations/impact', title: '影响分析', icon: Connection },
      { path: '/approvals/history', title: '审批历史', icon: CircleCheck },
      { path: '/workflow/instances', title: '工作流实例', icon: Connection },
      { path: '/workflow/templates', title: '工作流模板', icon: Connection },
      { path: '/workflow-templates/designer', title: '流程设计器', icon: Connection },
    ],
  },
  {
    title: '追溯与批次',
    icon: Box,
    children: [
      { path: '/batch-trace', title: '批次列表', icon: Box },
      { path: '/warehouse/batches', title: '批次管理', icon: Goods },
      { path: '/traceability', title: '追溯查询', icon: Search },
      { path: '/warehouse/material-balance', title: '物料平衡', icon: Goods },
      { path: '/incoming-inspections', title: '来料检验', icon: Document },
    ],
  },
  {
    title: '系统管理',
    icon: Setting,
    children: [
      { path: '/users', title: '用户管理', icon: UserFilled },
      { path: '/roles', title: '角色管理', icon: Key },
      { path: '/permissions', title: '权限管理', icon: Setting },
      { path: '/audit/search', title: '审计日志', icon: Odometer },
      { path: '/recycle-bin', title: '回收站', icon: Delete },
      { path: '/backup/manage', title: '备份管理', icon: Cloudy },
      { path: '/admin/import', title: '批量导入', icon: DataAnalysis },
      { path: '/admin/export', title: '批量导出', icon: DataAnalysis },
      { path: '/monitoring/dashboard', title: '监控大屏', icon: Monitor },
    ],
  },
];
