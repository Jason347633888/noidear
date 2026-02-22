import { type Page, type Locator, expect } from '@playwright/test';

export class ApprovalPendingPage {
  readonly page: Page;
  readonly title: Locator;
  readonly table: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('.page-title');
    this.table = page.locator('.approval-table');
    this.emptyState = page.locator('.el-empty');
  }

  async goto() {
    await this.page.goto('/approvals/pending');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForLoaded() {
    await expect(this.title).toBeVisible({ timeout: 10000 });
  }

  async getRowCount(): Promise<number> {
    const rows = this.page.locator('.approval-table .el-table__body tr');
    return rows.count();
  }

  async clickApproveOnRow(index: number) {
    const btn = this.page.locator('.approve-btn').nth(index);
    await btn.click();
  }

  async clickRejectOnRow(index: number) {
    const btn = this.page.locator('.reject-btn').nth(index);
    await btn.click();
  }

  async clickViewOnRow(index: number) {
    const btns = this.page.locator('.action-btn').filter({ hasText: '详情' });
    await btns.nth(index).click();
  }

  async fillApproveComment(text: string) {
    await this.page.locator('.approve-dialog textarea').fill(text);
  }

  async confirmApprove() {
    await this.page.locator('.el-dialog').filter({ hasText: '确认通过' })
      .locator('.el-button--success').click();
  }

  async fillRejectReason(text: string) {
    await this.page.locator('.reject-dialog textarea').fill(text);
  }

  async confirmReject() {
    await this.page.locator('.el-dialog').filter({ hasText: '确认驳回' })
      .locator('.el-button--danger').click();
  }

  async expectSuccessMessage() {
    await expect(this.page.locator('.el-message--success')).toBeVisible({ timeout: 5000 });
  }
}
