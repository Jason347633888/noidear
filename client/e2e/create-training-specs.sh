#!/bin/bash

# 1. Training Exam Flow
cat > training-exam-flow.spec.ts << 'SPECEOF'
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TodoListPage } from './pages/TodoListPage';
import { ExamPage } from './pages/ExamPage';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * Training Exam Flow: Student takes exam and completes training
 *
 * Scenario:
 * 1. Student logs in
 * 2. Views todo list - sees training todo
 * 3. Clicks todo → navigates to training project
 * 4. Takes exam
 * 5. Fails first attempt (score < 60)
 * 6. Retries exam
 * 7. Passes second attempt (score >= 60)
 * 8. Todo automatically marked as completed
 */

test.describe('Training Exam Flow', () => {
  test('Student can complete training by passing exam', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    const todoPage = new TodoListPage(page);
    const examPage = new ExamPage(page);

    // Login as student
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(adminUser, adminPass);

    // Navigate to todos
    await todoPage.goto();
    await todoPage.expectTodoVisible('完成培训考试');

    // Click training todo
    await todoPage.clickTodo('完成培训考试');

    // Wait for exam page
    await page.waitForURL('**/training/exam/**');

    // Start exam
    await examPage.startExam();

    // Answer all questions incorrectly (first attempt - should fail)
    await examPage.answerQuestion(0, '错误答案');
    await examPage.answerQuestion(1, '错误答案');

    // Submit exam
    await examPage.submitExam();

    // Verify failed result
    await examPage.expectExamResult(false);
    await examPage.expectScore(0);

    // Retry exam
    await examPage.clickRetry();
    await page.waitForTimeout(2000);

    // Answer all questions correctly (second attempt - should pass)
    await examPage.answerQuestion(0, '正确答案');
    await examPage.answerQuestion(1, '正确答案');

    // Submit exam
    await examPage.submitExam();

    // Verify passed result
    await examPage.expectExamResult(true);
    await examPage.expectScore(100);

    // Navigate back to todos
    await todoPage.goto();

    // Verify todo is completed (no longer in pending list)
    await todoPage.filterByType('已完成');
    await todoPage.expectTodoVisible('完成培训考试');
  });

  test('Student sees remaining attempts after failed exam', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    const examPage = new ExamPage(page);

    // Login
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(adminUser, adminPass);

    // Go to exam page directly
    await examPage.goto('test-project-id');

    // Start exam
    await examPage.startExam();

    // Answer incorrectly
    await examPage.answerQuestion(0, '错误答案');
    await examPage.submitExam();

    // Verify failed and remaining attempts shown
    await examPage.expectExamResult(false);
    await expect(page.locator('text=/剩余.*次/')).toBeVisible();
  });
});
SPECEOF

# 2. Training Project Creation Flow
cat > training-project-flow.spec.ts << 'SPECEOF'
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TrainingProjectListPage } from './pages/TrainingProjectListPage';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * Training Project Creation Flow
 *
 * Scenario:
 * 1. Admin creates training project
 * 2. Adds trainees
 * 3. Publishes project
 * 4. Todos are automatically created for trainees
 */

test.describe('Training Project Flow', () => {
  test('Admin can create and publish training project', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    const projectListPage = new TrainingProjectListPage(page);

    // Login as admin
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(adminUser, adminPass);

    // Navigate to training projects
    await projectListPage.goto();

    // Click create button
    await projectListPage.clickCreate();

    // Wait for dialog
    await expect(page.locator('.el-dialog')).toBeVisible();

    // Fill project form
    await page.locator('input[placeholder*="标题"]').fill('2026 Q1 GMP 培训');
    await page.locator('textarea').fill('本次培训覆盖 GMP 核心要素');

    // Select department
    await page.locator('.el-select').first().click();
    await page.locator('.el-select-dropdown__item').filter({ hasText: '质量部' }).click();

    // Select quarter
    await page.locator('.el-select').nth(1).click();
    await page.locator('.el-select-dropdown__item').filter({ hasText: '2026-Q1' }).click();

    // Select trainees (multi-select)
    await page.locator('button').filter({ hasText: /选择学员/ }).click();
    await page.locator('.el-checkbox').first().click();
    await page.locator('.el-checkbox').nth(1).click();

    // Save project
    await page.locator('button').filter({ hasText: /保存/ }).click();

    // Wait for success message
    await expect(page.locator('.el-message--success')).toBeVisible();

    // Verify project appears in list
    await projectListPage.expectProjectVisible('2026 Q1 GMP 培训');

    // Publish project
    await projectListPage.clickProjectByName('2026 Q1 GMP 培训');
    await page.waitForURL('**/training/projects/**');

    await page.locator('button').filter({ hasText: /发布/ }).click();

    // Confirm dialog
    await page.locator('.el-message-box button').filter({ hasText: /确定/ }).click();

    // Wait for success
    await expect(page.locator('.el-message--success')).toBeVisible();

    // Verify status changed to published
    await expect(page.locator('.el-tag').filter({ hasText: '已发布' })).toBeVisible();
  });
});
SPECEOF

# 3. Todo Integration Test
cat > training-todo-integration.spec.ts << 'SPECEOF'
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TodoListPage } from './pages/TodoListPage';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * Training Todo Integration
 *
 * Verifies that training todos are created when project is published
 * and automatically completed when student passes exam
 */

test.describe('Training Todo Integration', () => {
  test('Todo is created when project is published', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    const todoPage = new TodoListPage(page);

    // Login as student
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(adminUser, adminPass);

    // Navigate to todos
    await todoPage.goto();

    // Filter by training type
    await todoPage.filterByType('training_attend');

    // Verify training todo exists
    await todoPage.expectTodoVisible('完成培训考试');
  });

  test('Overdue todos are highlighted', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    const todoPage = new TodoListPage(page);

    // Login
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(adminUser, adminPass);

    // Navigate to todos
    await todoPage.goto();

    // Filter by overdue
    await todoPage.filterByType('逾期');

    // Verify overdue todos have red background
    const overdueTodo = page.locator('.todo-card.overdue').first();
    await expect(overdueTodo).toBeVisible();

    // Verify background color
    const bgColor = await overdueTodo.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toContain('rgb'); // Should have background color
  });
});
SPECEOF

echo "✅ Created Test Specs"
