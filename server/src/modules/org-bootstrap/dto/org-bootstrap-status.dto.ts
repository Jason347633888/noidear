// Deprecated diagnostic types. This DTO is NOT a product initialization contract.
// Frontend routing must NOT consume these fields to gate access.
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
  /** Always true — this endpoint is a deprecated authenticated diagnostic only. */
  deprecated: true;
  completed: boolean;
  step: BootstrapStep;
  reasons: BootstrapReason[];
}
