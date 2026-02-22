export interface ApproverStat {
  approverId: string;
  name: string;
  approved: number;
  rejected: number;
  avgTime: number;
}

export interface ApprovalTrendData {
  date: string;
  approved: number;
  rejected: number;
}

export interface ApprovalStatsResponse {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
  avgApprovalTime: number;
  byApprover: ApproverStat[];
  trend: ApprovalTrendData[];
}
