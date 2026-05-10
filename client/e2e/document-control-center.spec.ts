import { test, expect } from '@playwright/test';
import { loginViaApiCached } from './helpers/auth';
import { getCredentials } from './fixtures/task-fixtures';

test.describe('Document Control Center (Phase 2+3)', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);
  });

  test('DC-01: System file library renders', async ({ page }) => {
    await page.goto('/documents/control/library');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty, .el-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('DC-02: Record form landing index renders', async ({ page }) => {
    await page.goto('/documents/control/record-form-index');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 10000 });
  });

  test('DC-03: Control workbench renders', async ({ page }) => {
    await page.goto('/documents/control/workbench');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-card, .el-table, .el-empty').first()).toBeVisible({ timeout: 10000 });
  });

  test('DC-04: Document health dashboard renders', async ({ page }) => {
    await page.goto('/documents/operations/health');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-card, .document-health-dashboard').first()).toBeVisible({ timeout: 10000 });
  });

  test('DC-05: Read confirmation center renders', async ({ page }) => {
    await page.goto('/documents/operations/read-confirmations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-input').first()).toBeVisible({ timeout: 10000 });
  });

  test('DC-06: Training need center renders', async ({ page }) => {
    await page.goto('/documents/operations/training-needs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 10000 });
  });

  test('DC-07: Audit coverage center renders', async ({ page }) => {
    await page.goto('/documents/operations/audit-coverage');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty, .el-date-picker').first()).toBeVisible({ timeout: 10000 });
  });

  test('DC-08: Impact analysis workbench renders', async ({ page }) => {
    await page.goto('/documents/operations/impact');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-select').first()).toBeVisible({ timeout: 10000 });
  });

  test('DC-09: Audit chain explorer renders', async ({ page }) => {
    await page.goto('/documents/operations/audit-chain');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.audit-chain-explorer, .el-card, select').first()).toBeVisible({ timeout: 10000 });
  });
});
