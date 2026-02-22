import { test, expect } from '@playwright/test';

test.describe('SSO 单点登录', () => {
  test('SSO 登录页面可以访问', async ({ page }) => {
    await page.goto('/login/sso');
    await expect(page.locator('h2:has-text("SSO 单点登录")')).toBeVisible();
  });

  test('显示 LDAP 登录表单', async ({ page }) => {
    await page.goto('/login/sso');
    await expect(page.locator('input[placeholder="LDAP 用户名"]')).toBeVisible();
    await expect(page.locator('input[placeholder="LDAP 密码"]')).toBeVisible();
    await expect(page.locator('button:has-text("LDAP 登录")')).toBeVisible();
  });

  test('显示 OAuth2 登录选项', async ({ page }) => {
    await page.goto('/login/sso');
    await page.click('text=OAuth2 登录');
    await expect(page.locator('button:has-text("Google 登录")')).toBeVisible();
    await expect(page.locator('button:has-text("GitHub 登录")')).toBeVisible();
  });

  test('表单校验必填字段', async ({ page }) => {
    await page.goto('/login/sso');
    await page.click('button:has-text("LDAP 登录")');
    await expect(page.locator('.el-form-item__error')).toBeVisible();
  });

  test('返回普通登录链接正常', async ({ page }) => {
    await page.goto('/login/sso');
    await page.click('button:has-text("返回普通登录")');
    await expect(page.url()).toContain('/login');
    await expect(page.url()).not.toContain('/sso');
  });
});
