# Browser Smoke Test Record

## Environment

- Project: `/Users/jiashenglin/Desktop/好玩的项目/noidear`
- Date: 2026-04-23
- Browser: Chrome / Safari
- Frontend URL: http://localhost:5175
- Backend URL: http://localhost:3000
- Test account: admin / 12345678

## Route Checklist

| Priority | Area | Route | Action | Expected | Actual | Console Error | Network Error | Classification | Status |
|---|---|---|---|---|---|---|---|---|---|
| P0 | Login | `/login` | Submit valid credentials | Enters app shell | | | | | pending |
| P0 | Navigation | main app shell | Click each main sidebar item | Route changes and page renders | | | | | pending |
| P0 | Product R&D | product R&D entry route | Enter Step1 and continue through visible steps | Main workflow can be entered | | | | | pending |
| P0 | Dynamic Form | dynamic form entry route | Open a template and submit a minimal valid record | Form validates or submits with clear errors | | | | | pending |
| P0 | Template Designer | template designer route | Add field, edit field, save | Save succeeds or shows actionable validation | | | | | pending |
| P1 | Document Management | document list route | Open list, detail, upload/preview entry | Page responds without first-render crash | | | | | pending |
| P1 | Permissions | permission entry route | Open role/permission pages | Page responds or shows authorized denial | | | | | pending |
| P1 | Mobile | mobile build/type-check | Run mobile verification | Build/type-check passes or failure recorded | | | | | pending |

## Findings

| ID | Priority | Route | Action | Evidence | Root Cause Guess | Fix Plan |
|---|---|---|---|---|---|---|

## Summary

- P0 blocking issues:
- P1 core issues:
- P2 normal issues:
- Display-only issues:
