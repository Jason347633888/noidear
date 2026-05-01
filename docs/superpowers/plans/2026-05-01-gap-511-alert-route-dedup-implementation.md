# GAP-511 告警路由去重实施计划

> **给执行 agent：** 必须使用 `superpowers:executing-plans` 按本计划逐项执行。不要重新设计告警模块、监控模块或告警状态机。如果当前代码与本计划描述不一致，停止并回报主 agent。

**目标：** 将告警功能的公开 API 收敛到 `/monitoring/alerts/*`，停止注册独立的 `/alerts/*` 路由，避免同一套 `AlertService` 同时暴露两套入口。

**GAP：** `GAP-511`

**Spec：** 不需要。本任务是低风险路由去重，不涉及 schema、历史数据迁移或业务状态机。

**业务边界：** 告警属于系统运维/监控能力。当前前端菜单和 `client/src/api/monitoring.ts` 都使用 `/monitoring/alerts/*`，所以 `/monitoring/alerts/*` 是本次收敛后的权威路径。

**非目标：**

- 不修改 `AlertService` 业务逻辑。
- 不修改告警规则、告警历史的数据结构。
- 不修改 `/monitoring/alerts/*` 路由行为。
- 不处理 `GAP-507` / `GAP-508`，它们由监控 API 合同计划处理。
- 不增加兼容重定向层。

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 superpowers 写计划要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 主 agent 已按 grill-me 方式质询本计划的必要性、事实源边界、schema/历史数据影响、可并行性和验收方式；能通过代码和文档确认的问题已直接核对，未发现需要用户额外确认的阻塞问题。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## 文件范围

- 修改：`server/src/modules/alert/alert.module.ts`
- 可删除或保留未注册：`server/src/modules/alert/alert.controller.ts`
- 检查：`server/src/modules/monitoring/monitoring.controller.ts`
- 检查：`client/src/api/monitoring.ts`
- 检查：`docs/module-usage/13-system-admin-ops.md`

---

## 任务 1：停止注册独立 `/alerts/*` Controller

**文件：**

- `server/src/modules/alert/alert.module.ts`

- [ ] 从 `AlertModule` 的 `controllers` 中移除 `AlertController`。
- [ ] 移除不再使用的 `AlertController` import。
- [ ] 保留 `AlertService` provider 和 export，因为 `MonitoringModule` 仍通过 `AlertModule` 使用它。
- [ ] 不从 `app.module.ts` 粗暴删除 `AlertModule`，除非构建证明它已经完全不需要且不会影响 `MonitoringModule`。

**验收：**

- Nest 不再注册 `/api/v1/alerts/*`。
- `/api/v1/monitoring/alerts/*` 仍由 `MonitoringController` 提供。

---

## 任务 2：确认前端只走权威路径

**文件：**

- `client/src/api/monitoring.ts`
- `client/src/views/monitoring/`

- [ ] 搜索 `client/src` 中是否仍有 `/alerts/` 或 `/api/v1/alerts` 调用。
- [ ] 确认告警规则、告警历史页面继续使用 `/monitoring/alerts/*`。
- [ ] 如果发现仍有前端调用 `/alerts/*`，只改成 `/monitoring/alerts/*`；不要新增新的 API adapter。

**验收：**

- `rg -n "'/alerts|\"/alerts|/api/v1/alerts" client/src` 无有效调用。

---

## 任务 3：更新模块使用文档

**文件：**

- `docs/module-usage/13-system-admin-ops.md`
- `docs/module-usage/99-current-gap-register.md`（仅按现有约定更新状态时才改）

- [ ] 在系统运维模块文档中说明：告警权威路径为 `/monitoring/alerts/*`。
- [ ] 将 `/alerts/*` 描述为已停止注册的旧路由。
- [ ] 不删除 GAP 历史记录，除非项目现有文档约定要求执行后同步关闭。

**验收：**

- 文档读者能明确知道后续只接 `/monitoring/alerts/*`。

---

## 任务 4：验证

运行：

```bash
rg -n "AlertController|controllers: \\[AlertController\\]|@Controller\\('alerts'\\)|monitoring/alerts" server/src/modules/alert server/src/modules/monitoring client/src docs/module-usage/13-system-admin-ops.md
npm run build:server
node tools/check-module-usage-docs.mjs
git diff --check
```

**最终回报必须包含：**

- 已确认使用 `superpowers:executing-plans`。
- 修改的文件列表。
- `/alerts/*` 是否仍被注册。
- `/monitoring/alerts/*` 是否保持不变。
- 验证命令结果。
