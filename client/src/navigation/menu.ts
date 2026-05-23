import {
  HomeFilled, Bell, List, CircleCheck, Files, Grid, Monitor,
  Connection, Document, Box, Goods, Setting,
  UserFilled, WarnTriangleFilled, SetUp, Search, Odometer,
  Delete, Key, RefreshLeft, Message, DataAnalysis,
} from '@element-plus/icons-vue';

export interface MenuEntry {
  path?: string;
  title: string;
  icon: unknown;
  badge?: 'pendingTodoCount';
  moduleKey?: string;
  children?: MenuEntry[];
}

export interface MenuGroup extends MenuEntry {
  moduleKey?: string;
  adminOnly?: boolean;
}

export const menuGroups: MenuGroup[] = [
  {
    title: '工作执行',
    moduleKey: 'work_execution',
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
    moduleKey: 'document_approval',
    icon: Files,
    children: [
      { path: '/documents', title: '体系文件中心', icon: Files },
      { path: '/templates', title: '模板管理', icon: Grid },
      { path: '/documents/control/record-form-index', title: '记录表单索引', icon: List },
      { path: '/approvals/history', title: '审批历史', icon: CircleCheck },
    ],
  },
  {
    title: '生产执行',
    moduleKey: 'production_execution',
    icon: List,
    children: [
      { path: '/records', title: '记录管理', icon: Document, moduleKey: 'document_approval' },
      { path: '/record-tasks/manage', title: '任务配置', icon: Setting, moduleKey: 'work_execution' },
      { path: '/production/workshop-staging', title: '车间暂存区', icon: Grid },
    ],
  },
  {
    title: '产品研发',
    moduleKey: 'product_rd',
    icon: Grid,
    children: [
      { path: '/products', title: '产品信息', icon: Goods },
      { path: '/process', title: '研发流程列表', icon: List },
    ],
  },
  {
    title: '质量与合规',
    moduleKey: 'quality_compliance',
    icon: CircleCheck,
    children: [
      { path: '/ccp/records', title: 'CCP 监控', icon: WarnTriangleFilled },
      { path: '/non-conformances', title: '不合格品处置', icon: WarnTriangleFilled },
      { path: '/corrective-actions', title: '纠正措施（CAPA）', icon: CircleCheck },
      { path: '/customer-complaints', title: '顾客投诉', icon: Message },
      { path: '/product-recalls', title: '产品召回', icon: WarnTriangleFilled },
      { path: '/supplier-evaluations', title: '供应商评估', icon: Goods },
      { path: '/change-events', title: '变更管理', icon: Connection },
      { path: '/deviation-reports', title: '偏差报告', icon: WarnTriangleFilled },
      { path: '/deviation-analytics', title: '偏差分析', icon: DataAnalysis },
    ],
  },
  {
    title: '设备与现场',
    moduleKey: 'equipment_site',
    icon: SetUp,
    children: [
      { path: '/equipment', title: '设备台账', icon: SetUp },
      { path: '/equipment/plans', title: '维护计划', icon: SetUp },
      { path: '/equipment/records', title: '维保记录', icon: SetUp },
      { path: '/equipment/faults', title: '设备报修', icon: WarnTriangleFilled },
      { path: '/equipment/stats', title: '设备统计', icon: DataAnalysis },
      { path: '/environment-records', title: '环境温湿度', icon: Monitor },
      { path: '/process-records', title: '过程参数', icon: DataAnalysis },
      { path: '/metal-detections', title: '金属探测', icon: SetUp },
      { path: '/cleaning-records', title: '清洁消毒', icon: Grid },
      { path: '/measuring-equipment', title: '测量设备', icon: SetUp },
      { path: '/rework-records', title: '回料/返工记录', icon: RefreshLeft },
      { path: '/fragile-item-inspections', title: '玻璃硬塑检查', icon: Grid },
      { path: '/violation-records', title: '员工违规', icon: WarnTriangleFilled },
      { path: '/medication-records', title: '员工用药', icon: UserFilled },
      { path: '/visitor-records', title: '访客登记', icon: UserFilled },
      { path: '/emergency-drills', title: '应急演练', icon: HomeFilled },
      { path: '/waste', title: '废弃物管理', icon: Delete },
      { path: '/line-change-check-records', title: '换产前检查', icon: RefreshLeft },
      { path: '/food-safety-culture-records', title: '食品安全文化', icon: UserFilled },
      { path: '/external-parties', title: '外部方档案', icon: UserFilled },
    ],
  },
  {
    title: '追溯与批次',
    moduleKey: 'traceability_batch',
    icon: Box,
    children: [
      { path: '/batch-trace', title: '批次列表', icon: Box },
      { path: '/warehouse/batches', title: '批次管理', icon: Goods },
      { path: '/traceability', title: '追溯查询', icon: Search },
      { path: '/warehouse/material-balance', title: '物料平衡', icon: Goods },
      { path: '/incoming-inspections', title: '来料检验', icon: Document },
      { path: '/packaging-material-usages', title: '包装材料用量', icon: Grid },
    ],
  },
  {
    title: '仓库管理',
    moduleKey: 'warehouse',
    icon: Goods,
    children: [
      { path: '/warehouse/materials', title: '物料管理', icon: Goods },
      { path: '/warehouse/suppliers', title: '供应商', icon: Goods },
      { path: '/warehouse/requisitions', title: '领料管理', icon: Goods },
    ],
  },
  {
    title: '培训',
    moduleKey: 'training',
    icon: UserFilled,
    children: [
      { path: '/training/projects', title: '培训项目', icon: UserFilled },
    ],
  },
  {
    title: '系统治理',
    adminOnly: true,
    icon: Setting,
    children: [
      { path: '/users', title: '用户管理', icon: UserFilled },
      { path: '/departments', title: '部门管理', icon: Connection },
      { path: '/roles', title: '角色管理', icon: Key },
      { path: '/module-access/manage', title: '模块开关', icon: Setting },
      { path: '/notifications', title: '消息中心', icon: Message },
      { path: '/search', title: '高级搜索', icon: Search },
      { path: '/audit/search', title: '审计日志', icon: Odometer },
    ],
  },
];
