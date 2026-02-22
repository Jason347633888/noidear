import request from './request';

export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string | null;
  managerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentListResponse {
  list: Department[];
  total: number;
}

/**
 * 获取部门列表
 */
export const getDepartments = (params?: { limit?: number }) => {
  return request.get<DepartmentListResponse>('/departments', { params });
};

/**
 * 获取部门详情
 */
export const getDepartmentById = (id: string) => {
  return request.get<Department>(`/departments/${id}`);
};
