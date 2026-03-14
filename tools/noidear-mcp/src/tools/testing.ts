import { spawnSync } from 'child_process';
import * as fs from 'fs';

const REPORT_PATH = '/tmp/noidear-e2e-report.json';
const CLIENT_DIR = '/Users/jiashenglin/Desktop/好玩的项目/noidear/client';

const FLOW_PATTERNS: Record<string, string> = {
  all: '**/*.spec.ts',
  auth: 'e2e/login-smoke.spec.ts',
  process: 'e2e/flows/process-*.spec.ts',
  warehouse: 'e2e/flows/warehouse-*.spec.ts',
  document: 'e2e/document-management.spec.ts',
};

const ALLOWED_FLOWS = new Set(Object.keys(FLOW_PATTERNS));

export function runTests(args: { flow?: string }): unknown {
  const flow = args.flow ?? 'all';
  if (!ALLOWED_FLOWS.has(flow)) {
    return { error: `Unknown flow: ${flow}. Allowed: ${[...ALLOWED_FLOWS].join(', ')}` };
  }
  const pattern = FLOW_PATTERNS[flow];
  const start = Date.now();

  const result = spawnSync(
    'npx',
    ['playwright', 'test', pattern, '--reporter=json'],
    {
      cwd: CLIENT_DIR,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: REPORT_PATH },
    }
  );

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;

  try {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    const passed = (report.stats?.expected ?? 0) as number;
    const failed = (report.stats?.unexpected ?? 0) as number;
    return { flow, passed, failed, duration, reportPath: REPORT_PATH };
  } catch {
    return {
      flow,
      duration,
      stdout: result.stdout?.slice(0, 2000),
      stderr: result.stderr?.slice(0, 500),
      note: 'Could not parse JSON report, showing raw output',
    };
  }
}

export function getTestReport(): unknown {
  if (!fs.existsSync(REPORT_PATH)) {
    return { error: 'No report found. Run run_tests first.' };
  }
  try {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    const mtime = fs.statSync(REPORT_PATH).mtime;
    return {
      passed: report.stats?.expected ?? 0,
      failed: report.stats?.unexpected ?? 0,
      generatedAt: mtime.toISOString(),
    };
  } catch {
    return { error: 'Failed to read report' };
  }
}
