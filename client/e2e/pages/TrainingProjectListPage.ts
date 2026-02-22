import { type Page, type Locator, expect } from '@playwright/test';

export class TrainingProjectListPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly projectTable: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('button').filter({ hasText: /创建.*项目/ });
    this.projectTable = page.locator('.el-table');
    this.searchInput = page.locator('input[placeholder*="搜索"]');
  }

  async goto() {
    await this.page.goto('/training/projects');
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreate() {
    await this.createButton.click();
  }

  async searchProject(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.keyboard.press('Enter');
  }

  async clickProjectByName(name: string) {
    await this.page.locator('.el-table__row').filter({ hasText: name }).click();
  }

  async expectProjectVisible(name: string) {
    await expect(this.page.locator('.el-table__row').filter({ hasText: name })).toBeVisible();
  }
}
