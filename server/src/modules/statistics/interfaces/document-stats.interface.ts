export interface LevelStat {
  level: number;
  count: number;
  percentage: number;
}

export interface DepartmentStat {
  departmentId: string;
  name: string;
  count: number;
}

export interface StatusStat {
  status: string;
  count: number;
  percentage: number;
}

export interface TrendData {
  date: string;
  count: number;
}

export interface DocumentStatsResponse {
  total: number;
  byLevel: LevelStat[];
  byDepartment: DepartmentStat[];
  byStatus: StatusStat[];
  trend: TrendData[];
  growthRate: number;
}
