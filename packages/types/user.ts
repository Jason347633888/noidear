// 用户相关类型

export interface User {
  id: string;
  username: string;
  name: string;
  departmentId: string | null;
  departmentName?: string;
  role: 'user' | 'leader' | 'admin';
  superiorId: string | null;
  superiorName?: string;
  status: 'active' | 'inactive';
  loginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateUserDTO {
  username: string;
  password: string;
  name: string;
  departmentId: string;
  role: 'user' | 'leader' | 'admin';
  superiorId: string;
}

export interface UpdateUserDTO {
  name?: string;
  departmentId?: string;
  role?: 'user' | 'leader' | 'admin';
  superiorId?: string;
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
