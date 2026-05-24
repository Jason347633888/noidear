import request from './request';
import type { Department, DepartmentListResponse } from '@noidear/types';

export type { Department, DepartmentListResponse };

export interface DepartmentListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  status?: 'active' | 'inactive';
}

export interface CreateDepartmentPayload {
  code: string;
  name: string;
  managerId?: string;
}

export interface UpdateDepartmentPayload {
  name?: string;
  managerId?: string | null;
  status?: 'active' | 'inactive';
}

export const getDepartments = (params: DepartmentListParams = {}) => {
  return request.get<DepartmentListResponse>('/departments', { params });
};

export const getDepartmentById = (id: string) => {
  return request.get<Department>(`/departments/${id}`);
};

export const createDepartment = (payload: CreateDepartmentPayload) => {
  return request.post<Department>('/departments', payload);
};

export const updateDepartment = (id: string, payload: UpdateDepartmentPayload) => {
  return request.put<Department>(`/departments/${id}`, payload);
};

export const deleteDepartment = (id: string) => {
  return request.delete(`/departments/${id}`);
};
