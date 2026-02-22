import { type Page, type Locator, expect } from '@playwright/test';

export class TodoListPage {
  readonly page: Page;
  readonly todoCards: Locator;
  readonly filterSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.todoCards = page.locator('.todo-card');
    this.filterSelect = page.locator('.el-select');
  }

  async goto() {
    await this.page.goto('/todos');
    await this.page.waitForLoadState('networkidle');
  }

  async expectTodoVisible(title: string) {
    await expect(this.page.locator('.todo-card').filter({ hasText: title })).toBeVisible();
  }

  async clickTodo(title: string) {
    await this.page.locator('.todo-card').filter({ hasText: title }).click();
  }

  async filterByType(type: string) {
    await this.filterSelect.first().click();
    await this.page.locator(`.el-select-dropdown__item`).filter({ hasText: type }).click();
  }

  async expectTodoCount(count: number) {
    await expect(this.todoCards).toHaveCount(count);
  }
}
