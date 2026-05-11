import { type APIRequestContext } from '@playwright/test';
import { getAuthToken } from './api';
import { apiBaseUrl } from '../support/urls';

/**
 * Process helper for E2E tests.
 *
 * Provides direct backend API calls for creating and advancing
 * product R&D process instances without going through the UI.
 */

const API_BASE = apiBaseUrl();

interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

interface ProcessInstance {
  id: string;
  templateId: string;
  productName: string;
  currentStep: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
}

interface ProcessTemplate {
  id: string;
  name: string;
}

/**
 * Fetch the default process template ID.
 * Returns null if the endpoint is not available.
 */
export async function fetchDefaultProcessTemplateId(
  request: APIRequestContext,
  token: string,
): Promise<string | null> {
  try {
    const res = await request.get(`${API_BASE}/process/templates/default`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok()) {
      const listRes = await request.get(`${API_BASE}/process/templates?limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok()) return null;
      const listBody = (await listRes.json()) as ApiResponse<{ list?: ProcessTemplate[]; data?: ProcessTemplate[] }>;
      const list = listBody.data?.list ?? (Array.isArray(listBody.data) ? listBody.data as unknown as ProcessTemplate[] : []);
      return list.length > 0 ? list[0].id : null;
    }

    const body = (await res.json()) as ApiResponse<ProcessTemplate>;
    return body.data?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a new process instance via API.
 */
export async function createProcessInstanceViaApi(
  request: APIRequestContext,
  token: string,
  templateId: string,
  productName: string = 'E2E-Test-Product',
): Promise<ProcessInstance> {
  const res = await request.post(`${API_BASE}/process/instances`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { templateId, productName },
  });

  if (!res.ok()) {
    const errBody = await res.text();
    throw new Error(`Create process instance failed: ${res.status()} ${errBody}`);
  }

  const body = (await res.json()) as ApiResponse<ProcessInstance>;
  return body.data;
}

/**
 * Submit a step for a process instance via API.
 * Pass saveAsDraft=true to save as draft without advancing the step.
 */
export async function submitProcessStepViaApi(
  request: APIRequestContext,
  token: string,
  instanceId: string,
  stepNumber: number,
  data: Record<string, unknown> = {},
  saveAsDraft: boolean = false,
): Promise<void> {
  const res = await request.post(`${API_BASE}/process/instances/${instanceId}/steps`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { stepNumber, data, saveAsDraft },
  });

  if (!res.ok()) {
    const errBody = await res.text();
    throw new Error(
      `Submit step ${stepNumber} failed (saveAsDraft=${saveAsDraft}): ${res.status()} ${errBody}`,
    );
  }
}

/**
 * Approve a step for a process instance via the old sign-off endpoint.
 * Admin users can approve any role. Call multiple times for multi-role steps.
 */
export async function approveProcessStepViaApi(
  request: APIRequestContext,
  token: string,
  instanceId: string,
  stepNumber: number,
  comment: string = 'E2E auto-approve',
): Promise<void> {
  const res = await request.post(
    `${API_BASE}/process/instances/${instanceId}/steps/${stepNumber}/approvals`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { action: 'approve', comment },
    },
  );

  if (!res.ok()) {
    const errBody = await res.text();
    throw new Error(`Approve step ${stepNumber} failed: ${res.status()} ${errBody}`);
  }
}

/**
 * Fetch a process instance by ID.
 */
export async function fetchProcessInstanceViaApi(
  request: APIRequestContext,
  token: string,
  instanceId: string,
): Promise<ProcessInstance & { stepDataList: unknown[] }> {
  const res = await request.get(`${API_BASE}/process/instances/${instanceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok()) {
    throw new Error(`Fetch process instance failed: ${res.status()}`);
  }

  const body = (await res.json()) as ApiResponse<ProcessInstance & { stepDataList: unknown[] }>;
  return body.data;
}

/**
 * Advance a process instance from Step 1 to Step 2 via API.
 * Submits Step 1 and approves it so that currentStep becomes 2,
 * enabling the Step 2 UI (material picker, etc.).
 */
export async function advanceProcessToStep2(
  request: APIRequestContext,
  token: string,
  instanceId: string,
  productName: string = 'E2E-Material-Test',
): Promise<void> {
  await submitProcessStepViaApi(request, token, instanceId, 1, {
    productName,
    processType: '戚风分蛋工艺',
    customerRequirements: 'E2E test',
  });
  await approveProcessStepViaApi(request, token, instanceId, 1, 'E2E auto-advance to Step2');
}

/**
 * Advance a process instance through multiple steps to a target step number.
 * Each step is submitted and approved in sequence.
 * Step 3 is auto-approved by the server when trialConclusion === '通过'.
 */
async function advanceToStep(
  request: APIRequestContext,
  token: string,
  instanceId: string,
  targetStep: number,
): Promise<void> {
  for (let step = 1; step < targetStep; step++) {
    const stepData: Record<string, unknown> =
      step === 3
        ? { trialConclusion: '通过', productName: 'E2E-审批测试产品', processType: '戚风分蛋工艺' }
        : { productName: 'E2E-审批测试产品', processType: '戚风分蛋工艺' };

    await submitProcessStepViaApi(request, token, instanceId, step, stepData);

    // Step 3 with trialConclusion='通过' auto-approves server-side; skip explicit approval
    if (step !== 3) {
      await approveProcessStepViaApi(request, token, instanceId, step, 'E2E自动审批');
    }
  }
}

/**
 * Initialize shared process test data: returns templateId and admin token.
 * Call in test.beforeAll(). templateId may be null if not seeded.
 */
export async function initProcessTestData(
  request: APIRequestContext,
  adminUser: string,
  adminPass: string,
): Promise<{ token: string; templateId: string | null }> {
  const token = await getAuthToken(request, adminUser, adminPass);
  const templateId = await fetchDefaultProcessTemplateId(request, token);
  return { token, templateId };
}

// Re-export advanceToStep for use in approval spec
export { advanceToStep };
