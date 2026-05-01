export interface AuthenticatedUser {
  id: string;
  userId: string;
  username: string;
  role: string;
  name: string;
  companyId: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
