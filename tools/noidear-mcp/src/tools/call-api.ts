import axios, { AxiosError } from 'axios';
import { CONFIG } from '../auth/config.js';
import { tokenManager } from '../auth/token-manager.js';

export interface ApiArgs {
  path: string;
  method: string;
  body?: unknown;
  query?: Record<string, unknown>;
}

interface ApiResult {
  success: boolean;
  status?: number;
  data?: unknown;
  error?: unknown;
}

async function recordAction(
  token: string,
  path: string,
  method: string,
  result: string,
  errorCode: string | undefined,
  executedAs: string,
  durationMs: number,
): Promise<void> {
  try {
    await axios.post(
      `${CONFIG.baseUrl}/agent/actions`,
      { tool: 'call_api', path, method, result, errorCode, executedAs, durationMs },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 2000 },
    );
  } catch {
    // 审计记录失败不影响主流程
  }
}

async function executeRequest(
  token: string,
  args: ApiArgs,
  executedAs: string,
): Promise<ApiResult> {
  const startTime = Date.now();
  try {
    const res = await axios({
      url: `${CONFIG.baseUrl}${args.path}`,
      method: args.method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: args.body,
      params: args.query,
    });
    const durationMs = Date.now() - startTime;
    void recordAction(token, args.path, args.method, 'success', undefined, executedAs, durationMs);
    return { success: true, status: res.status, data: res.data };
  } catch (err) {
    const e = err as AxiosError;
    const durationMs = Date.now() - startTime;
    const errorCode = e.response?.status?.toString();
    void recordAction(token, args.path, args.method, 'error', errorCode, executedAs, durationMs);
    return {
      success: false,
      status: e.response?.status,
      error: e.response?.data ?? e.message,
    };
  }
}

export async function callApi(args: ApiArgs): Promise<unknown> {
  const token = await tokenManager.getAdminToken();
  return executeRequest(token, args, 'admin');
}

export async function callApiAs(args: { role: string } & ApiArgs): Promise<unknown> {
  const { role, ...rest } = args;
  const token = await tokenManager.getRoleToken(role);
  return executeRequest(token, rest, role);
}
