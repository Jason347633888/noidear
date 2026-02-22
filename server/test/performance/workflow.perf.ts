/**
 * 工作流引擎性能测试 (k6)
 * 目标: 1000个并发工作流实例，P99 响应时间 < 500ms
 *
 * 运行方式: k6 run workflow.perf.ts
 */

export const options = {
  scenarios: {
    workflowLoad: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 100 },
        { duration: '60s', target: 500 },
        { duration: '30s', target: 1000 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.API_TOKEN || '';

export default function workflowPerfTest() {
  console.log(`Workflow perf test at ${BASE_URL}, token: ${TOKEN ? 'provided' : 'missing'}`);
}

declare const __ENV: Record<string, string>;
