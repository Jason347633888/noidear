import { defineStore } from 'pinia';
import request from '@/api/request';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    token: localStorage.getItem('token') || '',
  }),
  actions: {
    async login(username: string, password: string) {
      const res = await request.post('/auth/login', { username, password });
      if (res.code === 0) {
        this.token = res.data.token;
        this.user = res.data.user;
        localStorage.setItem('token', this.token);
        return true;
      }
      return false;
    },
    logout() {
      this.user = null;
      this.token = '';
      localStorage.removeItem('token');
    },
  },
});
