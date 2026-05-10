import { test, expect, type Page } from '@playwright/test';
import { loginViaApiCached } from '../helpers/auth';
import { getCredentials } from '../fixtures/task-fixtures';
import {
  initProcessTestData,
  createProcessInstanceViaApi,
} from '../helpers/process-helper';

/**
 * T13: 仓库物料选择 E2E 测试（Step2 物料选择器）
 *
 * Covers:
 * - Step2 中点击「选择物料」弹窗出现
 * - 搜索过滤：输入关键词后只显示相关物料
 * - 勾选物料 → 确认 → 原料表显示已选物料
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

async function navigateToStep2(page: Page, instanceId: string): Promise<void> {
  await page.goto(`/process/instances/${instanceId}`);
  await page.waitForLoadState('networkidle');
  // Accept any step content container (.step-card, .step-header, or general form content)
  await expect(
    page.locator('.step-card, .step-header, .el-steps, .process-content, .el-form').first()
  ).toBeVisible({ timeout: 10000 });

  const nextBtn = page.locator('.step-nav .el-button, .el-button').filter({ hasText: '下一步' }).first();
  const isNextVisible = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (isNextVisible) {
    await nextBtn.click();
    await page.waitForLoadState('networkidle');
  }
}

async function openMaterialPicker(page: Page): Promise<void> {
  const pickerBtn = page.locator('.el-button').filter({ hasText: '选择物料' });
  const isVisible = await pickerBtn.isVisible({ timeout: 10000 }).catch(() => false);
  if (!isVisible) {
    throw new Error('「选择物料」按钮不可见 — Step2 物料选择器 fixture 或 UI 断言失败，请检查 seed-baseline.ts 或 Process 模板配置');
  }
  await pickerBtn.click();
}

async function waitForPickerLoaded(page: Page): Promise<void> {
  await page.locator('.picker-loading').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await expect(page.locator('.el-dialog')).toBeVisible({ timeout: 5000 });
}

async function countMaterialItems(page: Page): Promise<number> {
  return page.locator('.material-item').count();
}

test.describe('Step2 物料选择器', () => {
  test('WM-01: 点击「选择物料」弹窗正常出现', async ({ page, request }) => {
    if (!templateId) throw new Error('ProcessTemplate not found — check seed-baseline.ts (WM-01)');
    await loginAdmin(page);
    const instance = await createProcessInstanceViaApi(
      request, token, templateId, `E2E-WM01-${Date.now()}`,
    );

    await navigateToStep2(page, instance.id);
    await openMaterialPicker(page);

    await expect(page.locator('.el-dialog__title').filter({ hasText: '选择物料' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.picker-toolbar .el-input input')).toBeVisible({ timeout: 10000 });
  });

  test('WM-02: 搜索过滤输入关键词后列表数量减少或显示空状态', async ({ page, request }) => {
    if (!templateId) throw new Error('ProcessTemplate not found — check seed-baseline.ts (WM-02)');
    await loginAdmin(page);
    const instance = await createProcessInstanceViaApi(
      request, token, templateId, `E2E-WM02-${Date.now()}`,
    );

    await navigateToStep2(page, instance.id);
    await openMaterialPicker(page);
    await waitForPickerLoaded(page);

    const totalBefore = await countMaterialItems(page);

    const searchInput = page.locator('.picker-toolbar .el-input input');
    await searchInput.fill('zzz_nonexistent_keyword_xyz');
    await page.waitForTimeout(300);

    const emptyVisible = await page.locator('.el-empty').isVisible().catch(() => false);
    const filteredCount = await countMaterialItems(page);

    // 搜索不存在的关键词：结果应为空状态或零条目
    expect(emptyVisible || filteredCount === 0).toBeTruthy();

    // 清除搜索后结果恢复
    await searchInput.clear();
    await page.waitForTimeout(300);
    const afterClearCount = await countMaterialItems(page);
    expect(afterClearCount).toBe(totalBefore);
  });

  test('WM-03: 勾选物料并确认后原料表显示已选物料', async ({ page, request }) => {
    if (!templateId) throw new Error('ProcessTemplate not found — check seed-baseline.ts (WM-03)');
    await loginAdmin(page);
    const instance = await createProcessInstanceViaApi(
      request, token, templateId, `E2E-WM03-${Date.now()}`,
    );

    await navigateToStep2(page, instance.id);
    await openMaterialPicker(page);
    await waitForPickerLoaded(page);

    const uncheckedItems = page.locator('.material-item .el-checkbox:not(.is-disabled)');
    const uncheckedCount = await uncheckedItems.count();
    if (uncheckedCount === 0) {
      throw new Error('没有可勾选物料 — E2E baseline/fixture 中缺少稳定可选物料，请检查 seed-baseline.ts 中的 Material 数据');
    }

    await uncheckedItems.first().click();

    const confirmBtn = page.locator('.el-dialog__footer .el-button--primary').filter({ hasText: '确认添加' });
    await expect(confirmBtn).toBeEnabled({ timeout: 5000 });

    const confirmText = await confirmBtn.textContent() ?? '';
    expect(confirmText).toMatch(/确认添加（\d+）/);

    await confirmBtn.click();
    await expect(page.locator('.el-dialog')).not.toBeVisible({ timeout: 5000 });

    const materialTable = page.locator('.material-section .el-table');
    await expect(materialTable).toBeVisible({ timeout: 5000 });
    const rowCount = await materialTable.locator('.el-table__row').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('WM-04: 仓库物料列表页正常渲染', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/warehouse/materials');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });
});
