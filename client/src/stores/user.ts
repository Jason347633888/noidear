import { defineStore } from 'pinia';
import request from '@/api/request';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  departmentId: string | null;
}

interface LoginResponse {
  token: string;
  user: User;
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    token: localStorage.getItem('token') || '',
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isLeader: (state) => state.user?.role === 'leader' || state.user?.role === 'admin',
  },
  actions: {
    async login(username: string, password: string): Promise<boolean> {
      try {
        const data = await request.post<LoginResponse>('/auth/login', { username, password });
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', this.token);
        return true;
      } catch {
        return false;
      }
    },
    async fetchUser() {
      if (!this.token) return;
      const user = await request.get<User>('/auth/profile');
      this.user = user;
    },
    logout() {
      this.user = null;
      this.token = '';
      localStorage.removeItem('token');
    },
  },
});
