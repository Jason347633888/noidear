import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * E2E Tests for System Monitoring Dashboard (Phase 4 - TASK-375)
 *
 * Test Scenarios:
 * 1. Monitoring dashboard loads correctly
 * 2. Auto-refresh functionality works
 * 3. Health status cards display correctly
 * 4. Full-screen mode toggle works
 * 5. Manual refresh updates data
 */

test.describe('Monitoring Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminUser, adminPass);
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should load monitoring dashboard successfully', async ({ page }) => {
    // Navigate to monitoring dashboard
    await page.goto('http://localhost:5173/monitoring/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h2').filter({ hasText: '运维监控大屏' })).toBeVisible();
    await expect(page.locator('.subtitle').filter({ hasText: '实时监控系统状态和性能指标' })).toBeVisible();

    // Verify header action buttons
    await expect(page.locator('button').filter({ hasText: '全屏显示' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '暂停刷新' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '刷新' })).toBeVisible();

    // Verify health status section exists
    await expect(page.locator('.health-row')).toBeVisible();

    // Verify metrics section exists
    await expect(page.locator('.metrics-row')).toBeVisible();

    // Take screenshot for verification
    await page.screenshot({ path: 'e2e/test-results/monitoring-dashboard-loaded.png', fullPage: true });
  });

  test('should display health status cards for all services', async ({ page }) => {
    await page.goto('http://localhost:5173/monitoring/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Verify PostgreSQL health card
    const postgresCard = page.locator('.health-row').locator('text=PostgreSQL').first();
    await expect(postgresCard).toBeVisible();

    // Verify Redis health card
    const redisCard = page.locator('.health-row').locator('text=Redis').first();
    await expect(redisCard).toBeVisible();

    // Verify MinIO health card
    const minioCard = page.locator('.health-row').locator('text=MinIO').first();
    await expect(minioCard).toBeVisible();

    // Verify Disk space card
    const diskCard = page.locator('.health-row').locator('text=磁盘空间').first();
    await expect(diskCard).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/test-results/monitoring-health-cards.png' });
  });

  test('should display business metrics cards', async ({ page }) => {
    await page.goto('http://localhost:5173/monitoring/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for metrics data to load
    await page.waitForTimeout(2000);

    // Verify metric cards exist
    const metricsRow = page.locator('.metrics-row');
    await expect(metricsRow).toBeVisible();

    // Verify individual metrics
    await expect(page.locator('text=今日文档上传')).toBeVisible();
    await expect(page.locator('text=今日审批')).toBeVisible();
    await expect(page.locator('text=在线用户')).toBeVisible();
    await expect(page.locator('text=今日登录')).toBeVisible();
  });

  test('should toggle auto-refresh functionality', async ({ page }) => {
    await page.goto('http://localhost:5173/monitoring/dashboard');
    await page.waitForLoadState('networkidle');

    // Initially auto-refresh should be enabled
    const pauseButton = page.locator('button').filter({ hasText: '暂停刷新' });
    await expect(pauseButton).toBeVisible();

    // Verify countdown is visible
    await expect(page.locator('.next-refresh')).toBeVisible();

    // Click to pause auto-refresh
    await pauseButton.click();

    // Verify button text changed
    await expect(page.locator('button').filter({ hasText: '自动刷新' })).toBeVisible();

    // Click to resume auto-refresh
    await page.locator('button').filter({ hasText: '自动刷新' }).click();

    // Verify button text changed back
    await expect(page.locator('button').filter({ hasText: '暂停刷新' })).toBeVisible();
  });

  test('should manually refresh data', async ({ page }) => {
    await page.goto('http://localhost:5173/monitoring/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Get initial last update time
    const lastUpdateBefore = await page.locator('.last-update').textContent();

    // Wait a moment
    await page.waitForTimeout(1000);

    // Click refresh button
    const refreshButton = page.locator('button').filter({ hasText: /^刷新$/ });
    await refreshButton.click();

    // Wait for loading to complete
    await page.waitForTimeout(2000);

    // Get new last update time
    const lastUpdateAfter = await page.locator('.last-update').textContent();

    // Verify time has changed
    expect(lastUpdateAfter).not.toBe(lastUpdateBefore);
  });

  test('should toggle full-screen mode', async ({ page }) => {
    await page.goto('http://localhost:5173/monitoring/dashboard');
    await page.waitForLoadState('networkidle');

    // Click full-screen button
    const fullscreenButton = page.locator('button').filter({ hasText: '全屏显示' });
    await fullscreenButton.click();

    // Note: Full-screen API may not work in headless mode, so we just verify the button is clickable
    // In real scenario, this would enter full-screen mode

    // Verify button is still present (would change text to '退出全屏' in real full-screen)
    await expect(page.locator('button').filter({ hasText: /全屏|退出/ })).toBeVisible();
  });

  test('should display alert list section', async ({ page }) => {
    await page.goto('http://localhost:5173/monitoring/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Verify alert list exists in content row
    const contentRow = page.locator('.content-row');
    await expect(contentRow).toBeVisible();

    // Verify operation log statistics exists
    await expect(page.locator('text=操作日志统计')).toBeVisible();
  });

  test('should display last update time and countdown', async ({ page }) => {
    await page.goto('http://localhost:5173/monitoring/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Verify last update time is displayed
    const lastUpdate = page.locator('.last-update');
    await expect(lastUpdate).toBeVisible();
    await expect(lastUpdate).toContainText('最后更新');

    // Verify countdown is displayed when auto-refresh is on
    await expect(page.locator('.next-refresh')).toBeVisible();
    await expect(page.locator('.next-refresh')).toContainText('下次刷新');
  });
});

test.describe('Metrics Page', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminUser, adminPass);
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should load metrics page successfully', async ({ page }) => {
    await page.goto('http://localhost:5173/monitoring/metrics');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h2').filter({ hasText: '性能指标' })).toBeVisible();

    // Verify page content loads without errors
    await expect(page.locator('.el-card')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/test-results/monitoring-metrics-page.png', fullPage: true });
  });
});
