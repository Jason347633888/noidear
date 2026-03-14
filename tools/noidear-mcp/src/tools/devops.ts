import { execFileSync } from 'child_process';
import axios from 'axios';
import { CONFIG } from '../auth/config.js';
import { tokenManager } from '../auth/token-manager.js';

const ALLOWED_SERVICES = new Set(['server', 'client', 'redis', 'postgres']);
const ALLOWED_RESTART = new Set(['server', 'client', 'redis']);

function assertSafeService(service: string, allowedSet: Set<string>): void {
  if (!allowedSet.has(service)) {
    throw new Error(`Service not in allowlist: ${service}. Allowed: ${[...allowedSet].join(', ')}`);
  }
}

export async function healthCheck(): Promise<unknown> {
  const services: Record<string, string> = {};

  // Docker checks using array form (no shell injection)
  const dockerChecks: Array<{ name: string; cmd: string; args: string[] }> = [
    { name: 'postgres', cmd: 'docker', args: ['exec', 'noidear-postgres', 'pg_isready', '-U', 'noidear'] },
    { name: 'redis', cmd: 'docker', args: ['exec', 'noidear-redis', 'redis-cli', 'ping'] },
  ];
  for (const c of dockerChecks) {
    try {
      execFileSync(c.cmd, c.args, { stdio: 'pipe' });
      services[c.name] = 'healthy';
    } catch {
      services[c.name] = 'unhealthy';
    }
  }

  // Server health: use authenticated request since /health requires auth
  try {
    const token = await tokenManager.getAdminToken().catch(() => null);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios.get(`${CONFIG.baseUrl}/health`, { timeout: 3000, headers });
    services['server'] = res.data?.code === 0 ? 'healthy' : 'unhealthy';
  } catch (err) {
    // 401 means server is up but auth failed; treat as healthy for infrastructure check
    const status = (err as { response?: { status?: number } }).response?.status;
    services['server'] = status ? 'healthy' : 'unhealthy';
  }

  // Client health: unauthenticated HTTP check
  try {
    await axios.get('http://localhost', { timeout: 3000 });
    services['client'] = 'healthy';
  } catch {
    services['client'] = 'unhealthy';
  }

  const overall = Object.values(services).every((s) => s === 'healthy') ? 'all healthy' : 'some unhealthy';
  return { overall, services };
}

export function getLogs(args: { service: string; lines?: number; level?: string }): unknown {
  assertSafeService(args.service, ALLOWED_SERVICES);
  const container = `noidear-${args.service}`;
  const lineCount = String(Math.min(Math.max(args.lines ?? 50, 1), 500));
  try {
    const raw = execFileSync('docker', ['logs', container, '--tail', lineCount], {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    const lines = raw.split('\n').filter(Boolean);
    const level = args.level ?? 'error';
    if (level === 'all') return { total: lines.length, lines };
    const filtered = lines.filter((l) => /error|warn/i.test(l));
    return { total: lines.length, filtered: filtered.length, logs: filtered };
  } catch (err) {
    return { error: String(err) };
  }
}

// SELECT-only allowlist pattern for safe SQL read queries
const SAFE_SQL_PATTERN = /^\s*select\s+/i;

export function queryDb(args: { sql: string }): unknown {
  const sql = args.sql.trim();
  if (!SAFE_SQL_PATTERN.test(sql)) {
    return { error: 'Only SELECT queries allowed for safety' };
  }
  // Additional guard: reject stacked statements and common injection patterns
  if (/;\s*\S/.test(sql) || /--/.test(sql) || /\/\*/.test(sql)) {
    return { error: 'Query contains disallowed patterns (stacked statements, comments)' };
  }
  try {
    const result = execFileSync(
      'docker',
      ['exec', 'noidear-postgres', 'psql', '-U', 'noidear', '-d', 'document_system', '-c', sql],
      { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }
    );
    return { result };
  } catch (err) {
    return { error: String(err) };
  }
}

export function restartService(args: { service: string }): unknown {
  assertSafeService(args.service, ALLOWED_RESTART);
  try {
    execFileSync('docker', ['restart', `noidear-${args.service}`], { stdio: 'pipe' });
    return { success: true, restarted: `noidear-${args.service}` };
  } catch (err) {
    return { error: String(err) };
  }
}

export function runMigration(): unknown {
  const serverDir = '/Users/jiashenglin/Desktop/好玩的项目/noidear/server';
  try {
    const output = execFileSync(
      'npx',
      ['prisma', 'migrate', 'deploy', '--schema=src/prisma/schema.prisma'],
      { cwd: serverDir, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }
    );
    return { success: true, output };
  } catch (err) {
    return { error: String(err) };
  }
}
