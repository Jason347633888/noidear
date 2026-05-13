import request from './request';

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export const authApi = {
  changePassword(payload: ChangePasswordPayload) {
    return request.patch('/auth/change-password', payload);
  },
};
