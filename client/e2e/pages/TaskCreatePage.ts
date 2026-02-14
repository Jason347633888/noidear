import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Task Create page (/tasks/create).
 *
 * Encapsulates selectors and actions for creating a new task
 * with template selection, department selection, and deadline.
 */
export class TaskCreatePage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly templateSelect: Locator;
  readonly departmentSelect: Locator;
  readonly deadlinePicker: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('.page-title');
    // Form items by label text
    this.templateSelect = page.locator('.el-form-item').filter({ hasText: '选择模板' }).locator('.el-select');
    this.departmentSelect = page.locator('.el-form-item').filter({ hasText: '执行部门' }).locator('.el-select');
    this.deadlinePicker = page.locator('.el-form-item').filter({ hasText: '截止日期' }).locator('.el-date-editor');
    this.submitButton = page.locator('.el-button--primary').filter({ hasText: '创建' });
    this.cancelButton = page.locator('.el-button').filter({ hasText: '取消' });
    this.successMessage = page.locator('.el-message--success');
  }

  async goto() {
    await this.page.goto('/tasks/create');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select the first available template from the dropdown.
   */
  async selectFirstTemplate() {
    await this.templateSelect.click();
    // Wait for dropdown options to appear
    const option = this.page.locator('.el-select-dropdown__item').first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
  }

  /**
   * Select a template option by matching visible text.
   */
  async selectTemplateByText(text: string) {
    await this.templateSelect.click();
    const option = this.page.locator('.el-select-dropdown__item').filter({ hasText: text });
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
  }

  /**
   * Select the first available department from the dropdown.
   */
  async selectFirstDepartment() {
    await this.departmentSelect.click();
    const option = this.page.locator('.el-select-dropdown__item').first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
  }

  /**
   * Select a department option by matching visible text.
   */
  async selectDepartmentByText(text: string) {
    await this.departmentSelect.click();
    const option = this.page.locator('.el-select-dropdown__item').filter({ hasText: text });
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
  }

  /**
   * Set a deadline date. Picks a date 7 days from now by clicking
   * on the date picker and selecting a future date cell.
   */
  async setDeadlineToFuture() {
    await this.deadlinePicker.click();
    // Wait for the date picker panel to appear
    const panel = this.page.locator('.el-date-picker');
    await panel.waitFor({ state: 'visible', timeout: 5000 });

    // Click the "next month" arrow to ensure we pick a future date
    const nextMonthBtn = this.page.locator('.el-date-picker__header .el-icon-arrow-right, .el-picker-panel__icon-btn.arrow-right').first();
    if (await nextMonthBtn.isVisible()) {
      await nextMonthBtn.click();
      await this.page.waitForTimeout(300);
    }

    // Select the 15th day (a safe mid-month date)
    const dayCell = this.page.locator('.el-date-table td.available').filter({ hasText: /^15$/ }).first();
    if (await dayCell.isVisible()) {
      await dayCell.click();
    } else {
      // Fallback: select any available future date
      const anyDay = this.page.locator('.el-date-table td.available:not(.disabled)').nth(20);
      await anyDay.click();
    }
  }

  /**
   * Fill the deadline input directly with a date string.
   */
  async setDeadlineValue(dateStr: string) {
    const input = this.deadlinePicker.locator('input');
    await input.click();
    await input.fill(dateStr);
    // Press Enter to confirm
    await input.press('Enter');
    await this.page.waitForTimeout(300);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async submitAndWaitForRedirect() {
    await this.submitButton.click();
    await this.page.waitForURL('**/tasks', { timeout: 15000 });
  }

  async expectCreateSuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
  }
}
