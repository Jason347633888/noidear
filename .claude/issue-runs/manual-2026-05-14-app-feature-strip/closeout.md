# Closeout — manual-2026-05-14-app-feature-strip

## 状态

✅ 已合并，已关闭。

## 合并信息

- PR：https://github.com/Jason347633888/noidear/pull/214
- 分支：`codex/app-feature-strip`
- 最终 HEAD：`678b5789`
- 合并方式：squash merge
- 合并时间：2026-05-14

## 迭代历史

| 轮次 | 内容 | Commit |
|------|------|--------|
| 实现 | 8 个 Task 全部完成（mobile/backup/health/recycle-bin/import-export/监控栈删除，record export 新增） | `721b1f8e` ~ `ae18860b` |
| Round 1 | blob 拦截器、@Roles、审计、zip 碰撞、e2e ignore | `da3af2d9` |
| Round 2 | submitterId 越权、审计 details service 层、MCP /liveness | `c6777f19` |
| Round 3 | 双重审计收敛、vue-tsc TS2353、submitterId 入 details | `ffb43b49` |
| Round 4 | client e2e 删除已下线路由 spec | `979ff4f7` |
| Round 5 | BDD_SPEC.md / README.md 退役废弃能力声明 | `678b5789` |

## 遗留 LOW/NIT（建议后续独立工单）

1. leader 部门维度范围过滤（Record 模型无 `departmentId`）
2. `endDate` 漏当天数据（项目共性惯例，建议统一修）
3. server e2e ignore 改为删除
4. `client/coverage/` 覆盖率产物加入 `.gitignore`
5. `sensitive-log.interceptor.spec.ts` bodyFields/resourceIdField 分支补测

## 下一计划

`2026-05-14-dependency-and-image-hardening-implementation.md`（第二计划，dependency 升级 + Docker digest 固化）
