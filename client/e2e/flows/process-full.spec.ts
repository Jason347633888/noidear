import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { loginViaApiCached } from '../helpers/auth';
import { getCredentials } from '../fixtures/task-fixtures';
import {
  initProcessTestData,
  createProcessInstanceViaApi,
} from '../helpers/process-helper';

/**
 * T10: 研发流程 - 基本流程 E2E 测试
 *
 * Covers:
 * - Step1 提交后应跳转到 Step2 而非 Step3
 * - 暂存草稿后在列表中可见
 */

let token: string;
let templateId: string | null = null;

test.beforeAll(async ({ request }) => {
  const { adminUser, adminPass } = getCredentials();
  const data = await initProcessTestData(request, adminUser, adminPass);
  token = data.token;
  templateId = data.templateId;
});

async function gotoProcessDetail(page: Page, instanceId: string): Promise<void> {
  await page.goto(`/process/instances/${instanceId}`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.step-card')).toBeVisible({ timeout: 10000 });
}

async function fillStep1RequiredFields(page: Page): Promise<void> {
  const productNameItem = page.locator('.el-form-item').filter({ hasText: '开发产品名称' });
  await productNameItem.locator('input').first().fill('E2E测试产品');

  const radioBtn = page.locator('.el-radio').filter({ hasText: '戚风分蛋工艺' }).first();
  const isVisible = await radioBtn.isVisible().catch(() => false);
  if (isVisible) {
    await radioBtn.click();
  }
}

async function createAndLogin(
  page: Page,
  request: APIRequestContext,
  productName: string,
): Promise<string> {
  if (!templateId) throw new Error('ProcessTemplate not found — check seed-baseline.ts');
  const { adminUser, adminPass } = getCredentials();
  const instance = await createProcessInstanceViaApi(request, token, templateId, productName);
  await loginViaApiCached(page, adminUser, adminPass);
  return instance.id;
}

test.describe('研发流程 - 基本流程', () => {
  test('PF-01: Step1 提交后应跳转到 Step2 而非 Step3', async ({ page, request }) => {
    const productName = `E2E-PF01-${Date.now()}`;
    const instanceId = await createAndLogin(page, request, productName);
    await gotoProcessDetail(page, instanceId);

    // 确认当前显示 Step 1
    await expect(page.locator('.step-header span').first()).toContainText('Step 1', { timeout: 10000 });

    // 填写 Step1 必填项
    await fillStep1RequiredFields(page);

    // 提交
    const submitBtn = page.locator('.action-bar .el-button--primary').filter({ hasText: '提交' });
    await submitBtn.click();
    await page.waitForLoadState('networkidle');

    // 验证成功提示
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 10000 });

    // 验证跳转到 Step 2（而非 Step 3）
    await expect(page.locator('.step-header span').first()).toContainText('Step 2', { timeout: 10000 });
  });

  test('PF-02: 暂存草稿后在列表中可见', async ({ page, request }) => {
    const productName = `E2E-Draft-${Date.now()}`;
    const instanceId = await createAndLogin(page, request, productName);
    await gotoProcessDetail(page, instanceId);

    // 填写一个字段后暂存
    const textareaItem = page.locator('.el-form-item').filter({ hasText: '客户/风味需求' }).first();
    const textareaVisible = await textareaItem.isVisible().catch(() => false);
    if (textareaVisible) {
      await textareaItem.locator('textarea').fill('E2E草稿测试内容');
    }

    // 暂存草稿
    const saveDraftBtn = page.locator('.action-bar .el-button').filter({ hasText: '暂存草稿' });
    await saveDraftBtn.click();
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 10000 });

    // 返回列表验证可见
    await page.goto('/process');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.el-table__row').filter({ hasText: productName })).toBeVisible({ timeout: 10000 });
  });
});
