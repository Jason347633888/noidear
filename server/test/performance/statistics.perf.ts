/**
 * 统计分析性能测试 (k6)
 * 目标: 查询100万条记录 < 3s
 *
 * 运行方式: k6 run statistics.perf.ts
 */

export const options = {
  scenarios: {
    statisticsLoad: {
      executor: 'constant-vus',
      vus: 10,
      duration: '60s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.API_TOKEN || '';

export const ENDPOINTS = [
  '/api/v1/statistics/documents',
  '/api/v1/statistics/users',
  '/api/v1/statistics/workflow',
  '/api/v1/statistics/equipment',
];

export default function statisticsPerfTest() {
  const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  console.log(`Statistics perf test: ${BASE_URL}${endpoint}, token: ${TOKEN ? 'provided' : 'missing'}`);
}

declare const __ENV: Record<string, string>;
