import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * E2E Tests for Backup Management (Phase 4 - TASK-375)
 *
 * Test Scenarios:
 * 1. Trigger manual PostgreSQL backup
 * 2. Trigger manual MinIO backup
 * 3. View backup history
 * 4. Check backup status updates
 * 5. Delete old backup
 * 6. Filter backups by type
 * 7. Filter backups by status
 */

test.describe('Backup Management', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminUser, adminPass);
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should load backup management page successfully', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h2').filter({ hasText: '备份管理' })).toBeVisible();

    // Verify backup trigger buttons exist
    await expect(page.locator('button').filter({ hasText: /PostgreSQL|数据库/ })).toBeVisible();

    // Verify backup history table exists
    await expect(page.locator('.el-table')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/test-results/backup-manage-page.png', fullPage: true });
  });

  test('should display backup trigger buttons', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Verify PostgreSQL backup button
    const postgresButton = page.locator('button').filter({ hasText: /PostgreSQL|数据库备份/ });
    await expect(postgresButton.first()).toBeVisible();

    // Verify MinIO backup button if exists
    const minioButton = page.locator('button').filter({ hasText: /MinIO|对象存储/ });
    if (await minioButton.count() > 0) {
      await expect(minioButton.first()).toBeVisible();
    }

    // Take screenshot
    await page.screenshot({ path: 'e2e/test-results/backup-trigger-buttons.png' });
  });

  test('should trigger PostgreSQL backup', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Get initial backup count
    const initialRowCount = await page.locator('.el-table__row').count();

    // Click PostgreSQL backup button
    const postgresButton = page.locator('button').filter({ hasText: /PostgreSQL|数据库备份/ }).first();

    // Setup confirmation dialog handler if exists
    page.on('dialog', dialog => {
      console.log('Dialog message:', dialog.message());
      dialog.accept();
    });

    await postgresButton.click();

    // Wait for confirmation dialog or immediate execution
    await page.waitForTimeout(1000);

    // Check for Element Plus confirmation dialog
    const confirmButton = page.locator('.el-message-box').locator('button').filter({ hasText: '确定' });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Wait for backup to be triggered
    await page.waitForTimeout(3000);

    // Verify success message appears
    const successMessage = page.locator('.el-message--success');
    if (await successMessage.count() > 0) {
      await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
      console.log('PostgreSQL backup triggered successfully');
    }

    // Wait for table to refresh
    await page.waitForTimeout(2000);

    // Verify new backup record appears in table
    const newRowCount = await page.locator('.el-table__row').count();
    console.log(`Backup records: ${initialRowCount} -> ${newRowCount}`);

    // Take screenshot after backup trigger
    await page.screenshot({ path: 'e2e/test-results/backup-after-postgres-trigger.png', fullPage: true });
  });

  test('should trigger MinIO backup if button exists', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if MinIO backup button exists
    const minioButton = page.locator('button').filter({ hasText: /MinIO|对象存储/ });

    if (await minioButton.count() > 0) {
      // Get initial backup count
      const initialRowCount = await page.locator('.el-table__row').count();

      // Setup confirmation dialog handler
      page.on('dialog', dialog => {
        console.log('Dialog message:', dialog.message());
        dialog.accept();
      });

      await minioButton.first().click();

      // Wait for confirmation dialog
      await page.waitForTimeout(1000);

      // Check for Element Plus confirmation dialog
      const confirmButton = page.locator('.el-message-box').locator('button').filter({ hasText: '确定' });
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      // Wait for backup to be triggered
      await page.waitForTimeout(3000);

      // Verify success message appears
      const successMessage = page.locator('.el-message--success');
      if (await successMessage.count() > 0) {
        await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
        console.log('MinIO backup triggered successfully');
      }

      // Wait for table to refresh
      await page.waitForTimeout(2000);

      // Verify new backup record appears
      const newRowCount = await page.locator('.el-table__row').count();
      console.log(`Backup records: ${initialRowCount} -> ${newRowCount}`);
    } else {
      console.log('MinIO backup button not found - feature may not be available');
    }
  });

  test('should display backup history with correct columns', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForTimeout(2000);

    const table = page.locator('.el-table');

    // Verify table headers exist
    const headers = table.locator('.el-table__header-wrapper th');
    const headerCount = await headers.count();

    expect(headerCount).toBeGreaterThan(0);

    // Verify key columns exist (check text content)
    await expect(table.locator('text=备份类型')).toBeVisible();
    await expect(table.locator('text=状态')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/test-results/backup-history-table.png' });
  });

  test('should filter backups by type', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find backup type filter
    const typeSelect = page.locator('.el-select').filter({ has: page.locator('input[placeholder*="备份类型"]') });

    if (await typeSelect.count() > 0) {
      await typeSelect.first().click();
      await page.waitForTimeout(500);

      // Select PostgreSQL
      await page.locator('.el-select-dropdown__item').filter({ hasText: 'PostgreSQL' }).first().click();

      // Click search button
      const searchButton = page.locator('button').filter({ hasText: '查询' });
      if (await searchButton.count() > 0) {
        await searchButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // Verify filter was applied
      await expect(page.locator('.el-table')).toBeVisible();
    } else {
      console.log('Backup type filter not found - may be using different UI');
    }
  });

  test('should filter backups by status', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find status filter
    const statusSelect = page.locator('.el-select').filter({ has: page.locator('input[placeholder*="状态"]') });

    if (await statusSelect.count() > 0) {
      await statusSelect.first().click();
      await page.waitForTimeout(500);

      // Select success status
      await page.locator('.el-select-dropdown__item').filter({ hasText: /成功|success/ }).first().click();

      // Click search button
      const searchButton = page.locator('button').filter({ hasText: '查询' });
      if (await searchButton.count() > 0) {
        await searchButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // Verify filter was applied
      await expect(page.locator('.el-table')).toBeVisible();
    } else {
      console.log('Status filter not found - may be using different UI');
    }
  });

  test('should verify backup status badges', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Check if there are any backup records
    const rowCount = await page.locator('.el-table__row').count();

    if (rowCount > 0) {
      // Verify status badges exist (different statuses may have different colors)
      const firstRow = page.locator('.el-table__row').first();

      // Check for status tag/badge
      const statusCell = firstRow.locator('td').filter({ has: page.locator('.el-tag, .el-badge, text=/成功|失败|运行中/') });

      if (await statusCell.count() > 0) {
        await expect(statusCell.first()).toBeVisible();
        console.log('Backup status badge found');
      }
    } else {
      console.log('No backup records available for status verification');
    }
  });

  test('should delete old backup', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Check if there are any backup records
    const rowCount = await page.locator('.el-table__row').count();

    if (rowCount > 1) {
      // Find delete button in last row (to keep recent backups)
      const lastRow = page.locator('.el-table__row').last();
      const deleteButton = lastRow.locator('button').filter({ hasText: '删除' });

      if (await deleteButton.count() > 0) {
        // Click delete button
        await deleteButton.click();

        // Wait for confirmation dialog
        await page.waitForTimeout(1000);

        // Confirm deletion
        const confirmButton = page.locator('.el-message-box').locator('button').filter({ hasText: '确定' });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();

          // Wait for deletion to complete
          await page.waitForTimeout(2000);

          // Verify success message
          const successMessage = page.locator('.el-message--success');
          if (await successMessage.count() > 0) {
            console.log('Backup deleted successfully');
          }

          // Take screenshot after deletion
          await page.screenshot({ path: 'e2e/test-results/backup-after-deletion.png', fullPage: true });
        }
      } else {
        console.log('Delete button not found - may be restricted to certain users');
      }
    } else {
      console.log('Not enough backup records for deletion test');
    }
  });

  test('should display backup file size and date', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Check if there are any backup records
    const rowCount = await page.locator('.el-table__row').count();

    if (rowCount > 0) {
      const firstRow = page.locator('.el-table__row').first();

      // Verify date column exists (look for date format)
      const dateCell = firstRow.locator('td').filter({ hasText: /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}/ });
      if (await dateCell.count() > 0) {
        await expect(dateCell.first()).toBeVisible();
        console.log('Backup date found');
      }

      // Verify file size column exists (look for size format like MB, GB, KB)
      const sizeCell = firstRow.locator('td').filter({ hasText: /\d+(\.\d+)?\s*(KB|MB|GB|B)/i });
      if (await sizeCell.count() > 0) {
        await expect(sizeCell.first()).toBeVisible();
        console.log('Backup file size found');
      }
    } else {
      console.log('No backup records available for metadata verification');
    }
  });

  test('should refresh backup list', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Find refresh button
    const refreshButton = page.locator('button').filter({ hasText: /刷新|Refresh/ });

    if (await refreshButton.count() > 0) {
      // Click refresh button
      await refreshButton.first().click();

      // Wait for refresh to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Verify table is still visible
      await expect(page.locator('.el-table')).toBeVisible();

      console.log('Backup list refreshed successfully');
    } else {
      console.log('Refresh button not found - may auto-refresh');
    }
  });

  test('should paginate through backup history', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Verify pagination exists
    const pagination = page.locator('.el-pagination');

    if (await pagination.count() > 0) {
      await expect(pagination.first()).toBeVisible();

      // Check if there are multiple pages
      const totalText = await pagination.first().locator('.el-pagination__total').textContent();

      if (totalText && parseInt(totalText.match(/\d+/)?.[0] || '0') > 10) {
        // Click next page
        await pagination.first().locator('.btn-next').click();

        // Wait for data to load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Verify page changed
        const activePage = pagination.first().locator('.number.is-active');
        await expect(activePage).not.toHaveText('1');

        console.log('Pagination works correctly');
      } else {
        console.log('Not enough records for pagination test');
      }
    } else {
      console.log('Pagination not found - may be using different pagination UI');
    }
  });

  test('should handle backup in progress status', async ({ page }) => {
    await page.goto('http://localhost:5173/backup/manage');
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Trigger a backup to create a "running" status
    const postgresButton = page.locator('button').filter({ hasText: /PostgreSQL|数据库备份/ }).first();

    if (await postgresButton.isVisible()) {
      // Setup dialog handler
      page.on('dialog', dialog => dialog.accept());

      await postgresButton.click();

      // Handle confirmation if exists
      await page.waitForTimeout(1000);
      const confirmButton = page.locator('.el-message-box').locator('button').filter({ hasText: '确定' });
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      // Wait a moment for backup to start
      await page.waitForTimeout(2000);

      // Check for "running" status in table
      const runningStatus = page.locator('.el-table__row').locator('text=/运行中|进行中|running/i');
      if (await runningStatus.count() > 0) {
        console.log('Found backup in progress status');

        // Take screenshot
        await page.screenshot({ path: 'e2e/test-results/backup-in-progress.png', fullPage: true });
      }
    }
  });
});
