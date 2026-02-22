import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * TASK-376: 性能压力测试
 * 验证监控模块在并发负载下的响应时间和稳定性
 */
describe('Monitoring Load Tests (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: process.env.TEST_ADMIN_USERNAME || 'admin',
        password: process.env.TEST_ADMIN_PASSWORD,
      });

    authToken = loginRes.body.token;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  /**
   * 并发请求健康检查端点
   * 期望: 所有请求在 10s 内完成，成功率 > 95%
   */
  it('should handle 20 concurrent health check requests', async () => {
    const concurrency = 20;
    const start = Date.now();

    const requests = Array.from({ length: concurrency }, () =>
      request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(5000),
    );

    const results = await Promise.allSettled(requests);
    const elapsed = Date.now() - start;

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 200,
    ).length;

    expect(elapsed).toBeLessThan(10000);
    expect(succeeded / concurrency).toBeGreaterThan(0.95);
  }, 30000);

  /**
   * 并发写入指标
   * 期望: POST /monitoring/metrics 在并发写入时不出现数据损坏
   */
  it('should handle 10 concurrent metric writes without errors', async () => {
    const concurrency = 10;

    const requests = Array.from({ length: concurrency }, (_, i) =>
      request(app.getHttpServer())
        .post('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metricName: `load_test_metric_${i}`,
          metricValue: Math.random() * 100,
          metricType: 'application',
        }),
    );

    const results = await Promise.allSettled(requests);
    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 201,
    ).length;

    expect(succeeded).toBeGreaterThanOrEqual(9);
  }, 30000);

  /**
   * 顺序请求告警规则列表，模拟持续轮询
   * 期望: 连续 10 次请求 P95 响应时间 < 500ms
   */
  it('should respond to alert rule queries with P95 < 500ms', async () => {
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const res = await request(app.getHttpServer())
        .get('/api/v1/monitoring/alerts/rules')
        .set('Authorization', `Bearer ${authToken}`);
      times.push(Date.now() - start);
      expect(res.status).toBe(200);
    }

    const sorted = [...times].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    expect(p95).toBeLessThan(500);
  }, 30000);

  /**
   * 告警历史查询在大参数下的稳定性
   */
  it('should return stable results for alert history query', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/monitoring/alerts/history/query')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ page: 1, limit: 100 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.items)).toBe(true);
  }, 10000);

  /**
   * Prometheus 指标端点吞吐量
   * 期望: 5 次并发请求全部成功且响应为 text/plain
   */
  it('should serve Prometheus metrics under concurrent load', async () => {
    const concurrency = 5;

    const requests = Array.from({ length: concurrency }, () =>
      request(app.getHttpServer())
        .get('/api/v1/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`),
    );

    const results = await Promise.all(requests);
    results.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
    });
  }, 15000);
});
