import axios, { AxiosError } from 'axios';
import { CONFIG } from '../auth/config.js';
import { tokenManager } from '../auth/token-manager.js';

export interface ApiArgs {
  path: string;
  method: string;
  body?: unknown;
  query?: Record<string, unknown>;
}

async function executeRequest(token: string, args: ApiArgs): Promise<unknown> {
  try {
    const res = await axios({
      url: `${CONFIG.baseUrl}${args.path}`,
      method: args.method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: args.body,
      params: args.query,
    });
    return { success: true, status: res.status, data: res.data };
  } catch (err) {
    const e = err as AxiosError;
    return {
      success: false,
      status: e.response?.status,
      error: e.response?.data ?? e.message,
    };
  }
}

export async function callApi(args: ApiArgs): Promise<unknown> {
  const token = await tokenManager.getAdminToken();
  return executeRequest(token, args);
}

export async function callApiAs(args: { role: string } & ApiArgs): Promise<unknown> {
  const { role, ...rest } = args;
  const token = await tokenManager.getRoleToken(role);
  return executeRequest(token, rest);
}
