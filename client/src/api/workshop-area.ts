import request from './request';

export interface WorkshopArea {
  id: string;
  company_id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
  status: string;
  sort_order: number;
}

export interface CreateWorkshopAreaInput {
  company_id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
}

export const workshopAreaApi = {
  getList() {
    return request.get<WorkshopArea[]>('/workshop-areas');
  },

  create(data: CreateWorkshopAreaInput) {
    return request.post<WorkshopArea>('/workshop-areas', data);
  },
};
