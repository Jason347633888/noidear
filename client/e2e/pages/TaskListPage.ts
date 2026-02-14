import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Task List page (/tasks).
 *
 * Encapsulates selectors and actions for task list browsing,
 * filtering, navigation, and task cancellation.
 */
export class TaskListPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly createButton: Locator;
  readonly taskTable: Locator;
  readonly taskRows: Locator;
  readonly loadingOverlay: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('.page-title');
    this.createButton = page.locator('.create-btn');
    this.taskTable = page.locator('.el-table');
    this.taskRows = page.locator('.el-table__body-wrapper .el-table__row');
    this.loadingOverlay = page.locator('.el-loading-mask');
    this.pagination = page.locator('.el-pagination');
  }

  async goto() {
    await this.page.goto('/tasks');
    await this.waitForTableLoaded();
  }

  async waitForTableLoaded() {
    // Wait until loading overlay disappears
    await this.loadingOverlay.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
      // Loading may already be hidden
    });
    await this.page.waitForLoadState('networkidle');
  }

  async getRowCount(): Promise<number> {
    return this.taskRows.count();
  }

  async clickCreateTask() {
    await this.createButton.click();
    await this.page.waitForURL('**/tasks/create');
  }

  /**
   * Find a task row by matching visible text content.
   */
  getRowByText(text: string): Locator {
    return this.taskRows.filter({ hasText: text });
  }

  /**
   * Click the "View" action button on a specific row.
   */
  async clickViewOnRow(row: Locator) {
    await row.locator('.action-btn').filter({ hasText: '查看' }).click();
  }

  /**
   * Click the "Fill / Report" action button on a specific row.
   */
  async clickFillOnRow(row: Locator) {
    await row.locator('.action-btn').filter({ hasText: '立即填报' }).click();
  }

  /**
   * Click the "Cancel" action button on a specific row.
   */
  async clickCancelOnRow(row: Locator) {
    await row.locator('.action-btn').filter({ hasText: '取消' }).click();
  }

  /**
   * Switch to a specific tab by name.
   */
  async switchTab(tabName: string) {
    await this.page.locator('.el-tabs__item').filter({ hasText: tabName }).click();
    await this.waitForTableLoaded();
  }

  /**
   * Confirm an Element Plus MessageBox dialog.
   */
  async confirmDialog() {
    const confirmBtn = this.page.locator('.el-message-box__btns .el-button--primary');
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click();
  }

  /**
   * Get the status tag text for the first matching row.
   */
  async getRowStatus(row: Locator): Promise<string> {
    const statusTag = row.locator('.status-tag');
    return (await statusTag.textContent()) ?? '';
  }

  /**
   * Get the first visible task row.
   */
  firstRow(): Locator {
    return this.taskRows.first();
  }
}
