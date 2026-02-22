#!/bin/bash

# Create Page Objects
mkdir -p pages

# 1. TrainingProjectListPage
cat > pages/TrainingProjectListPage.ts << 'PAGEOF'
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
PAGEOF

# 2. ExamPage
cat > pages/ExamPage.ts << 'PAGEOF'
import { type Page, type Locator, expect } from '@playwright/test';

export class ExamPage {
  readonly page: Page;
  readonly startButton: Locator;
  readonly submitButton: Locator;
  readonly questionCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.startButton = page.locator('button').filter({ hasText: /开始考试/ });
    this.submitButton = page.locator('button').filter({ hasText: /提交答卷/ });
    this.questionCards = page.locator('.question-card');
  }

  async goto(projectId: string) {
    await this.page.goto(`/training/exam/${projectId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async startExam() {
    await this.startButton.click();
    await this.page.waitForTimeout(1000);
  }

  async answerQuestion(index: number, answer: string) {
    const card = this.questionCards.nth(index);
    await card.locator(`label`).filter({ hasText: answer }).click();
  }

  async submitExam() {
    await this.submitButton.click();
  }

  async expectExamResult(passed: boolean) {
    if (passed) {
      await expect(this.page.locator('text=恭喜您通过考试')).toBeVisible();
    } else {
      await expect(this.page.locator('text=很遗憾，未通过考试')).toBeVisible();
    }
  }

  async expectScore(score: number) {
    await expect(this.page.locator(`text=${score} 分`)).toBeVisible();
  }

  async clickRetry() {
    await this.page.locator('button').filter({ hasText: /重新考试/ }).click();
  }
}
PAGEOF

# 3. TodoListPage
cat > pages/TodoListPage.ts << 'PAGEOF'
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
PAGEOF

echo "✅ Created Page Objects"
