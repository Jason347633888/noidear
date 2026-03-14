import axios from 'axios';
import { CONFIG } from './config.js';

interface TokenCache { token: string; expiresAt: number }
const cache = new Map<string, TokenCache>();

async function login(username: string, password: string): Promise<string> {
  const res = await axios.post(`${CONFIG.baseUrl}/auth/login`, { username, password });
  return res.data.access_token as string;
}

export const tokenManager = {
  async getAdminToken(): Promise<string> {
    const pass = CONFIG.adminPass;
    if (!pass) throw new Error('Admin credentials not configured. Set required environment variables.');
    return this.getCachedToken('admin', CONFIG.adminUser, pass);
  },

  async getRoleToken(role: string): Promise<string> {
    const envKey = `NOIDEAR_${role.toUpperCase()}_PASS`;
    const pass = process.env[envKey] ?? CONFIG.adminPass;
    if (!pass) throw new Error('Role credentials not configured. Set required environment variables.');
    return this.getCachedToken(role, role, pass);
  },

  async getCachedToken(key: string, user: string, pass: string): Promise<string> {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;
    const token = await login(user, pass);
    // JWT 7-day validity; cache for 6 days
    cache.set(key, { token, expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000 });
    return token;
  },
};
