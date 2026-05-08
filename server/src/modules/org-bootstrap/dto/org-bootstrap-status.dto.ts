export type BootstrapStep =
  | 'system_role_baseline'
  | 'departments'
  | 'department_manager'
  | 'department_members'
  | 'completed';

export type BootstrapReason =
  | 'missing_system_roles'
  | 'missing_department'
  | 'missing_department_manager'
  | 'missing_business_member';

export interface OrgBootstrapStatusDto {
  completed: boolean;
  step: BootstrapStep;
  reasons: BootstrapReason[];
}
