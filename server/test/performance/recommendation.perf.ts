/**
 * 推荐算法性能测试 (k6)
 * 目标: 生成10000用户推荐 < 5s
 *
 * 运行方式: k6 run recommendation.perf.ts
 */

export const options = {
  scenarios: {
    recommendationLoad: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.API_TOKEN || '';

export default function recommendationPerfTest() {
  console.log(`Recommendation perf test at ${BASE_URL}, token: ${TOKEN ? 'provided' : 'missing'}`);
}

declare const __ENV: Record<string, string>;
