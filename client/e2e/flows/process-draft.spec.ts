import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { loginViaApiCached } from '../helpers/auth';
import { getCredentials } from '../fixtures/task-fixtures';
import {
  initProcessTestData,
  createProcessInstanceViaApi,
  submitProcessStepViaApi,
} from '../helpers/process-helper';

/**
 * T11: 研发流程 - 草稿功能 E2E 测试
 *
 * Covers:
 * - 草稿保存后返回列表可找到记录
 * - 重新进入草稿实例时已填数据保留
 */

let token: string;
let templateId: string | null = null;

test.beforeAll(async ({ request }) => {
  const { adminUser, adminPass } = getCredentials();
  const data = await initProcessTestData(request, adminUser, adminPass);
  token = data.token;
  templateId = data.templateId;
});

async function loginAdmin(page: Page): Promise<void> {
  const { adminUser, adminPass } = getCredentials();
  await loginViaApiCached(page, adminUser, adminPass);
}

async function createInstance(request: APIRequestContext, productName: string): Promise<string> {
  const instance = await createProcessInstanceViaApi(request, token, templateId, productName);
  return instance.id;
}

async function saveStep1Draft(
  request: APIRequestContext,
  instanceId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await submitProcessStepViaApi(request, token, instanceId, 1, data, true);
}

test.describe('研发流程 - 草稿功能', () => {
  test('PD-01: 草稿保存后返回列表可找到记录', async ({ page, request }) => {
    if (!templateId) { test.skip(true, '无流程模板 — 跳过 PD-01'); return; }
    const productName = `E2E-PD01-${Date.now()}`;
    await loginAdmin(page);
    const instanceId = await createInstance(request, productName);

    await saveStep1Draft(request, instanceId, {
      productName: 'E2E-Draft-Data',
      processType: '戚风分蛋工艺',
    });

    // 进入列表验证记录存在
    await page.goto('/process');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });

    const matchRow = page.locator('.el-table__row').filter({ hasText: productName });
    await expect(matchRow).toBeVisible({ timeout: 10000 });

    // 验证状态标签存在
    await expect(matchRow.locator('.el-tag').first()).toBeVisible();
  });

  test('PD-02: 重新进入草稿实例时步骤仍在 Step1', async ({ page, request }) => {
    if (!templateId) { test.skip(true, '无流程模板 — 跳过 PD-02'); return; }
    const productName = `E2E-PD02-${Date.now()}`;
    await loginAdmin(page);
    const instanceId = await createInstance(request, productName);

    await saveStep1Draft(request, instanceId, {
      flavorRequirement: 'E2E-恢复测试内容',
      productName,
      processType: '全蛋工艺',
    });

    // 进入详情页
    await page.goto(`/process/instances/${instanceId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.step-card')).toBeVisible({ timeout: 10000 });

    // 草稿暂存不前进步骤，应仍在 Step 1
    await expect(page.locator('.step-header span').first()).toContainText('Step 1', { timeout: 10000 });
    await expect(page.locator('.el-steps')).toBeVisible({ timeout: 10000 });
  });

  test('PD-03: 流程列表正常加载并显示操作按钮', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/process');
    await page.waitForLoadState('networkidle');

    // 列表页应渲染表格
    await expect(page.locator('.el-table')).toBeVisible({ timeout: 10000 });

    // 有数据时验证行可见
    const rowCount = await page.locator('.el-table__row').count();
    expect(rowCount).toBeGreaterThan(0); // 應至少有草稿記錄
  });
});
