import { defineStore } from 'pinia';
import request from '@/api/request';
import { useModuleAccessStore } from '@/stores/moduleAccess';

interface CurrentUser {
  id: string;
  username: string;
  name: string;
  roleCode: 'admin' | 'leader' | 'user';
  roleId: string;
  departmentId?: string | null;
}

interface LoginResponse {
  token: string;
  user: CurrentUser;
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as CurrentUser | null,
    token: localStorage.getItem('token') || '',
    error: '',
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.roleCode === 'admin',
    isLeader: (state) => state.user?.roleCode === 'leader' || state.user?.roleCode === 'admin',
  },
  actions: {
    async login(username: string, password: string): Promise<boolean> {
      this.error = '';
      try {
        const data = await request.post<LoginResponse>('/auth/login', { username, password });
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', this.token);
        // Refresh module access for the newly logged-in user to avoid stale state
        await useModuleAccessStore().refresh();
        return true;
      } catch (err: any) {
        this.error = err.response?.data?.message || '用户名或密码错误';
        return false;
      }
    },
    async fetchUser() {
      if (!this.token) return;
      try {
        const user = await request.get<CurrentUser>('/auth/profile');
        this.user = user;
      } catch {
        this.token = '';
        this.user = null;
        localStorage.removeItem('token');
      }
    },
    logout() {
      // Reset module access store before clearing user state so it's cleared for the next login
      useModuleAccessStore().reset();
      this.user = null;
      this.token = '';
      this.error = '';
      localStorage.removeItem('token');
    },
  },
});
