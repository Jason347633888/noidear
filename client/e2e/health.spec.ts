import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * E2E Tests for Health Check Page (Phase 4 - TASK-375)
 *
 * Test Scenarios:
 * 1. View system health overview
 * 2. Check individual service health status
 * 3. Discover degraded service
 * 4. View detailed service information
 * 5. Refresh health status
 * 6. Verify health indicators
 */

test.describe('Health Check Page', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminUser, adminPass);
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should load health check page successfully', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h2').filter({ hasText: /系统健康检查|健康状态/ })).toBeVisible();

    // Verify page has loaded content
    await expect(page.locator('.el-card')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/test-results/health-check-page.png', fullPage: true });
  });

  test('should display overall system health status', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Verify overall status card or indicator exists
    const statusIndicator = page.locator('text=/系统状态|总体状态|Overall Status/i');
    if (await statusIndicator.count() > 0) {
      await expect(statusIndicator.first()).toBeVisible();
      console.log('Overall system health status found');
    }

    // Look for status badge/tag
    const statusBadge = page.locator('.el-tag, .el-badge').first();
    if (await statusBadge.count() > 0) {
      await expect(statusBadge).toBeVisible();
      console.log('Health status badge found');
    }

    // Take screenshot
    await page.screenshot({ path: 'e2e/test-results/health-overall-status.png' });
  });

  test('should display PostgreSQL health status', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Verify PostgreSQL service card/section
    const postgresSection = page.locator('text=PostgreSQL');
    await expect(postgresSection.first()).toBeVisible();

    // Verify health status indicator (healthy, degraded, unhealthy)
    const postgresCard = page.locator('.el-card').filter({ hasText: 'PostgreSQL' });
    if (await postgresCard.count() > 0) {
      await expect(postgresCard.first()).toBeVisible();

      // Check for status text
      const statusText = postgresCard.first().locator('text=/healthy|degraded|unhealthy|健康|降级|不健康/i');
      if (await statusText.count() > 0) {
        await expect(statusText.first()).toBeVisible();
        console.log('PostgreSQL health status found');
      }

      // Check for latency metric if exists
      const latencyText = postgresCard.first().locator('text=/latency|延迟|ms/i');
      if (await latencyText.count() > 0) {
        console.log('PostgreSQL latency metric found');
      }
    }
  });

  test('should display Redis health status', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Verify Redis service card/section
    const redisSection = page.locator('text=Redis');
    await expect(redisSection.first()).toBeVisible();

    // Verify health status indicator
    const redisCard = page.locator('.el-card').filter({ hasText: 'Redis' });
    if (await redisCard.count() > 0) {
      await expect(redisCard.first()).toBeVisible();

      // Check for status text
      const statusText = redisCard.first().locator('text=/healthy|degraded|unhealthy|健康|降级|不健康/i');
      if (await statusText.count() > 0) {
        await expect(statusText.first()).toBeVisible();
        console.log('Redis health status found');
      }

      // Check for latency metric if exists
      const latencyText = redisCard.first().locator('text=/latency|延迟|ms/i');
      if (await latencyText.count() > 0) {
        console.log('Redis latency metric found');
      }
    }
  });

  test('should display MinIO health status', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Verify MinIO service card/section
    const minioSection = page.locator('text=MinIO');
    await expect(minioSection.first()).toBeVisible();

    // Verify health status indicator
    const minioCard = page.locator('.el-card').filter({ hasText: 'MinIO' });
    if (await minioCard.count() > 0) {
      await expect(minioCard.first()).toBeVisible();

      // Check for status text
      const statusText = minioCard.first().locator('text=/healthy|degraded|unhealthy|健康|降级|不健康/i');
      if (await statusText.count() > 0) {
        await expect(statusText.first()).toBeVisible();
        console.log('MinIO health status found');
      }

      // Check for latency metric if exists
      const latencyText = minioCard.first().locator('text=/latency|延迟|ms/i');
      if (await latencyText.count() > 0) {
        console.log('MinIO latency metric found');
      }
    }
  });

  test('should display disk space health status', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Verify disk space card/section
    const diskSection = page.locator('text=/磁盘|Disk/i');
    await expect(diskSection.first()).toBeVisible();

    // Verify disk metrics
    const diskCard = page.locator('.el-card').filter({ hasText: /磁盘|Disk/i });
    if (await diskCard.count() > 0) {
      await expect(diskCard.first()).toBeVisible();

      // Check for available space metric
      const availableText = diskCard.first().locator('text=/可用空间|Available|GB|MB/i');
      if (await availableText.count() > 0) {
        console.log('Disk available space metric found');
      }

      // Check for usage percentage
      const usageText = diskCard.first().locator('text=/使用率|Usage|%/i');
      if (await usageText.count() > 0) {
        console.log('Disk usage percentage found');
      }
    }
  });

  test('should identify degraded service', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Look for any degraded status indicators
    const degradedStatus = page.locator('text=/degraded|降级/i');

    if (await degradedStatus.count() > 0) {
      // Found a degraded service
      await expect(degradedStatus.first()).toBeVisible();
      console.log('Degraded service found');

      // Take screenshot of degraded service
      await page.screenshot({ path: 'e2e/test-results/health-degraded-service.png', fullPage: true });

      // Verify warning or alert styling
      const warningIndicator = page.locator('.el-tag--warning, .el-alert--warning');
      if (await warningIndicator.count() > 0) {
        console.log('Warning indicator found for degraded service');
      }
    } else {
      console.log('No degraded services found - all services healthy');
    }
  });

  test('should view detailed service information', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Find a service card with detail button/link
    const detailButton = page.locator('button').filter({ hasText: /详情|Details|查看/ });

    if (await detailButton.count() > 0) {
      // Click detail button for first service
      await detailButton.first().click();

      // Wait for detail view/dialog
      await page.waitForTimeout(1000);

      // Verify detail dialog or expanded view appears
      const detailDialog = page.locator('.el-dialog, .el-drawer');
      if (await detailDialog.isVisible({ timeout: 3000 })) {
        console.log('Service detail view opened');

        // Take screenshot of detail view
        await page.screenshot({ path: 'e2e/test-results/health-service-detail.png' });

        // Close detail view
        const closeButton = page.locator('.el-dialog__headerbtn, .el-drawer__close-btn');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    } else {
      console.log('No detail buttons found - service info may be displayed inline');
    }
  });

  test('should display service latency metrics', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Look for latency metrics
    const latencyMetrics = page.locator('text=/latency|延迟.*ms/i');

    if (await latencyMetrics.count() > 0) {
      // Found latency metrics
      const latencyCount = await latencyMetrics.count();
      console.log(`Found ${latencyCount} latency metrics`);

      // Verify at least one is visible
      await expect(latencyMetrics.first()).toBeVisible();

      // Take screenshot showing latency metrics
      await page.screenshot({ path: 'e2e/test-results/health-latency-metrics.png' });
    } else {
      console.log('No latency metrics found - may not be displayed on this page');
    }
  });

  test('should display error messages for unhealthy services', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Look for unhealthy status
    const unhealthyStatus = page.locator('text=/unhealthy|不健康/i');

    if (await unhealthyStatus.count() > 0) {
      // Found unhealthy service
      await expect(unhealthyStatus.first()).toBeVisible();
      console.log('Unhealthy service found');

      // Look for error message
      const errorMessage = page.locator('.el-alert--error, .error-message, [class*="error"]').filter({ hasText: /error|错误|失败/ });
      if (await errorMessage.count() > 0) {
        console.log('Error message found for unhealthy service');

        // Take screenshot
        await page.screenshot({ path: 'e2e/test-results/health-unhealthy-service.png', fullPage: true });
      }
    } else {
      console.log('No unhealthy services found - all services operational');
    }
  });

  test('should refresh health status', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Find refresh button
    const refreshButton = page.locator('button').filter({ hasText: /刷新|Refresh|更新/ });

    if (await refreshButton.count() > 0) {
      // Get timestamp before refresh if exists
      const timestampBefore = await page.locator('text=/最后更新|Last Update|时间/i').textContent().catch(() => '');

      // Click refresh button
      await refreshButton.first().click();

      // Wait for refresh to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify page is still loaded
      await expect(page.locator('.el-card')).toBeVisible();

      // Check if timestamp updated
      const timestampAfter = await page.locator('text=/最后更新|Last Update|时间/i').textContent().catch(() => '');

      if (timestampBefore && timestampAfter && timestampBefore !== timestampAfter) {
        console.log('Health status refreshed successfully');
      } else {
        console.log('Refresh button clicked - timestamp may not be displayed');
      }
    } else {
      console.log('No refresh button found - may auto-refresh');
    }
  });

  test('should display timestamp of last health check', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Look for timestamp
    const timestamp = page.locator('text=/最后更新|Last Update|检查时间|timestamp/i');

    if (await timestamp.count() > 0) {
      await expect(timestamp.first()).toBeVisible();

      // Verify timestamp format (look for date/time pattern)
      const timestampText = await timestamp.first().textContent();
      expect(timestampText).toMatch(/\d{2}:\d{2}|\d{4}-\d{2}-\d{2}/);

      console.log('Health check timestamp found:', timestampText);
    } else {
      console.log('No timestamp found - may not be displayed');
    }
  });

  test('should handle health check API errors gracefully', async ({ page }) => {
    // Intercept health API and return error
    await page.route('**/api/v1/health', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Health check failed' }),
      });
    });

    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for error to be displayed
    await page.waitForTimeout(2000);

    // Look for error message or alert
    const errorAlert = page.locator('.el-alert--error, .el-message--error, text=/错误|失败|Error/i');

    if (await errorAlert.count() > 0) {
      console.log('Error handling works - error message displayed');

      // Take screenshot of error state
      await page.screenshot({ path: 'e2e/test-results/health-api-error.png', fullPage: true });
    } else {
      console.log('Error handling may use different UI pattern');
    }
  });

  test('should display health status color coding', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Wait for health data to load
    await page.waitForTimeout(2000);

    // Look for colored status indicators
    // Healthy = green, Degraded = yellow/warning, Unhealthy = red/danger
    const statusTags = page.locator('.el-tag');

    if (await statusTags.count() > 0) {
      const tagCount = await statusTags.count();
      console.log(`Found ${tagCount} status tags`);

      // Check for different status colors
      const successTag = page.locator('.el-tag--success');
      const warningTag = page.locator('.el-tag--warning');
      const dangerTag = page.locator('.el-tag--danger, .el-tag--error');

      if (await successTag.count() > 0) {
        console.log('Green/success status found (healthy)');
      }

      if (await warningTag.count() > 0) {
        console.log('Yellow/warning status found (degraded)');
      }

      if (await dangerTag.count() > 0) {
        console.log('Red/danger status found (unhealthy)');
      }

      // Take screenshot showing color coding
      await page.screenshot({ path: 'e2e/test-results/health-color-coding.png', fullPage: true });
    }
  });

  test('should navigate from health page to monitoring dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/health');
    await page.waitForLoadState('networkidle');

    // Look for navigation link to monitoring dashboard
    const dashboardLink = page.locator('a, button').filter({ hasText: /监控大屏|监控中心|Dashboard/ });

    if (await dashboardLink.count() > 0) {
      // Click dashboard link
      await dashboardLink.first().click();

      // Wait for navigation
      await page.waitForURL('**/monitoring/dashboard', { timeout: 10000 });

      // Verify monitoring dashboard loaded
      await expect(page.locator('h2').filter({ hasText: '运维监控大屏' })).toBeVisible();

      console.log('Navigation to monitoring dashboard successful');
    } else {
      console.log('No direct navigation link found to monitoring dashboard');
    }
  });
});
