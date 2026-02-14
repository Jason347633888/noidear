import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Task Detail page (/tasks/:id).
 *
 * Encapsulates selectors and actions for viewing task details,
 * filling form data, saving drafts, submitting, approving,
 * and verifying lock states.
 */
export class TaskDetailPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly lockTag: Locator;
  readonly taskInfoCard: Locator;
  readonly formCard: Locator;
  readonly recordsCard: Locator;
  readonly saveDraftButton: Locator;
  readonly submitButton: Locator;
  readonly cancelTaskButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingMask: Locator;
  readonly statusTag: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('.page-title');
    this.lockTag = page.locator('.el-tag').filter({ hasText: '已锁定' });
    this.taskInfoCard = page.locator('.info-card');
    this.formCard = page.locator('.form-card');
    this.recordsCard = page.locator('.records-card');
    this.saveDraftButton = page.locator('.el-button').filter({ hasText: '保存草稿' });
    this.submitButton = page.locator('.actions .el-button--primary').filter({ hasText: '提交' });
    this.cancelTaskButton = page.locator('.task-actions .el-button--danger').filter({ hasText: '取消任务' });
    this.successMessage = page.locator('.el-message--success');
    this.errorMessage = page.locator('.el-message--error');
    this.loadingMask = page.locator('.el-loading-mask');
    this.statusTag = page.locator('.el-descriptions').locator('.el-tag').first();
  }

  async goto(taskId: string) {
    await this.page.goto(`/tasks/${taskId}`);
    await this.waitForLoaded();
  }

  async waitForLoaded() {
    await this.loadingMask.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
      // Loading may already be done
    });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the current task status text from the info card.
   */
  async getStatusText(): Promise<string> {
    return (await this.statusTag.textContent()) ?? '';
  }

  /**
   * Fill a text input field within the FormBuilder by its label.
   */
  async fillTextField(label: string, value: string) {
    const formItem = this.formCard.locator('.el-form-item').filter({ hasText: label });
    const input = formItem.locator('input[type="text"], input:not([type])').first();
    await input.fill(value);
  }

  /**
   * Fill a textarea field within the FormBuilder by its label.
   */
  async fillTextarea(label: string, value: string) {
    const formItem = this.formCard.locator('.el-form-item').filter({ hasText: label });
    const textarea = formItem.locator('textarea');
    await textarea.fill(value);
  }

  /**
   * Fill a number input field within the FormBuilder by its label.
   */
  async fillNumberField(label: string, value: number) {
    const formItem = this.formCard.locator('.el-form-item').filter({ hasText: label });
    const input = formItem.locator('.el-input-number input');
    await input.fill(String(value));
  }

  /**
   * Get all visible form inputs in the form card.
   */
  getFormInputs(): Locator {
    return this.formCard.locator('.el-form-item .el-input input, .el-form-item textarea, .el-form-item .el-input-number input');
  }

  /**
   * Fill the first N text inputs with dummy data.
   */
  async fillFormWithDummyData(prefix: string = 'E2E-Test') {
    const inputs = this.formCard.locator('.el-form-item');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const formItem = inputs.nth(i);
      const textInput = formItem.locator('input[type="text"], input:not([type]):not(.el-input-number__decrease):not(.el-input-number__increase)').first();
      const textarea = formItem.locator('textarea');
      const numberInput = formItem.locator('.el-input-number input');

      if (await textInput.isVisible().catch(() => false)) {
        await textInput.fill(`${prefix}-${i}`);
      } else if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill(`${prefix}-textarea-${i}`);
      } else if (await numberInput.isVisible().catch(() => false)) {
        await numberInput.fill(String(100 + i));
      }
    }
  }

  async clickSaveDraft() {
    await this.saveDraftButton.click();
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async clickCancelTask() {
    await this.cancelTaskButton.click();
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
   * Click "Approve" button on the first submitted record row.
   */
  async approveFirstRecord() {
    const approveBtn = this.recordsCard
      .locator('.el-table__row')
      .filter({ hasText: '待审批' })
      .locator('.el-button')
      .filter({ hasText: '通过' })
      .first();
    await approveBtn.click();
  }

  /**
   * Click "Reject" button on the first submitted record row.
   */
  async rejectFirstRecord() {
    const rejectBtn = this.recordsCard
      .locator('.el-table__row')
      .filter({ hasText: '待审批' })
      .locator('.el-button')
      .filter({ hasText: '驳回' })
      .first();
    await rejectBtn.click();
  }

  async expectSuccessMessage() {
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
  }

  async expectLocked() {
    await expect(this.lockTag).toBeVisible({ timeout: 10000 });
  }

  async expectNotLocked() {
    await expect(this.lockTag).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify all form fields are disabled (read-only).
   */
  async expectFormDisabled() {
    const inputs = this.formCard.locator('.el-input.is-disabled, .el-input-number.is-disabled, .el-select.is-disabled, .el-textarea.is-disabled');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * Verify the "Save Draft" button is NOT visible.
   */
  async expectNoDraftButton() {
    await expect(this.saveDraftButton).not.toBeVisible();
  }

  /**
   * Verify the "Submit" button is NOT visible.
   */
  async expectNoSubmitButton() {
    await expect(this.submitButton).not.toBeVisible();
  }

  /**
   * Check if the records table has a record with the given status.
   */
  async hasRecordWithStatus(statusText: string): Promise<boolean> {
    const row = this.recordsCard.locator('.el-table__row').filter({ hasText: statusText });
    return (await row.count()) > 0;
  }
}
