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
