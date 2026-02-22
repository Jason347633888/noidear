export interface DepartmentTaskStat {
  departmentId: string;
  name: string;
  count: number;
  completionRate: number;
}

export interface TemplateTaskStat {
  templateId: string;
  name: string;
  count: number;
}

export interface StatusTaskStat {
  status: string;
  count: number;
}

export interface TaskTrendData {
  date: string;
  completed: number;
  created: number;
}

export interface TaskStatsResponse {
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
  overdueRate: number;
  avgCompletionTime: number;
  byDepartment: DepartmentTaskStat[];
  byTemplate: TemplateTaskStat[];
  byStatus: StatusTaskStat[];
  trend: TaskTrendData[];
}
