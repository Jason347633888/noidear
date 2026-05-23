---
id: manual-2026-05-14-app-feature-strip
plan: docs/superpowers/plans/2026-05-14-app-feature-strip-implementation.md
branch: codex/app-feature-strip
worktree: /Users/jiashenglin/Desktop/project/noidear-app-feature-strip
started: 2026-05-14
status: in-progress
---

# App Feature Strip

删除未使用的 mobile workspace、in-app operations surfaces、generic cross-domain tool centers，保留 Web/H5 业务系统。

## 前置说明

`post-api-cleanup-hardening` 分支引用不作为硬阻塞，以当前 master 代码事实为准继续执行。

## Tasks

- Task 1: Preflight Snapshot
- Task 2: Remove Mobile Workspace and Backend Mobile API
- Task 3: Remove In-App Backup Management
- Task 4: Keep Only Minimal Liveness and Remove Health Management
- Task 5: Remove Generic Recycle Bin
- Task 6: Remove Generic Import/Export Center, Migrate Deviation Export, Build Record-Owned Export
- Task 7: Remove Deployment Observability Stack
- Task 8: Final Validation for Feature Strip
