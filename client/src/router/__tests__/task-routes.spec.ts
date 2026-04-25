import { describe, it, expect } from 'vitest';
import router from '@/router';

describe('task routes', () => {
  it('defines /tasks/create', () => {
    const match = router.resolve('/tasks/create');
    expect(match.name).toBe('TaskCreate');
  });

  it('defines /tasks/:id', () => {
    const match = router.resolve('/tasks/test-task-1');
    expect(match.name).toBe('TaskDetail');
  });
});
