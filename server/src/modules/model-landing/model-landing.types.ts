export interface ModelLandingFormRow {
  templateGroupId: string;
  code: string;
  formName: string;
  path: string;
  department: string;
  entities: string[];
  chain: string;
  basis: string;
}

export interface ModelLandingSummary {
  totalForms: number;
  totalGroups: number;
  unmappedCount: number;
  groupCounts: Record<string, number>;
}
