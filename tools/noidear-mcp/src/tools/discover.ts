import axios from 'axios';
import { CONFIG } from '../auth/config.js';
import { tokenManager } from '../auth/token-manager.js';

interface EndpointInfo { path: string; method: string; summary: string; tags: string[] }

export async function discover(args: { module?: string }): Promise<unknown> {
  const token = await tokenManager.getAdminToken();
  const docsUrl = CONFIG.baseUrl.replace('/api/v1', '') + '/api/docs-json';
  const { data: spec } = await axios.get(docsUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const results: EndpointInfo[] = [];
  for (const [path, methods] of Object.entries(
    spec.paths as Record<string, Record<string, { summary?: string; tags?: string[] }>>
  )) {
    for (const [method, op] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const tags: string[] = op.tags ?? [];
      if (args.module) {
        const kw = args.module.toLowerCase();
        if (!tags.some((t) => t.toLowerCase().includes(kw)) && !path.toLowerCase().includes(kw)) {
          continue;
        }
      }
      results.push({ path, method: method.toUpperCase(), summary: op.summary ?? '', tags });
    }
  }
  return {
    total: results.length,
    module: args.module ?? 'all',
    endpoints: results.slice(0, 60),
    note: results.length > 60 ? `还有 ${results.length - 60} 个，使用 module 过滤` : undefined,
  };
}
