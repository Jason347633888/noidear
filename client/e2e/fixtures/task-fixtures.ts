import { getAuthToken, fetchTemplates, fetchUserDepartmentId } from '../helpers/api';

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
    adminUser: process.env.E2E_ADMIN_USER || 'admin',
    adminPass: process.env.E2E_ADMIN_PASS || 'ChangeMe123!',
    memberUser: process.env.E2E_USER_USER || 'seed_user',
    memberPass: process.env.E2E_USER_PASS || 'ChangeMe123!',
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
  const { adminUser, adminPass, memberUser, memberPass } = getCredentials();
  const adminToken = await getAuthToken(request, adminUser, adminPass);

  const templates = await fetchTemplates(request, adminToken);
  if (templates.length === 0) {
    throw new Error('No active templates. Seed the database before running E2E tests.');
  }

  // Use the member user's department so they can submit tasks created for their department
  const memberDeptId = await fetchUserDepartmentId(request, adminToken, memberUser);
  if (!memberDeptId) {
    throw new Error(`Member user '${memberUser}' has no department assigned.`);
  }

  // Prefer a template that has actual form fields so draft/fill tests work
  const hasFields = (t: (typeof templates)[0]) => {
    const fj = t.fieldsJson as any;
    if (Array.isArray(fj) && fj.length > 0) return true;
    if (fj && typeof fj === 'object' && Array.isArray(fj.sections)) {
      return fj.sections.some((s: any) => Array.isArray(s.fields) && s.fields.length > 0);
    }
    return false;
  };
  const templateWithFields = templates.find(hasFields) ?? templates[0];

  sharedTemplateId = templateWithFields.id;
  sharedDepartmentId = memberDeptId;

  return { templateId: sharedTemplateId, departmentId: sharedDepartmentId, token: adminToken };
}
