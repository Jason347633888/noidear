# Browser High Priority Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix P0/P1 browser smoke-test failures recorded in `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md`.

**Architecture:** Fix one failure cluster per task. Write or update a focused test before changing implementation when a failure is a code bug. Keep Vue 3 + Element Plus on the frontend and NestJS + Prisma on the backend.

**Tech Stack:** Vue 3, Element Plus, Vite/Vitest, NestJS, Jest, Docker Compose, browser manual retest.

---

## Findings To Fix

| Task | Finding ID | Priority | Files To Inspect | Test To Add Or Update | Verification |
|---|---|---|---|---|---|---|
| 1 | FIND-001 | P3 | README.md, AGENTS.md, docs/DESIGN.md, docs/REQUIREMENTS.md | — | ✅ 已完成：所有文档密码统一为 ChangeMe123! |
| 2 | FIND-002 | P2 | client/e2e/ | 添加全局 setup（auth.setup.ts） | Playwright 登录缓存，解决429限流 |
| 3 | FIND-003 | P2 | docs/superpowers/reports/ | 更新执行报告 | Vault SaaS Browser Alignment Phase 1 已完成 |

## Execution Rules

- If a fix touches more than 3 files, split it into a smaller task before editing.
- API changes must keep try-catch error handling.
- Frontend changes must keep Element Plus components.
- After each fix, rerun the exact browser action from the smoke test record.
