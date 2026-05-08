import { request } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { apiBaseUrl } from './support/urls';

// Load .env.e2e before accessing process.env
const envFile = path.resolve(process.cwd(), '.env.e2e');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (key && !key.startsWith('#') && rest.length > 0) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    });
}

/**
 * Global setup for E2E tests.
 * Logs in once and saves storage state to avoid 429 rate limiting.
 */

const API_BASE = apiBaseUrl();

export default async function globalSetup() {
  const adminUser = process.env.E2E_ADMIN_USER;
  const adminPass = process.env.E2E_ADMIN_PASS;

  if (!adminUser || !adminPass) {
    console.warn('⚠️  E2E credentials not set, skipping global setup');
    return;
  }

  const authDir = 'e2e/.auth';
  const tokenPath = path.join(authDir, 'admin-token.json');
  const statePath = path.join(authDir, 'admin.json');

  // Reuse cached token if exists and not expired (< 1 hour)
  if (fs.existsSync(tokenPath) && fs.existsSync(statePath)) {
    const stats = fs.statSync(tokenPath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs < 60 * 60 * 1000) {
      console.log('✅ Global setup: Reusing cached admin login');
      return;
    }
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
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Save storage state with token in localStorage
    await context.storageState({
      path: statePath,
    });

    // Also save a custom auth file with the token for direct injection
    fs.writeFileSync(
      tokenPath,
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
