# 临时文件清单（可手动删除）

> 生成日期: 2026-02-22
> 以下文件均为开发过程中由 AI Agent 生成的临时产物，可安全删除。
> **删除前确认已不需要这些文件的内容**。

---

## 一键删除命令

```bash
# 在项目根目录执行（noidear/）

# 1. 根目录临时文件
rm -f HANDOFF_frontend_planner.md
rm -f TASK-329_COMPLETION_REPORT.md
rm -f TASK-330_COMPLETION_REPORT.md
rm -f TASK-331_COMPLETION_REPORT.md
rm -f TASK-332_COMPLETION_REPORT.md

# 2. server/ 下的 HANDOFF 和报告文件
rm -f server/HANDOFF_PLANNER.md
rm -f server/HANDOFF_PLANNER_TASK327.md
rm -f server/HANDOFF_TDD_COMPLETE.md
rm -f server/HANDOFF_TDD_TASK327.txt
rm -f server/HANDOFF_code_review_TASK327.txt
rm -f server/HANDOFF_code_review_TASK328.txt
rm -f server/HANDOFF_orchestrate_complete.md
rm -f server/HANDOFF_orchestrate_start.md
rm -f server/HANDOFF_planner_TASK-330.md
rm -f server/HANDOFF_planner_start.md
rm -f server/HANDOFF_security_TASK327.txt
rm -f server/HANDOFF_tdd_TASK328.txt
rm -f server/ORCHESTRATION_REPORT_TASK327.txt
rm -f server/ORCHESTRATION_REPORT_TASK328.txt
rm -f server/BACKEND_PHASE2_COMPLETION_PROOF.md
rm -f server/IMPLEMENTATION_SUMMARY.md
rm -f server/TASK-329-COMPLETE.md
rm -f server/TRAINING_IMPLEMENTATION_HANDOFF.md
rm -f server/TRAINING_MODULE_REVIEW_CHECKLIST.md

# 3. server/ 下的调试脚本
rm -f server/check-admin.ts
rm -f server/check-roles.ts
rm -f server/check-users.ts
rm -f server/test-output.txt
rm -f server/migrations_add_permissions.sql

# 4. client/ 下的脚本文件
rm -f client/create-all-tests.sh
rm -f client/create-more-tests.sh
rm -f client/create-tests.sh
rm -f client/fix-only.sh
rm -f client/fix-tests.sh

# 5. 覆盖率报告目录（由 npm run test:cov 重新生成）
rm -rf client/coverage/
rm -rf server/coverage/

# 6. 备份目录
rm -rf server/.backup/

# 7. 无用的移动端开发目录（已整合到 client/src/views/mobile/）
rm -rf server/mobile/
```

---

## 分类说明

### A. HANDOFF 文件（agent 交接文档）
AI Agent 在多步骤任务间传递上下文用的临时文件，任务完成后无价值。

| 文件 | 位置 |
|------|------|
| HANDOFF_frontend_planner.md | 根目录 |
| server/HANDOFF_PLANNER.md | server/ |
| server/HANDOFF_PLANNER_TASK327.md | server/ |
| server/HANDOFF_TDD_COMPLETE.md | server/ |
| server/HANDOFF_TDD_TASK327.txt | server/ |
| server/HANDOFF_code_review_TASK327.txt | server/ |
| server/HANDOFF_code_review_TASK328.txt | server/ |
| server/HANDOFF_orchestrate_complete.md | server/ |
| server/HANDOFF_orchestrate_start.md | server/ |
| server/HANDOFF_planner_TASK-330.md | server/ |
| server/HANDOFF_planner_start.md | server/ |
| server/HANDOFF_security_TASK327.txt | server/ |
| server/HANDOFF_tdd_TASK328.txt | server/ |

### B. 完成报告文件（COMPLETION_REPORT / ORCHESTRATION_REPORT）
单次任务的执行报告，已有审计文档（docs/complete-audit-report.md）替代。

| 文件 | 位置 |
|------|------|
| TASK-329_COMPLETION_REPORT.md | 根目录 |
| TASK-330_COMPLETION_REPORT.md | 根目录 |
| TASK-331_COMPLETION_REPORT.md | 根目录 |
| TASK-332_COMPLETION_REPORT.md | 根目录 |
| server/BACKEND_PHASE2_COMPLETION_PROOF.md | server/ |
| server/IMPLEMENTATION_SUMMARY.md | server/ |
| server/TASK-329-COMPLETE.md | server/ |
| server/TRAINING_IMPLEMENTATION_HANDOFF.md | server/ |
| server/TRAINING_MODULE_REVIEW_CHECKLIST.md | server/ |
| server/ORCHESTRATION_REPORT_TASK327.txt | server/ |
| server/ORCHESTRATION_REPORT_TASK328.txt | server/ |

### C. 调试脚本（开发时临时使用）

| 文件 | 说明 |
|------|------|
| server/check-admin.ts | 临时验证 admin 用户的调试脚本 |
| server/check-roles.ts | 临时验证角色的调试脚本 |
| server/check-users.ts | 临时验证用户的调试脚本 |
| server/test-output.txt | 测试输出日志 |
| server/migrations_add_permissions.sql | 已通过 Prisma 迁移执行，SQL 文件可删除 |
| client/create-all-tests.sh | 批量生成测试的临时脚本 |
| client/create-more-tests.sh | 同上 |
| client/create-tests.sh | 同上 |
| client/fix-only.sh | 临时修复脚本 |
| client/fix-tests.sh | 临时修复脚本 |

### D. 覆盖率报告（可由命令重新生成）

| 目录 | 重新生成命令 |
|------|------------|
| client/coverage/ | `cd client && npm run test:coverage` |
| server/coverage/ | `cd server && npm run test:cov` |

### E. 备份和冗余目录

| 目录 | 说明 |
|------|------|
| server/.backup/ | 开发中的代码备份，已提交到 git，可删除 |
| server/mobile/ | 移动端代码已整合至 client/src/views/mobile/ 和 server/src/modules/mobile/ |

---

## 保留文件（不要删除）

以下文件虽然也是本轮开发产物，但有实际价值，请保留：

| 文件 | 原因 |
|------|------|
| docs/complete-audit-report.md | 完整功能审计报告，项目重要参考文档 |
| docs/MOBILE_IMPLEMENTATION_COMPLETE.md | 移动端实现说明 |
| docs/P1-2_IMPLEMENTATION_DECISION.md | P1-2 权限系统实现决策记录 |
| monitoring/ | Prometheus/Grafana 配置，生产环境需要 |
| server/test/backup.e2e-spec.ts | 有效测试文件 |
| server/test/health.e2e-spec.ts | 有效测试文件 |
| server/test/monitoring.load.spec.ts | 有效负载测试文件 |
| client/src/views/audit/AuditSearchPage.vue | 有效页面组件 |

---

## 删除后验证

```bash
# 确认构建仍然通过
cd server && npm run build
cd ../client && npx vite build

# 确认 git status 干净
git status
```
