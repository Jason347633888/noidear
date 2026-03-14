# Agent-Native MCP 架構設計

**日期**：2026-03-14
**狀態**：已確認，待實現
**優先級**：P1

---

## 背景與目標

### 問題

當前 Claude Code 維護這個項目的方式效率低：
- 通過 Chrome DevTools MCP 逐一點擊 UI 驗證功能
- 無法自主發現系統問題
- 無法直接操作業務邏輯，需要人工中轉

### 目標

讓 Claude 成為系統的全權代理：
- 你說「幫我走一遍研發流程」→ Claude 自主調 API 完成，返回結果
- 你說「系統有沒有問題」→ Claude 跑測試 + 分析日誌，輸出報告
- 你說「修好後驗證一下」→ Claude 自主驗證並確認

---

## 核心架構決策

### MCP 定位：API 代理 + 發現層（非 1:1 映射）

**反模式（不做）**：
```
每個 API → 對應一個 MCP 工具
問題：每次新增功能都要同步維護 MCP，三份東西脫節
```

**正確模式（採用）**：
```
MCP 只有 ~10 個永久穩定的元工具
新功能上線 → 只需完善 Swagger 描述
Claude 通過 discover() 自動感知新能力
```

**核心原則**：Swagger 文檔是 Claude 的「API 地圖」，MCP 工具是「手和腳」。
地圖質量決定 Claude 的自主能力，而非工具數量。

---

## 五層架構

```
┌─────────────────────────────────────────┐
│  Layer 1: Knowledge Layer               │
│  llms.txt / BUSINESS_RULES.md /         │
│  AGENT_GUIDE.md                         │
├─────────────────────────────────────────┤
│  Layer 2: Semantic API Layer            │
│  Swagger 語義化描述 + 機器可讀錯誤碼    │
├─────────────────────────────────────────┤
│  Layer 3: MCP Server (noidear-mcp)      │
│  discover / call_api / devops / testing │
├─────────────────────────────────────────┤
│  Layer 4: E2E Test Suite                │
│  Playwright 覆蓋核心業務流程            │
├─────────────────────────────────────────┤
│  Layer 5: Agent Observability           │
│  AgentAction 審計日誌                   │
└─────────────────────────────────────────┘
```

---

## 詳細設計

### Layer 1：Knowledge Layer

#### `/llms.txt`（項目根目錄）
```
# noidear 质量管理系统 - Agent 入口

## 系统能力
- 产品研发9步流程（含HACCP审批）
- 仓库管理（物料/批次/FIFO出库）
- 文档三级管理 + 审批工作流
- 批次追溯、偏差检测、统计分析

## API 入口
REST API: http://localhost:3000/api/v1
完整文档: http://localhost:3000/api/docs（Swagger UI）
认证方式: POST /auth/login → Bearer JWT（有效期7天）

## MCP 工具
server: noidear-mcp
配置参考: /tools/noidear-mcp/README.md

## 关键约束
- Step7/8 审批需 HACCP/admin/manager 角色
- 物料出库遵循 FIFO（不可指定批次）
- 研发流程步骤必须顺序推进，不可跳步
详见: /docs/BUSINESS_RULES.md
```

#### `docs/BUSINESS_RULES.md`
業務規則外置文檔（非代碼），給 Agent 讀懂業務約束：
- 研發流程規則（步驟順序/審批/驳回/草稿）
- 倉庫規則（FIFO/安全庫存/批次追溯）
- 權限規則（角色/操作邊界）
- 數據規則（不可逆操作清單）

#### `docs/AGENT_GUIDE.md`
給 Agent 的操作手冊：
- 常用操作的最短路徑（如何在最少工具調用內完成任務）
- 已知限制和繞過方式
- 測試賬號和角色說明

---

### Layer 2：Semantic API Layer

#### Swagger 描述規範
每個 API 端點的 `@ApiOperation` 必須包含：
```typescript
@ApiOperation({
  summary: '一句話描述操作',
  description: `
    业务语义：[這個操作在業務上意味著什麼]
    前置条件：[調用前必須滿足什麼]
    副作用：[調用後系統狀態如何變化]
    例外情况：[什麼情況下行為不同]
  `
})
```

#### 機器可讀錯誤碼規範
```typescript
// 所有業務異常統一結構
{
  code: 'WRONG_STEP',          // 機器可讀錯誤碼
  message: '步骤不匹配',        // 人類可讀描述
  context: { current: 3, attempted: 5 },  // 現場數據
  fix: '请先提交 step 3'        // 修復建議
}
```

錯誤碼規範：`MODULE_ERROR_TYPE`，如：
- `PROCESS_WRONG_STEP`
- `PROCESS_NOT_SUBMITTABLE`
- `WAREHOUSE_INSUFFICIENT_STOCK`
- `AUTH_INSUFFICIENT_ROLE`

---

### Layer 3：MCP Server

#### 項目結構
```
tools/noidear-mcp/
  src/
    auth/
      token-manager.ts    # 自動登錄 + token 刷新（雙模式：admin / 指定角色）
    tools/
      discover.ts         # discover() - 讀 Swagger，返回可用操作
      call-api.ts         # call_api() / call_api_as() - 通用執行器
      devops.ts           # health_check / get_logs / query_db / restart / migrate
      testing.ts          # run_tests / get_test_report
    utils/
      swagger-parser.ts   # 解析 Swagger JSON，格式化給 Claude
    index.ts              # MCP server 入口
  package.json
  tsconfig.json
  README.md
```

#### 工具清單（最終穩定版，~10個）

**發現層**
```typescript
discover(module?: string)
// 讀取 /api/docs-json，返回格式化的操作清單
// module 可選過濾：'process' | 'warehouse' | 'document' | 'all'
// 返回：{ module, endpoints: [{ path, method, summary, params }] }
```

**執行層**
```typescript
call_api(path: string, method: string, body?: object, query?: object)
// 以 admin 身份調用任意 API 端點
// 自動處理認證、錯誤格式化

call_api_as(role: string, path: string, method: string, body?: object)
// 以指定角色調用（模擬業務場景）
// role: 'admin' | 'haccp' | 'manager' | userId
```

**運維層**
```typescript
health_check()
// 返回：{ postgres, redis, minio, server, client, overall }

get_logs(service: 'server'|'client', lines?: number, level?: 'error'|'warn'|'all')
// 過濾並返回關鍵日誌，預設只返回 ERROR/WARN

query_db(sql: string)
// 只讀查詢（SELECT only），用於診斷
// 拒絕 INSERT/UPDATE/DELETE/DROP

restart_service(service: string)
// 重啟指定 Docker 容器

run_migration(name?: string)
// 執行 Prisma migrate deploy
```

**測試層**
```typescript
run_tests(flow?: string)
// flow: 'all' | 'process' | 'warehouse' | 'document' | 'auth'
// 觸發 Playwright E2E + 等待結果
// 返回：{ passed, failed, duration, failures: [{ test, error, screenshot }] }

get_test_report()
// 返回最近一次測試結果（不重新跑）
```

#### 認證雙模式
```typescript
// 模式 A：Admin 模式（默認）
// MCP 啟動時自動以 admin 登錄，全局持有 token

// 模式 B：角色模式
// call_api_as('haccp', ...) 時臨時以 haccp 賬號登錄
// 用於測試角色權限邊界
```

---

### Layer 4：E2E Test Suite

#### 覆蓋範圍
```
client/e2e/
  flows/
    auth.spec.ts              # 登錄/登出/token 過期
    process-full.spec.ts      # Step1→Step9 完整走通（戚風分蛋工藝）
    process-draft.spec.ts     # 草稿保存 → 列表查找 → 恢復繼續
    process-approval.spec.ts  # Step7/8 HACCP 審批 + 驳回流程
    warehouse-material.spec.ts # 物料選擇彈窗、搜索、添加
    warehouse-inbound.spec.ts  # 入庫操作
    document.spec.ts          # 文檔上傳/查詢
  helpers/
    login.ts                  # 多角色登錄工具
    seed.ts                   # 測試前數據準備
    cleanup.ts                # 測試後數據清理
  playwright.config.ts
```

#### 測試結果格式（給 Claude 讀）
```json
{
  "summary": { "passed": 18, "failed": 2, "duration": "45s" },
  "failures": [
    {
      "test": "process-draft > 保存草稿後列表可見",
      "error": "Expected 1 item, got 0",
      "file": "process-draft.spec.ts:34",
      "screenshotPath": "e2e/artifacts/draft-list.png"
    }
  ]
}
```

---

### Layer 5：Agent Observability

#### 數據庫新增表 `AgentAction`
```prisma
model AgentAction {
  id          String   @id @default(cuid())
  timestamp   DateTime @default(now())
  tool        String   // 'call_api' | 'run_tests' | ...
  path        String?  // API 路徑
  method      String?  // HTTP 方法
  params      Json?    // 調用參數（敏感字段脫敏）
  result      String   // 'success' | 'error'
  errorCode   String?
  executedAs  String   // 'admin' | userId | role
  durationMs  Int
  sessionId   String?  // Claude 對話 session
}
```

用途：
- 審計 Claude 做了什麼操作
- 出問題回溯根因
- 統計 Claude 的操作模式優化 MCP

---

## 擴展性保證

| 場景 | 是否需要更新 MCP | 說明 |
|------|----------------|------|
| 新增業務功能/API | ❌ | discover() + call_api() 自動覆蓋 |
| 後端 API 重命名 | ❌ | Swagger 自動同步 |
| 新增複合業務操作 | 可選 ✅ | 添加語義工具提升效率，非必須 |
| 運維基礎設施變化 | ✅ | 更新 devops 工具 |
| 新增測試流程 | ✅ | 添加 E2E spec 文件 |

**核心原則**：API 進化 → Swagger 更新 → Claude 自動知道。MCP 工具集長期穩定。

---

## 實現順序

```
Phase 1：基礎（讓 Claude 能操作）
  P1-1. llms.txt + BUSINESS_RULES.md      ← 1天
  P1-2. noidear-mcp 核心工具              ← 3天
  P1-3. Claude Code 本地配置 MCP          ← 半天

Phase 2：測試（讓 Claude 能發現問題）
  P2-1. Playwright E2E 核心流程           ← 3天
  P2-2. MCP testing 工具接入 Playwright   ← 1天

Phase 3：語義化（讓 Claude 更精準）
  P3-1. Swagger 描述升級（所有 API）      ← 2天
  P3-2. 機器可讀錯誤碼規範落地           ← 2天

Phase 4：可觀測（讓操作可審計）
  P4-1. AgentAction 日誌表 + 記錄         ← 1天
```

---

## 成功標準

- [ ] Claude 通過 MCP 可以完整走完研發流程 9 步
- [ ] Claude 說「跑一遍測試」→ 返回結構化報告
- [ ] 新增一個後端 API → Claude 不需要 MCP 更新即可調用
- [ ] 所有 MCP 操作有 AgentAction 審計記錄
- [ ] `llms.txt` 在項目根目錄且完整描述系統能力
