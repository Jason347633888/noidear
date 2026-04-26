# Task Flow Completion Design

## 1. Goal And Boundary

This spec defines the completion of the `/tasks` flow as a **one-time standalone task document flow**.

The goal is to turn the current partial `/tasks` surface into a real end-to-end business flow that supports:

- task creation by a management role
- task detail and form filling by an assignee
- draft save and restore
- final submission
- task cancellation
- approval of submitted task results

This spec is not a task-center redesign. It does not unify all task-like systems in the repo.

### Business Definition

`/tasks` is a one-time task flow based on `RecordTemplate`.

A management role selects a template that is allowed for task dispatch, chooses the target department or execution scope, sets a deadline, and creates a single task. The assignee fills it, can save drafts, submits it, and the result can then be approved or rejected.

### In Scope

- `/tasks`
- `/tasks/create`
- `/tasks/:id`
- `GET /api/v1/tasks`
- `GET /api/v1/tasks/:id`
- `POST /api/v1/tasks`
- `POST /api/v1/tasks/:id/submit`
- `POST /api/v1/tasks/:id/draft`
- `POST /api/v1/tasks/:id/cancel`
- `POST /api/v1/tasks/approve`
- legacy compatibility decision for `POST /api/v1/tasks/submit`
- alignment with existing task API client, docs, server e2e, and Playwright scenarios

### Out Of Scope

- `/my-todos` redesign
- `workflow/my-tasks` redesign
- `record-task-assignment` redesign
- unified task center
- unifying underlying task models
- adding periodic or auto-dispatch to `/tasks`

### Hard Rule

This spec only completes the standalone one-time `/tasks` flow. It must not expand into a unified task center.

---

## 2. Current State And Gaps

The current `/tasks` flow is incomplete across router, pages, backend APIs, docs, and tests.

### 2.1 Frontend Route Reality

Current router defines only:

- `/tasks`

It does not define:

- `/tasks/create`
- `/tasks/:id`

### 2.2 Frontend Page Reality

Current `client/src/views/tasks/` contains only:

- `TaskList.vue`

It does not contain:

- `TaskCreate.vue`
- `TaskDetail.vue`

### 2.3 Frontend Client Reality

`client/src/api/task.ts` already assumes a full task flow exists, including:

- `createTask`
- `submitTaskById`
- `saveDraft`
- `cancelTask`
- `approveTask`

This means the API client already moved forward, while the route/page/backend reality did not fully follow.

### 2.4 Backend Reality

`server/src/modules/task/task.controller.ts` currently exposes only:

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/:id`

It does not expose the write path required for a complete task flow.

### 2.5 Documentation Reality

Current docs already describe:

- `/tasks/create`
- `/tasks/:id`

as if they existed, but the real frontend does not provide them.

### 2.6 Testing Reality

Current tests already depend on the complete flow:

- client API tests
- server task e2e tests
- Playwright `scenario1` through `scenario5`

So the current `KNOWN_SKIP` and `did not run` states are not test mistakes. They are accurate exposure of missing functionality.

### Hard Rule

This is not a UI polish task. It is completion of a currently broken business chain.

---

## 3. Flow Positioning And System Boundaries

### 3.1 `/tasks`

`/tasks` is the one-time standalone task document flow.

Its purpose is to create and execute a single task instance based on a template.

### 3.2 `/my-todos`

`/my-todos` is the user-facing unified reminder inbox.

Its purpose is to tell the current user “you have something to do” and let the user jump to a concrete business page.

It does not own task creation rules or task lifecycle design.

### 3.3 `workflow/my-tasks`

`workflow/my-tasks` is the workflow approval inbox.

Its purpose is to handle workflow-node approvals and rejections.

It is not the same as filling or submitting a task document.

### 3.4 `record-task-assignment`

`record-task-assignment` owns recurring/periodic dispatch rules.

Its purpose is to define long-lived dispatch configuration, not one-time task issuance.

### Boundary Decision

- `/tasks` handles one-time tasks only
- recurring/periodic dispatch remains under `record-task-assignment`
- `/my-todos` remains an aggregated reminder surface
- `workflow/my-tasks` remains workflow approval surface

### Hard Rule

`/tasks` does not gain periodic or auto-dispatch in this spec.

---

## 4. Roles And Permissions

The completed task flow uses at least three role types.

### 4.1 Task Creator

By default:

- admin
- or an authorized management role

Allowed actions:

- create tasks
- view created tasks
- cancel tasks in allowed states

### 4.2 Task Executor

By default:

- a user in the target department
- or a user explicitly in the execution scope

Allowed actions:

- view task detail
- save draft
- submit task result

Not allowed:

- create tasks
- approve results
- cancel other users' tasks without permission

### 4.3 Task Approver

By default:

- admin
- or an authorized approver role

Allowed actions:

- approve submitted task results
- reject submitted task results
- provide approval comments

### Hard Rule

Ordinary executors cannot create tasks.

---

## 5. Template Eligibility Rules

Tasks are created from `RecordTemplate`, but not every template is automatically eligible.

### 5.1 Eligible Template Meaning

A template must satisfy the “task dispatch allowed” conditions before it can appear in `/tasks/create`.

At minimum this means:

- template is enabled
- template is allowed for task dispatch
- template is not a system-internal-only template
- template is not explicitly excluded from one-time task usage

### 5.2 Template Selection Behavior

`/tasks/create` must show only eligible templates.

It must not show:

- disabled templates
- system-only templates
- templates not allowed for one-time dispatch

### Hard Rule

Not all 280+ templates are automatically valid task targets.

---

## 6. Page Structure

The completed frontend flow requires three pages.

### 6.1 `/tasks`

Responsibilities:

- show task list
- filter tasks
- show task summaries and statuses
- navigate to task creation
- navigate to task detail

### 6.2 `/tasks/create`

Responsibilities:

- choose eligible template
- choose target department or execution scope
- set deadline
- optionally provide title/description
- create the task

### 6.3 `/tasks/:id`

Responsibilities:

- show task details
- render template fields
- support editing for eligible users in eligible states
- save draft
- submit
- show approval state where applicable

### Hard Rule

Both `/tasks/create` and `/tasks/:id` must exist by the end of this work.

---

## 7. Backend API Surface

The completed backend task flow must support these interfaces.

### Required APIs

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/:id`
- `POST /api/v1/tasks`
- `POST /api/v1/tasks/:id/submit`
- `POST /api/v1/tasks/:id/draft`
- `POST /api/v1/tasks/:id/cancel`
- `POST /api/v1/tasks/approve`

### Legacy Compatibility

`POST /api/v1/tasks/submit` may remain temporarily as a compatibility endpoint if current clients/tests still use it, but it must delegate to the same formal submit logic.

### Hard Rule

The write path must be implemented in the real `/tasks` backend surface, not just assumed by tests or API clients.

---

## 8. Task Status Model

The task flow uses these task-level statuses:

- `pending`
- `submitted`
- `approved`
- `rejected`
- `cancelled`
- `overdue`

### 8.1 Meaning

- `pending`: created and waiting for work
- `submitted`: submitted and waiting for approval
- `approved`: result approved
- `rejected`: result rejected
- `cancelled`: task cancelled
- `overdue`: deadline passed while not completed

### 8.2 Draft Relationship

Draft is not a task-level primary status.

Draft is a record-level temporary save attached to a `pending` task.

### Hard Rule

Draft must not be modeled as a separate task lifecycle state.

---

## 9. Task Creation Flow

### 9.1 Required Inputs

At minimum:

- template
- target department
- deadline

Optional but recommended:

- title
- description/instructions

### 9.2 Creation Result

On success the system must:

- create a task master record
- bind the chosen template
- bind the target department or execution scope
- make the new task visible in `/tasks`

### 9.3 Post-create Navigation

Recommended default behavior:

- return to `/tasks`
- highlight or otherwise make the new task visible in the list

---

## 10. Task Detail And Fill Flow

### 10.1 Page Content

`/tasks/:id` must show at least:

- task title
- template information
- deadline
- current status
- editable field area
- draft/submit action area
- approval status and result area when applicable

### 10.2 Field Rendering

Task detail must render fields from the associated `RecordTemplate`.

It must not define a separate task-only field system.

### 10.3 Editability Rules

By default:

- `pending`: editable by executor
- `submitted`: read-only while waiting for approval
- `approved`: locked
- `cancelled`: locked
- `rejected`: editable again for correction and re-submit

---

## 11. Draft Flow

`/tasks/:id/draft` is a required formal capability.

### 11.1 Save Draft

The executor can save partial input while the task is still in an editable state.

### 11.2 Restore Draft

When reopening `/tasks/:id`, the current draft content must be restored automatically.

### 11.3 Draft And Final Submission

Once the task is formally submitted:

- the submitted version becomes the active formal record
- old editable draft ambiguity must be removed

### Hard Rule

Draft save and restore are mandatory, not optional enhancements.

---

## 12. Submit Flow

### 12.1 Submit Preconditions

Before submit:

- current user must be a valid executor
- task status must allow submission
- required validation must pass

### 12.2 Submit Result

On success the system must:

- create the formal submitted record
- set task status to `submitted`
- record submitter and submit time

### 12.3 Conflict Rules

- duplicate submit: `409`
- invalid task state for submit: `409`
- invalid payload: `400`
- permission denied: `403`
- task not found: `404`

### Hard Rule

`POST /tasks/:id/submit` must become a real, shipped endpoint.

---

## 13. Cancel Flow

### 13.1 Who Can Cancel

By default:

- creator
- admin
- authorized management role

### 13.2 When Cancel Is Allowed

By default:

- `pending`: cancel allowed
- `submitted`: cancel not allowed
- `approved`: cancel not allowed
- `cancelled`: no-op conflict

### 13.3 Cancel Result

After cancellation:

- task status becomes `cancelled`
- detail view becomes read-only
- list state updates accordingly

---

## 14. Approval Flow

### 14.1 Approval Entry

Approval remains on:

- `POST /api/v1/tasks/approve`

### 14.2 Approval Actions

The approver may:

- approve
- reject
- include comment

### 14.3 Result

- approve -> task status `approved`
- reject -> task status `rejected`

### 14.4 Boundary With Workflow Tasks

This approval is approval of task results.
It is not a redesign of workflow-task handling.

### Hard Rule

This spec completes task-result approval, not workflow-task unification.

---

## 15. List Coordination And Navigation Backflow

### 15.1 After Create

The new task must become visible in `/tasks` immediately after successful creation.

### 15.2 After Draft Save

The detail page stays in context and shows a clear saved-draft signal.

### 15.3 After Submit

List and detail must reflect `submitted` state consistently.

### 15.4 After Approval

List and detail must reflect `approved` or `rejected` state consistently.

---

## 16. Alignment With Existing Tests And Docs

This work must align the real implementation with these already-existing assumption sources:

- `client/src/api/task.ts`
- `server/test/task.e2e-spec.ts`
- `client/e2e/scenario1-create-and-fill.spec.ts` through related task scenarios
- `docs/PROJECT_STRUCTURE.md`

### Objective

Replace the current split state:

- docs claim capability exists
- API client assumes it exists
- tests depend on it
- real implementation is missing

with a single consistent state where docs, clients, tests, and implementation agree.

### Hard Rule

Tests and docs may not continue to lead reality after this work.

---

## 17. Error Handling Rules

Use these error semantics consistently:

- `400`: invalid input or validation failure
- `401`: unauthenticated
- `403`: unauthorized
- `404`: task not found
- `409`: state conflict such as duplicate submit or duplicate cancel

This consistency must apply across:

- create
- draft
- submit
- cancel
- approve

---

## 18. Acceptance Criteria

This flow is complete only if all of the following are true:

1. `/tasks/create` exists
2. `/tasks/:id` exists
3. required write APIs are implemented
4. draft save and restore work
5. submit works
6. approval works
7. current task E2E scenarios are no longer blocked by the missing route/endpoints
8. docs and implementation match

### Hard Rule

If `/tasks/create` or `/tasks/:id` is still missing, this spec is not complete.

---

## 19. Execution Rules

Agents implementing this spec must:

- complete only the standalone one-time `/tasks` flow
- leave periodic dispatch under `record-task-assignment`
- leave `/my-todos` as reminder aggregation
- leave `workflow/my-tasks` as workflow approval inbox
- avoid turning this into a task-center unification project

### Hard Rule

Success here is task-flow completion, not task-system consolidation.

---

## Appendix A: Task Status Transition Diagram

Suggested content:

- `pending -> submitted -> approved`
- `pending -> submitted -> rejected -> pending`
- `pending -> cancelled`
- draft as record-level temporary state

## Appendix B: Page To API Matrix

Suggested columns:

- page
- action
- API
- role
- result

## Appendix C: Permission Action Matrix

Suggested columns:

- role
- create
- edit
- draft
- submit
- cancel
- approve

## Appendix D: E2E Scenario Mapping

Suggested columns:

- scenario file
- required route
- required API
- required state transition
- acceptance outcome

## Appendix E: Boundary Table Against Other Task Systems

Suggested columns:

- surface
- purpose
- owner
- in scope now?
- notes

