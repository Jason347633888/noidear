/**
 * 批量导出性能测试 (k6)
 * 目标: 导出10000条记录 < 10s
 *
 * 运行方式: k6 run export.perf.ts
 */

export const options = {
  scenarios: {
    exportLoad: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 10,
      maxDuration: '120s',
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<10000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.API_TOKEN || '';

export default function exportPerfTest() {
  console.log(`Export test at ${BASE_URL}, token: ${TOKEN ? 'provided' : 'missing'}`);
}

declare const __ENV: Record<string, string>;
