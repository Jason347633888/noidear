// 用户相关类型

export interface UserRoleRef {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface UserDepartmentRef {
  id: string;
  name: string;
  status?: 'active' | 'inactive';
}

export interface User {
  id: string;
  username: string;
  name: string;
  departmentId: string | null;
  department?: UserDepartmentRef | null;
  departmentName?: string;
  roleId: string;
  roleObj?: UserRoleRef | null;
  superiorId: string | null;
  superiorName?: string;
  status: 'active' | 'inactive';
  loginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'leader' | 'user';
  roleId: string;
  departmentId?: string | null;
}

export interface CreateUserDTO {
  username: string;
  password: string;
  name: string;
  departmentId?: string | null;
  roleId: string;
  superiorId?: string | null;
}

export interface UpdateUserDTO {
  name?: string;
  departmentId?: string | null;
  roleId?: string;
  superiorId?: string | null;
  status?: 'active' | 'inactive';
}

export interface UserListParams {
  page: number;
  limit: number;
  keyword?: string;
  departmentId?: string;
  role?: string;
  status?: string;
}

export interface UserListResponse {
  list: User[];
  total: number;
  page: number;
  limit: number;
}
