# Browser Smoke Test Record

## Environment

- Project: `/Users/jiashenglin/Desktop/好玩的项目/noidear`
- Date: 2026-04-23
- Browser: Chrome / Safari
- Frontend URL: http://localhost:5175
- Backend URL: http://localhost:3000
- Test account: admin / ChangeMe123!

## Route Checklist

| Priority | Area | Route | Action | Expected | Actual | Console Error | Network Error | Classification | Status |
|---|---|---|---|---|---|---|---|---|---|
| P0 | Login | `/login` | Submit valid credentials | Enters app shell | ✅ 登录成功，跳转至 dashboard | None | None | — | **passed** |
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
| FIND-001 | P3 | — | 文档密码与实际不符 | ✅ 已修复 | 文档未随 seed 脚本更新 | 已批量更新所有文档中的默认密码为 ChangeMe123! |

## Summary

- P0 blocking issues: 0
- P1 core issues: 0
- P2 normal issues: 0
- Display-only issues: 1 (FIND-001: 文档密码记录不一致)
