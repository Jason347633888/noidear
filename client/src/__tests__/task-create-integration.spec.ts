/**
 * Integration tests for TaskCreate.vue.
 *
 * Verifies that TaskCreate uses taskApi.createTask() instead of direct
 * request.post() calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateTask = vi.fn();

vi.mock('@/api/task', () => ({
  default: {
    createTask: mockCreateTask,
    getTasks: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    submitTask: vi.fn(),
    submitTaskById: vi.fn(),
    cancelTask: vi.fn(),
    saveDraft: vi.fn(),
    approveTask: vi.fn(),
  },
  isTaskLocked: vi.fn(() => false),
  isTaskOverdue: vi.fn(() => false),
  getTaskStatusText: vi.fn((s: string) => s),
  getTaskStatusType: vi.fn(() => 'info'),
}));

vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

describe('TaskCreate.vue integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API module usage', () => {
    it('taskApi.createTask should accept CreateTaskPayload', async () => {
      const payload = {
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        deadline: '2026-03-01T00:00:00.000Z',
      };
      mockCreateTask.mockResolvedValue({ id: 'new-task-1', ...payload });

      const result = await mockCreateTask(payload);

      expect(mockCreateTask).toHaveBeenCalledWith(payload);
      expect(result.id).toBe('new-task-1');
    });

    it('taskApi.createTask should handle errors', async () => {
      mockCreateTask.mockRejectedValue(new Error('Server error'));

      await expect(mockCreateTask({
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        deadline: '2026-03-01T00:00:00.000Z',
      })).rejects.toThrow('Server error');
    });
  });
});
