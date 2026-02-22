import { type Page, type Locator, expect } from '@playwright/test';

export class ApprovalDetailPage {
  readonly page: Page;
  readonly title: Locator;
  readonly statusBadge: Locator;
  readonly approveBtn: Locator;
  readonly rejectBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('.page-title');
    this.statusBadge = page.locator('.status-badge');
    this.approveBtn = page.locator('.action-section .el-button--success');
    this.rejectBtn = page.locator('.action-section .el-button--danger');
  }

  async goto(approvalId: string) {
    await this.page.goto(`/approvals/detail/${approvalId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForLoaded() {
    await expect(this.title).toBeVisible({ timeout: 10000 });
  }

  async getStatus(): Promise<string> {
    return (await this.statusBadge.textContent()) || '';
  }

  async hasApprovalActions(): Promise<boolean> {
    return this.approveBtn.isVisible();
  }

  async clickApprove() {
    await this.approveBtn.click();
  }

  async clickReject() {
    await this.rejectBtn.click();
  }

  async fillApproveComment(text: string) {
    await this.page.locator('.el-dialog textarea').first().fill(text);
  }

  async confirmApprove() {
    await this.page.locator('.el-dialog .el-button--success').click();
  }

  async fillRejectReason(text: string) {
    const dialog = this.page.locator('.el-dialog').filter({ hasText: '驳回' });
    await dialog.locator('textarea').fill(text);
  }

  async confirmReject() {
    const dialog = this.page.locator('.el-dialog').filter({ hasText: '驳回' });
    await dialog.locator('.el-button--danger').click();
  }

  async expectSuccessMessage() {
    await expect(this.page.locator('.el-message--success')).toBeVisible({ timeout: 5000 });
  }

  async hasDocumentInfo(): Promise<boolean> {
    return this.page.locator('.card-title').filter({ hasText: '文档信息' }).isVisible();
  }

  async hasTaskRecordInfo(): Promise<boolean> {
    return this.page.locator('.card-title').filter({ hasText: '任务记录信息' }).isVisible();
  }
}
