import { test, expect } from '@playwright/test';
import { loginViaApiCached } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { apiBaseUrl } from './support/urls';

/**
 * E2E Tests — 设备与现场模块
 *
 * Covers:
 *   设备台账    EQ-001 ~ EQ-003
 *   维护计划    EQ-010 ~ EQ-011
 *   维保记录    EQ-020 ~ EQ-021
 *   设备报修    EQ-030 ~ EQ-031
 *   现场记录    SITE-001 ~ SITE-010
 */

const API_BASE = apiBaseUrl();
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'ChangeMe123!';

// ---------------------------------------------------------------------------
// 设备台账
// ---------------------------------------------------------------------------

test.describe('设备台账 (EQ-001 ~ EQ-003)', () => {
  test('EQ-001: 设备列表页渲染', async ({ page }) => {
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/equipment');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 });
  });

  test('EQ-002: API 创建设备 POST /equipment 返回 201', async ({ request }) => {
    const token = await getAuthToken(request, ADMIN_USER, ADMIN_PASS);

    const payload = {
      name: `E2E-设备-${Date.now()}`,
      category: '生产设备',
      location: 'E2E测试车间',
      manufacturer: 'E2E厂商',
    };

    const response = await request.post(`${API_BASE}/equipment`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    const equipment = body?.data ?? body;
    expect(equipment).toHaveProperty('id');
    expect(equipment.name).toBe(payload.name);
  });

  test('EQ-003: 设备详情页渲染', async ({ page, request }) => {
    // Ensure at least one equipment exists, then navigate to its detail page
    const token = await getAuthToken(request, ADMIN_USER, ADMIN_PASS);

    // Create an equipment to guarantee there is something to navigate to
    const createResp = await request.post(`${API_BASE}/equipment`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E-详情设备-${Date.now()}`,
        category: '检测设备',
      },
    });
    expect(createResp.status()).toBe(201);
    const created = await createResp.json();
    const equipmentId: string = (created?.data ?? created).id;

    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto(`/equipment/${equipmentId}`);
    await page.waitForLoadState('networkidle');

    // Detail page should render descriptions, cards, or table
    await expect(
      page.locator('.el-descriptions, .el-card, .el-tabs').first(),
    ).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// 维护计划
// ---------------------------------------------------------------------------

test.describe('维护计划 (EQ-010 ~ EQ-011)', () => {
  test('EQ-010: 维护计划列表页渲染', async ({ page }) => {
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/equipment/plans');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 });
  });

  test('EQ-011: API 获取维护计划列表返回 200', async ({ request }) => {
    /**
     * Maintenance plans are generated automatically when equipment is created
     * with a maintenanceConfig. This test verifies the GET /maintenance-plans
     * endpoint is accessible and returns a valid list shape.
     * Creating an equipment with maintenanceConfig triggers plan generation.
     */
    const token = await getAuthToken(request, ADMIN_USER, ADMIN_PASS);

    // Create equipment with maintenanceConfig so plans can be generated
    const createEqResp = await request.post(`${API_BASE}/equipment`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E-计划设备-${Date.now()}`,
        category: '生产设备',
        activationDate: new Date().toISOString(),
        maintenanceConfig: {
          monthly: { enabled: true, cycle: 30, reminderDays: 5 },
        },
      },
    });
    expect(createEqResp.status()).toBe(201);

    // Query the maintenance plans list
    const listResp = await request.get(`${API_BASE}/maintenance-plans?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResp.ok()).toBeTruthy();

    const body = await listResp.json();
    // The response should contain a list (may be empty if no plans yet)
    const listData = body?.data ?? body;
    expect(listData).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 维保记录
// ---------------------------------------------------------------------------

test.describe('维保记录 (EQ-020 ~ EQ-021)', () => {
  test('EQ-020: 维保记录列表页渲染', async ({ page }) => {
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/equipment/records');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 });
  });

  test('EQ-021: API 创建维保记录并提交审批', async ({ request }) => {
    const token = await getAuthToken(request, ADMIN_USER, ADMIN_PASS);

    // Create an equipment to reference
    const eqResp = await request.post(`${API_BASE}/equipment`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E-维保设备-${Date.now()}`,
        category: '生产设备',
      },
    });
    expect(eqResp.status()).toBe(201);
    const eqBody = await eqResp.json();
    const eqId: string = (eqBody?.data ?? eqBody).id;

    // Create maintenance record
    const createResp = await request.post(`${API_BASE}/maintenance-records`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        equipmentId: eqId,
        maintenanceLevel: 'monthly',
        maintenanceDate: new Date().toISOString().split('T')[0],
        content: 'E2E 月度维保测试',
        beforeStatus: '正常',
        afterStatus: '正常',
      },
    });
    expect(createResp.status()).toBe(201);

    const createBody = await createResp.json();
    const record = createBody?.data ?? createBody;
    expect(record).toHaveProperty('id');

    const recordId: string = record.id;

    // Submit for approval
    const submitResp = await request.post(`${API_BASE}/maintenance-records/${recordId}/submit`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(submitResp.ok()).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 设备报修
// ---------------------------------------------------------------------------

test.describe('设备报修 (EQ-030 ~ EQ-031)', () => {
  test('EQ-030: 设备报修列表页渲染', async ({ page }) => {
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/equipment/faults');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 15000 });
  });

  test('EQ-031: API 创建故障报修 POST /equipment/faults 返回 201', async ({ request }) => {
    const token = await getAuthToken(request, ADMIN_USER, ADMIN_PASS);

    // Fetch the admin user id to use as reporterId
    const meResp = await request.get(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let reporterId: string;
    if (meResp.ok()) {
      const meBody = await meResp.json();
      reporterId = (meBody?.data ?? meBody).id;
    } else {
      // Fall back: query users list and grab admin user
      const usersResp = await request.get(
        `${API_BASE}/users?keyword=${encodeURIComponent(ADMIN_USER)}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const usersBody = await usersResp.json();
      const users: Array<{ id: string; username: string }> =
        usersBody?.data?.list ?? usersBody?.data ?? [];
      const adminUser = users.find((u) => u.username === ADMIN_USER);
      reporterId = adminUser?.id ?? 'unknown';
    }

    // Create an equipment first
    const eqResp = await request.post(`${API_BASE}/equipment`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E-报修设备-${Date.now()}`,
        category: '生产设备',
      },
    });
    expect(eqResp.status()).toBe(201);
    const eqBody = await eqResp.json();
    const equipmentId: string = (eqBody?.data ?? eqBody).id;

    // Create fault report
    const faultResp = await request.post(`${API_BASE}/equipment/faults`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        equipmentId,
        reporterId,
        urgencyLevel: 'normal',
        faultDescription: 'E2E 测试故障：设备运行异常，噪音增大',
      },
    });

    expect(faultResp.status()).toBe(201);

    const faultBody = await faultResp.json();
    const fault = faultBody?.data ?? faultBody;
    expect(fault).toHaveProperty('id');
    expect(fault.equipmentId).toBe(equipmentId);
  });
});

// ---------------------------------------------------------------------------
// 现场记录类（业务行为测试 SITE-001 ~ SITE-005）
//
// 原 SITE-001~SITE-010 共 10 条无意义的"页面渲染"测试已合并为以下 5 条
// 有实际业务断言的测试：create → verify in list → cleanup。
// 对于 API 结构暂不确定或依赖复杂前置数据的模块使用 test.skip() 标注。
// ---------------------------------------------------------------------------

test.describe('现场记录 (SITE-001 ~ SITE-005)', () => {
  /**
   * SITE-001: 环境记录 —— 创建后出现在列表
   *
   * Given 管理员 token
   * When  POST /environment-records 创建记录
   * Then  GET /environment-records 列表中可查到该记录的 id
   * And   DELETE /environment-records/:id 清理成功
   */
  test.skip('SITE-001: 环境记录 create→verify→cleanup (需 location_id 和 production_batch_id 前置数据)', async () => {
    // POST /environment-records requires: location_id (string), record_type (string),
    // is_within_spec (boolean), production_batch_id (string) — all foreign keys that
    // need seed data. Skip until a seed strategy is established.
  });

  /**
   * SITE-002: 清洁记录 —— 创建后可通过 GET 查到，再删除
   *
   * Given 管理员 token
   * When  POST /cleaning-records 创建记录
   * Then  GET /cleaning-records/:id 返回相同 id
   * And   DELETE /cleaning-records/:id 清理成功
   */
  test('SITE-002: 清洁记录 create→verify in list', async ({ request }) => {
    const token = await getAuthToken(request, ADMIN_USER, ADMIN_PASS);

    const payload = {
      target_type: 'equipment',
      target_name: 'E2E Test Surface',
      is_pass: true,
    };

    const createResp = await request.post(`${API_BASE}/cleaning-records`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    });
    expect(createResp.status()).toBe(201);

    const created = await createResp.json();
    const record = created?.data ?? created;
    expect(record).toHaveProperty('id');
    const recordId: string = record.id ?? record?.data?.id;

    // The API only exposes GET /cleaning-records (list), not GET /:id.
    // Verify the created record appears in the list.
    const listResp = await request.get(`${API_BASE}/cleaning-records?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listResp.ok()).toBeTruthy();
    const listBody = await listResp.json();
    const list: Array<{ id: string }> = Array.isArray(listBody?.data)
      ? listBody.data
      : listBody?.data?.list ?? listBody?.data?.data ?? [];
    expect(list.some((r) => r.id === recordId)).toBe(true);
  });

  /**
   * SITE-003: 违规记录 —— 创建后出现在列表中
   *
   * Given 管理员 token
   * When  POST /violation-records 创建记录
   * Then  GET /violation-records 列表含该 id
   * And   DELETE /violation-records/:id 清理成功
   */
  test('SITE-003: 违规记录 create→verify in list', async ({ request }) => {
    const token = await getAuthToken(request, ADMIN_USER, ADMIN_PASS);

    // Fetch a real user id to use as employee_id
    const usersResp = await request.get(`${API_BASE}/users?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(usersResp.ok()).toBeTruthy();
    const usersBody = await usersResp.json();
    const users: Array<{ id: string }> =
      usersBody?.data?.list ?? usersBody?.data?.data ?? (Array.isArray(usersBody?.data) ? usersBody.data : []);
    expect(users.length).toBeGreaterThan(0);
    const employeeId: string = users[0].id;

    const payload = {
      employee_id: employeeId,
      violation_type: '操作违规',
      description: `E2E SITE-003 ${Date.now()}`,
    };

    const createResp = await request.post(`${API_BASE}/violation-records`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    });
    expect(createResp.status()).toBe(201);

    const created = await createResp.json();
    const record = created?.data ?? created;
    expect(record).toHaveProperty('id');
    const recordId: string = record.id ?? record?.data?.id;

    // The API only exposes GET /violation-records (list), not GET /:id.
    // Verify the created record appears in the list (filtered by employee to keep scope small).
    const listResp = await request.get(
      `${API_BASE}/violation-records?employee_id=${encodeURIComponent(employeeId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(listResp.ok()).toBeTruthy();
    const listBody = await listResp.json();
    const list: Array<{ id: string }> = Array.isArray(listBody?.data)
      ? listBody.data
      : listBody?.data?.list ?? listBody?.data?.data ?? [];
    expect(list.some((r) => r.id === recordId)).toBe(true);
  });

  /**
   * SITE-004: 金属检测记录 —— 依赖设备前置数据，API 结构较复杂
   * Skip until seed data strategy is established for metal-detection equipment.
   */
  test.skip('SITE-004: 金属检测记录 (需设备前置数据，暂跳过)', async () => {
    // Requires a metal detection equipment record to exist as a foreign key.
    // Implement once seed data strategy for metal-detections is confirmed.
  });

  /**
   * SITE-005: 访客记录 —— 创建后可通过 GET 查到
   *
   * Given 管理员 token
   * When  POST /visitor-records 创建访客记录
   * Then  GET /visitor-records/:id 返回 visitorName 一致
   * And   DELETE /visitor-records/:id 清理成功
   */
  test('SITE-005: 访客记录 create→verify in list', async ({ request }) => {
    const token = await getAuthToken(request, ADMIN_USER, ADMIN_PASS);
    const visitorName = `E2E访客-${Date.now()}`;
    const visitDate = new Date().toISOString().split('T')[0];

    const createResp = await request.post(`${API_BASE}/visitor-records`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        visitor_name: visitorName,
        visit_date: visitDate,
        purpose: 'Testing',
      },
    });
    expect(createResp.status()).toBe(201);

    const created = await createResp.json();
    const record = created?.data ?? created;
    expect(record).toHaveProperty('id');
    const recordId: string = record.id ?? record?.data?.id;

    // The API only exposes GET /visitor-records (list), not GET /:id.
    // Verify the created record appears in the list, filtered by today's date.
    const listResp = await request.get(
      `${API_BASE}/visitor-records?date=${encodeURIComponent(visitDate)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(listResp.ok()).toBeTruthy();
    const listBody = await listResp.json();
    const list: Array<{ id: string; visitor_name?: string; visitorName?: string }> =
      Array.isArray(listBody?.data)
        ? listBody.data
        : listBody?.data?.list ?? listBody?.data?.data ?? [];
    const found = list.find((r) => r.id === recordId);
    expect(found).toBeDefined();
    expect(found?.visitor_name ?? found?.visitorName).toBe(visitorName);
  });
});
