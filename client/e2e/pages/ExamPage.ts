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

  async waitForStartButton() {
    await this.startButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async startExam() {
    await this.startButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.startButton.click();
  }

  async waitForQuestions() {
    // Wait for at least one question card to appear after the API returns
    await this.questionCards.first().waitFor({ state: 'visible', timeout: 15000 });
  }

  async answerQuestion(index: number, answer: string) {
    const card = this.questionCards.nth(index);
    await card.waitFor({ state: 'visible', timeout: 5000 });
    await card.locator('label').filter({ hasText: answer }).click();
  }

  async submitExam() {
    await this.submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.submitButton.click();
    // Handle confirmation dialog
    const confirmBtn = this.page.locator('.el-message-box').locator('button').filter({ hasText: /确定提交/ });
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click();
  }

  async expectExamResult(passed: boolean) {
    if (passed) {
      await expect(this.page.locator('text=恭喜您通过考试')).toBeVisible({ timeout: 10000 });
    } else {
      await expect(this.page.locator('text=很遗憾，未通过考试')).toBeVisible({ timeout: 10000 });
    }
  }

  async expectScore(score: number) {
    await expect(this.page.locator(`text=${score} 分`)).toBeVisible({ timeout: 5000 });
  }

  async clickRetry() {
    await this.page.locator('button').filter({ hasText: /重新考试/ }).click();
  }
}
