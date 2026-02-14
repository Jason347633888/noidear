import { getAuthToken, fetchTemplates, fetchDepartments } from '../helpers/api';

/**
 * Shared test configuration and data for task E2E tests.
 *
 * All credentials MUST be provided via environment variables:
 *   E2E_ADMIN_USER, E2E_ADMIN_PASS, E2E_USER_USER, E2E_USER_PASS
 *
 * See .env.e2e.example for required environment variable documentation.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.e2e.example.`);
  }
  return value;
}

/**
 * Lazily reads credentials from environment variables.
 * Called at test runtime to avoid module-level side effects.
 */
export function getCredentials() {
  return {
    adminUser: requireEnv('E2E_ADMIN_USER'),
    adminPass: requireEnv('E2E_ADMIN_PASS'),
    memberUser: requireEnv('E2E_USER_USER'),
    memberPass: requireEnv('E2E_USER_PASS'),
  };
}

/** Shared IDs populated by initSharedTestData(). */
export let sharedTemplateId: string;
export let sharedDepartmentId: string;

/** Returns ISO deadline string 7 days in the future. */
export function futureDeadline(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * One-time setup: fetches template/department IDs from the backend.
 * Call this in test.beforeAll().
 */
export async function initSharedTestData(request: Parameters<typeof getAuthToken>[0]) {
  const { adminUser, adminPass } = getCredentials();
  const token = await getAuthToken(request, adminUser, adminPass);
  const templates = await fetchTemplates(request, token);
  const departments = await fetchDepartments(request, token);

  if (templates.length === 0) {
    throw new Error('No active templates. Seed the database before running E2E tests.');
  }
  if (departments.length === 0) {
    throw new Error('No active departments. Seed the database before running E2E tests.');
  }

  sharedTemplateId = templates[0].id;
  sharedDepartmentId = departments[0].id;

  return { templateId: sharedTemplateId, departmentId: sharedDepartmentId, token };
}
