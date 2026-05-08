export interface AuthenticatedUser {
  id: string;
  userId: string;
  username: string;
  role: 'admin' | 'leader' | 'user';
  roleId: string;
  name: string;
  companyId: string;
  departmentId?: string | null;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
