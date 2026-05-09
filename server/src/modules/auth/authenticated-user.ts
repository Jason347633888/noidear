export interface AuthenticatedUser {
  id: string;
  username: string;
  roleCode: string;
  roleId: string;
  name: string;
  companyId: string;
  departmentId?: string | null;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
