# Known Feature Gap Register

**Date:** 2026-04-25  
**Status:** Current — maintained as part of baseline reconstruction

---

## Gap 1: `/tasks` Create / Submit Flow

| Field | Value |
|-------|-------|
| Current route | `/tasks` (list only) |
| Missing route | `/tasks/create` |
| Missing pages | `TaskCreate.vue`, `TaskDetail.vue` |
| Missing backend | create / submit / draft / cancel / approve task endpoints in `server/src/modules/task/` |
| E2E impact | `scenario2-draft-resume.spec.ts` scenario1 (S1-a, S1-b) tests are `KNOWN_SKIP` |
| In scope for baseline reconstruction | No |
| Next subproject | task-flow-completion |
| Classification date | 2026-04-25 |

### What exists today

- `GET /api/v1/tasks` — list tasks (read-only, delegating to `RecordTaskAssignmentService`)
- `GET /api/v1/tasks/:id` — get one task (read-only)
- Frontend router has `/tasks` route pointing to a tasks list view
- No create/detail/edit pages exist

### What is missing

- `POST /api/v1/tasks` — create task
- `POST /api/v1/tasks/:id/submit` — submit task for approval
- `POST /api/v1/tasks/:id/approve` — approve task
- `POST /api/v1/tasks/:id/draft` — save as draft
- `POST /api/v1/tasks/:id/cancel` — cancel task
- Frontend: `TaskCreate.vue`, `TaskDetail.vue`
- Frontend: `/tasks/create` and `/tasks/:id` routes

### Resolution path

This gap is intentionally deferred. It does not affect production readiness for the currently implemented feature set. It will be addressed in the `task-flow-completion` subproject.
