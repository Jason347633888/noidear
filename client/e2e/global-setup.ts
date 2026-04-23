import { request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global setup for E2E tests.
 * Logs in once and saves storage state to avoid 429 rate limiting.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

export default async function globalSetup() {
  const adminUser = process.env.E2E_ADMIN_USER;
  const adminPass = process.env.E2E_ADMIN_PASS;
  
  if (!adminUser || !adminPass) {
    console.warn('⚠️  E2E credentials not set, skipping global setup');
    return;
  }

  // Create a request context for API calls
  const context = await request.newContext();
  
  try {
    // Login via API
    const response = await context.post(`${API_BASE}/auth/login`, {
      data: { username: adminUser, password: adminPass },
    });

    if (!response.ok()) {
      throw new Error(`Global setup login failed: ${response.status()}`);
    }

    const body = await response.json();
    const { token, user } = body.data;

    // Create auth directory
    const authDir = 'e2e/.auth';
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Save storage state with token in localStorage
    await context.storageState({
      path: path.join(authDir, 'admin.json'),
    });

    // Also save a custom auth file with the token for direct injection
    fs.writeFileSync(
      path.join(authDir, 'admin-token.json'),
      JSON.stringify({ token, user }),
    );

    console.log('✅ Global setup: Admin login cached');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.dispose();
  }
}
