import { getAuthToken, fetchUserDepartmentId } from '../helpers/api';

/**
 * Shared test configuration and data for E2E tests.
 *
 * All credentials MUST be provided via environment variables:
 *   E2E_ADMIN_USER, E2E_ADMIN_PASS, E2E_USER_USER, E2E_USER_PASS
 *
 * See .env.e2e.example for required environment variable documentation.
 */

/**
 * Lazily reads credentials from environment variables.
 * Called at test runtime to avoid module-level side effects.
 */
export function getCredentials() {
  return {
    adminUser: process.env.E2E_ADMIN_USER || 'admin',
    adminPass: process.env.E2E_ADMIN_PASS || 'ChangeMe123!',
    memberUser: process.env.E2E_USER_USER || 'seed_user',
    memberPass: process.env.E2E_USER_PASS || 'ChangeMe123!',
  };
}

/** Shared ID populated by initSharedTestData(). */
export let sharedDepartmentId: string;

/** Returns ISO deadline string 7 days in the future. */
export function futureDeadline(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * One-time setup: fetches department ID from the backend.
 * Call this in test.beforeAll().
 */
export async function initSharedTestData(request: Parameters<typeof getAuthToken>[0]) {
  const { adminUser, adminPass, memberUser } = getCredentials();
  const adminToken = await getAuthToken(request, adminUser, adminPass);

  // Use the member user's department so they can submit tasks created for their department
  const memberDeptId = await fetchUserDepartmentId(request, adminToken, memberUser);
  if (!memberDeptId) {
    throw new Error(`Member user '${memberUser}' has no department assigned.`);
  }

  sharedDepartmentId = memberDeptId;

  return { departmentId: sharedDepartmentId, token: adminToken };
}
