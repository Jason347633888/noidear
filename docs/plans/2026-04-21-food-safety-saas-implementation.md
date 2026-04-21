# 食品安全 SaaS 合并实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将食品安全管理 SaaS（48 个实体，260 份表单数字化）合并进 noidear，支持 BRCGS 追溯演练和微信小程序。

**Architecture:** 在 noidear 原地扩展，三阶段执行：先清理冗余模块，再加食品安全数据模型，最后按追溯链优先级逐批开发业务模块 + 微信小程序。

**Tech Stack:** NestJS 10 / Vue 3 / Prisma / PostgreSQL / Redis / MinIO / uni-app（小程序）

**Design Doc:** `docs/plans/2026-04-21-food-safety-saas-merge-design.md`

---

# 阶段一：清理冗余模块

---

### Task 1：删除 agent 模块

**Files:**
- Delete: `server/src/modules/agent/`（整个目录）
- Modify: `server/src/app.module.ts`

**Step 1: 删除 agent 目录**
```bash
rm -rf server/src/modules/agent
```

**Step 2: 从 app.module.ts 移除 AgentModule**

打开 `server/src/app.module.ts`，删除以下两行：
```typescript
// 删除这行 import
import { AgentModule } from './modules/agent/agent.module';

// 删除 imports 数组中的
AgentModule,
```

**Step 3: 验证编译无报错**
```bash
cd server && npx tsc --noEmit
```
Expected: 无报错

**Step 4: Commit**
```bash
git add -A && git commit -m "chore: 删除 agent/MCP 模块"
```

---

### Task 2：删除 recommendation 模块

**Files:**
- Delete: `server/src/modules/recommendation/`
- Modify: `server/src/app.module.ts`

**Step 1: 删除目录**
```bash
rm -rf server/src/modules/recommendation
```

**Step 2: 从 app.module.ts 移除 RecommendationModule**
```typescript
// 删除 import
import { RecommendationModule } from './modules/recommendation/recommendation.module';
// 删除 imports 数组中的
RecommendationModule,
```

**Step 3: 验证编译**
```bash
cd server && npx tsc --noEmit
```

**Step 4: Commit**
```bash
git add -A && git commit -m "chore: 删除 recommendation 模块"
```

---

### Task 3：删除 i18n 模块（后端）

**Files:**
- Delete: `server/src/modules/i18n/`
- Modify: `server/src/app.module.ts`

**Step 1: 删除目录**
```bash
rm -rf server/src/modules/i18n
```

**Step 2: 从 app.module.ts 移除 I18nAppModule**
```typescript
// 删除 import
import { I18nAppModule } from './modules/i18n/i18n.module';
// 删除 imports 数组中的
I18nAppModule,
```

**Step 3: 验证编译**
```bash
cd server && npx tsc --noEmit
```

**Step 4: Commit**
```bash
git add -A && git commit -m "chore: 删除 i18n 模块（中文市场，无需多语言）"
```

---

### Task 4：删除 todo 模块

**Files:**
- Delete: `server/src/modules/todo/`
- Modify: `server/src/app.module.ts`

**Step 1: 删除目录**
```bash
rm -rf server/src/modules/todo
```

**Step 2: 从 app.module.ts 移除 TodoModule**
```typescript
import { TodoModule } from './modules/todo/todo.module'; // 删除
TodoModule, // 删除
```

**Step 3: 验证编译**
```bash
cd server && npx tsc --noEmit
```

**Step 4: Commit**
```bash
git add -A && git commit -m "chore: 删除 todo 模块（并入 record-task）"
```

---

### Task 5：将 process 模块并入工作流引擎

process 模块（RD-001）本质是工作流引擎 + 表单的特例，直接用 workflow 配置即可。

**Files:**
- Delete: `server/src/modules/process/`
- Modify: `server/src/app.module.ts`

**Step 1: 备份 process 模块的 Prisma 模型（稍后手动迁移到 workflow）**
```bash
grep -n "ProcessTemplate\|ProcessInstance\|ProcessStepData" server/src/prisma/schema.prisma
```
记录这三个模型的定义，后续迁移时确认 workflow 模型已覆盖。

**Step 2: 删除目录**
```bash
rm -rf server/src/modules/process
```

**Step 3: 从 app.module.ts 移除 ProcessModule**
```typescript
import { ProcessModule } from './modules/process/process.module'; // 删除
ProcessModule, // 删除
```

**Step 4: 验证编译**
```bash
cd server && npx tsc --noEmit
```

**Step 5: Commit**
```bash
git add -A && git commit -m "chore: 删除独立 process 模块（并入 workflow 引擎）"
```

---

### Task 6：简化 search 模块（移除 ElasticSearch 依赖）

**Files:**
- Modify: `server/src/modules/search/search.service.ts`
- Modify: `server/src/modules/search/search.module.ts`
- Delete: `server/src/modules/search/elasticsearch.config.ts`

**Step 1: 查看当前 search.service.ts 的 ES 相关代码**
```bash
cat server/src/modules/search/search.service.ts
```

**Step 2: 修改 search.service.ts**

移除所有 `@elastic/elasticsearch` 相关 import 和逻辑，保留 PostgreSQL `$queryRaw` LIKE 搜索部分。最终 service 只保留：
```typescript
// 只保留 PostgreSQL 全文搜索方法
async searchDocuments(query: string, companyId: number) {
  return this.prisma.document.findMany({
    where: {
      company_id: companyId,
      deleted_at: null,
      OR: [
        { title: { contains: query } },
        { content_md: { contains: query } },
        { doc_code: { contains: query } },
      ],
    },
    take: 20,
  });
}
```

**Step 3: 删除 elasticsearch.config.ts**
```bash
rm server/src/modules/search/elasticsearch.config.ts
```

**Step 4: 从 server/package.json 移除 ES 依赖**
```bash
cd server && npm uninstall @elastic/elasticsearch
```

**Step 5: 验证编译**
```bash
npx tsc --noEmit
```

**Step 6: Commit**
```bash
git add -A && git commit -m "chore: 移除 ElasticSearch，改用 PostgreSQL 全文搜索"
```

---

### Task 7：更新 docker-compose，移除 ElasticSearch 容器

**Files:**
- Modify: `docker-compose.yml`

**Step 1: 查看当前 docker-compose.yml**
```bash
cat docker-compose.yml | grep -A 20 "elasticsearch"
```

**Step 2: 删除 elasticsearch service 块**

从 `docker-compose.yml` 中删除整个 `elasticsearch:` service 定义（包括其 volumes 引用）。

**Step 3: 检查其他 service 是否有 ES 依赖声明（depends_on）**
```bash
grep -n "elasticsearch" docker-compose.yml
```
如有残留，一并删除。

**Step 4: Commit**
```bash
git add docker-compose.yml && git commit -m "chore: 移除 docker-compose ElasticSearch 容器"
```

---

### Task 8：前端清理（删除 todo / search / i18n 相关文件）

**Files:**
- Delete: `client/src/views/todo/`
- Delete: `client/src/i18n/`
- Modify: `client/src/views/search/`（保留界面，移除 ES 逻辑）
- Modify: `client/src/router/index.ts`（删除对应路由）
- Modify: `client/src/main.ts`（移除 i18n 初始化）

**Step 1: 删除 todo 前端**
```bash
rm -rf client/src/views/todo
```

**Step 2: 删除 i18n 目录**
```bash
rm -rf client/src/i18n
```

**Step 3: 从 router/index.ts 移除 todo 和 i18n 相关路由**

打开 `client/src/router/index.ts`，搜索 `todo`、`i18n`，删除对应路由定义。

**Step 4: 从 main.ts 移除 i18n 初始化代码**

打开 `client/src/main.ts`，删除 `createI18n` 相关 import 和 `app.use(i18n)` 调用。

**Step 5: 验证前端编译**
```bash
cd client && npm run build 2>&1 | tail -20
```
Expected: 无报错

**Step 6: Commit**
```bash
git add -A && git commit -m "chore: 前端清理 todo/i18n/search(ES) 相关文件"
```

---

### Task 9：添加微信小程序登录到 auth 模块

**Files:**
- Modify: `server/src/modules/auth/auth.service.ts`
- Modify: `server/src/modules/auth/auth.controller.ts`
- Create: `server/src/modules/auth/dto/wechat-login.dto.ts`

**Step 1: 创建 DTO**
```typescript
// server/src/modules/auth/dto/wechat-login.dto.ts
import { IsString } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  code: string; // wx.login() 返回的 code
}
```

**Step 2: 在 auth.service.ts 添加微信登录方法**
```typescript
async wechatMiniProgramLogin(code: string) {
  // 1. 用 code 换取 openid
  const appId = this.configService.get('WECHAT_APP_ID');
  const appSecret = this.configService.get('WECHAT_APP_SECRET');
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

  const { data } = await this.httpService.get(url).toPromise();
  if (data.errcode) {
    throw new UnauthorizedException('微信登录失败：' + data.errmsg);
  }

  const { openid } = data;

  // 2. 查找或创建用户
  let user = await this.prisma.user.findFirst({
    where: { wechat_openid: openid },
  });

  if (!user) {
    throw new UnauthorizedException('该微信未绑定账号，请联系管理员');
  }

  // 3. 返回 JWT
  return {
    access_token: this.jwtService.sign({ sub: user.id, username: user.username }),
    user: { id: user.id, name: user.name, role: user.role },
  };
}
```

**Step 3: 在 auth.controller.ts 添加路由**
```typescript
@Public()
@Post('wechat/miniprogram')
wechatLogin(@Body() dto: WechatLoginDto) {
  return this.authService.wechatMiniProgramLogin(dto.code);
}
```

**Step 4: 在 .env 添加微信配置项（仅占位，实际值由运维填写）**
```bash
echo "WECHAT_APP_ID=your_appid_here" >> server/.env.example
echo "WECHAT_APP_SECRET=your_secret_here" >> server/.env.example
```

**Step 5: 验证编译**
```bash
cd server && npx tsc --noEmit
```

**Step 6: Commit**
```bash
git add -A && git commit -m "feat(auth): 新增微信小程序登录（wx.login code 换 JWT）"
```

---

### Task 10：阶段一验收

**Step 1: 启动后端，确认无崩溃**
```bash
cd server && npm run start:dev 2>&1 | head -30
```
Expected: `Application is running on port 3000`，无模块找不到报错

**Step 2: 启动前端，确认无编译错误**
```bash
cd client && npm run dev 2>&1 | head -20
```

**Step 3: 检查剩余模块数量**
```bash
ls server/src/modules/ | wc -l
```
Expected：原来 40 个模块，删除 5 个（agent/recommendation/i18n/todo/process）后剩 35 个

**Step 4: 最终 Commit**
```bash
git add -A && git commit -m "chore: 阶段一清理完成（移除5个冗余模块 + ES）"
```

---

# 阶段二：食品安全数据层

---

### Task 11：扩展现有 Prisma 模型（Document）

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Step 1: 找到 Document 模型位置**
```bash
grep -n "^model Document" server/src/prisma/schema.prisma
```

**Step 2: 在 Document 模型添加食品安全元数据字段**
```prisma
model Document {
  // ...（保留原有字段）...

  // 食品安全元数据（新增）
  doc_code        String?   // 文件编号，如 GRSS-CX-01-2024
  doc_level       String?   // 'level1'|'level2'|'level3'|'level4'
  department      String?   // 编制部门
  fill_frequency  String?   // 填写频率：每班/每日/每周/每批次/每月/每年
  retention_years Int?      // 保存年限
  reviewer        String?   // 审核人
  approver        String?   // 批准人
  effective_date  DateTime? // 生效日期
  content_md      String?   @db.Text // Markdown 正文（替代纯文件上传）
}
```

**Step 3: 生成迁移文件（不执行，先预览）**
```bash
cd server && npx prisma migrate dev --name add_document_food_safety_fields --create-only
```

**Step 4: 检查生成的 SQL**
```bash
cat server/src/prisma/migrations/*/migration.sql | tail -30
```

**Step 5: Commit**
```bash
git add -A && git commit -m "feat(schema): Document 模型新增食品安全元数据字段"
```

---

### Task 12：扩展现有模型（Material / MaterialBatch / ProductionBatch / Supplier）

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Step 1: 找到各模型位置**
```bash
grep -n "^model Material\b\|^model MaterialBatch\|^model ProductionBatch\|^model Supplier\b" server/src/prisma/schema.prisma
```

**Step 2: Material 模型新增字段**
```prisma
material_type   String  @default("raw") // 'raw'|'auxiliary'|'packaging'
is_allergen     Boolean @default(false)
allergen_notes  String?
shelf_life_days Int?
```

**Step 3: MaterialBatch 模型新增字段**
```prisma
supplier_lot_no       String?  // 供应商批号
storage_confirmed     Boolean  @default(false)
lot_status            String   @default("in_stock")
// lot_status: 'in_stock'|'consumed'|'nonconforming'|'quarantined'|'disposed'
```

**Step 4: ProductionBatch 模型新增字段**
```prisma
output_qty    Decimal? @db.Decimal(14,4)
loss_qty      Decimal  @default(0) @db.Decimal(14,4)
sample_qty    Decimal  @default(0) @db.Decimal(14,4)
waste_qty     Decimal  @default(0) @db.Decimal(14,4)
shift         String?  // 班次
production_line String?
released_by   Int?
released_at   DateTime?
```

**Step 5: Supplier 模型新增字段**
```prisma
supplier_status    String @default("approved")
// 'approved'|'suspended'|'eliminated'|'pending'
last_evaluated_at  DateTime?
```

**Step 6: 生成迁移文件**
```bash
cd server && npx prisma migrate dev --name extend_existing_models --create-only
```

**Step 7: Commit**
```bash
git add -A && git commit -m "feat(schema): 扩展 Material/MaterialBatch/ProductionBatch/Supplier 字段"
```

---

### Task 13：新增追溯链支撑模型

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Step 1: 追加以下模型到 schema.prisma 末尾**

```prisma
// ─── 追溯链支撑 ───────────────────────────────────

model SupplierDocument {
  id          Int      @id @default(autoincrement())
  company_id  Int
  supplier_id Int
  supplier    Supplier @relation(fields: [supplier_id], references: [id])
  doc_type    String   // 'business_license'|'food_production_permit'|'inspection_report'|'certificate'|'other'
  doc_name    String
  doc_no      String?
  issued_by   String?
  issued_at   DateTime?
  expires_at  DateTime?
  file_url    String?
  status      String   @default("valid") // 'valid'|'expiring_soon'|'expired'
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}

model IncomingInspection {
  id                Int          @id @default(autoincrement())
  company_id        Int
  material_batch_id Int
  material_batch    MaterialBatch @relation(fields: [material_batch_id], references: [id])
  inspected_at      DateTime
  inspector_id      Int?
  sample_qty        Decimal?     @db.Decimal(14,4)
  sample_unit       String?
  overall_result    String       // 'pass'|'fail'|'conditional_pass'
  disposition       String?
  disposition_by    Int?
  notes             String?
  results           IncomingInspectionResult[]
  created_at        DateTime     @default(now())
  updated_at        DateTime     @updatedAt
}

model IncomingInspectionResult {
  id            Int                @id @default(autoincrement())
  inspection_id Int
  inspection    IncomingInspection @relation(fields: [inspection_id], references: [id])
  item_name     String
  actual_value  String?
  is_pass       Boolean
}

model InventoryMovement {
  id              Int      @id @default(autoincrement())
  company_id      Int
  movement_type   String   // 'receive'|'issue_to_production'|'transfer'|'finished_goods_in'|'finished_goods_out'|'adjustment'
  object_type     String   // 'material_batch'|'production_batch'
  object_id       Int
  from_location   String?
  to_location     String?
  qty             Decimal  @db.Decimal(14,4)
  unit            String
  ref_type        String?
  ref_id          Int?
  operator_id     Int?
  moved_at        DateTime
  notes           String?
  created_at      DateTime @default(now())
}

model StockCount {
  id                Int           @id @default(autoincrement())
  company_id        Int
  count_date        DateTime      @db.Date
  location          String?
  material_batch_id Int
  material_batch    MaterialBatch @relation(fields: [material_batch_id], references: [id])
  book_qty          Decimal       @db.Decimal(14,4)
  actual_qty        Decimal       @db.Decimal(14,4)
  variance_reason   String?
  counter_id        Int?
  verifier_id       Int?
  created_at        DateTime      @default(now())
  updated_at        DateTime      @updatedAt
}

model DeliveryNote {
  id                    Int             @id @default(autoincrement())
  company_id            Int
  dn_no                 String          @unique
  production_batch_id   Int
  production_batch      ProductionBatch @relation(fields: [production_batch_id], references: [id])
  customer_name         String
  transporter_name      String?
  shipped_qty           Decimal         @db.Decimal(14,4)
  unit                  String
  ship_date             DateTime        @db.Date
  vehicle_plate         String?
  driver_name           String?
  receipt_status        String          @default("pending") // 'pending'|'signed'|'rejected'
  signed_at             DateTime?
  notes                 String?
  created_at            DateTime        @default(now())
  updated_at            DateTime        @updatedAt
}

model Sample {
  id                    Int             @id @default(autoincrement())
  company_id            Int
  production_batch_id   Int
  production_batch      ProductionBatch @relation(fields: [production_batch_id], references: [id])
  sample_qty            Decimal         @db.Decimal(14,4)
  unit                  String
  sampling_date         DateTime        @db.Date
  sampled_by            Int?
  location              String?
  retention_until       DateTime        @db.Date
  status                String          @default("retained") // 'retained'|'under_test'|'disposed'
  disposed_at           DateTime?
  notes                 String?
  created_at            DateTime        @default(now())
  updated_at            DateTime        @updatedAt
}
```

**Step 2: 生成迁移**
```bash
cd server && npx prisma migrate dev --name add_traceability_models --create-only
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(schema): 新增追溯链支撑模型（6个）"
```

---

### Task 14：新增产品/配方/CCP 模型

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Step 1: 追加以下模型**

```prisma
// ─── 产品/配方/CCP ────────────────────────────────

model Product {
  id          Int      @id @default(autoincrement())
  company_id  Int
  code        String
  name        String
  spec        String?
  net_weight  Decimal? @db.Decimal(12,4)
  weight_unit String?
  label_claims String?
  status      String   @default("active") // 'active'|'inactive'|'discontinued'
  recipes     Recipe[]
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  deleted_at  DateTime?
  @@unique([company_id, code])
}

model Recipe {
  id          Int           @id @default(autoincrement())
  company_id  Int
  product_id  Int
  product     Product       @relation(fields: [product_id], references: [id])
  version     Int           @default(1)
  version_note String?
  status      String        @default("draft") // 'draft'|'active'|'archived'
  approved_by Int?
  approved_at DateTime?
  lines       RecipeLine[]
  steps       ProcessStep[]
  created_at  DateTime      @default(now())
  updated_at  DateTime      @updatedAt
  @@unique([company_id, product_id, version])
}

model RecipeLine {
  id              Int     @id @default(autoincrement())
  recipe_id       Int
  recipe          Recipe  @relation(fields: [recipe_id], references: [id])
  material_id     Int
  qty_per_batch   Decimal @db.Decimal(14,4)
  unit            String
  is_critical     Boolean @default(false)
  notes           String?
}

model ProcessStep {
  id          Int      @id @default(autoincrement())
  company_id  Int
  recipe_id   Int
  recipe      Recipe   @relation(fields: [recipe_id], references: [id])
  seq         Int
  name        String
  description String?
  is_ccp      Boolean  @default(false)
  ccp_points  CCPPoint[]
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  @@unique([recipe_id, seq])
}

model CCPPoint {
  id                  Int          @id @default(autoincrement())
  company_id          Int
  process_step_id     Int
  process_step        ProcessStep  @relation(fields: [process_step_id], references: [id])
  ccp_no              String
  hazard_type         String       // 'biological'|'chemical'|'physical'
  control_measure     String
  critical_limit      String
  cl_min              Decimal?     @db.Decimal(14,4)
  cl_max              Decimal?     @db.Decimal(14,4)
  cl_unit             String?
  monitoring_method   String?
  monitoring_frequency String?
  corrective_action   String?
  records             CCPRecord[]
  created_at          DateTime     @default(now())
  updated_at          DateTime     @updatedAt
  @@unique([company_id, ccp_no])
}

model CCPRecord {
  id                    Int             @id @default(autoincrement())
  company_id            Int
  production_batch_id   Int
  production_batch      ProductionBatch @relation(fields: [production_batch_id], references: [id])
  ccp_point_id          Int
  ccp_point             CCPPoint        @relation(fields: [ccp_point_id], references: [id])
  measured_value        Decimal?        @db.Decimal(14,4)
  measured_text         String?
  unit                  String?
  is_within_cl          Boolean
  deviation_action      String?
  operator_id           Int
  verifier_id           Int?
  approved_by           Int?
  monitored_at          DateTime
  created_at            DateTime        @default(now())
}

model InspectionStandard {
  id           Int               @id @default(autoincrement())
  company_id   Int
  code         String
  name         String
  applies_to   String            // 'material'|'product'
  reference_doc String?
  version      String?
  status       String            @default("active")
  items        InspectionItem[]
  created_at   DateTime          @default(now())
  updated_at   DateTime          @updatedAt
  @@unique([company_id, code])
}

model InspectionItem {
  id          Int                @id @default(autoincrement())
  standard_id Int
  standard    InspectionStandard @relation(fields: [standard_id], references: [id])
  item_name   String
  test_method String?
  unit        String?
  spec_min    Decimal?           @db.Decimal(14,4)
  spec_max    Decimal?           @db.Decimal(14,4)
  spec_text   String?
  is_critical Boolean            @default(false)
}
```

**Step 2: 生成迁移**
```bash
cd server && npx prisma migrate dev --name add_product_recipe_ccp_models --create-only
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(schema): 新增 Product/Recipe/ProcessStep/CCP 模型"
```

---

### Task 15a：新增质量合规模型（6 个）

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Step 1: 追加以下 6 个模型到 schema.prisma 末尾**

```prisma
// ─── 质量合规 ─────────────────────────────────────

model NonConformance {
  id              Int      @id @default(autoincrement())
  company_id      Int
  nc_no           String
  source_type     String   // 'material_batch'|'production_batch'|'product'
  source_id       Int
  nc_type         String?
  description     String
  qty             Decimal? @db.Decimal(14,4)
  unit            String?
  discovered_at   DateTime
  discovered_by   Int?
  disposition     String?  // 'rework'|'destroy'|'concession'|'return'
  disposition_by  Int?
  disposition_at  DateTime?
  status          String   @default("open") // 'open'|'dispositioned'|'closed'
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  @@unique([company_id, nc_no])
}

model CorrectiveAction {
  id                  Int      @id @default(autoincrement())
  company_id          Int
  capa_no             String
  trigger_type        String   // 'non_conformance'|'customer_complaint'|'internal_audit'|'other'
  trigger_id          Int?
  description         String
  root_cause          String?
  corrective_action   String?
  preventive_action   String?
  due_date            DateTime? @db.Date
  responsible_id      Int?
  status              String   @default("open") // 'open'|'implementing'|'verifying'|'closed'
  verified_by         Int?
  verified_at         DateTime?
  closed_at           DateTime?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt
  @@unique([company_id, capa_no])
}

model CustomerComplaint {
  id                    Int      @id @default(autoincrement())
  company_id            Int
  complaint_no          String
  customer_name         String
  production_batch_id   Int?
  received_at           DateTime
  complaint_type        String?
  description           String
  status                String   @default("open")
  resolution            String?
  closed_at             DateTime?
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  @@unique([company_id, complaint_no])
}

model ReworkRecord {
  id                    Int      @id @default(autoincrement())
  company_id            Int
  production_batch_id   Int
  production_batch      ProductionBatch @relation(fields: [production_batch_id], references: [id])
  nc_id                 Int?
  rework_reason         String
  rework_qty            Decimal  @db.Decimal(14,4)
  unit                  String
  rework_process        String?
  rework_date           DateTime @db.Date
  operator_id           Int?
  quality_verdict       String   // 'pass'|'fail'
  verdict_by            Int?
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
}

model MeasuringEquipment {
  id                      Int      @id @default(autoincrement())
  company_id              Int
  code                    String
  name                    String
  model                   String?
  serial_no               String?
  location                String?
  calibration_cycle_days  Int?
  last_calibrated_at      DateTime? @db.Date
  next_calibration_at     DateTime? @db.Date
  status                  String   @default("normal") // 'normal'|'overdue'|'scrapped'
  calibration_records     CalibrationRecord[]
  created_at              DateTime @default(now())
  updated_at              DateTime @updatedAt
  @@unique([company_id, code])
}

model CalibrationRecord {
  id                      Int                @id @default(autoincrement())
  company_id              Int
  measuring_equipment_id  Int
  measuring_equipment     MeasuringEquipment @relation(fields: [measuring_equipment_id], references: [id])
  calibrated_at           DateTime           @db.Date
  valid_until             DateTime           @db.Date
  calibration_body        String?
  certificate_no          String?
  result                  String             // 'pass'|'fail'|'conditional'
  notes                   String?
  created_by              Int?
  created_at              DateTime           @default(now())
}
```

**Step 2: 生成迁移（仅创建，不执行）**
```bash
cd server && npx prisma migrate dev --name add_quality_compliance_models --create-only
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(schema): 新增质量合规模型（NonConformance/CAPA/CustomerComplaint/ReworkRecord/MeasuringEquipment/CalibrationRecord）"
```

---

### Task 15b：新增过程监控模型（4 个）

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Step 1: 追加以下 4 个模型到 schema.prisma 末尾**

```prisma
// ─── 过程监控 ─────────────────────────────────────

model EnvironmentRecord {
  id                    Int      @id @default(autoincrement())
  company_id            Int
  production_batch_id   Int?
  location              String
  record_type           String   // 'temperature_humidity'|'pressure_differential'|'other'
  temperature           Decimal? @db.Decimal(8,2)
  humidity              Decimal? @db.Decimal(8,2)
  pressure_diff         Decimal? @db.Decimal(8,2)
  is_within_spec        Boolean
  abnormal_action       String?
  measured_at           DateTime
  operator_id           Int?
  created_at            DateTime @default(now())
}

model ProcessRecord {
  id                    Int      @id @default(autoincrement())
  company_id            Int
  production_batch_id   Int
  production_batch      ProductionBatch @relation(fields: [production_batch_id], references: [id])
  param_name            String
  param_value           Decimal? @db.Decimal(14,4)
  param_text            String?
  unit                  String?
  spec_min              Decimal? @db.Decimal(14,4)
  spec_max              Decimal? @db.Decimal(14,4)
  is_within_spec        Boolean
  abnormal_action       String?
  measured_at           DateTime
  operator_id           Int?
  created_at            DateTime @default(now())
}

model MetalDetectionLog {
  id                    Int      @id @default(autoincrement())
  company_id            Int
  production_batch_id   Int
  production_batch      ProductionBatch @relation(fields: [production_batch_id], references: [id])
  fe_ball_spec          String?
  sus_ball_spec         String?
  al_ball_spec          String?
  fe_test_pass          Boolean
  sus_test_pass         Boolean
  al_test_pass          Boolean
  overall_pass          Boolean
  rejection_action      String?
  tested_at             DateTime
  operator_id           Int?
  created_at            DateTime @default(now())
}

model CleaningRecord {
  id              Int      @id @default(autoincrement())
  company_id      Int
  target_type     String   // 'area'|'equipment'|'utensil'|'facility'
  target_name     String
  cleaning_method String?
  disinfectant    String?
  concentration   String?
  cleaning_date   DateTime @db.Date
  operator_id     Int?
  verifier_id     Int?
  is_pass         Boolean
  notes           String?
  created_at      DateTime @default(now())
}
```

**Step 2: 生成迁移（仅创建，不执行）**
```bash
cd server && npx prisma migrate dev --name add_process_monitoring_models --create-only
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(schema): 新增过程监控模型（EnvironmentRecord/ProcessRecord/MetalDetectionLog/CleaningRecord）"
```

---

### Task 15c：新增人员合规 + 变更/废弃物/评估模型（11 个）

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Step 1: 追加以下 11 个模型到 schema.prisma 末尾**

```prisma
// ─── 人员合规 ─────────────────────────────────────

model ViolationRecord {
  id                       Int      @id @default(autoincrement())
  company_id               Int
  employee_id              Int
  violation_type           String
  description              String
  penalty                  String?
  corrective_requirement   String?
  occurred_at              DateTime
  recorded_by              Int?
  verification_result      String?
  verified_at              DateTime?
  created_at               DateTime @default(now())
  updated_at               DateTime @updatedAt
}

model MedicationRecord {
  id                    Int      @id @default(autoincrement())
  company_id            Int
  employee_id           Int
  drug_name             String
  dosage                String?
  reason                String?
  health_impact         String?
  fit_for_duty          Boolean
  assessed_by           Int?
  record_date           DateTime @db.Date
  created_at            DateTime @default(now())
}

model VisitorRecord {
  id              Int      @id @default(autoincrement())
  company_id      Int
  visitor_name    String
  visitor_org     String?
  visit_purpose   String?
  accompanied_by  Int?
  health_decl     Boolean  @default(false)
  entry_at        DateTime
  exit_at         DateTime?
  created_at      DateTime @default(now())
}

model EmergencyDrillRecord {
  id              Int      @id @default(autoincrement())
  company_id      Int
  drill_type      String   // 'fire'|'food_safety_incident'|'chemical_spill'|'traceability'|'other'
  drill_date      DateTime @db.Date
  participants    String?
  drill_result    String
  improvements    String?
  organizer_id    Int?
  created_at      DateTime @default(now())
}

// ─── 变更 / 废弃物 / 评估 ──────────────────────────

model ChangeEvent {
  id                    Int                       @id @default(autoincrement())
  company_id            Int
  change_no             String
  change_type           String                    // 'recipe'|'process'|'equipment'|'supplier'|'other'
  description           String
  reason                String
  applied_by            Int?
  applied_at            DateTime                  @db.Date
  status                String                    @default("pending")
  approved_by           Int?
  verifications         ChangeVerificationRecord[]
  created_at            DateTime                  @default(now())
  updated_at            DateTime                  @updatedAt
  @@unique([company_id, change_no])
}

model ChangeVerificationRecord {
  id                  Int         @id @default(autoincrement())
  company_id          Int
  change_event_id     Int
  change_event        ChangeEvent @relation(fields: [change_event_id], references: [id])
  verification_plan   String
  verification_result String
  verdict             String      // 'pass'|'fail'|'conditional'
  verified_by         Int?
  approved_by         Int?
  verified_at         DateTime    @db.Date
  created_at          DateTime    @default(now())
}

model WasteDisposalRecord {
  id               Int      @id @default(autoincrement())
  company_id       Int
  material_name    String
  lot_no           String?
  disposal_reason  String   // 'expired'|'non_conforming'|'damaged'|'other'
  qty              Decimal  @db.Decimal(14,4)
  unit             String
  disposal_method  String
  disposal_date    DateTime @db.Date
  operator_id      Int?
  witness_id       Int?
  notes            String?
  created_at       DateTime @default(now())
}

model WasteRecord {
  id                    Int      @id @default(autoincrement())
  company_id            Int
  production_batch_id   Int?
  waste_type            String
  qty                   Decimal  @db.Decimal(14,4)
  unit                  String
  shift                 String?
  disposal_destination  String?
  recorded_at           DateTime
  operator_id           Int?
  created_at            DateTime @default(now())
}

model SupplierEvaluation {
  id             Int      @id @default(autoincrement())
  company_id     Int
  supplier_id    Int
  supplier       Supplier @relation(fields: [supplier_id], references: [id])
  eval_period    String
  eval_date      DateTime @db.Date
  quality_score  Decimal? @db.Decimal(5,2)
  delivery_score Decimal? @db.Decimal(5,2)
  service_score  Decimal? @db.Decimal(5,2)
  total_score    Decimal? @db.Decimal(5,2)
  verdict        String   // 'approved'|'conditional'|'eliminated'
  evaluator_id   Int?
  notes          String?
  created_at     DateTime @default(now())
}

model DocumentIssuance {
  id          Int      @id @default(autoincrement())
  company_id  Int
  doc_code    String
  doc_name    String
  qty         Int      @default(1)
  purpose     String?
  issued_to   Int?
  issued_by   Int?
  issued_at   DateTime @db.Date
  created_at  DateTime @default(now())
}

model FragileItemInspection {
  id                    Int      @id @default(autoincrement())
  company_id            Int
  production_batch_id   Int?
  location              String?
  item_name             String
  total_qty             Int
  intact_qty            Int
  is_pass               Boolean
  damage_action         String?
  inspected_at          DateTime
  inspector_id          Int?
  created_at            DateTime @default(now())
}
```

**Step 2: 生成迁移（仅创建，不执行）**
```bash
cd server && npx prisma migrate dev --name add_personnel_change_waste_models --create-only
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(schema): 新增人员合规/变更/废弃物/评估模型（11个）"
```

---

### Task 16：执行所有迁移，验证数据库

**Step 1: 确认 Docker 数据库在运行**
```bash
docker ps | grep postgres
```

**Step 2: 执行所有 pending 迁移**
```bash
cd server && npx prisma migrate deploy
```
Expected: 所有迁移成功

**Step 3: 用 Prisma Studio 快速验证新表存在**
```bash
cd server && npx prisma studio
```
在浏览器打开 http://localhost:5555，确认左侧面板出现新增的模型。

**Step 4: 重新生成 Prisma Client**
```bash
cd server && npx prisma generate
```

**Step 5: 验证后端编译**
```bash
cd server && npx tsc --noEmit
```

**Step 6: 最终 Commit**
```bash
git add -A && git commit -m "feat(schema): 阶段二完成，食品安全数据层全部就绪（48 个实体）"
```

---

# 阶段三：业务模块开发（第一批：追溯链核心）

> 每个模块遵循 NestJS 标准结构：module → controller → service → dto
> 参考现有模块（如 `warehouse/`）的写法

---

### Task 17：来料检验模块（incoming-inspection）

**Files:**
- Create: `server/src/modules/incoming-inspection/incoming-inspection.module.ts`
- Create: `server/src/modules/incoming-inspection/incoming-inspection.controller.ts`
- Create: `server/src/modules/incoming-inspection/incoming-inspection.service.ts`
- Create: `server/src/modules/incoming-inspection/dto/create-inspection.dto.ts`
- Modify: `server/src/app.module.ts`

**Step 1: 创建 DTO**
```typescript
// dto/create-inspection.dto.ts
import { IsInt, IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateInspectionDto {
  @IsInt()
  material_batch_id: number;

  @IsOptional() @IsInt()
  standard_id?: number;

  @IsString()
  overall_result: string; // 'pass'|'fail'|'conditional_pass'

  @IsOptional() @IsString()
  disposition?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsArray()
  results: Array<{
    item_name: string;
    actual_value?: string;
    is_pass: boolean;
  }>;
}
```

**Step 2: 创建 Service（核心查询逻辑）**
```typescript
// incoming-inspection.service.ts
@Injectable()
export class IncomingInspectionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInspectionDto, companyId: number, inspectorId: number) {
    return this.prisma.incomingInspection.create({
      data: {
        company_id: companyId,
        material_batch_id: dto.material_batch_id,
        inspected_at: new Date(),
        inspector_id: inspectorId,
        overall_result: dto.overall_result,
        disposition: dto.disposition,
        notes: dto.notes,
        results: {
          create: dto.results,
        },
      },
      include: { results: true },
    });
  }

  async findByBatch(materialBatchId: number, companyId: number) {
    return this.prisma.incomingInspection.findMany({
      where: { material_batch_id: materialBatchId, company_id: companyId },
      include: { results: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
```

**Step 3: 创建 Controller**
```typescript
@ApiTags('来料检验')
@Controller('incoming-inspections')
@UseGuards(JwtAuthGuard)
export class IncomingInspectionController {
  constructor(private service: IncomingInspectionService) {}

  @Post()
  create(@Body() dto: CreateInspectionDto, @Request() req) {
    return this.service.create(dto, req.user.company_id, req.user.id);
  }

  @Get('batch/:batchId')
  findByBatch(@Param('batchId', ParseIntPipe) batchId: number, @Request() req) {
    return this.service.findByBatch(batchId, req.user.company_id);
  }
}
```

**Step 4: 在 app.module.ts 注册**
```typescript
import { IncomingInspectionModule } from './modules/incoming-inspection/incoming-inspection.module';
// 在 imports 数组中加入
IncomingInspectionModule,
```

**Step 5: 启动验证**
```bash
cd server && npm run start:dev 2>&1 | grep -E "IncomingInspection|error" | head -10
```

**Step 6: Commit**
```bash
git add -A && git commit -m "feat(be): 来料检验模块（incoming-inspection）"
```

---

### Task 18：追溯查询模块（traceability）

这是整个系统最核心的功能。

**Files:**
- Create: `server/src/modules/traceability/traceability.module.ts`
- Create: `server/src/modules/traceability/traceability.controller.ts`
- Create: `server/src/modules/traceability/traceability.service.ts`

**Step 1: 创建 Service（三个核心查询）**

```typescript
@Injectable()
export class TraceabilityService {
  constructor(private prisma: PrismaService) {}

  // 正向追溯：原料批次 → 生产批次 → 发货 → 客户
  async forwardTrace(materialBatchId: number, companyId: number) {
    const batch = await this.prisma.materialBatch.findFirst({
      where: { id: materialBatchId, company_id: companyId },
      include: {
        material: true,
        supplier: true,
        incoming_inspections: { include: { results: true } },
      },
    });

    // 通过 IngredientUsage 找到生产批次（BatchMaterialUsage 已有）
    const usages = await this.prisma.batchMaterialUsage.findMany({
      where: { material_batch_id: materialBatchId },
      include: {
        production_batch: {
          include: {
            delivery_notes: true,
          },
        },
      },
    });

    return { material_batch: batch, production_usages: usages };
  }

  // 反向追溯：生产批次 → 所有原料批次 → 供应商
  async backwardTrace(productionBatchId: number, companyId: number) {
    const batch = await this.prisma.productionBatch.findFirst({
      where: { id: productionBatchId, company_id: companyId },
    });

    const usages = await this.prisma.batchMaterialUsage.findMany({
      where: { production_batch_id: productionBatchId },
      include: {
        material_batch: {
          include: { material: true, supplier: true },
        },
      },
    });

    return { production_batch: batch, material_usages: usages };
  }

  // 物料平衡：投入量 vs 产出量 + 损耗 + 留样 + 废弃
  async materialBalance(productionBatchId: number, companyId: number) {
    const batch = await this.prisma.productionBatch.findFirst({
      where: { id: productionBatchId, company_id: companyId },
    });

    const usages = await this.prisma.batchMaterialUsage.findMany({
      where: { production_batch_id: productionBatchId },
    });

    const totalInput = usages.reduce((sum, u) => sum + Number(u.actual_qty), 0);
    const output = Number(batch?.output_qty ?? 0);
    const loss = Number(batch?.loss_qty ?? 0);
    const sample = Number(batch?.sample_qty ?? 0);
    const waste = Number(batch?.waste_qty ?? 0);
    const balance = totalInput - output - loss - sample - waste;

    return {
      production_batch: batch,
      total_input: totalInput,
      output,
      loss,
      sample,
      waste,
      balance,
      is_balanced: Math.abs(balance) < 0.01,
    };
  }
}
```

**Step 2: 创建 Controller**
```typescript
@ApiTags('追溯查询')
@Controller('traceability')
@UseGuards(JwtAuthGuard)
export class TraceabilityController {
  constructor(private service: TraceabilityService) {}

  @Get('forward/:materialBatchId')
  forwardTrace(@Param('materialBatchId', ParseIntPipe) id: number, @Request() req) {
    return this.service.forwardTrace(id, req.user.company_id);
  }

  @Get('backward/:productionBatchId')
  backwardTrace(@Param('productionBatchId', ParseIntPipe) id: number, @Request() req) {
    return this.service.backwardTrace(id, req.user.company_id);
  }

  @Get('balance/:productionBatchId')
  materialBalance(@Param('productionBatchId', ParseIntPipe) id: number, @Request() req) {
    return this.service.materialBalance(id, req.user.company_id);
  }
}
```

**Step 3: 注册模块，启动验证，Commit**
```bash
git add -A && git commit -m "feat(be): 追溯查询模块（正向/反向/物料平衡）"
```

---

### Task 19：前端 — 追溯查询页面

**Files:**
- Create: `client/src/views/traceability/TraceabilityQuery.vue`
- Create: `client/src/api/traceability.ts`
- Modify: `client/src/router/index.ts`

**Step 1: 创建 API 层**
```typescript
// client/src/api/traceability.ts
import request from '@/utils/request';

export const traceabilityApi = {
  forwardTrace: (materialBatchId: number) =>
    request.get(`/traceability/forward/${materialBatchId}`),
  backwardTrace: (productionBatchId: number) =>
    request.get(`/traceability/backward/${productionBatchId}`),
  materialBalance: (productionBatchId: number) =>
    request.get(`/traceability/balance/${productionBatchId}`),
};
```

**Step 2: 创建页面（基本结构）**

页面包含三个 Tab：正向追溯 / 反向追溯 / 物料平衡。每个 Tab 有一个输入框（批次号）+ 查询按钮 + 结果展示区（`el-timeline` 展示追溯链各节点）。

**Step 3: 添加路由**
```typescript
{
  path: '/traceability',
  name: 'Traceability',
  component: () => import('@/views/traceability/TraceabilityQuery.vue'),
  meta: { title: '追溯查询' }
}
```

**Step 4: 手动测试追溯查询**

启动前后端，录入测试数据后执行一次完整的正向追溯，确认链路完整。

**Step 5: Commit**
```bash
git add -A && git commit -m "feat(fe): 追溯查询页面（正向/反向/物料平衡）"
```

---

# 阶段四：微信小程序

---

### Task 20：初始化 uni-app 小程序项目

**Step 1: 在 noidear 根目录创建 uni-app 项目**
```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npx degit dcloudio/uni-preset-vue#vite-ts miniprogram
cd miniprogram && npm install
```

**Step 2: 配置 manifest.json**

打开 `miniprogram/src/manifest.json`，填写微信小程序 appid：
```json
{
  "mp-weixin": {
    "appid": "your_appid_here",
    "setting": { "urlCheck": false }
  }
}
```

**Step 3: 配置 API 基础地址**

创建 `miniprogram/src/utils/request.ts`，baseURL 指向后端：
```typescript
const BASE_URL = 'http://your-server-ip:3000';

export function request(options: any) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        Authorization: `Bearer ${uni.getStorageSync('token')}`,
        'Content-Type': 'application/json',
      },
      success: (res: any) => {
        if (res.statusCode === 200) resolve(res.data);
        else reject(res);
      },
      fail: reject,
    });
  });
}
```

**Step 4: Commit**
```bash
git add miniprogram && git commit -m "feat(miniprogram): 初始化 uni-app 微信小程序项目"
```

---

### Task 21：小程序微信登录

**Files:**
- Create: `miniprogram/src/pages/login/index.vue`
- Modify: `miniprogram/src/App.vue`

**Step 1: 登录页面**
```vue
<template>
  <view class="login-page">
    <image src="/static/logo.png" class="logo" />
    <text class="title">食品安全管理系统</text>
    <button class="login-btn" @click="handleLogin">微信一键登录</button>
  </view>
</template>

<script setup lang="ts">
import { request } from '@/utils/request';

async function handleLogin() {
  // 1. 获取微信 code
  const { code } = await new Promise<any>((resolve) => uni.login({ success: resolve }));

  // 2. 换取 JWT
  const res: any = await request({
    url: '/auth/wechat/miniprogram',
    method: 'POST',
    data: { code },
  });

  // 3. 存储 token，跳转首页
  uni.setStorageSync('token', res.data.access_token);
  uni.switchTab({ url: '/pages/index/index' });
}
</script>
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(miniprogram): 微信小程序登录"
```

---

### Task 22：小程序三个核心页面（表单填写/审批/看板）

每个页面骨架各一步，后续迭代完善细节。

**Step 1: 表单填写页（`pages/forms/index.vue`）**

- 列出当前用户待填的 `RecordTaskAssignment`
- 点击进入填写页，渲染动态表单字段
- 提交后调用 `/records` 接口

**Step 2: 审批页（`pages/approvals/index.vue`）**

- 列出当前用户待审批的 `Approval`
- 显示关联表单/文档内容
- 通过/驳回按钮调用 `/approvals/:id/approve` 或 `/approvals/:id/reject`

**Step 3: 数据看板页（`pages/dashboard/index.vue`）**

- 调用 `/statistics` 接口
- 用 uni-app 兼容的图表库（`@qiun/uni-charts`）展示：
  - 近 30 天每日产量折线图
  - 本月不合格品数量
  - 待办任务数量

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(miniprogram): 表单填写/审批/数据看板三个核心页面骨架"
```

---

# 阶段三续：业务模块开发（第二批：质量合规）

---

### Task 23：不合格品处置模块（non-conformance）

**Files:**
- Create: `server/src/modules/non-conformance/non-conformance.module.ts`
- Create: `server/src/modules/non-conformance/non-conformance.controller.ts`
- Create: `server/src/modules/non-conformance/non-conformance.service.ts`
- Create: `server/src/modules/non-conformance/dto/create-nc.dto.ts`
- Create: `client/src/views/non-conformance/NonConformanceList.vue`
- Create: `client/src/api/non-conformance.ts`
- Modify: `server/src/app.module.ts`
- Modify: `client/src/router/index.ts`

**Step 1: 创建 DTO**
```typescript
// dto/create-nc.dto.ts
import { IsInt, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateNcDto {
  @IsString() source_type: string;   // 'material_batch'|'production_batch'|'product'
  @IsInt()    source_id: number;
  @IsString() description: string;
  @IsOptional() @IsString() nc_type?: string;
  @IsOptional() @IsNumber() qty?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() disposition?: string;
}
```

**Step 2: 创建 Service**
```typescript
@Injectable()
export class NonConformanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNcDto, companyId: number, userId: number) {
    const count = await this.prisma.nonConformance.count({ where: { company_id: companyId } });
    const nc_no = `NC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.nonConformance.create({
      data: { ...dto, company_id: companyId, nc_no, discovered_by: userId, discovered_at: new Date() },
    });
  }

  async findAll(companyId: number, status?: string) {
    return this.prisma.nonConformance.findMany({
      where: { company_id: companyId, ...(status ? { status } : {}) },
      orderBy: { created_at: 'desc' },
    });
  }

  async dispose(id: number, disposition: string, companyId: number, userId: number) {
    return this.prisma.nonConformance.update({
      where: { id },
      data: { disposition, disposition_by: userId, disposition_at: new Date(), status: 'dispositioned' },
    });
  }
}
```

**Step 3: 创建 Controller**
```typescript
@ApiTags('不合格品')
@Controller('non-conformances')
@UseGuards(JwtAuthGuard)
export class NonConformanceController {
  constructor(private service: NonConformanceService) {}

  @Post()
  create(@Body() dto: CreateNcDto, @Request() req) {
    return this.service.create(dto, req.user.company_id, req.user.id);
  }

  @Get()
  findAll(@Query('status') status: string, @Request() req) {
    return this.service.findAll(req.user.company_id, status);
  }

  @Patch(':id/dispose')
  dispose(@Param('id', ParseIntPipe) id: number, @Body('disposition') disposition: string, @Request() req) {
    return this.service.dispose(id, disposition, req.user.company_id, req.user.id);
  }
}
```

**Step 4: 创建前端 API + 页面**
```typescript
// client/src/api/non-conformance.ts
export const ncApi = {
  create: (data: any) => request.post('/non-conformances', data),
  findAll: (status?: string) => request.get('/non-conformances', { params: { status } }),
  dispose: (id: number, disposition: string) => request.patch(`/non-conformances/${id}/dispose`, { disposition }),
};
```

页面包含：不合格品列表（el-table，按 status 筛选）、新建不合格品表单、处置操作弹窗。

**Step 5: 注册模块，添加路由，启动验证**
```bash
cd server && npm run start:dev 2>&1 | grep -E "NonConformance|error" | head -5
```

**Step 6: Commit**
```bash
git add -A && git commit -m "feat: 不合格品处置模块（non-conformance）后端 + 前端"
```

---

### Task 24：纠正措施模块（corrective-action）

**Files:**
- Create: `server/src/modules/corrective-action/` (module/controller/service/dto)
- Create: `client/src/views/corrective-action/CorrectiveActionList.vue`
- Create: `client/src/api/corrective-action.ts`
- Modify: `server/src/app.module.ts`
- Modify: `client/src/router/index.ts`

**Step 1: 创建 DTO**
```typescript
export class CreateCapaDto {
  @IsString() trigger_type: string;
  @IsOptional() @IsInt() trigger_id?: number;
  @IsString() description: string;
  @IsOptional() @IsString() root_cause?: string;
  @IsOptional() @IsString() corrective_action?: string;
  @IsOptional() @IsString() preventive_action?: string;
  @IsOptional() @IsString() due_date?: string;
  @IsOptional() @IsInt() responsible_id?: number;
}
```

**Step 2: 创建 Service（核心方法：create / findAll / close）**
```typescript
async create(dto: CreateCapaDto, companyId: number) {
  const count = await this.prisma.correctiveAction.count({ where: { company_id: companyId } });
  const capa_no = `CAPA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  return this.prisma.correctiveAction.create({
    data: { ...dto, company_id: companyId, capa_no },
  });
}

async close(id: number, verifiedBy: number) {
  return this.prisma.correctiveAction.update({
    where: { id },
    data: { status: 'closed', verified_by: verifiedBy, verified_at: new Date(), closed_at: new Date() },
  });
}
```

**Step 3: Controller / 前端页面 / 注册路由**

页面包含：CAPA 列表（按 status 筛选）、新建 CAPA 表单、关闭操作。

**Step 4: Commit**
```bash
git add -A && git commit -m "feat: 纠正措施模块（corrective-action）后端 + 前端"
```

---

### Task 25：顾客投诉模块（customer-complaint）

**Files:**
- Create: `server/src/modules/customer-complaint/` (module/controller/service/dto)
- Create: `client/src/views/customer-complaint/ComplaintList.vue`
- Create: `client/src/api/customer-complaint.ts`
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: DTO**
```typescript
export class CreateComplaintDto {
  @IsString() customer_name: string;
  @IsOptional() @IsInt() production_batch_id?: number;
  @IsString() description: string;
  @IsOptional() @IsString() complaint_type?: string;
}
```

**Step 2: Service（create / findAll / resolve）**
```typescript
async resolve(id: number, resolution: string) {
  return this.prisma.customerComplaint.update({
    where: { id },
    data: { resolution, status: 'closed', closed_at: new Date() },
  });
}
```

**Step 3: Controller / 前端 / 注册**

**Step 4: Commit**
```bash
git add -A && git commit -m "feat: 顾客投诉模块（customer-complaint）后端 + 前端"
```

---

### Task 26：CCP 监控模块（ccp）

**Files:**
- Create: `server/src/modules/ccp/` (module/controller/service/dto)
- Create: `client/src/views/ccp/CCPRecordForm.vue`
- Create: `client/src/api/ccp.ts`
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: DTO**
```typescript
export class CreateCcpRecordDto {
  @IsInt() production_batch_id: number;
  @IsInt() ccp_point_id: number;
  @IsOptional() @IsNumber() measured_value?: number;
  @IsOptional() @IsString() measured_text?: string;
  @IsOptional() @IsString() unit?: string;
  @IsBoolean() is_within_cl: boolean;
  @IsOptional() @IsString() deviation_action?: string;
}
```

**Step 2: Service（createRecord / findByBatch / findMissingCCPs）**

`findMissingCCPs` 比对该生产批次所属配方的所有 CCPPoint，返回尚未填写监控记录的 CCP 列表（用于 `CCP_RECORD_MISSING` 错误码）。

**Step 3: Controller / 前端（CCP 监控记录表单）/ 注册**

**Step 4: Commit**
```bash
git add -A && git commit -m "feat: CCP 监控模块（ccp）后端 + 前端"
```

---

# 阶段三续：业务模块开发（第三批：过程监控）

---

### Task 27：环境温湿度模块（environment-record）

**Files:**
- Create: `server/src/modules/environment-record/` (module/controller/service/dto)
- Create: `client/src/views/environment-record/EnvironmentRecordList.vue`
- Create: `client/src/api/environment-record.ts`
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: DTO**
```typescript
export class CreateEnvironmentRecordDto {
  @IsString() location: string;
  @IsString() record_type: string;
  @IsOptional() @IsNumber() temperature?: number;
  @IsOptional() @IsNumber() humidity?: number;
  @IsOptional() @IsNumber() pressure_diff?: number;
  @IsBoolean() is_within_spec: boolean;
  @IsOptional() @IsString() abnormal_action?: string;
  @IsOptional() @IsInt() production_batch_id?: number;
}
```

**Step 2: Service（create / findAll with date range filter）**

**Step 3: Controller / 前端（含趋势折线图，用 ECharts）/ 注册**

**Step 4: Commit**
```bash
git add -A && git commit -m "feat: 环境温湿度记录模块（environment-record）后端 + 前端"
```

---

### Task 28：过程参数 + 金属探测 + 清洁消毒（process-record / metal-detection / cleaning-record）

三个模块结构相近，合并为一个 Task 以减少上下文切换。

**Files:**
- Create: `server/src/modules/process-record/` (module/controller/service/dto)
- Create: `server/src/modules/metal-detection/` (module/controller/service/dto)
- Create: `server/src/modules/cleaning-record/` (module/controller/service/dto)
- Create: 对应三个前端页面
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: ProcessRecord DTO + Service + Controller**
```typescript
export class CreateProcessRecordDto {
  @IsInt() production_batch_id: number;
  @IsString() param_name: string;
  @IsOptional() @IsNumber() param_value?: number;
  @IsOptional() @IsString() unit?: string;
  @IsBoolean() is_within_spec: boolean;
  @IsOptional() @IsString() abnormal_action?: string;
}
```

**Step 2: MetalDetectionLog DTO + Service + Controller**
```typescript
export class CreateMetalDetectionDto {
  @IsInt() production_batch_id: number;
  @IsBoolean() fe_test_pass: boolean;
  @IsBoolean() sus_test_pass: boolean;
  @IsBoolean() al_test_pass: boolean;
  @IsBoolean() overall_pass: boolean;
  @IsOptional() @IsString() rejection_action?: string;
}
```

**Step 3: CleaningRecord DTO + Service + Controller**
```typescript
export class CreateCleaningRecordDto {
  @IsString() target_type: string;
  @IsString() target_name: string;
  @IsOptional() @IsString() cleaning_method?: string;
  @IsOptional() @IsString() disinfectant?: string;
  @IsBoolean() is_pass: boolean;
  @IsOptional() @IsString() notes?: string;
}
```

**Step 4: 前端页面（三个简单列表 + 新建表单）**

**Step 5: 注册三个模块，启动验证**

**Step 6: Commit**
```bash
git add -A && git commit -m "feat: 过程参数/金属探测/清洁消毒模块后端 + 前端"
```

---

# 阶段三续：业务模块开发（第四批：人员/设备/合规）

---

### Task 29：测量设备 + 校准记录模块（measuring-equipment）

**Files:**
- Create: `server/src/modules/measuring-equipment/` (module/controller/service/dto)
- Create: `client/src/views/measuring-equipment/EquipmentList.vue`
- Create: `client/src/api/measuring-equipment.ts`
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: DTO（设备 + 校准记录各一个）**
```typescript
export class CreateEquipmentDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsInt() calibration_cycle_days?: number;
}

export class CreateCalibrationDto {
  @IsInt() measuring_equipment_id: number;
  @IsString() calibrated_at: string;
  @IsString() valid_until: string;
  @IsString() result: string;
  @IsOptional() @IsString() certificate_no?: string;
}
```

**Step 2: Service（设备 CRUD + 校准记录 create + 到期预警查询）**

到期预警：
```typescript
async findOverdue(companyId: number) {
  return this.prisma.measuringEquipment.findMany({
    where: {
      company_id: companyId,
      next_calibration_at: { lte: new Date() },
      status: { not: 'scrapped' },
    },
  });
}
```

**Step 3: Controller / 前端（设备列表 + 校准记录子列表 + 到期预警标红）/ 注册**

**Step 4: Commit**
```bash
git add -A && git commit -m "feat: 测量设备 + 校准记录模块后端 + 前端"
```

---

### Task 30：员工违规 + 用药记录模块（violation-record / medication-record）

两个结构简单的人员合规模块，合并执行。

**Files:**
- Create: `server/src/modules/violation-record/` (module/controller/service/dto)
- Create: `server/src/modules/medication-record/` (module/controller/service/dto)
- Create: 对应两个前端页面
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: ViolationRecord DTO + Service + Controller**
```typescript
export class CreateViolationDto {
  @IsInt() employee_id: number;
  @IsString() violation_type: string;
  @IsString() description: string;
  @IsOptional() @IsString() penalty?: string;
  @IsOptional() @IsString() corrective_requirement?: string;
}
```

**Step 2: MedicationRecord DTO + Service + Controller**
```typescript
export class CreateMedicationDto {
  @IsInt() employee_id: number;
  @IsString() drug_name: string;
  @IsBoolean() fit_for_duty: boolean;
  @IsOptional() @IsString() health_impact?: string;
}
```

**Step 3: 前端页面 / 注册 / Commit**
```bash
git add -A && git commit -m "feat: 员工违规 + 用药记录模块后端 + 前端"
```

---

### Task 31：供应商评估模块（supplier-evaluation）

**Files:**
- Create: `server/src/modules/supplier-evaluation/` (module/controller/service/dto)
- Create: `client/src/views/supplier-evaluation/EvaluationList.vue`
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: DTO**
```typescript
export class CreateEvaluationDto {
  @IsInt()    supplier_id: number;
  @IsString() eval_period: string;
  @IsOptional() @IsNumber() quality_score?: number;
  @IsOptional() @IsNumber() delivery_score?: number;
  @IsOptional() @IsNumber() service_score?: number;
  @IsString() verdict: string;  // 'approved'|'conditional'|'eliminated'
  @IsOptional() @IsString() notes?: string;
}
```

**Step 2: Service（create + findBySupplier + 更新供应商状态）**

创建评估后，若 verdict 为 'eliminated' 则同步更新 Supplier.supplier_status：
```typescript
if (dto.verdict === 'eliminated') {
  await this.prisma.supplier.update({
    where: { id: dto.supplier_id },
    data: { supplier_status: 'eliminated', last_evaluated_at: new Date() },
  });
}
```

**Step 3: Controller / 前端 / 注册 / Commit**
```bash
git add -A && git commit -m "feat: 供应商评估模块后端 + 前端"
```

---

### Task 32：变更管理模块（change-event）

**Files:**
- Create: `server/src/modules/change-event/` (module/controller/service/dto)
- Create: `client/src/views/change-event/ChangeEventList.vue`
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: DTO（变更申请 + 变更验证各一个）**
```typescript
export class CreateChangeEventDto {
  @IsString() change_type: string;
  @IsString() description: string;
  @IsString() reason: string;
  @IsOptional() @IsString() applied_at?: string;
}

export class CreateVerificationDto {
  @IsInt()    change_event_id: number;
  @IsString() verification_plan: string;
  @IsString() verification_result: string;
  @IsString() verdict: string;
  @IsOptional() @IsInt() verified_by?: number;
}
```

**Step 2: Service（create + addVerification + approve）**

**Step 3: Controller / 前端 / 注册 / Commit**
```bash
git add -A && git commit -m "feat: 变更管理模块后端 + 前端"
```

---

### Task 33：废弃物管理模块（waste）

**Files:**
- Create: `server/src/modules/waste/` (module/controller/service/dto)
- Create: `client/src/views/waste/WasteList.vue`
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: DTO（WasteDisposalRecord + WasteRecord 各一个）**
```typescript
export class CreateWasteDisposalDto {
  @IsString() material_name: string;
  @IsString() disposal_reason: string;
  @IsNumber() qty: number;
  @IsString() unit: string;
  @IsString() disposal_method: string;
  @IsOptional() @IsString() lot_no?: string;
  @IsOptional() @IsInt() witness_id?: number;
}

export class CreateWasteRecordDto {
  @IsString() waste_type: string;
  @IsNumber() qty: number;
  @IsString() unit: string;
  @IsOptional() @IsInt() production_batch_id?: number;
  @IsOptional() @IsString() disposal_destination?: string;
}
```

**Step 2: Service（两类废弃物各自的 create + findAll）**

**Step 3: Controller / 前端 / 注册 / Commit**
```bash
git add -A && git commit -m "feat: 废弃物管理模块后端 + 前端"
```

---

### Task 34：访客登记 + 应急演练模块（visitor-record / emergency-drill）

两个结构简单的合规模块，合并执行。

**Files:**
- Create: `server/src/modules/visitor-record/` (module/controller/service/dto)
- Create: `server/src/modules/emergency-drill/` (module/controller/service/dto)
- Create: 对应两个前端页面
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`

**Step 1: VisitorRecord DTO + Service + Controller**
```typescript
export class CreateVisitorDto {
  @IsString() visitor_name: string;
  @IsOptional() @IsString() visitor_org?: string;
  @IsOptional() @IsString() visit_purpose?: string;
  @IsBoolean() health_decl: boolean;
}
```

**Step 2: EmergencyDrillRecord DTO + Service + Controller**
```typescript
export class CreateDrillDto {
  @IsString() drill_type: string;
  @IsString() drill_result: string;
  @IsOptional() @IsString() participants?: string;
  @IsOptional() @IsString() improvements?: string;
}
```

**Step 3: 前端页面 / 注册 / Commit**
```bash
git add -A && git commit -m "feat: 访客登记 + 应急演练模块后端 + 前端"
```

---

# 验收标准

- [ ] 阶段一（Task 1-10）：后端/前端编译无报错，Docker 不再启动 ES 容器
- [ ] 阶段二（Task 11-16）：Prisma Studio 中可见全部 48 个模型，迁移无报错
- [ ] 阶段三第一批（Task 17-19）：可通过 API 完成一次完整的正向追溯（原料批次 → 生产批次 → 发货）
- [ ] 阶段三第二批（Task 23-26）：不合格品 + CAPA + CCP 记录可正常新建
- [ ] 阶段三第三批（Task 27-28）：环境温湿度/过程参数/金属探测记录可正常填写
- [ ] 阶段三第四批（Task 29-34）：设备校准到期预警正常显示，供应商评估后状态同步
- [ ] 阶段四（Task 20-22）：微信小程序可登录，可填写一张四级记录表单并提交
