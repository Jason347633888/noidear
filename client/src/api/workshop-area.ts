import request from './request';

export interface WorkshopArea {
  id: string;
  code: string;
  name: string;
  status: string;
  sort_order: number;
}

export const workshopAreaApi = {
  getList() {
    return request.get<WorkshopArea[]>('/workshop-areas');
  },
};
