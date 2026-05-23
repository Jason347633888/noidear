import request from './request';

export interface ModuleAccessMe {
  roleCode: 'admin' | 'leader' | 'user';
  enabledModules: string[];
}

export interface MatrixRow {
  moduleKey: string;
  moduleLabel: string;
  leader: boolean;
  user: boolean;
}

export interface MatrixResponse {
  modules: MatrixRow[];
}

export const moduleAccessApi = {
  me: () => request.get<ModuleAccessMe>('/module-access'),
  listMatrix: () => request.get<MatrixResponse>('/admin/module-access'),
  saveMatrix: (modules: Array<Pick<MatrixRow, 'moduleKey' | 'leader' | 'user'>>) =>
    request.put<MatrixResponse>('/admin/module-access', { modules }),
};
