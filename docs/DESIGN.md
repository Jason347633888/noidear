# 文档管理系统 - 完整需求设计文档

> **源表单口径**: 当前四级记录表单口径以 `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单` 为唯一事实源；截至2026-04-23，源表单为283张。`SaaS产品构思` 是字段映射和产品语义参考层，项目实现以 `noidear` 为落地点。
>
> 最后更新: 2026-04-23
> 文档版本: 10.7 ⭐ **P1 技术债务完整方案（API + 业务规则 + 前端界面）**
> 文档行数: ~20,000 行
> **架构升级**: 自底向上分层设计，明确依赖关系，核心引擎完整定义
> **业务规则**: 基于用户详细业务规则，共 113 条细化规则（BR-1.1 ~ BR-1.60, BR-281 ~ BR-359）
> **前端交互**: 完整的 UI/UX 交互规范，覆盖 7 大模块，详见 [INTERACTION_DESIGN.md](./INTERACTION_DESIGN.md)
> **MVP 状态**: Phase 1-6 完成 98.1%（51/52 Issue）| 已有基础代码库 | 技术栈已确立
> **技术债务**: P1-1/P1-2/P1-3 完整方案已补充（数据模型 + API + 业务规则 + 前端界面）
> **状态**: Layer 0-1 完整定义 | Layer 2-4 依赖关系明确 | 8 个 P0 问题修复完成 | 所有待确认细节已明确 | 前端交互规范完成 | 技术债务完整方案完成

---

## 🚀 MVP 实现状态追踪（v10.6 新增）

> **重要说明**: 本项目已完成 MVP Phase 1-6 的 98.1% 功能（51/52 Issue），具备完整的 Vue 3 + Element Plus + NestJS + Prisma 技术栈基础。本节用于追踪已实现功能与待实现功能，指导增量开发。

### 📊 Phase 1-6 核心功能实现状态

| Phase | 模块 | 功能点 | 实现状态 | 代码位置 | 备注 |
|-------|------|--------|---------|---------|------|
| **Phase 1** | **用户管理** | 用户CRUD | ✅ 已实现 | `server/src/modules/user/`<br>`client/src/views/user/` | 含登录/注册/权限 |
| Phase 1 | 用户管理 | 组织架构 | ✅ 已实现 | `server/src/modules/department/`<br>`client/src/views/department/` | 树形结构 |
| **Phase 2** | **文档管理** | 三级文档CRUD | ✅ 已实现 | `server/src/modules/document/`<br>`client/src/views/document/` | 一/二/三级文件 |
| Phase 2 | 文档管理 | 文件上传（MinIO） | ✅ 已实现 | `server/src/modules/file/` | 支持 PDF/Word/Excel |
| Phase 2 | 文档管理 | 版本控制 | ✅ 已实现 | `Document.version` 字段 | 自动版本号生成 |
| Phase 2 | 文档管理 | 文档预览（PDF） | ✅ 已实现 | `client/src/components/PdfViewer.vue` | 原生 PDF 预览 |
| **Phase 3** | **审批流程** | 单级审批 | ✅ 已实现 | `server/src/modules/approval/`<br>`client/src/views/approval/` | 文档审批 |
| Phase 3 | 审批流程 | 审批记录 | ✅ 已实现 | `Approval` 表 | 完整审批链 |
| **Phase 4** | **模板管理** | 四级模板CRUD | ✅ 已实现 | `server/src/modules/template/`<br>`client/src/views/template/` | 动态字段配置 |
| Phase 4 | 模板管理 | 字段类型支持 | ✅ 已实现 | 20+ 字段类型 | 文本/数字/日期/下拉等 |
| **Phase 5** | **任务管理** | 任务派发 | ✅ 已实现 | `server/src/modules/task/`<br>`client/src/views/task/` | 任务分配到人 |
| Phase 5 | 任务管理 | 任务填报 | ✅ 已实现 | 动态表单填写 | 基于模板字段 |
| **Phase 6** | **通知系统** | 站内消息 | ✅ 已实现 | `server/src/modules/notification/`<br>`client/src/views/notification/` | 实时通知 |
| Phase 6 | 通知系统 | 消息已读/未读 | ✅ 已实现 | `Notification.read` 字段 | - |
| **Phase 7** | **偏离检测** | 公差配置 | ✅ 已实现 | `TemplateField.tolerance` | 范围/百分比 |
| Phase 7 | 偏离检测 | 自动偏离检测 | ✅ 已实现 | 填报时自动检测 | - |
| Phase 7 | 偏离检测 | 偏离报告生成 | ✅ 已实现 | `DeviationReport` 表 | - |
| **Phase 9** | **数据导出** | Excel 批量导出 | ✅ 已实现 | `server/src/modules/export/` | 文档/任务/偏离 |
| Phase 9 | 数据导出 | 动态列支持 | ✅ 已实现 | ExcelJS 生成 | - |
| **Phase 12** | **偏离统计** | 偏离趋势分析 | ✅ 已实现 | `client/src/views/statistics/` | ECharts 图表 |
| Phase 12 | 偏离统计 | 字段分布统计 | ✅ 已实现 | 饼图展示 | - |
| Phase 12 | 偏离统计 | 部门偏离率 | ✅ 已实现 | 柱状图对比 | - |
| **其他** | **回收站** | 软删除功能 | ✅ 已实现 | `deleted_at` 字段 | 所有核心表支持 |
| 其他 | 回收站 | 回收站UI | ⏳ **未完成** | - | **仅剩的 1/52 Issue** |

**完成度统计**:
- ✅ **已实现**: 51 个功能点（98.1%）
- ⏳ **未完成**: 1 个功能点（1.9%）- 回收站UI

**Phase 8/10/11 设计完成但未实施**:
- Phase 8: 偏离检测（部分已实现）
- Phase 10: 二级审批流程（PRD 已完成，见第十六章）
- Phase 11: 文件预览（PDF 已实现，Word/Excel 待完善）

### 📦 现有技术栈总结

| 层级 | 技术 | 版本 | 已配置 |
|------|------|------|--------|
| **前端** | Vue 3 | 3.4+ | ✅ |
| 前端 | Element Plus | 2.5+ | ✅ |
| 前端 | TypeScript | 5.0+ | ✅ |
| 前端 | Vite | 5.0+ | ✅ |
| 前端 | Pinia | 2.1+ | ✅ |
| 前端 | ECharts | 6.0+ | ✅ 偏离统计图表 |
| 前端 | sortablejs | 1.15+ | ✅ 拖拽排序 |
| **后端** | Node.js | 18+ | ✅ |
| 后端 | NestJS | 10+ | ✅ |
| 后端 | TypeScript | 5.3+ | ✅ |
| 后端 | Prisma | 5.7+ | ✅ |
| 后端 | ExcelJS | 4.4+ | ✅ 数据导出 |
| 后端 | bcrypt | 5.1+ | ✅ 密码加密 |
| 后端 | jsonwebtoken | 9.0+ | ✅ JWT 认证 |
| 后端 | @nestjs/swagger | 7.1+ | ✅ API 文档 |
| 后端 | helmet | 8.1+ | ✅ 安全头 |
| **数据库** | PostgreSQL | 15+ | ✅ Docker |
| 数据库 | Redis | 7+ | ✅ Docker |
| **存储** | MinIO | 8.0+ | ✅ Docker S3兼容 |
| **测试** | Jest | - | ✅ 164 tests, 85.3% coverage |
| **部署** | Docker | - | ✅ docker-compose.yml |

**关键配置文件**:
- ✅ `server/src/prisma/schema.prisma` - 完整数据模型
- ✅ `server/.env` - 环境变量配置
- ✅ `docker-compose.yml` - PostgreSQL + Redis + MinIO
- ✅ `client/vite.config.ts` - 前端构建配置
- ✅ `server/tsconfig.json` - 后端 TypeScript 配置

### 🔄 增量开发指导（新功能集成检查清单）

> **核心原则**: 所有新功能必须与现有 MVP 代码库无缝集成，不破坏已有功能，遵循现有架构和技术栈。

#### ✅ 新功能开发前检查（强制）

**1. 技术栈兼容性检查**
```
□ 是否使用文档中列出的技术栈？（不引入新库）
□ 前端是否使用 Vue 3 + Element Plus？
□ 后端是否使用 NestJS + Prisma？
□ 是否复用现有组件/服务？（检查 client/src/components/ 和 server/src/modules/）
```

**2. 数据模型兼容性检查**
```
□ 新增表是否符合 Prisma Schema 规范？
□ 是否复用现有表关系？（如 User、Department、Document）
□ 外键约束是否设置正确？（onDelete: Restrict / Cascade）
□ 是否添加 created_at、updated_at、deleted_at？（软删除支持）
□ 字段命名是否符合现有风格？（snake_case）
```

**3. API 设计兼容性检查**
```
□ 路由是否符合 RESTful 规范？
□ 是否复用现有鉴权中间件？（@UseGuards(JwtAuthGuard)）
□ 是否复用现有权限装饰器？（@RequirePermissions(...)）
□ 响应格式是否统一？（{ success, data, error, meta }）
□ 错误处理是否使用 try-catch？
```

**4. 前端集成检查**
```
□ 页面路由是否添加到 client/src/router/index.ts？
□ 菜单是否添加到侧边栏配置？
□ 是否复用现有 API 请求封装？（client/src/api/request.ts）
□ 是否使用 Element Plus 组件？（不引入新 UI 库）
□ 状态管理是否使用 Pinia？（不引入 Vuex）
```

**5. 测试覆盖检查**
```
□ 是否编写单元测试？（server/test/）
□ 测试覆盖率是否 ≥ 80%？
□ 是否测试核心业务逻辑？
□ 是否测试异常情况？
```

#### 📋 数据库迁移策略

**Phase 7-12 新增表时的兼容性处理**:

1. **Prisma Schema 更新步骤**:
```bash
# 1. 修改 server/src/prisma/schema.prisma
# 2. 生成迁移文件
npx prisma migrate dev --name add_new_feature --schema=src/prisma/schema.prisma

# 3. 生成 Prisma Client
npx prisma generate --schema=src/prisma/schema.prisma

# 4. 应用到生产环境
npx prisma migrate deploy --schema=src/prisma/schema.prisma
```

2. **向后兼容原则**:
- ✅ 新增表：直接添加，不影响现有表
- ✅ 新增字段：必须设置默认值或允许 NULL
- ❌ 修改字段类型：需要数据迁移脚本
- ❌ 删除字段：先废弃（deprecated），再删除

3. **外键约束策略**:
```prisma
// ✅ 推荐：限制删除（保护数据）
user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)

// ✅ 可选：级联删除（仅用于从属数据）
comments  Comment[] // 删除文档时同时删除评论

// ❌ 禁止：无约束（数据孤岛风险）
userId    String   // 缺少 @relation
```

#### 🔗 前后端集成测试清单

**新功能上线前验证步骤**:

1. **后端 API 测试**:
```bash
# 1. 运行单元测试
npm test

# 2. 启动后端服务
npm run start:dev

# 3. 使用 curl 测试 API
curl -X POST http://localhost:3000/api/xxx \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

2. **前端集成测试**:
```bash
# 1. 启动前端开发服务器
npm run dev

# 2. 浏览器访问页面
# 3. 打开浏览器 DevTools，检查：
#    - Network 标签：API 请求/响应
#    - Console 标签：无错误日志
#    - Vue DevTools：状态管理正常
```

3. **端到端测试**:
```
□ 登录 → 访问新功能页面
□ 执行核心操作（CRUD）
□ 验证权限控制（无权限用户访问）
□ 验证数据持久化（刷新页面数据不丢失）
□ 验证错误处理（网络异常、输入验证）
```

#### 🚨 集成失败常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|---------|
| **API 404** | 路由未注册 | 检查 `xxx.module.ts` 是否导入到 `app.module.ts` |
| **API 401** | 缺少鉴权 | 添加 `@UseGuards(JwtAuthGuard)` |
| **API 403** | 权限不足 | 检查用户角色和 `@RequirePermissions()` |
| **Prisma 错误** | Schema 未生成 | 运行 `npx prisma generate --schema=src/prisma/schema.prisma` |
| **前端白屏** | 组件导入错误 | 检查浏览器 Console，修复 import 路径 |
| **页面404** | 路由未配置 | 添加路由到 `client/src/router/index.ts` |
| **表格不显示** | API 响应格式不对 | 统一使用 `{ success, data, meta }` |
| **表单验证失败** | 缺少验证规则 | 使用 `class-validator` 装饰器 |

#### 📝 代码复用指南

**推荐复用的现有代码**:

1. **前端组件** (`client/src/components/`):
   - `PdfViewer.vue` - PDF 预览组件
   - `FileUpload.vue` - 文件上传组件
   - `DepartmentTreeSelect.vue` - 部门树选择器
   - `UserSelect.vue` - 用户选择器
   - `StatusTag.vue` - 状态标签组件

2. **后端服务** (`server/src/modules/`):
   - `file/file.service.ts` - MinIO 文件上传服务
   - `user/user.service.ts` - 用户查询服务
   - `department/department.service.ts` - 部门树查询
   - `notification/notification.service.ts` - 通知发送服务

3. **公共工具** (`server/src/common/`):
   - `guards/jwt-auth.guard.ts` - JWT 鉴权
   - `decorators/permissions.decorator.ts` - 权限装饰器
   - `filters/http-exception.filter.ts` - 异常过滤器
   - `interceptors/transform.interceptor.ts` - 响应转换

**示例：复用文件上传服务**:
```typescript
// ✅ 正确：复用现有服务
import { FileService } from '../file/file.service';

@Injectable()
export class NewFeatureService {
  constructor(private fileService: FileService) {}

  async uploadFile(file: Express.Multer.File) {
    return this.fileService.uploadToMinio(file);
  }
}

// ❌ 错误：重复实现文件上传
async uploadFile(file: Express.Multer.File) {
  // 不要重新实现 MinIO 上传逻辑！
}
```

---

## 🎯 v10.1-10.4 版本业务规则细化（基于用户深度沟通）

本次更新基于与用户的详细业务规则沟通，细化了核心模块的业务逻辑，确保系统功能与实际业务完全契合：

### ✅ 核心业务规则更新（104 条细化规则）

**新增 Layer 1.1-1.2 核心业务规则**（BR-1.1 ~ BR-1.60）：
- ✅ 模板管理规则（BR-1.1 ~ BR-1.4）
- ✅ 草稿与提交规则（BR-1.5 ~ BR-1.8）
- ✅ 记录保留规则（BR-1.9 ~ BR-1.11）
- ✅ 工作流配置规则（BR-1.12 ~ BR-1.14）
- ✅ 并行审批规则（BR-1.15 ~ BR-1.18）
- ✅ 审批超时规则（BR-1.19 ~ BR-1.22）
- ✅ 审批拒绝与取消规则（BR-1.23 ~ BR-1.26）
- ✅ 待办任务规则（BR-1.27 ~ BR-1.32）
- ✅ 批次追溯规则（BR-1.33 ~ BR-1.39）
- ✅ 仓库 FIFO 规则（BR-1.40 ~ BR-1.43）
- ✅ 物料平衡规则（BR-1.44 ~ BR-1.47）
- ✅ 库存盘点规则（BR-1.48 ~ BR-1.50）
- ✅ 供应商资质规则（BR-1.51 ~ BR-1.53）
- ✅ 设备维保规则（BR-1.54 ~ BR-1.56）
- ✅ 设备故障规则（BR-1.57 ~ BR-1.60）

**新增补充业务规则**（BR-281 ~ BR-324，共 44 条）：
- ✅ 文档管理补充规则（BR-281 ~ BR-283）：版本升级、作废处理、历史版本权限
- ✅ 模板字段管理规则（BR-284 ~ BR-286）：字段新增、删除、类型修改
- ✅ 任务分配与处理规则（BR-287 ~ BR-289）：多人并行、完成规则、超期处理
- ✅ 审批流程规则（BR-290 ~ BR-291）：审批人缺位、审批撤回
- ✅ 权限管理规则（BR-292 ~ BR-293）：跨部门权限、外部审核
- ✅ 生产批次号规则（BR-294）：批次号格式配置
- ✅ 物料平衡规则（BR-295 ~ BR-298）：基础公式、损耗率、误差范围、超标处理
- ✅ 库存管理规则（BR-299 ~ BR-301）：领料扣减、配料扣减、盘点校正
- ✅ 设备维保等级规则（BR-302 ~ BR-304）：等级分类、周期配置、内容层级
- ✅ 文档引用规则（BR-305 ~ BR-306）：禁止循环引用、引用深度限制
- ✅ 批次关联规则（BR-307 ~ BR-308）：自动关联、批次调整
- ✅ 通知系统规则（BR-309 ~ BR-310）：通知保留、优先级
- ✅ 编号规则系统（BR-311 ~ BR-312）：规则修改、年度重置
- ✅ 数据导出系统（BR-313 ~ BR-315）：导出权限、导出格式、导出审计
- ✅ 回收站系统（BR-316 ~ BR-318）：保留时长、回收站权限、清理通知
- ✅ 用户管理系统（BR-319 ~ BR-321）：离职处理、密码策略、数据转交通知
- ✅ 操作日志系统（BR-322 ~ BR-324）：日志保留策略、查询权限、记录内容

### 🔄 关键业务规则调整

| 调整项 | 原规则 | 新规则（基于用户确认） | 影响范围 |
|--------|--------|------------------------|----------|
| **记录保留期限** | 默认 3 年 | **默认 5 年** | RecordTemplate.retentionYears |
| **审批通过后修改** | 允许（有权限控制） | **禁止修改** | 移除 MODIFY_APPROVED_RECORD 权限 |
| **审批超时处理** | 自动转交 | **仅通知，原审批人仍可审批** | WorkflowStep.escalationUserId |
| **会签拒绝逻辑** | 未明确 | **一人拒绝 → 所有审批失效** | WorkflowStep.parallelMode |
| **会签超时逻辑** | 未明确 | **一人超时 → 其他人不能继续** | 工作流引擎 |
| **工作流取消** | 未定义 | **发起人可取消，无次数限制** | WorkflowInstance 新增 cancel 功能 |
| **FIFO 强制执行** | 完全强制 | **保留手动选择开关** | SystemConfig.allowManualBatchSelection |
| **临期物料优先** | 临期优先于 FIFO | **不要太复杂，仅 FIFO** | 移除 BR-147 |
| **供应商资质过期** | 自动停用 + 订单隔离 | **允许收货，资质可后补** | Supplier.status 不改为 inactive |
| **批次号生成** | 系统生成 | **原料批次优先用供应商批次号** | MaterialBatch 生成逻辑 |
| **追溯响应时间** | 4 小时（BRCGS 要求） | **实时响应（立即显示）** | 批次追溯 API 性能要求 |
| **待办优先级** | 默认有紧急/高/中/低 | **默认无优先级区分** | TodoTask.priority 可选 |
| **设备故障分级** | 紧急/普通 | **无分级，统一处理** | 设备报修流程 |

### 📝 ~~待明确细节~~ ✅ 已全部确认（2026-02-13）

~~以下细节用户表示稍后确认，暂不实施~~
**更新**: 所有细节已在 2026-02-13 与用户确认完成，详见 BR-281 ~ BR-324

| 项目 | 状态 | 最终确认结果 | 规则编号 |
|------|------|-------------|---------|
| **文档版本升级** | ✅ 已确认 | 1.0 → 1.1 → 1.9 → 2.0，系统自动生成 | BR-281 |
| **文档作废后任务** | ✅ 已确认 | 允许继续，标记文档已作废 | BR-282 |
| **历史版本权限** | ✅ 已确认 | 仅创建者和管理员可查看 | BR-283 |
| **模板字段修改** | ✅ 已确认 | 新增字段作为新版本，删除字段历史保留，允许修改类型 | BR-284~286 |
| **任务分配** | ✅ 已确认 | 多人并行，一人提交即完成 | BR-287~288 |
| **任务超期处理** | ✅ 已确认 | 一直保持待办状态 | BR-289 |
| **审批人缺位** | ✅ 已确认 | 上级代审，最终管理员 | BR-290 |
| **审批撤回** | ✅ 已确认 | 不允许撤回 | BR-291 |
| **跨部门权限** | ✅ 已确认 | 按角色/管理层级 | BR-292 |
| **外部审核** | ✅ 已确认 | 仅提供数据导出，不给系统访问 | BR-293 |
| **生产批次号格式** | ✅ 已确认 | 产品缩写+年月日+班次，支持灵活配置 | BR-294 |
| **物料平衡公式** | ✅ 已确认 | 投入=产出+损耗，液体3%/固体2%/贵重1% | BR-295~298 |
| **库存更新时机** | ✅ 已确认 | 领料即时扣减，每日盘点校正 | BR-299~301 |
| **维保等级内容** | ✅ 已确认 | 一级/二级/三级，内容从粗到细，周期灵活配置 | BR-302~304 |
| **文档引用深度** | ✅ 已确认 | 禁止循环引用，简化引用关系（一层） | BR-305~306 |
| **批次自动关联时机** | ✅ 已确认 | FIFO自动匹配，用户确认后可调整 | BR-307~308 |
| **通知保留时长** | ✅ 已确认 | 已读保留30天，未读永久保留，不区分优先级 | BR-309~310 |
| **编号规则修改** | ✅ 已确认 | 已使用不允许修改关键字段，支持年度重置 | BR-311~312 |
| **数据导出** | ✅ 已确认 | 不需要审批，支持Excel/PDF，必须审计 | BR-313~315 |
| **回收站** | ✅ 已确认 | 保留30天，仅删除人和管理员可见，多阶段通知 | BR-316~318 |
| **用户离职** | ✅ 已确认 | 数据自动转交上级，密码错误5次锁定1分钟 | BR-319~321 |
| **操作日志** | ✅ 已确认 | 分级保留（关键永久/普通90天/低价值30天） | BR-322~324 |

### 🚨 重要提醒

用户反馈发现**历史讨论内容丢失**问题：
- "培训计划的创建流程，这个我们之前在聊每一个模块功能的时候都已经说过了吧？"
- "我们今天探讨的系统功能的细节需求细节都被删掉了吗？"
- "怎么你问的很多问题都是之前聊过的"

**行动**: 本次更新已将用户本次提供的所有业务规则完整记录到文档中（BR-1.1 ~ BR-1.60），确保不再丢失。

---

## 🏗️ v10.0 版本重大架构升级

本次更新从**自底向上**重构整个系统架构，解决之前"东讲一个西讲一个"的问题：

### ✅ 核心改进

1. **明确分层架构**（5 层从底层到顶层）
2. **核心引擎完整定义**（工作流引擎 + 动态表单引擎 + 文档引擎）
3. **依赖关系清晰标注**（每个模块明确依赖哪些底层能力）
4. **接口定义完整**（TypeScript 类型定义 + API 示例 + 业务规则）
5. **修复 8 个新 P0 问题**（工作流集成、权限细粒度、超时升级等）

### 📊 系统分层架构（自底向上）

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: 移动端与运维层                                          │
│  - 移动端应用（uniapp）                                          │
│  - 系统运维监控（Prometheus + Grafana）                         │
│  - 审计日志与合规                                                │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ 依赖
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: 体系管理模块                                            │
│  - 培训管理（依赖：动态表单 + 工作流 + 待办）                   │
│  - 内审管理（依赖：动态表单 + 工作流 + 文档引擎）               │
│  - 供应商管理（依赖：权限系统 + 待办）                          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ 依赖
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: 核心生产流程                                            │
│  - 批次追溯系统（依赖：动态表单）                               │
│  - 仓库管理（依赖：批次追溯 + 工作流 + 动态表单）               │
│  - 设备管理（依赖：动态表单 + 待办）                            │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ 依赖
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: 通用引擎层 ⭐ 核心能力层                               │
│  - 动态表单引擎（20+ 字段类型，完整定义）                      │
│  - 工作流引擎（审批流程，超时升级，完整定义）                  │
│  - 智能文档引擎（文档引用，自动同步）                          │
│  - 待办任务系统（统一待办，优先级管理）                        │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ 依赖
┌─────────────────────────────────────────────────────────────────┐
│ Layer 0: 数据基础设施层                                          │
│  - 用户与组织架构（User + Department）                          │
│  - 权限管理系统（Permission + RBAC）                            │
│  - 文档分级体系（Document 1-4 级）                              │
│  - 编号规则引擎（NumberRule）                                   │
│  - 文件存储（MinIO）                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 🔥 8 个新 P0 问题修复

| 问题 | 描述 | 状态 |
|------|------|------|
| **P0-1** | 工作流与偏离检测集成接口不明确 | ✅ 已定义完整 JSON 配置示例 |
| **P0-2** | 批次追溯外键约束策略混乱 | ✅ 统一 onDelete: Restrict |
| **P0-3** | 权限管理无细粒度控制 | ✅ 定义 RBAC + 资源级权限 |
| **P0-4** | 审批超时升级机制不完整 | ✅ 定义自动转交 + 多级升级 |
| **P0-5** | 记录保留期限缺乏执行机制 | ✅ 定义定时任务 + 归档策略 |
| **P0-6** | 供应商资质到期缺乏自动处理 | ✅ 定义每日检查 + 在途订单处理 |
| **P0-7** | 动态表单与硬编码字段冲突 | ✅ 明确核心字段 vs 扩展字段 |
| **P0-8** | 文档引用循环依赖风险 | ✅ 限制引用深度 + 异步队列 |

---

## 🔥 v9.2 版本更新说明（P0 修复）

本次更新修复了深度业务逻辑审查发现的 **6 个 P0 级别业务逻辑硬伤**，确保系统功能闭环完整：

### P0-1: 文档归档/作废流程 ✅ 已修复
- **问题**: Document 表只有 `current` 状态，缺少 `archived`/`obsolete` 状态，无法满足 BRCGS 文档作废要求
- **修复**: Document 表添加 6 个字段：archive_reason, archived_at, archived_by, obsolete_reason, obsoleted_at, obsoleted_by
- **影响章节**: 七、数据模型（第 460 行）

### P0-2: 批次追溯链条断裂风险 ✅ 已修复
- **问题**: BatchMaterialUsage 可能缺少外键约束，追溯链条存在断裂风险
- **修复**: 确认并强化外键约束 `onDelete: Restrict`，更新业务规则 BR-243 和 BR-245
- **影响章节**: 十九章补充（批次追溯系统，第 8921-8922 行，第 9116-9117 行）

### P0-3: 跨部门协作权限缺失 ✅ 已修复
- **问题**: 质量部需要查看所有记录但当前只有部门级权限，无法跨部门协作
- **修复**: 新增 permissions 表、user_permissions 表，添加业务规则 BR-017/018/019（viewAllRecords 权限）
- **影响章节**: 七、数据模型（第 437-458 行）、五、业务规则（第 361-363 行）

### P0-4: 审批超时机制缺失 ✅ 已修复
- **问题**: 审批流程无超时自动升级/提醒机制，可能无限期卡住
- **修复**: WorkflowTask 表添加 timeoutHours、escalationUserId、isOverdue、overdueNotifiedAt 字段，添加业务规则 BR-091~094
- **影响章节**: 十四、工作流系统（第 3327-3343 行，第 4039-4065 行）、业务规则（第 3970-3973 行）

### P0-5: 记录保留期限管理缺失 ✅ 已修复
- **问题**: BRCGS 要求不同记录保留期限不同（如投诉 5 年），但无自动管理
- **修复**: RecordTemplate 添加 retentionYears 字段，Record 添加 retentionUntil、autoArchiveStatus 字段，添加业务规则 BR-261~265
- **影响章节**: 十九、动态表单引擎（第 7326-7396 行）、业务规则（第 8526-8536 行）

### P0-6: 供应商资质到期自动处理缺失 ✅ 已修复
- **问题**: 供应商资质到期后状态不自动更新，需人工检查，可能使用未合格供应商
- **修复**: 添加业务规则 BR-181~185（自动过期检查、临期预警、过期自动停用）
- **影响章节**: 十七、仓库管理系统（第 6228-6242 行）

---

## 🏗️ 核心架构定义（v10.0 新增）

> **重要**: 本章节是整个系统的架构蓝图，定义了各层级的职责、接口和依赖关系。
> **阅读建议**: 从 Layer 0 开始，自底向上理解系统架构。

---

### 架构总览：5 层分层设计

| 层级 | 名称 | 核心职责 | 关键模块 |
|------|------|----------|----------|
| **Layer 0** | 数据基础设施层 | 用户、权限、文档体系、存储 | User, Department, Permission, Document, MinIO |
| **Layer 1** | 通用引擎层 | 工作流、动态表单、文档引擎、待办 | WorkflowEngine, FormEngine, DocumentEngine, TodoTask |
| **Layer 2** | 核心生产流程 | 批次追溯、仓库、设备管理 | BatchTraceability, Warehouse, Equipment |
| **Layer 3** | 体系管理模块 | 培训、内审、供应商管理 | Training, Audit, Supplier |
| **Layer 4** | 移动端与运维 | 移动应用、监控、审计 | UniApp, Prometheus, AuditLog |

---

### Layer 0: 数据基础设施层（最底层）

**定位**: 提供最基础的数据模型和能力，被所有上层模块依赖。

#### 0.1 用户与组织架构

**核心表**:
```prisma
model User {
  id              String   @id @default(cuid())
  username        String   @unique
  password        String   // bcrypt 加密
  name            String
  departmentId    String
  role            String   @default("user")  // user | leader | admin
  status          String   @default("active")

  department      Department @relation(fields: [departmentId], references: [id])
  permissions     UserPermission[]
}

model Department {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  parentId    String?

  users       User[]
  children    Department[] @relation("DepartmentHierarchy")
  parent      Department?  @relation("DepartmentHierarchy", fields: [parentId], references: [id])
}
```

#### 0.2 权限管理系统（RBAC + 资源级权限）

**修复 P0-3**: 细粒度权限控制

```prisma
model Permission {
  id          String   @id @default(cuid())
  code        String   @unique  // 如: "viewRecords:production"
  name        String
  category    String              // document | record | approval | system
  scope       String   @default("department")  // department | all | custom

  users       UserPermission[]
}

model UserPermission {
  id            String   @id @default(cuid())
  userId        String
  permissionId  String
  grantedBy     String
  grantedAt     DateTime @default(now())

  // 资源级权限（可选）
  resourceType  String?  // 如: "record"
  resourceId    String?  // 如: 特定记录 ID

  user          User       @relation(fields: [userId], references: [id])
  permission    Permission @relation(fields: [permissionId], references: [id])

  @@unique([userId, permissionId])
}
```

**权限定义示例**:
```typescript
// 系统预定义权限
const SYSTEM_PERMISSIONS = [
  { code: "viewRecords:own", name: "查看本人创建的记录", scope: "user" },
  { code: "viewRecords:department", name: "查看本部门记录", scope: "department" },
  { code: "viewRecords:production", name: "查看生产部记录", scope: "custom" },
  { code: "viewRecords:quality", name: "查看质量部记录", scope: "custom" },
  { code: "viewRecords:all", name: "查看所有部门记录", scope: "all" },  // 仅管理层
  { code: "modifyApprovedRecord", name: "修改已审批记录", scope: "all" }   // 质量部+管理层
]

// 权限检查函数
async function checkPermission(userId: string, permissionCode: string, resourceId?: string): Promise<boolean> {
  const userPermission = await prisma.userPermission.findFirst({
    where: {
      userId,
      permission: { code: permissionCode },
      OR: [
        { resourceId: null },        // 全局权限
        { resourceId }               // 资源级权限
      ]
    },
    include: { permission: true }
  })

  return !!userPermission
}
```

#### 0.3 文档分级体系（1-4 级）

**核心表**:
```prisma
model Document {
  id          String   @id @default(cuid())
  level       Int                          // 1/2/3/4
  number      String   @unique
  title       String
  content     Json?                        // Tiptap JSON（三级文件）
  filePath    String?                      // MinIO 路径（一二级文件）
  version     Decimal  @default(1.0)
  status      String                       // draft | under_review | approved | current | archived | obsolete

  // P0-1 修复：归档/作废流程
  archiveReason   String?
  archivedAt      DateTime?
  archivedBy      String?
  obsoleteReason  String?
  obsoletedAt     DateTime?
  obsoletedBy     String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 0.4 编号规则引擎

**核心表**:
```prisma
model NumberRule {
  id              String   @id @default(cuid())
  level           Int                      // 1/2/3/4 级文件
  departmentId    String
  prefix          String                   // 前缀（如 "QP-"）
  sequence        Int      @default(0)     // 当前序号
  format          String                   // 格式（如 "{prefix}-{department}-{序号}"）

  department      Department @relation(fields: [departmentId], references: [id])
}
```

**编号生成逻辑**:
```typescript
async function generateDocumentNumber(level: number, departmentId: string): Promise<string> {
  const rule = await prisma.numberRule.findFirst({
    where: { level, departmentId },
    include: { department: true }
  })

  if (!rule) {
    throw new Error('未配置编号规则')
  }

  // 原子递增序号
  const updated = await prisma.numberRule.update({
    where: { id: rule.id },
    data: { sequence: { increment: 1 } }
  })

  // 格式化编号
  return rule.format
    .replace('{prefix}', rule.prefix)
    .replace('{department}', rule.department.code)
    .replace('{序号}', String(updated.sequence).padStart(3, '0'))
}
```

---

### Layer 1: 通用引擎层（核心能力）⭐

**定位**: 提供可复用的核心引擎，支撑所有业务模块。

#### 1.1 工作流引擎（完整定义）

**修复 P0-1 + P0-4**: 工作流集成接口 + 超时升级机制

**核心表**:
```prisma
model WorkflowTemplate {
  id            String   @id @default(cuid())
  code          String   @unique          // 模板代码（如 "equipment-maintenance-approval"）
  name          String
  departmentId  String
  steps         Json                       // 步骤配置（详见下方）
  version       Int      @default(1)
  status        String   @default("active")

  instances     WorkflowInstance[]
}

model WorkflowInstance {
  id           String   @id @default(cuid())
  templateId   String
  currentStep  Int      @default(1)
  status       String   @default("running")  // running | completed | rejected

  // 关联资源（通用）
  relatedType  String?                      // "record" | "document" | "requisition"
  relatedId    String?                      // 关联资源 ID

  initiatorId  String
  startedAt    DateTime @default(now())
  completedAt  DateTime?

  template     WorkflowTemplate @relation(fields: [templateId], references: [id])
  tasks        WorkflowTask[]
}

model WorkflowTask {
  id          String   @id @default(cuid())
  instanceId  String
  stepOrder   Int
  stepName    String
  assigneeId  String
  status      String   @default("pending")
  action      String?                      // approved | rejected
  comment     String?
  completedAt DateTime?

  // P0-4 修复：超时升级机制
  timeoutHours      Int      @default(24)
  escalationUserId  String?                // 超时升级到的用户
  isOverdue         Boolean  @default(false)
  overdueNotifiedAt DateTime?

  instance    WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@index([assigneeId, status])
  @@index([isOverdue, status])
}
```

**工作流步骤配置（JSON Schema）**:
```typescript
interface WorkflowStep {
  order: number
  name: string
  type: 'approval' | 'parallel'          // 单人审批 | 并行会签
  approvers: string[]                    // 审批人 ID 列表
  timeoutHours?: number                  // 超时时长（默认 24，从任务创建时间算起，周末/节假日不计入）
  escalationUserId?: string              // 超时升级用户（超时后原审批人仍可审批）
  parallelMode?: 'all' | 'any'           // 并行模式：all=会签(全部通过) | any=或签(任一通过)

  // 用户业务规则补充：
  // 1. 会签模式(all)：一人拒绝 → 其他所有审批失效 → 退回发起人
  // 2. 会签模式(all)：一人超时 → 其他人不能继续审批 → 等待超时处理
  // 3. 或签模式(any)：任一人通过即可进入下一步
  // 4. 超时后：原审批人仍可审批，不会强制转交
  // 5. 无多级升级：只通知升级用户，不自动转交
}

// 示例：设备维保审批流程
const equipmentMaintenanceWorkflow: WorkflowTemplate = {
  code: "equipment-maintenance-approval",
  name: "设备维保审批流程",
  steps: [
    {
      order: 1,
      name: "工程师审批",
      type: "approval",
      approvers: ["engineer-001"],
      timeoutHours: 12,                  // 12 小时超时
      escalationUserId: "supervisor-001" // 升级到主管
    },
    {
      order: 2,
      name: "部门主管审批",
      type: "approval",
      approvers: ["supervisor-001"],
      timeoutHours: 24,
      escalationUserId: "manager-001"
    }
  ]
}
```

**工作流 API 接口**:
```typescript
// 创建工作流实例
POST /api/workflows/instances
Body: {
  templateCode: "equipment-maintenance-approval",
  relatedType: "record",
  relatedId: "rec-001",
  initiatorId: "user-001"
}
Response: { instanceId: "wf-001", tasks: [...] }

// 完成审批任务
POST /api/workflows/tasks/:taskId/complete
Body: {
  action: "approved" | "rejected",
  comment: "审批意见"
}

// P0-4: 查询超时任务（定时任务调用）
GET /api/workflows/tasks/overdue
Response: [
  {
    taskId: "task-001",
    assigneeId: "user-001",
    escalationUserId: "user-002",
    overdueHours: 26
  }
]
```

**P0-4 修复：超时升级逻辑**:
```typescript
// 定时任务：每小时执行
async function checkAndEscalateOverdueTasks() {
  const overdueTasks = await prisma.workflowTask.findMany({
    where: {
      status: 'pending',
      isOverdue: false,
      createdAt: {
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000)  // 24 小时前
      }
    }
  })

  for (const task of overdueTasks) {
    // 1. 标记超时
    await prisma.workflowTask.update({
      where: { id: task.id },
      data: { isOverdue: true }
    })

    // 2. 发送通知
    await sendNotification({
      to: [task.assigneeId, task.escalationUserId],
      subject: '审批任务超时',
      content: `任务 ${task.stepName} 已超时 24 小时`
    })

    // 3. 自动升级（可选）
    if (task.escalationUserId) {
      await prisma.workflowTask.create({
        data: {
          instanceId: task.instanceId,
          stepOrder: task.stepOrder,
          stepName: task.stepName + '（升级）',
          assigneeId: task.escalationUserId,
          status: 'pending'
        }
      })
    }
  }
}
```

#### 1.2 动态表单引擎（完整定义）

**修复 P0-1 + P0-7**: 工作流集成 + 硬编码字段冲突

**核心表**:
```prisma
model RecordTemplate {
  id              String   @id @default(cuid())
  code            String   @unique
  name            String
  category        String              // 分类（工程部/质量部/生产部）
  formSchema      Json                // 表单结构（详见下方）

  // P0-1 修复：工作流集成配置
  approvalRequired Boolean  @default(false)
  workflowConfig   Json?               // 工作流配置（详见下方）

  // P0-5 修复：保留期限管理
  retentionYears  Int      @default(5)  // 用户业务规则：默认 5 年保留期

  // P0-7 修复：批次关联配置
  batchLinkConfig Json?               // 批次关联配置（详见下方）

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  records         Record[]
}

model Record {
  id              String   @id @default(cuid())
  templateId      String
  recordNumber    String   @unique
  formData        Json                // 表单数据
  status          String   @default("draft")

  // 工作流关联
  workflowId      String?

  // 批次关联
  relatedBatchType   String?
  relatedBatchId     String?
  relatedBatchNumber String?

  // P0-5 修复：保留期限
  retentionUntil     DateTime?
  autoArchiveStatus  String @default("active")

  // 防篡改
  signatureTimestamp DateTime?
  offlineFilled      Boolean @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  template        RecordTemplate @relation(fields: [templateId], references: [id])
  changeLogs      RecordChangeLog[]

  @@index([autoArchiveStatus])
}
```

**字段类型完整清单（20+ 类型）**:
```typescript
enum FieldType {
  // 基础类型
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  DECIMAL = 'decimal',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',

  // 选择类型
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',

  // 特殊类型
  SIGNATURE = 'signature',          // 电子签名
  PHOTO = 'photo',                  // 拍照
  FILE_UPLOAD = 'file_upload',      // 文件上传
  BARCODE_SCAN = 'barcode_scan',    // 条形码扫描
  LOCATION = 'location',            // 地理位置

  // 动态数据源类型（P0-7 核心字段）
  EQUIPMENT_SELECT = 'equipment_select',
  MATERIAL_SELECT = 'material_select',
  BATCH_SELECT = 'batch_select',
  USER_SELECT = 'user_select',

  // 计算类型
  COMPUTED = 'computed'
}
```

**P0-1 修复：工作流配置接口**:
```typescript
interface WorkflowConfig {
  enabled: boolean
  workflowTemplateCode: string
  autoTrigger: boolean              // 提交时自动触发工作流

  // 工作流回调
  onApproved?: {
    action: "updateStatus" | "generatePDF" | "sendNotification"
    params: Record<string, any>
  }

  onRejected?: {
    action: "resetToDraft" | "notify"
    params: Record<string, any>
  }
}

// 示例：设备维保记录模板
const maintenanceTemplate = {
  code: "MAINT-RECORD-001",
  name: "设备维保记录",
  workflowConfig: {
    enabled: true,
    workflowTemplateCode: "equipment-maintenance-approval",
    autoTrigger: true,
    onApproved: {
      action: "updateStatus",
      params: { status: "approved" }
    },
    onRejected: {
      action: "resetToDraft",
      params: {}
    }
  }
}
```

**P0-7 修复：批次关联配置接口**:
```typescript
interface BatchLinkConfig {
  enabled: boolean
  batchType: 'production' | 'finished_goods' | 'material'
  autoLink: {
    triggerField: string            // 触发字段名（如 "productionBatchNumber"）
    linkStrategy: 'byNumber' | 'byId' | 'byBarcode'
  }
}

// 示例：生产记录自动关联生产批次
const productionRecordTemplate = {
  code: "PROD-RECORD-001",
  name: "生产记录",
  batchLinkConfig: {
    enabled: true,
    batchType: 'production',
    autoLink: {
      triggerField: 'productionBatchNumber',
      linkStrategy: 'byNumber'
    }
  },
  formSchema: [
    { name: 'productionBatchNumber', type: 'text', label: '生产批次号', required: true },
    { name: 'productName', type: 'text', label: '产品名称' },
    // ... 其他字段
  ]
}
```

**动态表单提交流程（修复 P0-1）**:
```typescript
// 提交记录并触发工作流
async function submitRecord(recordId: string, userId: string) {
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: { template: true }
  })

  // 1. 校验必填字段
  validateRequiredFields(record)

  // 2. 计算保留期限（P0-5）
  const retentionUntil = new Date()
  retentionUntil.setFullYear(retentionUntil.getFullYear() + record.template.retentionYears)

  // 3. 批次自动关联（P0-7）
  let batchInfo = null
  if (record.template.batchLinkConfig?.enabled) {
    batchInfo = await linkToBatch(record, record.template.batchLinkConfig)
  }

  // 4. 更新记录状态
  await prisma.record.update({
    where: { id: recordId },
    data: {
      status: 'submitted',
      submittedAt: new Date(),
      retentionUntil,
      ...batchInfo
    }
  })

  // 5. 触发工作流（P0-1）
  if (record.template.workflowConfig?.enabled && record.template.workflowConfig?.autoTrigger) {
    const workflowInstance = await createWorkflowInstance({
      templateCode: record.template.workflowConfig.workflowTemplateCode,
      relatedType: 'record',
      relatedId: recordId,
      initiatorId: userId
    })

    await prisma.record.update({
      where: { id: recordId },
      data: { workflowId: workflowInstance.id }
    })
  }
}
```

**Layer 1.1-1.2 核心业务规则（基于用户确认）**:

```typescript
// ==================== 模板管理规则 ====================
// BR-1.1: 部门负责人可创建模板，无需审批
// BR-1.2: 模板修改后，旧记录不受影响（历史数据不变）
// BR-1.3: 归档的模板，其旧记录仍然可查看
// BR-1.4: 所有旧版本、历史记录必须保留指定年限（默认 5 年）

// ==================== 草稿与提交规则 ====================
// BR-1.5: 草稿可无限期保存，直到提交或删除
// BR-1.6: 提交失败后，取消并返回草稿状态
// BR-1.7: 审批拒绝后，需重新提交并走完整流程
// BR-1.8: ⚠️ 审批通过的记录不允许修改（已移除 MODIFY_APPROVED_RECORD 权限）

// ==================== 记录保留规则 ====================
// BR-1.9: 所有记录默认保留 5 年（不是 3 年）
// BR-1.10: 保留期满后自动归档
// BR-1.11: 归档记录必须支持导出

// ==================== 工作流配置规则 ====================
// BR-1.12: 部门负责人配置工作流模板
// BR-1.13: 每种业务类型只有一个工作流（如"领料"只有一个工作流）
// BR-1.14: 模板修改后，进行中的工作流不受影响

// ==================== 并行审批规则（会签） ====================
// BR-1.15: 会签(all)：所有审批人必须全部通过（AND 逻辑）
// BR-1.16: 会签(all)：一人拒绝 → 所有其他审批失效 → 退回发起人
// BR-1.17: 会签(all)：一人超时 → 其他人不能继续审批 → 等待处理
// BR-1.18: 或签(any)：任一审批人通过即可

// ==================== 审批超时规则 ====================
// BR-1.19: 超时时间：从任务创建时间算起 24 小时（默认）
// BR-1.20: 周末/节假日不计入超时时间
// BR-1.21: 超时后：原审批人仍可审批（不强制转交）
// BR-1.22: 无多级升级：仅通知升级用户，任务卡住

// ==================== 审批拒绝与取消规则 ====================
// BR-1.23: 审批拒绝后退回发起人
// BR-1.24: 无拒绝次数限制
// BR-1.25: 发起人可取消流程
// BR-1.26: 取消后记录返回草稿状态

// ==================== 待办任务规则 ====================
// BR-1.27: 待办来源：审批、维保提醒、到期提醒、内审、"还有很多"
// BR-1.28: 支持手动创建待办任务
// BR-1.29: 默认无优先级区分（所有任务同等优先级）
// BR-1.30: 逾期任务不自动升级优先级
// BR-1.31: 完成待办任务自动更新业务记录
// BR-1.32: 待办任务可关闭

// ==================== 批次追溯规则 ====================
// BR-1.33: 原料批次号：优先使用供应商提供的批次号，无则系统生成
// BR-1.34: 生产批次号：格式稍后确定（用户将提供）
// BR-1.35: 成品批次号 = 生产批次号（相同）
// BR-1.36: 原料批次创建时机：仓库收货时
// BR-1.37: 生产批次创建时机：生产计划创建时
// BR-1.38: 批次物料使用关联时机：实际使用物料时
// BR-1.39: 追溯响应时间：实时（正向/反向追溯必须立即显示结果）

// ==================== 仓库 FIFO 规则 ====================
// BR-1.40: 系统强制执行先进先出（FIFO）
// BR-1.41: 保留手动选择批次开关（应对特殊情况）
// BR-1.42: 最早批次不足时，允许多批次混用
// BR-1.43: 临期物料不优先（不要把系统搞太复杂）

// ==================== 物料平衡规则 ====================
// BR-1.44: 计算周期：从产品入库到下次切换批次
// BR-1.45: 偏差容限：可配置（不固定 ±5%）
// BR-1.46: 偏差超标：警告/提醒（暂无工作流）
// BR-1.47: 计算公式：需进一步探讨

// ==================== 库存盘点规则 ====================
// BR-1.48: 盘点频率：工作日上下班前后各一次
// BR-1.49: 盘点差异：生成盘盈盘亏单 → 需审批
// BR-1.50: 库存更新时机：需进一步明确

// ==================== 供应商资质规则 ====================
// BR-1.51: 必需证照：营业执照、生产许可证（生产商）、经营许可证（经销商）
// BR-1.52: 到期提醒：必须有
// BR-1.53: ⚠️ 资质过期的供应商仍可收货，资质可后补

// ==================== 设备维保规则 ====================
// BR-1.54: 维保等级内容：日常/周/月/季/年（内容待定）
// BR-1.55: 维保计划：根据设备台账自动生成
// BR-1.56: 逾期处理：仅提醒，不锁定设备

// ==================== 设备故障规则 ====================
// BR-1.57: 报修流程：全员 → 工程部 → 现场维修 → 完成
// BR-1.58: 无紧急/普通区分（所有故障同等处理）
// BR-1.59: 所有故障都能修复
// BR-1.60: 故障设备可继续使用

// ==================== 文档管理补充规则（2026-02-13 新增）====================
// BR-281: 文档版本升级规则：1.0 → 1.1 → 1.2 → ... → 1.9 → 2.0，系统自动生成
// BR-282: 文档作废后任务处理：允许任务继续，但标记文档已作废
// BR-283: 历史版本查看权限：仅创建者和管理员可查看

// ==================== 模板字段管理规则 ====================
// BR-284: 模板新增字段：已有填报记录的模板新增字段，作为新版本使用
// BR-285: 模板删除字段：允许删除，历史数据保持原样，新填报不再出现
// BR-286: 模板修改字段类型：允许修改（文本→数字），历史数据保留，新数据按新类型验证

// ==================== 任务分配与处理规则 ====================
// BR-287: 任务多人并行：任务可分配给多个人，多人并行填报
// BR-288: 任务完成规则：任何一人提交后，任务即标记为完成，其他人无需再提交
// BR-289: 任务超期处理：任务超过截止日期后，一直保持待办状态，不自动关闭

// ==================== 审批流程规则 ====================
// BR-290: 审批人缺位处理：审批人请假/离职时，由其直属上级代为审批，如无上级则管理员审批
// BR-291: 审批撤回规则：审批通过后不允许撤回

// ==================== 权限管理规则 ====================
// BR-292: 跨部门权限规则：按角色分配权限，管理层级及以上可跨部门查看
// BR-293: 外部审核处理：外部审核人员不给系统访问权限，仅提供数据导出（打印或电子版）

// ==================== 生产批次号规则 ====================
// BR-294: 生产批次号格式：产品名称缩写 + 年月日 + 班次（如 QKLBG20260213A）
//         支持灵活配置：产品缩写、日期格式、是否启用班次、分隔符

// ==================== 物料平衡规则 ====================
// BR-295: 物料平衡基础公式：投入量 = 产出量 + 损耗量
// BR-296: 损耗率计算公式：损耗率 = (损耗量 / 投入量) × 100%
// BR-297: 允许误差范围：液体物料 ≤ 3%、固体物料 ≤ 2%、贵重物料 ≤ 1%
// BR-298: 损耗超标处理：系统预警 → 需填写损耗原因 → 主管审批

// ==================== 库存管理规则 ====================
// BR-299: 领料即时扣减：仓库出料 → 仓库库存扣减 → 物料暂存间库存增加
// BR-300: 配料时扣减暂存间库存：配料完成 → 物料暂存间库存扣减
// BR-301: 每日盘点校正差异：每日盘点 → 发现差异 → 填写盘点差异原因 → 校正库存

// ==================== 设备维保等级规则 ====================
// BR-302: 维保等级分类：一级保养（日常，粗）、二级保养（定期，中）、三级保养（深度，细）
// BR-303: 维保周期配置：一级（1/2/3个月）、二级（3/6个月）、三级（半年/一年），每台设备独立配置
// BR-304: 维保内容层级：一级（清洁、检查、记录）→ 二级（+润滑、紧固、更换易损件）→ 三级（+深度拆检、精度校验、性能测试）

// ==================== 文档引用规则 ====================
// BR-305: 禁止循环引用：文档A → 文档B → 文档A，系统检测并阻止
// BR-306: 简化引用关系：只允许一层引用（文档A → 文档B），不允许多层引用（文档A → 文档B → 文档C）

// ==================== 批次关联规则 ====================
// BR-307: 自动关联原料批次：生产记录填写时，系统根据 BOM 列出所需原料，自动匹配可用批次（FIFO规则）
// BR-308: 允许调整批次选择：用户可确认自动匹配的批次，也可手动更换为其他可用批次，可调整每个批次的用量

// ==================== 通知系统规则（2026-02-13 新增）====================
// BR-309: 通知保留时长：已读通知保留 30 天，未读通知永久保留
// BR-310: 通知优先级：不区分优先级，所有通知同等对待

// ==================== 编号规则系统 ====================
// BR-311: 编号规则修改：已使用的编号规则不允许修改前缀、分隔符等关键字段，仅允许修改名称/描述
// BR-312: 编号规则年度重置：支持按年度重置序号（如 DOC-2026-001 → DOC-2027-001）

// ==================== 数据导出系统 ====================
// BR-313: 导出权限：所有用户可导出自己有权限查看的数据，不需要额外审批
// BR-314: 导出格式：支持 Excel、PDF 两种格式
// BR-315: 导出审计：所有导出操作必须记录操作日志（谁、何时、导出了什么、导出条数）

// ==================== 回收站系统 ====================
// BR-316: 回收站保留时长：删除后保留 30 天，30 天后自动永久删除
// BR-317: 回收站权限：仅删除人本人和管理员可查看回收站中的数据
// BR-318: 清理通知：系统在第 23、25、27、29 天发送清理通知，30 天后自动删除

// ==================== 用户管理系统 ====================
// BR-319: 用户离职处理：离职用户的待办任务、待审批事项自动转交给其直属上级，如无上级则转给管理员
// BR-320: 密码策略：密码错误 5 次后锁定账号 1 分钟
// BR-321: 数据转交通知：数据转交时必须发送通知给接收人

// ==================== 操作日志系统 ====================
// BR-322: 日志保留策略：关键操作（删除、审批、导出）永久保留；普通操作（查看、编辑）保留 90 天；低价值操作（登录）保留 30 天
// BR-323: 日志查询权限：普通用户仅可查看自己的操作日志，管理员可查看所有日志
// BR-324: 日志记录内容：必须包含操作人、操作时间、操作类型、操作对象、IP地址、操作结果

// ==================== 前端 UI/UX 设计规范（2026-02-13 新增，参考 SPMS-Web）====================

// ==================== 审批流程可视化 ====================
// BR-328: 审批流程可视化：审批人用彩色标签链式展示（张三 > 李四 > 王五），提高流程可读性
// BR-329: 审批人不能重复：添加审批人时检查是否已存在，避免重复添加
// BR-330: 审批流程动态配置：发起审批时可选择审批人，支持多级串行审批，可动态增删审批人

// ==================== 表格操作列设计 ====================
// BR-337: 操作按钮状态动态控制：根据文档状态和用户权限动态显示/禁用按钮
//         - 编辑按钮：草稿状态 + 文档创建者 → 启用；已发布 → 禁用
//         - 删除按钮：文档创建者或管理员 → 启用；其他 → 禁用
//         - 预览/下载按钮：有查看权限 → 始终启用
// BR-338: 按钮样式规范：操作列宽度 160px，按钮顺序（编辑、删除、详情、预览、下载），编辑/详情用链接样式，删除用危险色

// ==================== 状态标签可视化 ====================
// BR-341: 状态标签可视化：用彩色标签（el-tag）区分不同状态，提高识别度
// BR-342: 状态颜色规范：草稿(灰色 info)、审核中(橙色 warning)、已发布(绿色 success)、已驳回(红色 danger)、已归档(蓝色 primary)

// ==================== 菜单权限动态显示 ====================
// BR-334: 菜单权限动态加载：用户登录后根据角色返回可访问菜单列表
// BR-335: 隐藏无权限菜单：前端仅显示用户有权限的菜单项（不显示而非置灰）
// BR-336: API 权限校验：即使前端绕过菜单限制，后端仍需校验权限

// ==================== 表单分组布局 ====================
// BR-339: 表单分组布局：使用分组区分不同类型字段（基础信息、审批信息、附加信息），提高表单可读性
// BR-340: 表单列数规范：基础信息/审批信息用 2 列布局，描述性字段（文档描述、备注）用 1 列全宽布局

// ==================== 对话框尺寸规范 ====================
// BR-343: 对话框尺寸规范：
//         - 编辑对话框：80% 宽 × 80% 高（文档编辑、模板编辑）
//         - 详情对话框：70% 宽 × 80% 高（文档详情查看）
//         - 选择对话框：60% 宽 × 70% 高（选择审批人、选择部门）
//         - 预览对话框：90% 宽 × 90% 高（PDF/Word 预览）
//         - 确认对话框：自适应（删除确认、操作确认）

// ==================== 操作反馈规范 ====================
// BR-344: 操作反馈规范：
//         - 成功操作：绿色 Toast，2 秒自动关闭（如"文档上传成功"）
//         - 失败操作：红色 Toast，3 秒自动关闭（如"文档上传失败：文件过大"）
//         - 警告操作：橙色 Toast，3 秒自动关闭（如"请先选择文件夹"）
//         - 信息提示：蓝色 Toast，2 秒自动关闭（如"正在处理中..."）
// BR-345: 确认对话框规范：删除/危险操作必须弹出确认对话框，避免误操作
//         - 删除操作：标题"删除确认"，内容"确定删除该文档？删除后可在回收站恢复"
//         - 危险操作：标题"警告"，内容"确定永久删除该文档？此操作不可恢复"
//         - 批量操作：标题"批量操作确认"，内容"确定删除选中的 5 个文档？"
```

#### 1.3 智能文档引擎

**修复 P0-8**: 引用深度限制 + 循环依赖检测

```prisma
model DocumentReference {
  id             String   @id @default(cuid())
  sourceDocId    String
  targetDocId    String
  sectionId      String
  lastSyncedAt   DateTime?

  sourceDoc      Document @relation("SourceDoc", fields: [sourceDocId], references: [id], onDelete: Cascade)
  targetDoc      Document @relation("TargetDoc", fields: [targetDocId], references: [id], onDelete: Cascade)

  @@unique([sourceDocId, targetDocId, sectionId])
}
```

**P0-8 修复：引用深度限制**:
```typescript
const MAX_REFERENCE_DEPTH = 2

async function checkReferenceDepth(sourceDocId: string, targetDocId: string, currentDepth = 0): Promise<void> {
  if (currentDepth >= MAX_REFERENCE_DEPTH) {
    throw new Error('引用深度不能超过 2 层')
  }

  // 检查循环引用
  if (sourceDocId === targetDocId) {
    throw new Error('不能引用自己')
  }

  // 递归检查目标文档的引用
  const targetReferences = await prisma.documentReference.findMany({
    where: { sourceDocId: targetDocId }
  })

  for (const ref of targetReferences) {
    await checkReferenceDepth(sourceDocId, ref.targetDocId, currentDepth + 1)
  }
}

// 创建引用前检查
async function createDocumentReference(sourceDocId: string, targetDocId: string, sectionId: string) {
  // 检查引用深度
  await checkReferenceDepth(sourceDocId, targetDocId)

  // 创建引用
  return await prisma.documentReference.create({
    data: { sourceDocId, targetDocId, sectionId }
  })
}
```

#### 1.4 待办任务系统

**核心表**:
```prisma
model TodoTask {
  id          String   @id @default(cuid())
  title       String
  description String?
  type        String              // reminder | approval | maintenance | audit
  priority    String   @default("normal")  // low | normal | high | urgent
  status      String   @default("pending")
  dueDate     DateTime?

  // 关联资源
  relatedType String?             // "record" | "document" | "equipment"
  relatedId   String?

  assigneeId  String
  createdAt   DateTime @default(now())
  completedAt DateTime?

  @@index([assigneeId, status])
  @@index([priority, dueDate])
}
```

---

### 核心架构总结

**Layer 0 提供**:
- ✅ 用户与组织架构
- ✅ 细粒度权限管理（RBAC + 资源级）
- ✅ 文档分级体系（1-4 级）
- ✅ 编号规则引擎

**Layer 1 提供**:
- ✅ 工作流引擎（审批流程 + 超时升级）
- ✅ 动态表单引擎（20+ 字段类型 + 工作流集成 + 批次关联）
- ✅ 智能文档引擎（引用管理 + 深度限制）
- ✅ 待办任务系统（统一待办）

---

### Layer 2: 核心生产流程（业务层）

**定位**: 基于 Layer 0-1 的能力，构建核心生产业务流程。

#### 2.1 批次追溯系统（BRCGS 核心）

**依赖关系**:
- ✅ **依赖 Layer 1.2**: 动态表单引擎（生产记录、质检记录通过动态表单填写）
- ✅ **依赖 Layer 0.2**: 权限系统（质量部可跨部门查看追溯数据）

**核心表**（硬编码 - P0-7 明确划分）:
```prisma
// 1. 原料批次表
model MaterialBatch {
  id                String   @id @default(cuid())
  batchNumber       String   @unique
  materialId        String
  materialCode      String              // 核心字段（硬编码）
  materialName      String              // 核心字段
  supplierId        String
  quantity          Float                // 核心字段
  unit              String               // 核心字段
  productionDate    DateTime?
  expiryDate        DateTime?
  receivedDate      DateTime
  status            String   @default("in_stock")

  // P0-2 修复：批次追溯关联（外键约束）
  usedInProduction  BatchMaterialUsage[]

  @@index([batchNumber])
  @@index([materialId])
  @@map("material_batches")
}

// 2. 生产批次表
model ProductionBatch {
  id                String   @id @default(cuid())
  batchNumber       String   @unique
  productId         String                // 核心字段（硬编码）
  productCode       String                // 核心字段
  productName       String                // 核心字段
  productionDate    DateTime              // 核心字段
  plannedQuantity   Float                 // 核心字段
  actualQuantity    Float                 // 核心字段
  unit              String                // 核心字段
  status            String   @default("in_progress")

  // P0-2 修复：外键约束保证追溯链完整性
  materialsUsed     BatchMaterialUsage[]
  finishedGoods     FinishedGoodsBatch[]

  // P0-7 修复：动态表单扩展（生产参数、操作员签名等）
  relatedRecords    Record[]              // 扩展字段（动态）

  @@index([batchNumber])
  @@index([productId])
  @@map("production_batches")
}

// 3. 批次物料使用表（关键追溯关联）
model BatchMaterialUsage {
  id                String   @id @default(cuid())
  productionBatchId String
  materialBatchId   String
  materialCode      String                // 核心字段（硬编码）
  quantity          Float                 // 核心字段
  unit              String                // 核心字段

  // P0-2 修复：外键约束 onDelete: Restrict（禁止删除有关联的批次）
  productionBatch   ProductionBatch @relation(fields: [productionBatchId], references: [id], onDelete: Restrict)
  materialBatch     MaterialBatch @relation(fields: [materialBatchId], references: [id], onDelete: Restrict)

  @@index([productionBatchId])
  @@index([materialBatchId])
  @@map("batch_material_usage")
}

// 4. 成品批次表
model FinishedGoodsBatch {
  id                String   @id @default(cuid())
  batchNumber       String   @unique
  productionBatchId String
  productId         String                // 核心字段（硬编码）
  quantity          Float                 // 核心字段
  productionDate    DateTime              // 核心字段
  expiryDate        DateTime?
  status            String   @default("in_stock")

  // P0-2 修复：外键约束
  productionBatch   ProductionBatch @relation(fields: [productionBatchId], references: [id], onDelete: Restrict)

  // P0-7 修复：动态表单扩展（质检记录等）
  relatedRecords    Record[]
  shipments         ShipmentItem[]

  @@index([batchNumber])
  @@map("finished_goods_batches")
}
```

**P0-7 修复：硬编码 vs 动态字段明确划分**:

| 字段类型 | 存储方式 | 字段示例 | 原因 |
|---------|---------|---------|------|
| **核心追溯字段** | 硬编码表 | materialCode, quantity, batchNumber | 追溯链条主线，不可配置，查询性能高 |
| **扩展参数字段** | 动态表单 | 温度、湿度、操作员签名、照片 | 不同产品参数不同，可灵活配置 |

**批次自动关联示例**（P0-7 修复）:
```typescript
// 生产记录模板配置
const productionRecordTemplate = {
  code: "PROD-RECORD-001",
  name: "生产记录",
  category: "生产部",

  // P0-7: 批次关联配置
  batchLinkConfig: {
    enabled: true,
    batchType: 'production',
    autoLink: {
      triggerField: 'productionBatchNumber',  // 填写批次号时自动关联
      linkStrategy: 'byNumber'
    }
  },

  // 表单字段定义
  formSchema: [
    // 核心字段（用于批次关联）
    { name: 'productionBatchNumber', type: 'text', label: '生产批次号', required: true },

    // 扩展字段（动态）
    { name: 'temperature', type: 'decimal', label: '烘烤温度（℃）', validation: { min: 150, max: 200 } },
    { name: 'humidity', type: 'decimal', label: '环境湿度（%）' },
    { name: 'operatorSignature', type: 'signature', label: '操作员签名' },
    { name: 'productPhoto', type: 'photo', label: '产品照片' }
  ]
}

// 提交生产记录时自动关联批次
async function submitProductionRecord(recordData) {
  // 1. 查找生产批次
  const batch = await prisma.productionBatch.findUnique({
    where: { batchNumber: recordData.formData.productionBatchNumber }
  })

  if (!batch) {
    throw new Error('生产批次不存在')
  }

  // 2. 创建记录并自动关联
  await prisma.record.create({
    data: {
      ...recordData,
      relatedBatchType: 'production',
      relatedBatchId: batch.id,
      relatedBatchNumber: batch.batchNumber
    }
  })
}
```

**追溯 API**:
```typescript
// 反向追溯：成品 → 原料
POST /api/trace/backward
Body: { finishedGoodsBatchNumber: "FG-20240601-001" }
Response: {
  finishedGoodsBatch: { ... },
  productionBatch: { ... },
  materials: [
    { materialCode: "MAT-001", materialName: "高筋面粉", batchNumber: "SUP-001", quantity: 500 }
  ]
}

// 正向追溯：原料 → 成品 → 客户
POST /api/trace/forward
Body: { materialBatchNumber: "SUP-001" }
Response: {
  materialBatch: { ... },
  usedInProductions: [
    {
      productionBatch: { ... },
      finishedGoods: [ { ... } ],
      customers: [ { name: "客户 A", shipmentDate: "2024-06-15" } ]
    }
  ]
}
```

---

#### 2.2 仓库管理系统

**依赖关系**:
- ✅ **依赖 Layer 2.1**: 批次追溯系统（入库创建批次、领料关联批次）
- ✅ **依赖 Layer 1.1**: 工作流引擎（领料审批、报废审批）
- ✅ **依赖 Layer 1.2**: 动态表单引擎（盘点记录、物料平衡记录）
- ✅ **依赖 Layer 1.4**: 待办任务系统（临期预警、过期预警）

**核心表**:
```prisma
model Material {
  id          String   @id @default(cuid())
  code        String   @unique          // 物料编号（来自金蝶）
  name        String                    // 核心字段
  category    String                    // 核心字段
  specification String?
  unit        String                    // 核心字段

  batches     MaterialBatch[]           // 批次（依赖 Layer 2.1）
}

model MaterialRequisition {
  id              String   @id @default(cuid())
  requisitionNumber String @unique
  departmentId    String
  status          String   @default("draft")  // draft | pending | approved | completed

  // P0-1 修复：工作流集成
  workflowId      String?

  items           MaterialRequisitionItem[]

  @@map("material_requisitions")
}

model MaterialRequisitionItem {
  id              String   @id @default(cuid())
  requisitionId   String
  materialId      String                    // 核心字段（硬编码）
  batchId         String                    // 核心字段（硬编码）
  quantity        Float                     // 核心字段（硬编码）

  requisition     MaterialRequisition @relation(fields: [requisitionId], references: [id])
  batch           MaterialBatch @relation(fields: [batchId], references: [id])
}
```

**领料审批流程（P0-1 修复）**:
```typescript
// 工作流配置
const requisitionWorkflow: WorkflowTemplate = {
  code: "material-requisition-approval",
  name: "领料单审批",
  steps: [
    {
      order: 1,
      name: "仓库主管审批",
      type: "approval",
      approvers: ["warehouse-supervisor"],
      timeoutHours: 12,
      escalationUserId: "warehouse-manager"
    }
  ]
}

// 提交领料单触发工作流
async function submitRequisition(requisitionId: string) {
  // 1. 校验库存充足
  await validateStockSufficient(requisitionId)

  // 2. 创建工作流实例
  const workflow = await createWorkflowInstance({
    templateCode: "material-requisition-approval",
    relatedType: "requisition",
    relatedId: requisitionId
  })

  // 3. 更新领料单状态
  await prisma.materialRequisition.update({
    where: { id: requisitionId },
    data: {
      status: 'pending',
      workflowId: workflow.id
    }
  })
}
```

**P0-6 修复：供应商资质到期处理**:
```typescript
// 定时任务：每天凌晨 00:00 执行
async function checkSupplierQualifications() {
  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // 1. 查询即将过期的资质（< 30 天）
  const expiringQualifications = await prisma.supplierQualification.findMany({
    where: {
      status: 'valid',
      expiryDate: {
        gte: now,
        lte: in30Days
      }
    },
    include: { supplier: true }
  })

  // 2. 标记为 expiring，生成待办任务
  for (const qual of expiringQualifications) {
    await prisma.supplierQualification.update({
      where: { id: qual.id },
      data: { status: 'expiring' }
    })

    await prisma.todoTask.create({
      data: {
        title: `供应商资质即将过期：${qual.supplier.name}`,
        type: 'reminder',
        priority: 'high',
        assigneeId: 'procurement-manager',
        relatedType: 'supplier',
        relatedId: qual.supplierId,
        dueDate: qual.expiryDate
      }
    })
  }

  // 3. 查询已过期的资质
  const expiredQualifications = await prisma.supplierQualification.findMany({
    where: {
      status: { in: ['valid', 'expiring'] },
      expiryDate: { lt: now }
    },
    include: { supplier: true }
  })

  // 4. 标记为 expired，但供应商状态保持 active（用户业务规则 BR-1.53）
  for (const qual of expiredQualifications) {
    await prisma.supplierQualification.update({
      where: { id: qual.id },
      data: { status: 'expired' }
    })

    // ⚠️ 用户业务规则变更：资质过期的供应商仍可收货，资质可后补
    // 不再将供应商状态改为 inactive
    // await prisma.supplier.update({
    //   where: { id: qual.supplierId },
    //   data: { status: 'inactive' }
    // })

    // 5. 创建待办任务，提醒采购部门补充资质
    await prisma.todoTask.create({
      data: {
        title: `供应商资质已过期，需补充：${qual.supplier.name}`,
        type: 'reminder',
        priority: 'high',
        assigneeId: 'procurement-manager',
        relatedType: 'supplier',
        relatedId: qual.supplierId,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 天后
      }
    })

    // 移除原有的"在途订单隔离"逻辑（BR-1.53：允许继续收货）
    // const pendingOrders = await prisma.materialRequisition.findMany({...})
    // 不再标记订单为 quarantine
  }
}
```

---

#### 2.3 设备管理系统

**依赖关系**:
- ✅ **依赖 Layer 1.2**: 动态表单引擎（维保记录、故障记录）
- ✅ **依赖 Layer 1.4**: 待办任务系统（维保提醒、故障报修）
- ✅ **依赖 Layer 1.1**: 工作流引擎（维保审批）

**核心表**:
```prisma
model Equipment {
  id                String   @id @default(cuid())
  code              String   @unique
  name              String
  category          String
  location          String
  status            String   @default("normal")

  // 多级维保配置（P0 修复版）
  maintenanceConfig Json?                      // 日常/周/月/季/年维保配置

  maintenancePlans   MaintenancePlan[]
  maintenanceRecords MaintenanceRecord[]
  faults             EquipmentFault[]          // 设备故障

  @@map("equipment")
}

model EquipmentFault {
  id                String   @id @default(cuid())
  faultNumber       String   @unique          // FR-{YYYYMMDD}-{序号}
  equipmentId       String
  reporterId        String
  reportTime        DateTime @default(now())
  faultDescription  String
  urgencyLevel      String   @default("normal")  // urgent | normal | low
  status            String   @default("pending")

  // 工作流集成（P0-1）
  todoTaskId        String?                   // 自动生成待办任务

  equipment         Equipment @relation(fields: [equipmentId], references: [id])

  @@map("equipment_faults")
}
```

**设备故障报修流程（所有员工可发起）**:
```typescript
// 提交故障报修
async function submitEquipmentFault(data: {
  equipmentId: string
  faultDescription: string
  urgencyLevel: 'urgent' | 'normal' | 'low'
  reporterId: string
}) {
  // 1. 生成故障编号
  const faultNumber = await generateFaultNumber()  // FR-20240612-001

  // 2. 创建故障记录
  const fault = await prisma.equipmentFault.create({
    data: {
      faultNumber,
      equipmentId: data.equipmentId,
      reporterId: data.reporterId,
      faultDescription: data.faultDescription,
      urgencyLevel: data.urgencyLevel,
      status: 'pending'
    },
    include: { equipment: true }
  })

  // 3. 自动生成待办任务（工程部接单）
  const todoTask = await prisma.todoTask.create({
    data: {
      title: `设备报修：${fault.equipment.name}`,
      description: fault.faultDescription,
      type: 'maintenance',
      priority: fault.urgencyLevel === 'urgent' ? 'urgent' : 'high',
      assigneeId: 'engineering-dept-leader',  // 分配给工程部主管
      relatedType: 'fault',
      relatedId: fault.id
    }
  })

  // 4. 关联待办任务
  await prisma.equipmentFault.update({
    where: { id: fault.id },
    data: { todoTaskId: todoTask.id }
  })

  return fault
}
```

---

### Layer 3: 体系管理模块

**定位**: 支撑 BRCGS 体系管理要求的功能模块。

#### 3.1 培训管理系统

**依赖关系**:
- ✅ **依赖 Layer 1.2**: 动态表单引擎（培训签到表、考试成绩表）
- ✅ **依赖 Layer 1.1**: 工作流引擎（培训计划审批）
- ✅ **依赖 Layer 1.4**: 待办任务系统（培训通知）

**核心表**:
```prisma
model TrainingPlan {
  id              String   @id @default(cuid())
  planNumber      String   @unique
  title           String
  category        String              // 岗前培训 | 在岗培训 | 专项培训
  targetAudience  Json                // 目标学员（部门/岗位）
  startDate       DateTime
  endDate         DateTime
  status          String   @default("draft")

  // 工作流集成
  workflowId      String?

  sessions        TrainingSession[]
  participants    TrainingParticipant[]

  @@map("training_plans")
}
```

---

#### 3.2 内审管理系统

**依赖关系**:
- ✅ **依赖 Layer 1.2**: 动态表单引擎（内审检查表、不符合项记录）
- ✅ **依赖 Layer 1.3**: 智能文档引擎（内审报告引用文档）
- ✅ **依赖 Layer 1.1**: 工作流引擎（不符合项整改审批）

---

#### 3.3 供应商管理

**依赖关系**:
- ✅ **依赖 Layer 0.2**: 权限系统（采购部管理供应商）
- ✅ **依赖 Layer 1.4**: 待办任务系统（资质到期提醒）

**P0-6 修复已在 Layer 2.2 仓库管理中实现。**

---

### Layer 4: 移动端与运维层

**定位**: 跨平台移动应用和系统运维监控。

#### 4.1 移动端应用（uniapp）

**依赖关系**:
- ✅ **依赖 Layer 1.2**: 动态表单引擎（移动端填写记录）
- ✅ **依赖 Layer 1.1**: 工作流引擎（移动端审批）
- ✅ **依赖 Layer 2.3**: 设备管理（移动端报修、维保）

**核心功能**:
- 动态表单渲染（20+ 字段类型）
- 离线填写 + 在线同步
- 拍照、签名、条形码扫描
- 工作流审批

---

#### 4.2 系统运维监控

**依赖关系**:
- ✅ **依赖 Layer 0**: 审计日志（LoginLog, PermissionLog, SensitiveLog）
- ✅ **独立部署**: Prometheus + Grafana + Loki

**核心功能**:
- 数据库备份（PostgreSQL pg_dump，每天自动）
- 文件备份（MinIO mc mirror，每天自动）
- 系统监控（CPU、内存、磁盘、API 响应时间）
- 日志聚合（应用日志、审计日志）

---

### 分层架构完整依赖图

```
Layer 4: 移动端与运维
  ├─ 移动端应用 → 依赖 Layer 1.1, 1.2, 2.3
  └─ 运维监控 → 依赖 Layer 0 (审计日志)

Layer 3: 体系管理
  ├─ 培训管理 → 依赖 Layer 1.1, 1.2, 1.4
  ├─ 内审管理 → 依赖 Layer 1.1, 1.2, 1.3
  └─ 供应商管理 → 依赖 Layer 0.2, 1.4

Layer 2: 核心生产
  ├─ 批次追溯 → 依赖 Layer 1.2 (动态表单), Layer 0.2 (权限)
  ├─ 仓库管理 → 依赖 Layer 2.1, 1.1, 1.2, 1.4
  └─ 设备管理 → 依赖 Layer 1.1, 1.2, 1.4

Layer 1: 通用引擎
  ├─ 工作流引擎
  ├─ 动态表单引擎
  ├─ 智能文档引擎
  └─ 待办任务系统

Layer 0: 数据基础设施
  ├─ 用户与组织
  ├─ 权限管理
  ├─ 文档分级体系
  ├─ 编号规则引擎
  └─ 文件存储 (MinIO)
```

---

## 📑 快速导航

### 🔥 Phase A: 基础设施层（最高优先级）- 第一批上线
| 章节 | 标题 | 行号 | 行数 |
|------|------|------|------|
| Chapter 19 | [动态表单引擎与记录管理](#十九动态表单引擎与记录管理核心架构--phase-a基础设施) | 6869 | ~1,600 |
| Chapter 19补充 | [批次追溯系统（BRCGS 核心）](#十九章补充批次追溯系统brcgs-核心--phase-a基础设施) | 8473 | ~360 |
| Chapter 20 | [移动端应用设计（uniapp）](#二十移动端应用设计uniapp-跨平台--phase-a基础设施) | 8830 | ~880 |

### ⚡ Phase B: 核心生产流程（高优先级）- 第二批上线
| 章节 | 标题 | 行号 | 行数 |
|------|------|------|------|
| Chapter 17 | [仓库管理系统](#十七仓库管理系统独立模块--phase-b核心生产) | 5561 | ~790 |
| Chapter 18 | [设备管理系统](#十八设备管理系统独立模块--phase-b核心生产) | 6349 | ~520 |

### 📊 Phase C: 体系管理功能（中等优先级）- 第三批上线
| 章节 | 标题 | 行号 | 行数 |
|------|------|------|------|
| Chapter 15 | [培训管理系统](#十五培训管理系统独立模块--phase-c体系管理) | 4142 | ~700 |
| Chapter 16 | [内审管理系统](#十六内审管理系统独立模块--phase-c体系管理) | 4843 | ~720 |

### 📚 基础章节（架构与核心功能）
| 章节 | 标题 | 行号 | 行数 |
|------|------|------|------|
| 1-13 | [基础章节：项目概述、技术架构、数据模型等](#一项目概述) | 63 | ~2,400 |
| Chapter 14 | [智能文档引擎与工作流系统](#十四智能文档引擎与工作流系统v200---prd-01整合) | 2437 | ~1,700 |
| Chapter 21 | [系统运维与监控设计](#二十一系统运维与监控设计--phase-a基础设施) | 9783 | ~700 |

---

## 🚀 上线路径规划

### Phase A: 基础设施层（Infrastructure）⭐⭐⭐ 最高优先级
**目标：为所有业务功能打好地基**

- **Chapter 19**: 动态表单引擎（核心架构，所有记录系统的基础）- 第 6869 行
- **Chapter 19补充**: 批次追溯系统（BRCGS 认证核心要求）- 第 8473 行
- **Chapter 20**: 移动端应用架构（现场人员的主要工作界面）- 第 8830 行
- **Chapter 21**: 系统运维与监控设计（备份、监控、部署、审计）- 第 9783 行

### Phase B: 核心生产流程 ⭐⭐⭐ 高优先级
**目标：打通从原料到成品的完整流程**

- **Chapter 17**: 仓库管理系统（原料 → 生产 → 成品全流程）- 第 5561 行
- **Chapter 18**: 设备管理系统（生产设备维护保养）- 第 6349 行

### Phase C: 体系管理功能 ⭐⭐ 中等优先级
**目标：完善 BRCGS 管理体系要求**

- **Chapter 15**: 培训管理系统（人员能力管理）- 第 4142 行
- **Chapter 16**: 内审管理系统（体系自查与改进）- 第 4843 行

### 架构决策
- ✅ **批次追溯表采用硬编码方式**（ProductionBatch、BatchMaterialUsage、FinishedGoodsBatch）
- ✅ **动态表单引擎作为扩展记录系统**（生产参数、质检指标、操作签名等）
- ✅ **硬编码核心 + 动态表单扩展**的混合架构，兼顾稳定性与灵活性

---

## 📖 完整目录

### 基础章节
1. [项目概述](#一项目概述) - 第 63 行
2. [技术架构](#二技术架构) - 第 131 行
3. [文档分级体系](#三文档分级体系) - 第 162 行
4. [核心功能模块](#四核心功能模块) - 第 192 行
5. [业务规则](#五业务规则) - 第 293 行
6. [工程化约束](#六工程化约束) - 第 317 行
7. [数据模型](#七数据模型) - 第 365 行
8. [API设计](#八api设计) - 第 536 行
9. [前端设计](#九前端设计) - 第 609 行
10. [MVP Phase 1-6 核心设计决策](#十mvp-phase-1-6-核心设计决策) - 第 705 行
11. [项目里程碑](#十一项目里程碑) - 第 758 行
12. [待补充细节](#十二待补充细节) - 第 792 行
13. [Phase 7-12 扩展功能规划](#十三phase-7-12-扩展功能规划) - 第 804 行

### 功能模块章节（按章节编号排序）
14. [智能文档引擎与工作流系统（v2.0.0）](#十四智能文档引擎与工作流系统v200---prd-01整合) - 第 2437 行 | 约 1,700 行
15. [培训管理系统（独立模块）⭐⭐ Phase C](#十五培训管理系统独立模块--phase-c体系管理) - 第 4142 行 | 约 700 行
16. [内审管理系统（独立模块）⭐⭐ Phase C](#十六内审管理系统独立模块--phase-c体系管理) - 第 4843 行 | 约 720 行
17. [仓库管理系统（独立模块）⭐⭐⭐ Phase B](#十七仓库管理系统独立模块--phase-b核心生产) - 第 5561 行 | 约 790 行
18. [设备管理系统（独立模块）⭐⭐ Phase B](#十八设备管理系统独立模块--phase-b核心生产) - 第 6349 行 | 约 520 行
19. [动态表单引擎与记录管理（核心架构）⭐⭐⭐ Phase A](#十九动态表单引擎与记录管理核心架构--phase-a基础设施) - 第 6869 行 | 约 1,600 行
    - 补充：[批次追溯系统（BRCGS 核心）⭐⭐⭐ Phase A](#十九章补充批次追溯系统brcgs-核心--phase-a基础设施) - 第 8473 行 | 约 360 行
20. [移动端应用设计（uniapp 跨平台）⭐⭐⭐ Phase A](#二十移动端应用设计uniapp-跨平台--phase-a基础设施) - 第 8830 行 | 约 880 行
21. [系统运维与监控设计⭐⭐⭐ Phase A](#二十一系统运维与监控设计--phase-a基础设施) - 第 9783 行 | 约 700 行

---

## 一、项目概述

[⬆️ 返回目录](#-完整目录)

### 1.1 项目目标

建立一个企业内部文档管理系统，支持：
- 四级文件体系管理（一级/二级/三级/四级）
- 文档上传、审批、版本管理
- 四级文件模板创建与任务分发
- 用户与权限管理

### 1.2 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端 | Vue 3 + Element Plus + Vite + Pinia | ^3.4.0 / ^2.5.0 / ^5.0.0 / ^2.1.0 | 上手简单，生态丰富 |
| 后端 | Node.js + NestJS + TypeScript + Prisma | 18.x / ^10.0.0 / ^5.3.0 / ^5.7.0 | 企业级框架，稳定 |
| 数据库 | PostgreSQL + Redis | >=15.0 / >=7.0 | JSON支持好，适合动态表单 |
| 文件存储 | MinIO | Latest | 本地部署，数据自主可控 |
| 部署 | Docker + Docker Compose | >=24.0 / >=2.20 | 环境一致，不出错 |
| 共享 | TypeScript 类型定义 | packages/types | 前后端类型共享 |

### 1.3 目录结构

```
noidear/
├── client/                    # 前端 Vue 3 项目
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                    # 后端 NestJS 项目
│   ├── src/
│   │   ├── modules/          # 按域分模块
│   │   │   ├── auth/         # 认证模块
│   │   │   ├── user/         # 用户模块
│   │   │   ├── department/   # 部门模块
│   │   │   ├── document/     # 文档模块
│   │   │   ├── template/     # 模板模块
│   │   │   ├── task/         # 任务模块
│   │   │   └── approval/     # 审批模块
│   │   ├── common/           # 公共模块
│   │   └── prisma/           # 数据库模型
│   └── package.json
├── packages/                  # 共享包
│   └── types/                 # TypeScript 类型定义
│       ├── index.ts           # 导出所有类型
│       ├── user.ts            # 用户相关类型
│       ├── document.ts        # 文档相关类型
│       ├── template.ts        # 模板相关类型
│       ├── task.ts            # 任务相关类型
│       └── api.ts             # API 响应类型
├── docker-compose.yml         # 开发环境 Docker 配置
├── docker-compose.prod.yml    # 生产环境 Docker 配置
├── data/                      # 数据持久化目录
│   ├── postgres/              # PostgreSQL 数据
│   └── minio/                 # MinIO 数据
└── uploads/                   # 本地临时文件目录
```

### 1.4 数据库

- 数据库名称: `document_system`
- 主键类型: 雪花ID（Snowflake ID）
- 软删除: `deleted_at` 字段（datetime）
- 事务: 创建文件时使用（编号+记录一起成功或失败）
- 并发: 任务提交加锁，数据库事务保证数据一致性

---

## 二、技术架构

[⬆️ 返回目录](#-完整目录)

### 2.1 开发环境

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存 |
| MinIO | 9000 | 对象存储 |
| MinIO Console | 9001 | 管理界面 |
| NestJS | 3000 | 后端API |
| Vue Dev | 5173 | 前端开发 |

### 2.2 部署方案

- 开发环境: Docker Compose
- Docker 配置: 分开两份（dev/prod）
- 文件存储: MinIO，按部门分桶
- 访问方式: VPN + 内网
- HTTPS: 暂时不需要，公网访问时再加

### 2.3 安全配置

- 密码加密: bcrypt（自动加盐）
- 登录锁定: 5次失败锁定账号
- Token: Header 传递 `Authorization: Bearer xxx`
- 验证码: 不需要（MVP阶段）
- 接口限流: 不限流

---

## 三、文档分级体系

[⬆️ 返回目录](#-完整目录)

### 3.1 四级文件定义

| 级别 | 文件类型 | 说明 | 上传/创建方式 | 审批流程 |
|------|----------|------|---------------|----------|
| 一级 | 管理手册 | 质量方针、目标 | 上传文件（PDF/Word/Excel） | 上传→提交审批→通过→发布 |
| 二级 | 程序文件 | 管理制度、流程 | 上传文件（PDF/Word/Excel） | 上传→提交审批→通过→发布 |
| 三级 | 作业指导书 | 操作规范、标准 | 上传文件（PDF/Word/Excel） | 上传→提交审批→通过→发布 |
| 四级 | 记录表单 | 填写记录、证据 | 创建表单模板 | 创建模板→发布→任务分发→填写→审批 |

### 3.2 编号规则

**编号格式**: `{级别}-{部门代码}-{序号}`

示例:
```
1-RD-001    （一级文件）
2-RD-001    （二级文件）
3-RD-001    （三级文件）
4-RD-001    （四级文件）
```

**规则**:
- 文件编号生成后不能修改
- 编号删除后记录待补齐，下次新建时优先使用
- 不同级别的文件使用不同的编号序列

---

## 四、核心功能模块

[⬆️ 返回目录](#-完整目录)

### 4.1 用户管理

| 功能 | 说明 |
|------|------|
| 用户列表 | 查看所有用户 |
| 新增用户 | 手动添加 |
| 编辑用户 | 修改信息、状态、部门 |
| 删除用户 | 软删除（deleted_at） |
| 修改密码 | 用户可修改自己的密码 |
| 批量导入 | MVP不支持 |

**用户状态**: 启用/禁用

### 4.2 组织架构

| 功能 | 说明 |
|------|------|
| 部门列表 | 查看所有部门 |
| 新增部门 | 支持2级（公司→部门） |
| 编辑部门 | 修改名称、上级部门 |
| 删除部门 | 检查后删除（有文件时提示） |
| 停用部门 | 用户转无部门状态 |

**规则**:
- 一人只能属一个部门
- 一人只能有一个上级
- 部门停用后用户转"无部门"

### 4.3 文件管理

| 功能 | 说明 |
|------|------|
| 文件上传 | 支持拖拽、批量上传 |
| 文件列表 | 显示编号、名称、状态、创建人、创建时间 |
| 文件搜索 | 支持名称和编号搜索 |
| 文件排序 | 支持创建时间、编号排序 |
| 文件删除 | 草稿/待审批可删；已发布不能删除只能停用；停用后可彻底删除 |
| 文件下载 | 有权限才能下载 |
| 版本管理 | 修改后自动+版本号，旧版本可查看但不能下载，MVP不支持回滚 |

**文件类型**: PDF、Word、Excel
**文件大小限制**: 10MB
**文件名**: 需要填写，可重复时提示用户修改

### 4.4 审批流程

| 功能 | 说明 |
|------|------|
| 提交审批 | 上传文件后提交 |
| 审批操作 | 通过（选填意见）/ 驳回（必填意见） |
| 审批历史 | 能查看自己审批过的文件 |
| 意见可见 | 依次审批时能看到前面人的意见 |
| 驳回处理 | 驳回后状态变"草稿"，修改后重新提交 |

**审批人确定**: 从用户的上级中选择（用户必须有上级）
**会签**: 支持多人同时审批（需全部通过）
**依次审批**: 支持一人审批后下一人审批
**兜底**: Admin可以审批任何文件

### 4.5 四级模板管理

| 功能 | 说明 |
|------|------|
| 模板创建 | Excel上传解析 / 手动创建 |
| 模板字段 | 文本、长文本、数值、日期、下拉、是/否 |
| 字段排序 | 支持拖拽排序 |
| 字段默认值 | 支持设置默认值 |
| 模板复制 | 支持复制模板 |
| 模板列表 | 显示编号、名称、版本、创建人、创建时间 |
| 模板筛选 | 支持筛选 |
| 模板停用 | 停用后已分发任务不受影响 |
| 模板删除 | 支持删除 |

### 4.6 任务分发

| 功能 | 说明 |
|------|------|
| 任务分发 | 发给部门，部门内人人都能看到 |
| 任务列表 | 显示模板名称、执行人、截止时间、状态 |
| 任务筛选 | Tabs切换（全部/待完成/已完成） |
| 任务填写 | 部门内任意一人填写 |
| 任务提交 | 第一人提交后锁定，不能修改 |
| 任务取消 | 发起人可以取消任务 |
| 任务转发 | 不支持 |
| 逾期标记 | 红色标记 |

**截止日期**: 必填，过期站内消息提醒
**执行规则**: 部门内任意一人都可以填写，第一人提交后锁定

### 4.7 站内消息

| 功能 | 说明 |
|------|------|
| 消息类型 | 任务通知、审批通知、逾期提醒 |
| 已读状态 | 显示已读/未读 |
| 消息保留 | 30天自动清理 |

---

## 五、业务规则

[⬆️ 返回目录](#-完整目录)

| 规则编号 | 规则描述 |
|---------|----------|
| BR-001 | 编号规则配置后，新文件自动按规则生成文件编号 |
| BR-002 | 一级/二级/三级文件创建后必须提交审批，不审批不可发布 |
| BR-003 | 四级文件（模板）创建后直接发布，无需审批 |
| BR-004 | 四级文件（记录）填写后提交审批，审批通过后归档 |
| BR-005 | 模板停用后，不可再新建数据，历史数据可查询 |
| BR-006 | 文件提交后不允许修改，只能查看或撤回 |
| BR-007 | 文件名称同级别内不可重复 |
| BR-008 | 编号删除后，系统记录待补齐编号，下次新建时优先使用 |
| BR-009 | 任务必须指定执行人，否则无法分发 |
| BR-010 | 归档后的数据不可修改，只能查看 |
| BR-011 | 不同级别的文件使用不同的编号序列 |
| BR-012 | 审批驳回时必须填写驳回原因 |
| BR-013 | 文件修改后自动+版本号（1.0→1.1→1.2） |
| BR-014 | 任务第一人提交后，其他人不能再提交，只能查看 |
| BR-014a | 任务发给部门，部门内任意一人都可填写 |
| BR-015 | 用户名唯一，英文+数字，最小3位 |
| BR-016 | 密码最小8位，无需复杂度和特殊字符 |
| **BR-017 (P0-3 修复)** | **质量部和管理层拥有 viewAllRecords 权限，可跨部门查看所有记录** |
| **BR-018 (P0-3 修复)** | **质量部和管理层拥有 MODIFY_APPROVED_RECORD 权限，可修改已审批记录** |
| **BR-019 (P0-3 修复)** | **普通员工只能查看本部门创建的记录，不可跨部门查看** |

---

## 六、工程化约束

[⬆️ 返回目录](#-完整目录)

> **目的**：防止AI乱发挥，确保模块独立、可维护
> **适用范围**：所有开发者/AI Agent

### 6.1 模块化约束

| 约束 | 说明 | 违规处理 |
|------|------|----------|
| **模块独立** | 新增模块不修改现有模块代码 | 重构到独立模块 |
| **API稳定** | 现有API端点不变 | 禁止修改已有API |
| **数据库隔离** | 新功能新建表，不改现有表结构 | 禁止修改现有表 |
| **组件复用** | 相同UI必须提取到components/ | 禁止重复实现 |

### 6.2 代码规范约束

| 约束 | 要求 | 来源 |
|------|------|------|
| 函数长度 | < 50行 | Good Taste |
| 缩进层数 | < 3层 | Good Taste |
| 向后兼容 | 不破坏现有功能 | Never break userspace |
| 异常处理 | 所有API必须有try-catch | 安全规范 |

### 6.3 新增模块步骤

> 以下步骤为AI/开发者必须遵守

```
1. 前端：在 views/ 新建模块目录
2. 前端：在 api/ 新建模块API文件
3. 后端：在 modules/ 新建模块目录
4. 后端：在 prisma/schema.prisma 新增模型（禁止修改现有模型）
5. 路由：在 router/index.js 添加路由
6. 菜单：根据角色动态显示（配置文件控制）
```

### 6.4 禁止行为清单

- ❌ 引入未在技术栈清单中的库
- ❌ 更换框架（Vue 3 → React）
- ❌ 修改项目目录结构
- ❌ 硬编码密码/密钥
- ❌ 使用裸SQL（必须用Prisma）
- ❌ 修改现有API端点
- ❌ 添加MVP范围外功能

---

## 七、数据模型

[⬆️ 返回目录](#-完整目录)

### 6.1 核心表

```sql
-- 用户表
users (
  id              SnowflakeID   PRIMARY KEY,
  username        VARCHAR(50)   UNIQUE NOT NULL,    -- 用户名（英文+数字）
  password        VARCHAR(255)  NOT NULL,           -- bcrypt加密
  name            VARCHAR(100)  NOT NULL,           -- 姓名
  department_id   SnowflakeID   REFERENCES departments(id),
  role            VARCHAR(20)   NOT NULL DEFAULT 'user',  -- user/leader/admin
  superior_id     SnowflakeID   REFERENCES users(id),     -- 上级ID
  status          VARCHAR(10)   NOT NULL DEFAULT 'active', -- active/inactive
  login_attempts  INT           DEFAULT 0,               -- 登录失败次数
  locked_until    TIMESTAMP,                            -- 锁定截止时间
  created_at      TIMESTAMP   DEFAULT NOW(),
  updated_at      TIMESTAMP   DEFAULT NOW(),
  deleted_at      TIMESTAMP                              -- 软删除
);

-- P0-3 修复：权限表（细粒度权限控制）
permissions (
  id          SnowflakeID   PRIMARY KEY,
  code        VARCHAR(50)   UNIQUE NOT NULL,     -- 权限代码（如 viewAllRecords）
  name        VARCHAR(100)  NOT NULL,            -- 权限名称
  description VARCHAR(500),                       -- 权限说明
  category    VARCHAR(50)   NOT NULL,            -- 权限分类（document/record/approval/system）
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW()
);

-- P0-3 修复：用户权限关联表
user_permissions (
  id            SnowflakeID   PRIMARY KEY,
  user_id       SnowflakeID   REFERENCES users(id) ON DELETE CASCADE,
  permission_id SnowflakeID   REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by    SnowflakeID   REFERENCES users(id),      -- 授权人
  granted_at    TIMESTAMP   DEFAULT NOW(),

  UNIQUE(user_id, permission_id)
);

-- 部门表
departments (
  id          SnowflakeID   PRIMARY KEY,
  code        VARCHAR(20)   UNIQUE NOT NULL,    -- 部门代码
  name        VARCHAR(100)  NOT NULL,           -- 部门名称
  parent_id   SnowflakeID   REFERENCES departments(id),  -- 上级部门
  manager_id  VARCHAR(32)   REFERENCES users(id),        -- 部门负责人（可为空）
  status      VARCHAR(10)   NOT NULL DEFAULT 'active',   -- active/inactive
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 编号规则表
number_rules (
  id              SnowflakeID   PRIMARY KEY,
  level           INT           NOT NULL,        -- 1/2/3/4级
  department_id   SnowflakeID   REFERENCES departments(id),
  sequence        INT           NOT NULL DEFAULT 0,  -- 当前序号
  created_at      TIMESTAMP   DEFAULT NOW(),
  updated_at      TIMESTAMP   DEFAULT NOW()
);

-- 文档文件表（一/二/三级）
documents (
  id          SnowflakeID   PRIMARY KEY,
  level       INT           NOT NULL,            -- 1/2/3级
  number      VARCHAR(50)   UNIQUE NOT NULL,     -- 文件编号
  title       VARCHAR(200)  NOT NULL,            -- 文件标题
  file_path   VARCHAR(500)  NOT NULL,            -- MinIO路径
  file_name   VARCHAR(200)  NOT NULL,            -- 原始文件名
  file_size   BIGINT        NOT NULL,            -- 文件大小
  file_type   VARCHAR(50)   NOT NULL,            -- 文件类型
  version     DECIMAL(3,1)  NOT NULL DEFAULT 1.0, -- 版本号
  status      VARCHAR(20)   NOT NULL,            -- draft/under_review/approved/current/archived/obsolete
  creator_id  SnowflakeID   REFERENCES users(id),
  approver_id SnowflakeID   REFERENCES users(id),    -- 审批人
  approved_at TIMESTAMP,                              -- 审批时间

  -- P0-1 修复：文档归档/作废流程
  archive_reason    VARCHAR(500),                     -- 归档/作废原因
  archived_at       TIMESTAMP,                        -- 归档时间
  archived_by       SnowflakeID   REFERENCES users(id), -- 归档人
  obsolete_reason   VARCHAR(500),                     -- 作废原因
  obsoleted_at      TIMESTAMP,                        -- 作废时间
  obsoleted_by      SnowflakeID   REFERENCES users(id), -- 作废人

  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 文档版本历史表
document_versions (
  id          SnowflakeID   PRIMARY KEY,
  document_id SnowflakeID   REFERENCES documents(id),
  version     DECIMAL(3,1)  NOT NULL,
  file_path   VARCHAR(500)  NOT NULL,
  file_name   VARCHAR(200)  NOT NULL,
  file_size   BIGINT        NOT NULL,
  creator_id  SnowflakeID   REFERENCES users(id),
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 模板表（四级）
templates (
  id          SnowflakeID   PRIMARY KEY,
  level       INT           NOT NULL DEFAULT 4,
  number      VARCHAR(50)   UNIQUE NOT NULL,
  title       VARCHAR(200)  NOT NULL,
  fields_json JSONB         NOT NULL,            -- 字段配置
  version     DECIMAL(3,1)  NOT NULL DEFAULT 1.0,
  status      VARCHAR(20)   NOT NULL DEFAULT 'active', -- active/inactive
  creator_id  SnowflakeID   REFERENCES users(id),
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 任务表
tasks (
  id          SnowflakeID   PRIMARY KEY,
  template_id SnowflakeID   REFERENCES templates(id),
  department_id SnowflakeID REFERENCES departments(id), -- 执行部门
  deadline    TIMESTAMP   NOT NULL,            -- 截止日期
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending', -- pending/completed/cancelled
  creator_id  SnowflakeID   REFERENCES users(id),       -- 分发人
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 任务记录表（四级填写）
task_records (
  id          SnowflakeID   PRIMARY KEY,
  task_id     SnowflakeID   REFERENCES tasks(id),
  template_id SnowflakeID   REFERENCES templates(id),
  data_json   JSONB         NOT NULL,            -- 填写数据
  status      VARCHAR(20)   NOT NULL DEFAULT 'pending', -- pending/submitted/approved/rejected
  submitter_id SnowflakeID  REFERENCES users(id),    -- 提交人（第一人提交后锁定）
  submitted_at TIMESTAMP,
  approver_id SnowflakeID   REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW(),
  deleted_at  TIMESTAMP                              -- 软删除
);

-- 说明：每个任务只能有一条提交后的记录（第一人提交后锁定）

-- 审批记录表
approvals (
  id          SnowflakeID   PRIMARY KEY,
  document_id SnowflakeID   REFERENCES documents(id),
  record_id   SnowflakeID   REFERENCES task_records(id),
  approver_id SnowflakeID   REFERENCES users(id),
  status      VARCHAR(20)   NOT NULL,            -- approved/rejected
  comment     TEXT,
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 审批链扩展字段（v2.0 后添加，实现多级审批与会签）
-- level            INT              -- 当前审批层级（多级审批时使用）
-- approval_chain_id VARCHAR(32)     -- 所属审批链ID
-- previous_level   INT              -- 上一层级
-- next_level       INT              -- 下一层级
-- rejection_reason TEXT             -- 拒绝原因
-- approved_at      TIMESTAMPTZ      -- 审批时间
-- approval_type    VARCHAR(20)      -- 审批类型：sequential（依次）/ countersign（会签）
-- sequence         INT              -- 会签序号
-- group_id         VARCHAR(32)      -- 会签组ID

-- 审批委托日志表
CREATE TABLE delegation_logs (
  id              VARCHAR(32)   PRIMARY KEY,
  delegator_id    VARCHAR(32)   NOT NULL REFERENCES users(id),
  delegate_id     VARCHAR(32)   NOT NULL REFERENCES users(id),
  start_date      DATE          NOT NULL,
  end_date        DATE          NOT NULL,
  reason          TEXT,
  status          VARCHAR(20)   NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 操作日志表
operation_logs (
  id          SnowflakeID   PRIMARY KEY,
  user_id     SnowflakeID   REFERENCES users(id),
  action      VARCHAR(50)   NOT NULL,            -- login/upload/approve/edit/delete
  module      VARCHAR(50)   NOT NULL,            -- auth/document/template/task
  object_id   SnowflakeID,
  object_type VARCHAR(50),
  details     JSONB,
  ip          VARCHAR(50),
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 站内消息表
notifications (
  id          SnowflakeID   PRIMARY KEY,
  user_id     SnowflakeID   REFERENCES users(id),
  type        VARCHAR(50)   NOT NULL,            -- task/approval/reminder
  title       VARCHAR(200)  NOT NULL,
  content     TEXT,
  is_read     BOOLEAN       DEFAULT FALSE,
  read_at     TIMESTAMP,
  created_at  TIMESTAMP   DEFAULT NOW()
);
```

### 6.2 扩展字段预留（后续加）

| 字段 | 表 | 用途 |
|------|------|------|
| email | users | 后续邮件通知 |
| phone | users | 后续短信通知 |
| workflow_config | documents | 后续多级审批配置 |
| tags | documents/templates | 后续标签搜索 |
| description | departments | 部门描述 |

---

## 八、API设计

[⬆️ 返回目录](#-完整目录)

### 8.1 API规范

| 项目 | 值 |
|------|------|
| 前缀 | /api/v1 |
| 认证 | Header: `Authorization: Bearer <token>` |
| 分页 | `?page=1&limit=20` |
| 日期格式 | ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) |
| 错误格式 | `{ code: number, message: string, details: any }` |
| 文件上传 | multipart/form-data |
| 超时时间 | 30秒 |

### 7.2 核心API

| 模块 | 端点 | 方法 | 说明 |
|------|------|------|------|
| **认证** | | | |
| | /api/v1/auth/login | POST | 登录 |
| | /api/v1/auth/me | GET | 获取当前用户 |
| | /api/v1/auth/password | PUT | 修改密码 |
| | /api/v1/auth/logout | POST | 登出 |
| **用户** | | | |
| | /api/v1/users | GET | 用户列表 |
| | /api/v1/users | POST | 创建用户 |
| | /api/v1/users/:id | GET | 用户详情 |
| | /api/v1/users/:id | PUT | 更新用户 |
| | /api/v1/users/:id | DELETE | 删除用户 |
| **部门** | | | |
| | /api/v1/departments | GET | 部门列表 |
| | /api/v1/departments | POST | 创建部门 |
| | /api/v1/departments/:id | PUT | 更新部门 |
| | /api/v1/departments/:id | DELETE | 删除部门 |
| **文档** | | | |
| | /api/v1/documents/level/:level | GET | 文档列表 |
| | /api/v1/documents | POST | 上传文档 |
| | /api/v1/documents/:id | GET | 文档详情 |
| | /api/v1/documents/:id | PUT | 更新文档 |
| | /api/v1/documents/:id | DELETE | 删除文档 |
| | /api/v1/documents/:id/download | GET | 下载文档 |
| | /api/v1/documents/:id/versions | GET | 版本历史 |
| **审批** | | | |
| | /api/v1/approvals/pending | GET | 待审批列表 |
| | /api/v1/approvals/history | GET | 审批历史 |
| | /api/v1/approvals | POST | 提交审批 |
| | /api/v1/approvals/:id | PUT | 审批操作 |
| **模板** | | | |
| | /api/v1/templates | GET | 模板列表 |
| | /api/v1/templates | POST | 创建模板 |
| | /api/v1/templates/:id | GET | 模板详情 |
| | /api/v1/templates/:id | PUT | 更新模板 |
| | /api/v1/templates/:id | DELETE | 删除模板 |
| | /api/v1/templates/:id/copy | POST | 复制模板 |
| | /api/v1/templates/parse-excel | POST | 解析Excel |
| **任务** | | | |
| | /api/v1/tasks | GET | 任务列表 |
| | /api/v1/tasks | POST | 分发任务 |
| | /api/v1/tasks/:id | GET | 任务详情 |
| | /api/v1/tasks/:id | DELETE | 取消任务 |
| | /api/v1/tasks/:id/submit | POST | 提交任务 |
| **记录** | | | |
| | /api/v1/records | GET | 记录列表 |
| | /api/v1/records/:id | GET | 记录详情 |
| **消息** | | | |
| | /api/v1/notifications | GET | 消息列表 |
| | /api/v1/notifications/:id/read | PUT | 标记已读 |
| | /api/v1/notifications/read-all | PUT | 全部已读 |
| **日志** | | | |
| | /api/v1/logs | GET | 操作日志（管理员） |

---

## 九、前端设计

[⬆️ 返回目录](#-完整目录)

### 10.1 页面结构

**侧边栏层级**: 二级（按功能模块分类）

```
侧边栏:
├── 一级文件管理
│   ├── 文件列表
│   └── 上传文件
├── 二级文件管理
│   ├── 文件列表
│   └── 上传文件
├── 三级文件管理
│   ├── 文件列表
│   └── 上传文件
├── 四级模板
│   ├── 模板列表
│   └── 创建模板
├── 任务管理
│   ├── 我的任务
│   └── 分发任务（部门负责人）
├── 审批中心
├── 用户管理（Admin）
└── 部门管理（Admin）
```

### 8.2 交互规范

| 项目 | 值 |
|------|------|
| 每页条数 | 20条（可切换10/20/50） |
| 列表加载 | 分页 |
| 表单验证 | 红色文字在字段下方 |
| 审批意见 | 驳回时必填，通过时选填 |
| 文件上传 | 拖拽上传 + 批量上传 + 进度条 |
| 文件名显示 | 显示文件名 |
| 批量操作 | 批量删除 |
| 任务筛选 | Tabs切换 |

### 8.3 组件预留扩展

| 组件 | 用途 | 后续扩展 |
|------|------|----------|
| UserAvatar | 用户头像 | 后续支持上传 |
| VersionCompare | 版本对比 | 后续加 |
| DataExport | 数据导出 | 后续加Excel导出 |
| WorkflowDesigner | 工作流设计 | 后续加可视化设计 |

### 8.4 响应式设计

> **适用范围**：Phase 1-6 所有页面
> **响应式目标**：手机、平板、电脑均可正常使用核心功能

#### 8.4.1 支持设备

| 设备 | 宽度范围 | 支持级别 |
|------|----------|----------|
| 手机 | 375px - 428px | 完全支持 |
| iPad | 768px - 1024px | 完全支持 |
| 桌面 | ≥1200px | 完全支持（主适配） |

#### 8.4.2 断点定义

```css
/* 桌面 ≥1200px */
@media (min-width: 1200px) { /* 桌面布局 */ }

/* iPad 768px - 1199px */
@media (min-width: 768px) and (max-width: 1199px) { /* iPad布局 */ }

/* 手机 <768px */
@media (max-width: 767px) { /* 手机布局 */ }
```

#### 8.4.3 各端适配规则

| 功能 | 手机 | iPad | 桌面 |
|------|------|------|------|
| 侧边栏 | 汉堡菜单（折叠） | 可折叠 | 固定显示 |
| 文档列表 | 卡片式 | 表格+卡片 | 表格 |
| 任务填写 | 全屏表单 | 分栏布局 | 分栏布局 |
| 审批操作 | 全屏弹窗 | 弹窗 | 弹窗 |
| 文件上传 | 拍照/选择文件 | 拖拽+选择 | 拖拽+批量 |
| 按钮大小 | ≥44px（手指操作） | ≥40px | ≥32px |

#### 8.4.4 禁止行为

- ❌ 禁止使用fixed定位导致手机端底部被遮挡
- ❌ 禁止表格超过屏幕宽度出现横向滚动
- ❌ 禁止弹窗超过100%高度
- ❌ 禁止使用hover交互（手机无hover）

---

## 十、MVP Phase 1-6 核心设计决策

[⬆️ 返回目录](#-完整目录)

> **说明**: MVP Phase 1-6 已完成 98.1%，以下为关键设计决策精简版

### 10.1 组织架构

- **部门层级**: 2级（公司→部门）
- **用户角色**: 普通用户、部门负责人、管理员
- **审批人规则**: 从上级选择
- **不支持**: 一人多部门、一人多上级

### 10.2 文档管理

- **支持格式**: PDF、Word、Excel（单文件最大 10MB）
- **文档编号**: 自动生成，不可修改
- **版本控制**: 旧版本可查看不可下载，无版本对比
- **审批流程**: 无时限，站内消息提醒，驳回后回到草稿
- **权限控制**: 有权限才能下载，已发布文件不可删除
- **文件操作**: 支持拖拽上传、批量上传

### 10.3 四级模板与任务

- **模板功能**: 支持复制、字段拖拽排序、字段默认值
- **任务分发**: Tab切换筛选、支持取消、逾期红色标记
- **数据导出**: 支持导出为 Excel
- **Excel解析**: 手动映射字段

### 10.4 系统配置

- **数据库**: PostgreSQL（Docker）+ 雪花ID主键 + 软删除（deleted_at）
- **文件存储**: MinIO（按部门分桶）
- **身份验证**: bcrypt 密码加密 + JWT Token（Header）
- **分页**: page + limit（每页20条）
- **日期格式**: YYYY-MM-DD
- **回收站**: 保留7天

### 10.5 用户与安全

- **用户名**: 英文+数字，最小3位，必须唯一
- **密码**: 最小8位，无复杂度要求
- **登录保护**: 5次失败锁定账号
- **不支持**: 验证码、用户头像、批量导入用户

### 10.6 消息通知

- **通知方式**: 站内消息（无邮件/短信）
- **消息保留**: 30天
- **功能**: 支持已读/未读、搜索（名称和编号）

---



## 十一、项目里程碑

[⬆️ 返回目录](#-完整目录)

> **重要说明**：
> - **MVP范围**：Phase 1-6（当前开发，完成后开箱即用）
> - **扩展范围**：Phase 7-14（后续扩展，不在当前计划内）

### Phase 1-6: MVP版本（当前开发）

| Phase | 模块 | Issue数 | 状态 |
|-------|------|---------|------|
| Phase 1 | 基础配置 | 8个 | 待开发 |
| Phase 2 | 一级文件 | 10个 | 待开发 |
| Phase 3 | 二三级文件 | 6个 | 待开发 |
| Phase 4 | 四级模板 | 12个 | 待开发 |
| Phase 5 | 任务分发 | 10个 | 待开发 |
| Phase 6 | 消息与优化 | 6个 | 待开发 |
| **合计** | | **52个** | |

### Phase 7-14: 完整版扩展（后续规划）

> 以下功能不在当前开发范围内，仅作为预留扩展空间

| Phase | 模块 | 说明 |
|-------|------|------|
| Phase 7-8 | 偏离检测 | 配方公差定义与自动偏离检测 |
| Phase 9 | 数据导出 | Excel批量导出 |
| Phase 11 | 文件预览 | 在线预览PDF/Word/Excel |
| Phase 12 | 统计分析 | 报表和图表展示 |
| Phase 13 | 多语言 | 中英文切换 |
| Phase 14 | 邮件通知 | SMTP邮件通知（留接口） |
| v2.0.0 | 工作流+智能文档 | 工作流引擎与文档内容引用 |

---

## 十二、待补充细节

[⬆️ 返回目录](#-完整目录)

> 以下是待讨论或待确认的细节，在后续会议中补充

| 序号 | 分类 | 问题 | 状态 |
|------|------|------|------|
| 1 | | | 待讨论 |
| 2 | | | 待讨论 |
| 3 | | | 待讨论 |

---

## 十三、Phase 7-12 扩展功能规划

[⬆️ 返回目录](#-完整目录)

> **重要说明**：
> - MVP Phase 1-6 已完成 98.1%（51/52个Issue）
> - 本章节详细描述 Phase 7-12 的业务需求和功能规格
> - 基于用户确认的需求：**偏离检测、数据导出、文件预览、偏离统计**
> - **架构变更**: 采用 v2.0.0 新架构，优先实施工作流引擎和智能文档引擎
> - **已移除**: Phase 10 (2级审批流程) - 完全由 v2.0.0 简化工作流引擎替代
> - **不包含**：多语言（Phase 13）、邮件通知（Phase 14）

### 13.0 Phase 7-12 功能总览

| Phase | 功能 | 核心业务价值 | 依赖关系 | 实施优先级 |
|-------|------|-------------|----------|-----------|
| **Phase 7-8** | 配方偏离检测与版本管理 | 配方公差定义 → 自动偏离检测 → 强制说明原因 → 生成报告 → 触发工作流审批 | 依赖 v2.0.0 工作流引擎 | P0（最高） |
| **Phase 9** | 数据导出 | Excel 批量导出文档、任务记录、偏离报告 | 无依赖 | P1 |
| **Phase 11** | 文件预览 | PDF/Word/Excel 全格式原生预览 | 无依赖 | P2 |
| **Phase 12** | 偏离统计分析 | 偏离次数、类型分布、趋势统计 | 依赖 Phase 7-8 | P1 |

**实施顺序建议**（基于 v2.0.0 新架构）：
```
v2.0.0（工作流引擎 + 智能文档引擎，11周）
  ↓
Phase 7-8（偏离检测，依赖工作流引擎）
  ↓
Phase 12（统计分析）→ Phase 9（数据导出）→ Phase 11（文件预览）
```

> **架构说明**: Phase 7-8 的偏离检测需要2级审批流程，不再单独实现 Phase 10，而是直接使用 v2.0.0 工作流引擎配置偏离专用审批流程。

---

### 13.1 Phase 7-8：配方偏离检测与版本管理

#### 13.1.1 业务背景

**核心问题**：
1. 生产过程中，员工填写生产记录时，实际值可能偏离配方标准值
2. 当前系统无法自动检测偏离，依赖人工审核，效率低且易漏检
3. 偏离原因无法追溯，质量问题难以分析

**业务目标**：
- 在模板（配方）中定义公差范围，员工填写时自动检测偏离
- 偏离时强制填写原因，生成偏离报告，触发额外审批流程
- 支持偏离数据统计分析，为质量改进提供数据支持

#### 13.1.2 用户故事

**故事1：配方管理员定义公差**
```
作为：配方管理员（研发部）
我想要：在工艺配方中定义每个字段的公差范围
以便：系统能自动检测生产记录的偏离情况

验收标准：
- 能为数值型字段设置公差（范围公差：±5g、百分比公差：±5%）
- 公差配置保存在模板中，不影响已有字段
- 公差配置可修改，但不影响历史记录的偏离判断（版本锁定）
```

**故事2：生产员工填写记录时偏离检测**
```
作为：生产员工
我想要：填写生产记录时，系统自动检测我填的值是否偏离配方
以便：及时发现异常情况并记录原因

验收标准：
- 输入数值后，系统实时显示是否在公差范围内（✅正常 / ❌偏离）
- 偏离时弹窗强制填写偏离原因（不填无法提交）
- 偏离原因保存在偏离报告中，方便后续审批和追溯
```

**故事3：质量主管审批偏离报告**
```
作为：质量主管
我想要：查看包含偏离的生产记录，并审批偏离是否可接受
以便：确保质量可控，不合格的偏离不能归档

验收标准：
- 偏离记录提交后，触发额外的审批流程（正常记录→主管审批；偏离记录→主管+质量主管）
- 审批时能看到偏离字段、期望值、实际值、偏离量、偏离原因
- 审批拒绝后，记录回到草稿状态，员工可修改后重新提交
```

**故事4：版本锁定（防止历史数据混乱）**
```
作为：配方管理员
我想要：配方更新后，已填写的生产记录不受影响
以便：历史数据准确反映当时的配方要求，不会因配方变更而改变偏离判断

验收标准：
- 员工提交记录时，系统锁定配方版本号
- 配方从 v1.0 更新到 v1.1 后，已提交的记录仍按 v1.0 判断偏离
- 未提交的记录自动使用最新版本 v1.1
```

#### 13.1.3 功能需求

##### 13.1.3.1 配方公差定义

**输入**：
- 字段名称（如：temperature）
- 字段类型（必须为 number）
- 公差类型（范围公差 / 百分比公差）
- 公差参数：
  - 范围公差：最小值、最大值（如：175°C ~ 185°C）
  - 百分比公差：百分比（如：±5%）

**输出**：
- 模板 fieldsJson 中增加 tolerance 配置
- 前端表单显示公差提示（如：温度：___°C（标准：180±5°C））

**业务规则**：
- 仅数值型字段支持公差配置
- 公差配置为可选项，不配置则不检测偏离
- 公差配置修改后，版本号+0.1，历史记录不受影响

##### 13.1.3.2 自动偏离检测

**触发时机**：
- 员工填写表单时（实时检测，前端显示）
- 员工提交表单时（后端验证，生成偏离报告）

**检测逻辑**：
```
IF 字段有公差配置 THEN
  IF 范围公差 THEN
    偏离 = (实际值 < 最小值) OR (实际值 > 最大值)
    偏离量 = MIN(|实际值 - 最小值|, |实际值 - 最大值|)
  ELSE IF 百分比公差 THEN
    期望值 = (最小值 + 最大值) / 2
    偏离率 = (实际值 - 期望值) / 期望值 * 100%
    偏离 = |偏离率| > 百分比阈值
  END IF
END IF
```

**输出**：
- 前端：偏离字段标红，显示偏离提示
- 后端：返回偏离字段列表（字段名、期望值、实际值、偏离量）

**业务规则**：
- 偏离检测结果实时显示，不阻塞填写
- 提交时若有偏离，强制弹窗填写原因（每个偏离字段一个原因）
- 偏离原因最少10个字符，最多500个字符

##### 13.1.3.3 偏离报告生成

**触发时机**：员工提交包含偏离的任务记录时

**报告内容**：
| 字段 | 说明 | 示例 |
|------|------|------|
| recordId | 任务记录ID | xxx-xxx |
| templateId | 配方模板ID | 3-RD-001 |
| fieldName | 偏离字段名称 | temperature |
| expectedValue | 期望值（配方值） | 180°C |
| actualValue | 实际值（填写值） | 190°C |
| toleranceMin | 公差最小值 | 175°C |
| toleranceMax | 公差最大值 | 185°C |
| deviationAmount | 偏离量（绝对值） | 5°C |
| deviationRate | 偏离率（百分比） | 5.6% |
| reason | 偏离原因（员工填写） | 生产线温度控制器故障，已报修 |
| status | 报告状态 | pending（待审批）|
| reportedBy | 报告人 | 张三 |
| reportedAt | 报告时间 | 2026-02-05 14:30:00 |

**输出**：
- 生成偏离报告记录（存入 DeviationReport 表）
- 任务记录标记为"包含偏离"（hasDeviation = true, deviationCount = N）
- 触发 v2.0.0 工作流引擎的"偏离审批流程"（2级审批：主管→质量经理）

**业务规则**：
- 一个任务记录可以包含多个偏离字段，每个字段生成一条偏离报告
- 偏离报告状态：pending（待审批）→ approved（通过）/ rejected（拒绝）
- 偏离报告不可修改，只能查看和审批

##### 13.1.3.4 版本锁定机制

**目标**：配方更新后，已提交的记录不受影响，保证历史数据准确性

**实现方式**：
- 任务记录表新增字段：
  - `relatedTemplateId`（关联的配方模板ID）
  - `relatedTemplateVersion`（锁定的配方版本号）
- 员工提交记录时，系统自动记录当前配方版本号
- 偏离检测和统计时，使用锁定的版本号对应的公差配置

**业务规则**：
- 提交后的记录，版本号永久锁定，不可修改
- 未提交的记录（草稿状态），每次打开时使用最新版本
- 配方版本号格式：1.0, 1.1, 1.2...（修改字段配置时自动递增）

#### 13.1.4 业务规则（新增）

| 规则编号 | 规则描述 |
|---------|----------|
| BR-017 | 数值型字段可配置公差（范围公差 or 百分比公差），非数值型字段不支持 |
| BR-018 | 偏离检测在前端实时显示，后端提交时强制验证 |
| BR-019 | 偏离时必须填写偏离原因（最少10字，最多500字） |
| BR-020 | 偏离报告自动生成，不可手动修改，只能审批通过/拒绝 |
| BR-021 | 包含偏离的记录触发额外审批流程（正常：1级审批；偏离：2级审批） |
| BR-022 | 任务记录提交时锁定配方版本号，后续配方更新不影响已提交记录 |
| BR-023 | 配方公差配置修改后，版本号自动+0.1，历史记录按旧版本判断偏离 |
| BR-024 | 偏离报告状态：pending（待审批）→ approved（归档）/ rejected（驳回到创建人） |

#### 13.1.5 数据实体

##### Template.fieldsJson 扩展（向后兼容）

```typescript
// 现有字段结构（MVP Phase 1-6，保持不变）
interface TemplateField {
  name: string          // 字段名称
  label: string         // 字段标签
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'boolean'
  required: boolean
  defaultValue?: string | number | boolean
  options?: { label: string; value: string | number }[]  // 下拉选项
  sort: number          // 排序
}

// 新增字段（Phase 7+）
interface TemplateFieldV2 extends TemplateField {
  tolerance?: {                    // 公差配置（仅 number 类型有效）
    type: 'range' | 'percentage'   // 范围公差 vs 百分比公差
    min?: number                   // 最小值（如：95）
    max?: number                   // 最大值（如：105）
    percentage?: number            // 百分比（如：5，表示±5%）
    unit?: string                  // 单位（如：°C, g, min）
  }
  relatedTemplateId?: string       // 关联的上游配方ID（用于自动带入）
}
```

**示例**：
```json
{
  "name": "temperature",
  "label": "温度",
  "type": "number",
  "required": true,
  "defaultValue": 180,
  "tolerance": {
    "type": "range",
    "min": 175,
    "max": 185,
    "unit": "°C"
  }
}
```

##### DeviationReport（新增表）

**业务概念**：偏离报告，记录生产记录中偏离配方标准的字段详情

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SnowflakeID | 主键 |
| recordId | SnowflakeID | 关联的任务记录ID |
| templateId | SnowflakeID | 关联的配方模板ID |
| fieldName | String | 偏离字段名称 |
| expectedValue | String | 期望值（配方标准值） |
| actualValue | String | 实际值（员工填写值） |
| toleranceMin | Float | 公差最小值 |
| toleranceMax | Float | 公差最大值 |
| deviationAmount | Float | 偏离量（绝对值） |
| deviationRate | Float | 偏离率（百分比） |
| reason | String | 偏离原因（员工填写，10-500字符） |
| status | String | 报告状态（pending/approved/rejected） |
| reportedBy | SnowflakeID | 报告人（员工ID） |
| reportedAt | DateTime | 报告时间 |
| approvedBy | SnowflakeID | 审批人ID |
| approvedAt | DateTime | 审批时间 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |
| deletedAt | DateTime | 软删除 |

##### TaskRecord 扩展

**新增字段**：
| 字段 | 类型 | 说明 |
|------|------|------|
| relatedTemplateId | SnowflakeID | 关联的配方模板ID（用于版本锁定） |
| relatedTemplateVersion | Float | 锁定的配方版本号（如：1.0, 1.1） |
| hasDeviation | Boolean | 是否包含偏离（true/false） |
| deviationCount | Int | 偏离字段数量 |

#### 13.1.6 业务流程

##### 流程图：配方偏离检测与审批

```
┌──────────────────────────────────────────────────────────────────┐
│                   配方偏离检测与审批流程                            │
└──────────────────────────────────────────────────────────────────┘

Step 1: 配方管理员创建/更新配方
    ↓
   配方模板（三级文件）
   - 原料A: 100g ±5g
   - 温度: 180°C ±5°C
   - 时间: 30min ±2min
   版本号：v1.0

Step 2: 生产员工填写生产记录
    ↓
   员工输入：
   - 原料A = 103g  →  ✅ 正常（100-105范围内）
   - 温度 = 190°C  →  ❌ 偏离（175-185范围外）
   - 时间 = 28min  →  ✅ 正常（28-32范围内）
    ↓
   前端实时显示：
   - 温度字段标红
   - 提示：偏离配方标准值5°C

Step 3: 提交时强制填写偏离原因
    ↓
   弹窗：请填写"温度"字段偏离原因
   员工输入：生产线温度控制器故障，已报修
    ↓
   系统生成偏离报告：
   - 字段：temperature
   - 期望值：180°C
   - 实际值：190°C
   - 偏离量：5°C
   - 原因：生产线温度控制器故障，已报修

Step 4: 触发工作流引擎的偏离审批流程（v2.0.0）
    ↓
   1级审批（生产主管）：
   - 查看生产记录 + 偏离报告
   - 通过/拒绝
    ↓（通过后）
   2级审批（质量主管）：
   - 查看偏离报告，判断是否可接受
   - 通过（归档）/ 拒绝（回到员工，修改后重新提交）

Step 5: 归档或驳回
    ↓
   通过：记录归档，偏离报告状态 = approved
   拒绝：记录回到草稿，偏离报告状态 = rejected
```

#### 13.1.7 成功指标

| 指标 | 目标值 | 数据来源 |
|------|--------|----------|
| 偏离检出率 | ≥95% | 实际偏离数 / 人工审核发现的偏离数 |
| 偏离报告完成率 | 100% | 偏离记录中填写原因的比例 |
| 偏离审批及时率 | ≥90% 在24小时内完成审批 | 审批完成时间 - 提交时间 |
| 版本锁定准确率 | 100% | 历史记录的配方版本不受更新影响 |
| 用户满意度 | ≥4.0/5.0 | 生产员工和质量主管的反馈评分 |

#### 13.1.8 验收标准

**Phase 7-8 功能验收清单**：

- [ ] 配方管理员能在模板中为数值型字段配置公差（范围公差 + 百分比公差）
- [ ] 公差配置修改后，模板版本号自动递增（1.0 → 1.1）
- [ ] 员工填写表单时，偏离字段实时标红显示
- [ ] 提交时若有偏离，强制弹窗填写原因（不填无法提交）
- [ ] 偏离原因限制10-500字符，少于10字符提示错误
- [ ] 提交后自动生成偏离报告，包含字段名、期望值、实际值、偏离量、原因
- [ ] 任务记录提交时锁定配方版本号，后续配方更新不影响已提交记录
- [ ] 未提交的草稿记录，每次打开时自动使用最新配方版本
- [ ] 包含偏离的记录触发工作流引擎的偏离审批流程（2级审批：主管→质量经理，依赖 v2.0.0）
- [ ] 偏离报告审批通过后，状态变为 approved，记录归档
- [ ] 偏离报告审批拒绝后，状态变为 rejected，记录回到草稿状态
- [ ] 偏离报告不可手动修改，只能查看和审批

---

### 13.2 Phase 9：数据导出

#### 13.2.1 业务背景

**核心问题**：
1. 管理层需要定期汇报生产数据、偏离情况、审批效率等指标
2. 当前系统只能在页面查看，无法导出Excel进行二次分析
3. 数据分析师需要批量导出数据进行统计分析

**业务目标**：
- 支持批量导出文档列表、任务记录、偏离报告为 Excel 格式
- 导出文件包含必要的字段和过滤条件，方便二次分析
- 导出过程不阻塞用户操作，大批量导出时异步生成

#### 13.2.2 用户故事

**故事1：部门主管导出文档列表**
```
作为：部门主管
我想要：导出本部门的所有一级/二级/三级文件列表（Excel）
以便：进行文档盘点和合规性检查

验收标准：
- 能按文档级别（1/2/3）、部门、状态、时间范围筛选导出
- 导出字段：编号、名称、版本、状态、创建人、创建时间、审批人、审批时间
- 导出文件名格式：文档列表_部门名称_20260205.xlsx
- 导出后自动下载或提供下载链接
```

**故事2：质量主管导出偏离报告**
```
作为：质量主管
我想要：导出某个时间段内的所有偏离报告（Excel）
以便：分析偏离趋势，制定改进措施

验收标准：
- 能按模板、部门、时间范围筛选导出
- 导出字段：记录ID、配方名称、字段名称、期望值、实际值、偏离量、偏离率、原因、审批状态
- 每个偏离报告单独一行，便于统计分析
- 支持导出超过1000条数据（异步导出）
```

**故事3：数据分析师导出任务记录**
```
作为：数据分析师
我想要：导出某个模板的所有任务填写记录（Excel）
以便：分析生产数据，发现规律和异常

验收标准：
- 导出表头包含固定列（任务ID、提交人、提交时间、状态）+ 动态列（模板字段）
- 动态列根据模板字段动态生成（如：原料A、温度、时间...）
- 支持导出多个部门的数据
- 导出后文件大小不超过 50MB（超过则分批导出）
```

#### 13.2.3 功能需求

##### 13.2.3.1 文档列表导出

**输入参数**：
- level：文档级别（1/2/3）
- departmentId：部门ID（可选）
- status：文档状态（可选：draft/pending/approved/rejected/inactive）
- startDate：开始日期（可选）
- endDate：结束日期（可选）

**输出**：
- Excel 文件（.xlsx格式）
- 文件名：文档列表_{level}级_{部门名称}_{日期}.xlsx

**导出字段**：
| 字段名 | 数据来源 |
|-------|---------|
| 文档编号 | Document.number |
| 文档标题 | Document.title |
| 版本号 | Document.version |
| 状态 | Document.status |
| 创建人 | User.name |
| 创建时间 | Document.createdAt |
| 审批人 | User.name |
| 审批时间 | Document.approvedAt |

**业务规则**：
- 仅导出当前用户有权限查看的文档
- 软删除的文档不导出
- 导出数量 ≤1000条：同步导出，直接返回文件
- 导出数量 >1000条：异步导出，返回任务ID，用户轮询下载

##### 13.2.3.2 任务记录导出

**输入参数**：
- templateId：模板ID（必填）
- departmentId：部门ID（可选）
- startDate：开始日期（必填）
- endDate：结束日期（必填）

**输出**：
- Excel 文件（.xlsx格式）
- 文件名：任务记录_{模板名称}_{日期}.xlsx

**导出字段**（动态列）：
| 固定列 | 说明 |
|--------|------|
| 任务ID | Task.id |
| 模板名称 | Template.title |
| 提交人 | User.name |
| 提交时间 | TaskRecord.submittedAt |
| 审批状态 | TaskRecord.status |
| 是否偏离 | TaskRecord.hasDeviation |

| 动态列 | 说明 |
|--------|------|
| {字段标签} | TaskRecord.dataJson[字段名称] |

**示例**：
```
| 任务ID | 模板名称 | 提交人 | 提交时间 | 审批状态 | 是否偏离 | 原料A(g) | 温度(°C) | 时间(min) |
|--------|---------|--------|----------|----------|---------|---------|---------|----------|
| xxx-1  | 生产记录  | 张三   | 2026-02-05 | approved | 是      | 103     | 190     | 28       |
| xxx-2  | 生产记录  | 李四   | 2026-02-06 | approved | 否      | 100     | 180     | 30       |
```

**业务规则**：
- 动态列根据模板 fieldsJson 动态生成
- 数值型字段显示数值，日期型字段格式化为 YYYY-MM-DD
- 下拉型字段显示选项标签（label），不是值（value）
- 仅导出已提交的记录（status = submitted/approved/rejected）

##### 13.2.3.3 偏离报告导出

**输入参数**：
- templateId：模板ID（可选）
- departmentId：部门ID（可选）
- startDate：开始日期（必填）
- endDate：结束日期（必填）

**输出**：
- Excel 文件（.xlsx格式）
- 文件名：偏离报告_{时间段}.xlsx

**导出字段**：
| 字段名 | 数据来源 |
|--------|---------|
| 记录ID | TaskRecord.id |
| 配方模板 | Template.title |
| 配方版本 | TaskRecord.relatedTemplateVersion |
| 字段名称 | DeviationReport.fieldName |
| 期望值 | DeviationReport.expectedValue |
| 实际值 | DeviationReport.actualValue |
| 公差最小值 | DeviationReport.toleranceMin |
| 公差最大值 | DeviationReport.toleranceMax |
| 偏离量 | DeviationReport.deviationAmount |
| 偏离率(%) | DeviationReport.deviationRate |
| 偏离原因 | DeviationReport.reason |
| 报告人 | User.name |
| 报告时间 | DeviationReport.reportedAt |
| 审批状态 | DeviationReport.status |
| 审批人 | User.name |
| 审批时间 | DeviationReport.approvedAt |

**业务规则**：
- 一个任务记录有多个偏离字段时，每个字段单独一行
- 仅导出已生成偏离报告的记录（hasDeviation = true）
- 按报告时间倒序排序

#### 13.2.4 业务规则（新增）

| 规则编号 | 规则描述 |
|---------|----------|
| BR-025 | 导出功能仅限有权限的用户使用（Admin可导出全部，Leader可导出本部门） |
| BR-026 | 导出数量 ≤1000条：同步导出；>1000条：异步导出，生成下载链接 |
| BR-027 | 异步导出文件保留7天，超期自动删除 |
| BR-028 | 导出文件名格式：{类型}_{筛选条件}_{日期时间}.xlsx |
| BR-029 | 动态列导出时，字段顺序与模板字段排序一致 |
| BR-030 | 导出文件大小限制：单个文件最大 50MB |

#### 13.2.5 导出格式定义

**Excel 样式规范**：
- 表头行：粗体 + 背景色（浅蓝色）+ 冻结首行
- 数据行：偶数行浅灰色背景（条纹样式）
- 列宽：自动调整（根据内容长度）
- 日期格式：YYYY-MM-DD HH:mm:ss
- 数值格式：保留2位小数

**文件命名规范**：
```
文档列表_{level}级_{部门名称}_{YYYYMMDD}.xlsx
任务记录_{模板名称}_{YYYYMMDD}.xlsx
偏离报告_{YYYYMMDD_HHMMSS}.xlsx
```

#### 13.2.6 权限控制

| 角色 | 权限范围 |
|------|---------|
| Admin | 可导出所有部门的数据 |
| Leader | 可导出本部门的数据 |
| User | 可导出自己创建/提交的数据 |

**权限验证逻辑**：
```
IF role = 'admin' THEN
  允许导出所有数据
ELSE IF role = 'leader' THEN
  过滤条件：departmentId = 用户所在部门ID
ELSE IF role = 'user' THEN
  过滤条件：creatorId = 当前用户ID 或 submitterId = 当前用户ID
END IF
```

#### 13.2.7 验收标准

**Phase 9 功能验收清单**：

- [ ] 部门主管能按级别、部门、状态、时间范围导出文档列表
- [ ] 导出的文档列表包含编号、名称、版本、状态、创建人、审批人、时间等字段
- [ ] 质量主管能按模板、部门、时间范围导出偏离报告
- [ ] 偏离报告导出包含字段名称、期望值、实际值、偏离量、偏离率、原因等字段
- [ ] 数据分析师能导出任务记录，表头包含固定列+动态列（模板字段）
- [ ] 动态列根据模板字段自动生成，顺序与模板一致
- [ ] 导出数量 ≤1000条时，同步返回文件，直接下载
- [ ] 导出数量 >1000条时，异步生成文件，返回任务ID，提供下载链接
- [ ] 异步导出文件保留7天，超期自动删除
- [ ] 导出权限控制：Admin可导出全部，Leader可导出本部门，User可导出自己的
- [ ] 导出文件命名规范，易于识别
- [ ] Excel 样式规范：表头粗体+背景色，数据行条纹样式，列宽自动调整

---


### 13.4 Phase 11：文件预览

#### 13.4.1 业务背景

**核心问题**：
1. 四级文档体系中，Level 1-3 为上传的文件（PDF/Word/Excel），用户需要下载后才能查看内容
2. 下载查看效率低，尤其在移动端或网络不佳的情况下体验差
3. 无法快速确认文件内容是否正确，导致重复下载

**业务目标**：
- 支持 PDF/Word/Excel 全格式在线预览，无需下载
- 预览性能优化，首屏加载时间 < 5秒
- 支持预览缓存，相同文件二次访问更快
- 移动端自适应，支持缩放、翻页等基础操作

#### 13.4.2 用户故事

**故事1：快速预览文档**
```
作为：质量主管
我想要：在文档列表中点击文件名，直接在浏览器中预览文件内容
以便：快速确认文件内容，无需下载到本地

验收标准：
- 点击文件名，弹出预览窗口，显示文件内容
- 支持 PDF、Word（.doc/.docx）、Excel（.xls/.xlsx）三种格式
- 预览窗口支持关闭、下载、打印操作
- 预览失败时，提示用户并提供下载链接
```

**故事2：Excel 表格预览**
```
作为：生产员工
我想要：预览 Excel 文件时，能看到完整的表格结构和数据
以便：确认配料表或配方表的内容准确性

验收标准：
- Excel 预览保留原始样式（字体、颜色、边框）
- 支持多 Sheet 切换（如果文件有多个工作表）
- 支持列宽自适应，表格内容不截断
- 预览窗口支持缩放（放大/缩小）
```

**故事3：Word 文档预览**
```
作为：研发工程师
我想要：预览 Word 文档时，能看到完整的格式和图片
以便：确认工艺文件的排版和内容无误

验收标准：
- Word 预览保留原始格式（标题、段落、列表）
- 图片和表格正常显示
- 支持滚动翻页
- 预览窗口支持全屏模式
```

**故事4：PDF 文档预览**
```
作为：质量审计员
我想要：预览 PDF 文件时，能逐页查看并快速跳转到指定页
以便：审查文档内容，定位关键信息

验收标准：
- PDF 预览显示页码，支持输入页码跳转
- 支持上一页/下一页按钮
- 支持缩放（适应宽度、适应高度、自定义比例）
- 预览清晰度高，文字可正常阅读
```

**故事5：预览性能优化**
```
作为：系统用户
我想要：预览文件时加载速度快，不卡顿
以便：提高工作效率，减少等待时间

验收标准：
- 首次预览文件，加载时间 < 5秒（10MB 以内文件）
- 二次预览相同文件，加载时间 < 1秒（使用缓存）
- 预览加载时，显示进度条或加载动画
- 超大文件（>10MB）提示用户文件较大，建议下载查看
```

#### 13.4.3 功能需求

##### 13.4.3.1 PDF 预览

**技术方案**：
- 前端使用 PDF.js 直接渲染 PDF 文件
- 后端提供文件流接口，支持分段加载（HTTP Range 请求）

**功能列表**：
- ✅ 逐页渲染，支持翻页（上一页/下一页/跳转页）
- ✅ 缩放控制（放大/缩小/适应宽度/适应高度）
- ✅ 全屏模式
- ✅ 下载原文件
- ✅ 打印（调用浏览器打印功能）

**业务规则**：
- PDF 文件 ≤10MB 直接预览
- PDF 文件 >10MB 提示"文件较大，建议下载查看"，但仍可强制预览

##### 13.4.3.2 Word 预览

**技术方案**：
- 后端使用 LibreOffice 转换 Word → HTML
- 前端渲染 HTML 内容，保留格式和图片

**功能列表**：
- ✅ 保留原始格式（标题、段落、列表、表格）
- ✅ 图片正常显示（嵌入图片转为 Base64 或 MinIO URL）
- ✅ 支持滚动浏览
- ✅ 全屏模式
- ✅ 下载原文件

**业务规则**：
- Word 文件转换后缓存 HTML，有效期 7 天
- 转换失败（如文件损坏）时，提示用户并提供下载链接
- 转换超时时间：30 秒

##### 13.4.3.3 Excel 预览

**技术方案**：
- 后端使用 LibreOffice 转换 Excel → HTML
- 前端渲染 HTML 表格，支持多 Sheet 切换

**功能列表**：
- ✅ 保留原始样式（字体、颜色、边框、对齐方式）
- ✅ 多 Sheet 切换（Tab 标签页）
- ✅ 列宽自适应
- ✅ 支持缩放（放大/缩小）
- ✅ 下载原文件

**业务规则**：
- Excel 文件转换后缓存 HTML，有效期 7 天
- 单 Sheet 行数 >1000 时，分页显示（每页 100 行）
- 转换失败时，提示用户并提供下载链接

##### 13.4.3.4 预览缓存机制

**目标**：减少重复转换，提高二次访问速度

**缓存策略**：
| 文件类型 | 缓存内容 | 缓存时长 | 缓存存储 |
|---------|---------|---------|---------|
| PDF | 无需缓存（直接渲染） | - | - |
| Word | 转换后的 HTML | 7天 | MinIO（/preview-cache） |
| Excel | 转换后的 HTML | 7天 | MinIO（/preview-cache） |

**缓存失效条件**：
- 文件被更新（Version 表新增版本记录）
- 缓存超过 7 天（定时任务清理）

**缓存键生成**：
```
cacheKey = `preview_${fileId}_${versionId}_${fileHash}`
```

#### 13.4.4 业务规则（新增）

| 规则编号 | 规则描述 |
|---------|----------|
| BR-041 | 支持 PDF、Word（.doc/.docx）、Excel（.xls/.xlsx）三种格式在线预览 |
| BR-042 | PDF 文件直接渲染，Word/Excel 文件需后端转换为 HTML 后预览 |
| BR-043 | 预览文件大小限制：≤10MB 直接预览，>10MB 提示建议下载（可强制预览） |
| BR-044 | Word/Excel 转换后的 HTML 缓存 7 天，文件更新后缓存失效 |
| BR-045 | 预览加载超时时间：转换 30 秒，渲染 10 秒，超时提示并提供下载链接 |
| BR-046 | 预览权限：拥有文档查看权限的用户才能预览文件 |
| BR-047 | Excel 多 Sheet 文件支持 Sheet 切换，单 Sheet 行数 >1000 时分页显示 |
| BR-048 | 预览窗口支持全屏、缩放、下载、打印（PDF）等操作 |
| BR-049 | 预览失败时，显示友好错误提示，并提供下载原文件的备用方案 |
| BR-050 | 预览缓存存储在 MinIO（/preview-cache 目录），定时任务每日清理过期缓存 |

#### 13.4.5 数据实体

##### FilePreview 表（新增）

**用途**：记录文件预览缓存信息，便于管理和清理

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SnowflakeID | 主键 |
| fileId | SnowflakeID | 文件ID（关联 Document 或 TaskRecord） |
| versionId | SnowflakeID | 文件版本ID（关联 DocumentVersion） |
| fileType | String | 文件类型（pdf/word/excel） |
| originalFileUrl | String | 原文件 MinIO 路径 |
| previewCacheUrl | String | 预览缓存文件 MinIO 路径（HTML） |
| fileHash | String | 文件哈希值（MD5，用于缓存失效判断） |
| conversionStatus | String | 转换状态（pending/success/failed） |
| conversionError | String | 转换失败原因（如有） |
| expiresAt | DateTime | 缓存过期时间（创建时间 + 7 天） |
| createdAt | DateTime | 创建时间 |

**索引**：
- `idx_file_version`：(fileId, versionId) - 查询缓存时使用
- `idx_expires_at`：expiresAt - 定时清理过期缓存

#### 13.4.6 技术选型

| 文件类型 | 技术方案 | 说明 |
|---------|---------|------|
| PDF | PDF.js（前端） | Mozilla 开源库，支持 Canvas/SVG 渲染，兼容性好 |
| Word/Excel | LibreOffice（后端） | 开源办公套件，支持 .doc/.docx/.xls/.xlsx 转 HTML |
| 预览缓存 | MinIO | 对象存储，支持分布式，成本低 |

**LibreOffice 部署**：
- Docker 容器部署（libreoffice-online 或 unoconv）
- 提供 HTTP API 接口，接收文件路径，返回 HTML
- 转换命令示例：
  ```bash
  libreoffice --headless --convert-to html --outdir /tmp input.docx
  ```

#### 13.4.7 性能要求

| 指标 | 目标值 | 说明 |
|------|--------|------|
| PDF 首次加载 | < 3秒 | 10MB 以内文件 |
| Word/Excel 首次转换 | < 5秒 | 10MB 以内文件 |
| 缓存命中加载 | < 1秒 | 使用缓存的 HTML |
| 转换并发数 | ≥5 | 同时支持 5 个文件转换请求 |
| 预览缓存存储 | 100GB | 预估可缓存 10,000+ 文件 |

#### 13.4.8 验收标准

**功能验收**：
- [ ] PDF 文件点击预览，使用 PDF.js 渲染，支持翻页、缩放、全屏
- [ ] Word 文件点击预览，后端转换为 HTML，保留格式和图片
- [ ] Excel 文件点击预览，后端转换为 HTML，支持多 Sheet 切换
- [ ] 预览窗口支持下载原文件、全屏模式、缩放操作
- [ ] 文件 ≤10MB 直接预览，>10MB 提示建议下载（可强制预览）
- [ ] Word/Excel 预览缓存 7 天，二次访问加载 < 1秒
- [ ] 预览失败时，显示错误提示并提供下载链接
- [ ] 预览权限校验：只有拥有文档查看权限的用户才能预览
- [ ] Excel 多 Sheet 文件支持 Sheet 切换，单 Sheet 行数 >1000 时分页显示
- [ ] 预览加载时，显示进度条或加载动画

**性能验收**：
- [ ] PDF 预览首次加载时间 < 3秒（10MB 以内）
- [ ] Word/Excel 预览首次转换时间 < 5秒（10MB 以内）
- [ ] 预览缓存命中时，加载时间 < 1秒
- [ ] LibreOffice 转换并发数 ≥5

**安全验收**：
- [ ] 预览文件前校验用户权限，无权限返回 403
- [ ] 预览缓存文件存储在 MinIO，使用签名 URL 访问
- [ ] 转换失败时，不暴露服务器路径或敏感信息

---

### 13.5 Phase 12：偏离统计分析

#### 13.5.1 业务背景

**核心问题**：
1. Phase 7-8 实现偏离检测和报告生成，但缺少统计分析能力
2. 质量管理需要了解偏离发生频率、类型分布、趋势变化，指导改进
3. 数据分散在各个偏离报告中，无法快速获取全局视图

**业务目标**：
- 提供偏离统计分析功能，支持按时间、部门、模板、字段等维度分析
- 可视化展示偏离趋势、类型分布、高频偏离字段
- 为质量改进提供数据支持，识别薄弱环节

#### 13.5.2 用户故事

**故事1：偏离次数统计**
```
作为：质量经理
我想要：查看指定时间范围内的偏离次数统计
以便：了解整体偏离情况，评估质量控制效果

验收标准：
- 选择时间范围（本周/本月/本季度/自定义），显示偏离总次数
- 显示偏离率（偏离记录数 / 总记录数）
- 对比上期数据，显示增长率（↑10% / ↓5%）
- 支持按部门筛选（仅看本部门的偏离）
```

**故事2：偏离类型分布**
```
作为：质量主管
我想要：查看偏离字段的分布情况，了解哪些字段容易偏离
以便：针对性地加强培训或调整工艺参数

验收标准：
- 饼图显示偏离字段分布（如：温度 40%、压力 30%、时间 20%、其他 10%）
- 列表显示偏离字段排名（字段名、偏离次数、占比）
- 点击字段名，查看该字段的偏离详情列表
```

**故事3：偏离趋势分析**
```
作为：质量审计员
我想要：查看偏离趋势变化，了解质量控制是否有改善
以便：评估质量改进措施的有效性

验收标准：
- 折线图显示偏离趋势（横轴：日期，纵轴：偏离次数）
- 支持按日/周/月聚合数据
- 支持多字段对比（同时显示温度偏离和压力偏离的趋势）
- 异常峰值标注（偏离次数突增的日期）
```

**故事4：部门偏离对比**
```
作为：总经理
我想要：对比各部门的偏离情况，了解哪个部门质量控制较好
以便：表彰优秀部门，督促改进不足部门

验收标准：
- 柱状图显示各部门偏离次数对比
- 显示部门偏离率排名（偏离率 = 偏离记录数 / 总记录数）
- 支持按时间范围筛选（本月/本季度/本年度）
```

**故事5：高频偏离报告导出**
```
作为：质量分析师
我想要：导出偏离统计报告（Excel），用于月度质量会议
以便：向管理层汇报质量数据，支持决策

验收标准：
- 支持导出偏离统计数据（时间范围、部门、字段分布、趋势数据）
- Excel 包含多个 Sheet（总览、字段分布、部门对比、趋势数据）
- 导出文件命名规范：偏离统计报告_2026年2月_质量部.xlsx
```

#### 13.5.3 功能需求

##### 13.5.3.1 偏离次数统计

**输入**：
- 时间范围（开始日期、结束日期）
- 部门筛选（可选，默认全部）
- 模板筛选（可选，默认全部）

**输出**：
| 指标 | 说明 | 示例 |
|------|------|------|
| 偏离总次数 | 偏离报告数量 | 125 次 |
| 偏离记录数 | 包含偏离的任务记录数 | 85 条（一条记录可能有多个偏离） |
| 总记录数 | 所有任务记录数 | 1,000 条 |
| 偏离率 | 偏离记录数 / 总记录数 | 8.5% |
| 环比增长 | 对比上期偏离率变化 | ↑2.3%（上期 6.2%） |

**业务规则**：
- 统计时间范围：支持预设（本周/本月/本季度）和自定义
- 偏离率计算公式：`偏离率 = (包含偏离的记录数 / 总记录数) * 100%`
- 环比增长计算：`增长率 = (本期偏离率 - 上期偏离率) / 上期偏离率 * 100%`

##### 13.5.3.2 偏离类型分布

**输入**：
- 时间范围
- 部门筛选（可选）

**输出**：
| 偏离字段 | 偏离次数 | 占比 | 平均偏离量 |
|---------|---------|------|----------|
| 温度（temperature） | 50 | 40% | 8.5°C |
| 压力（pressure） | 38 | 30.4% | 0.3MPa |
| 时间（duration） | 25 | 20% | 15min |
| 湿度（humidity） | 12 | 9.6% | 5% |

**可视化**：
- 饼图：显示各字段偏离占比
- 柱状图：显示各字段偏离次数排名

**业务规则**：
- 按偏离次数降序排列
- 占比计算公式：`占比 = (该字段偏离次数 / 总偏离次数) * 100%`
- 平均偏离量：该字段所有偏离的偏离量平均值

##### 13.5.3.3 偏离趋势分析

**输入**：
- 时间范围
- 聚合维度（日/周/月）
- 字段筛选（可选，默认全部偏离）

**输出**：
| 时间点 | 偏离次数 | 偏离率 |
|-------|---------|--------|
| 2026-02-01 | 5 | 5% |
| 2026-02-02 | 8 | 8% |
| 2026-02-03 | 3 | 3% |
| ... | ... | ... |

**可视化**：
- 折线图：横轴时间，纵轴偏离次数/偏离率
- 支持多字段对比（多条折线）
- 异常峰值标注（偏离次数 > 平均值 + 2*标准差）

**业务规则**：
- 日聚合：按提交日期（TaskRecord.createdAt）分组
- 周聚合：按周（ISO Week）分组
- 月聚合：按月（YYYY-MM）分组
- 趋势线平滑：支持移动平均（7日/30日）

##### 13.5.3.4 部门偏离对比

**输入**：
- 时间范围

**输出**：
| 部门 | 总记录数 | 偏离记录数 | 偏离率 | 排名 |
|------|---------|----------|--------|------|
| 生产一部 | 500 | 25 | 5% | 1（最优） |
| 生产二部 | 450 | 36 | 8% | 2 |
| 质检部 | 300 | 30 | 10% | 3 |

**可视化**：
- 柱状图：横轴部门，纵轴偏离率
- 颜色标识：偏离率 <5% 绿色，5%-10% 黄色，>10% 红色

**业务规则**：
- 按偏离率升序排列（偏离率低的排名靠前）
- 只统计有记录的部门（总记录数 >0）

#### 13.5.4 业务规则（新增）

| 规则编号 | 规则描述 |
|---------|----------|
| BR-051 | 偏离率 = (包含偏离的记录数 / 总记录数) * 100%，保留 2 位小数 |
| BR-052 | 统计时间范围支持预设（本周/本月/本季度）和自定义（开始日期-结束日期） |
| BR-053 | 偏离趋势支持按日/周/月聚合，周聚合按 ISO Week，月聚合按 YYYY-MM |
| BR-054 | 偏离字段分布按偏离次数降序排列，显示占比（保留 1 位小数） |
| BR-055 | 部门偏离对比按偏离率升序排列，偏离率低的部门排名靠前 |
| BR-056 | 偏离统计权限：Admin 可查看全部部门，Leader 可查看本部门，User 不可访问统计页面 |
| BR-057 | 异常峰值标注：偏离次数 > 平均值 + 2*标准差 的日期标记为异常 |
| BR-058 | 偏离统计数据可导出 Excel，包含多个 Sheet（总览、字段分布、部门对比、趋势数据） |
| BR-059 | 统计计算基于 DeviationReport 表，不直接查询 TaskRecord（性能优化） |
| BR-060 | 偏离统计支持实时刷新（点击刷新按钮，重新计算最新数据） |

#### 13.5.5 数据实体

##### DeviationStatistics 表（新增，可选）

**用途**：预聚合偏离统计数据，提高查询性能（适用于数据量大的场景）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SnowflakeID | 主键 |
| statDate | Date | 统计日期（按日聚合） |
| departmentId | SnowflakeID | 部门ID（null 表示全局统计） |
| templateId | SnowflakeID | 模板ID（null 表示全模板统计） |
| fieldName | String | 偏离字段名（null 表示全字段统计） |
| totalRecords | Integer | 总记录数 |
| deviationRecords | Integer | 偏离记录数 |
| deviationCount | Integer | 偏离次数（一条记录可能有多个偏离） |
| deviationRate | Float | 偏离率（百分比） |
| avgDeviationAmount | Float | 平均偏离量 |
| createdAt | DateTime | 创建时间 |

**索引**：
- `idx_stat_date_dept`：(statDate, departmentId) - 查询部门统计
- `idx_stat_date_field`：(statDate, fieldName) - 查询字段统计

**说明**：
- 此表为可选优化方案，适用于数据量 >10万条记录的场景
- 通过定时任务（每日凌晨）预计算统计数据，减少实时查询压力
- 如果数据量不大，可直接从 DeviationReport 表实时计算

#### 13.5.6 可视化需求

| 图表类型 | 用途 | 数据源 |
|---------|------|--------|
| 数字卡片 | 显示偏离总次数、偏离率、环比增长 | 偏离次数统计 |
| 饼图 | 显示偏离字段分布占比 | 偏离类型分布 |
| 柱状图 | 显示偏离字段次数排名、部门偏离对比 | 偏离类型分布、部门对比 |
| 折线图 | 显示偏离趋势（日/周/月） | 偏离趋势分析 |

**前端图表库**：
- 推荐使用 ECharts 5.x（Apache 开源，功能强大）
- 或 Element Plus 自带图表组件（简单场景）

#### 13.5.7 成功指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 统计查询响应时间 | < 2秒 | 1万条记录以内 |
| 图表渲染时间 | < 1秒 | 加载并渲染图表 |
| 统计数据准确率 | 100% | 与源数据（DeviationReport）一致 |
| 统计维度覆盖率 | 100% | 支持时间、部门、模板、字段四个维度 |

#### 13.5.8 验收标准

**功能验收**：
- [ ] 支持选择时间范围（本周/本月/本季度/自定义），显示偏离总次数和偏离率
- [ ] 显示环比增长率（对比上期），↑表示增长，↓表示下降
- [ ] 饼图显示偏离字段分布（字段名、占比），柱状图显示字段次数排名
- [ ] 折线图显示偏离趋势（日/周/月聚合），支持多字段对比
- [ ] 柱状图显示部门偏离对比（部门名、偏离率），按偏离率排序
- [ ] 支持按部门筛选统计数据（Leader 只能看本部门，Admin 可看全部）
- [ ] 点击偏离字段，跳转到该字段的偏离详情列表
- [ ] 支持导出偏离统计报告（Excel），包含多个 Sheet
- [ ] 统计页面支持实时刷新按钮，重新计算最新数据
- [ ] 统计权限校验：User 角色无法访问统计页面，提示权限不足

**性能验收**：
- [ ] 统计查询响应时间 < 2秒（1万条记录以内）
- [ ] 图表渲染时间 < 1秒
- [ ] 大数据量场景（>10万条记录）使用预聚合表优化，查询时间 < 3秒

**准确性验收**：
- [ ] 偏离率计算准确（手动抽查 10 条记录对比）
- [ ] 环比增长率计算准确（对比上期数据）
- [ ] 偏离字段占比总和 = 100%
- [ ] 部门偏离对比数据与源数据一致

---

### 13.6 数据模型汇总（Phase 7-12）

#### 13.6.1 新增数据表

| 表名 | 用途 | 依赖阶段 |
|------|------|---------|
| DeviationReport | 偏离报告明细（字段、期望值、实际值、偏离量、原因） | Phase 7-8 |
| FilePreview | 文件预览缓存信息（转换状态、缓存路径、过期时间） | Phase 11 |
| DeviationStatistics | 偏离统计预聚合数据（可选，性能优化） | Phase 12 |

#### 13.6.2 扩展现有表

##### Template 表扩展

**新增字段**：
| 字段名 | 类型 | 说明 | 启用阶段 |
|--------|------|------|---------|
| version | String | 模板版本号（1.0, 1.1, ...） | Phase 7-8 |

**fieldsJson 结构扩展**：
```typescript
interface TemplateFieldV2 extends TemplateField {
  tolerance?: {
    type: 'range' | 'percentage'  // 范围公差 or 百分比公差
    min?: number                  // 范围公差最小值
    max?: number                  // 范围公差最大值
    percentage?: number           // 百分比公差（如 5 表示 ±5%）
    unit?: string                 // 单位（如 °C、g、MPa）
  }
}
```

##### TaskRecord 表扩展

**新增字段**：
| 字段名 | 类型 | 说明 | 启用阶段 |
|--------|------|------|---------|
| hasDeviation | Boolean | 是否包含偏离 | Phase 7-8 |
| deviationCount | Integer | 偏离字段数量 | Phase 7-8 |
| relatedTemplateId | SnowflakeID | 关联的配方模板ID | Phase 7-8 |
| relatedTemplateVersion | String | 锁定的配方版本号 | Phase 7-8 |

> **说明**: 审批相关字段由 v2.0.0 工作流引擎统一管理，不再在 TaskRecord 表中扩展。

##### Approval 表（v2.0.0 工作流引擎管理）

**说明**: 原 Phase 10 计划扩展的审批字段已由 v2.0.0 工作流引擎的 `WorkflowInstance` 和 `WorkflowTask` 表替代，详见第十四章。

#### 13.6.3 完整版数据模型 ER 图

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│  Template   │        │  TaskRecord  │        │  Approval   │
│  (配方)      │◄───────│  (任务记录)   │───────►│  (审批)      │
└─────────────┘        └──────────┬───┘        └─────────────┘
       │                          │
       │ version                  │ hasDeviation
       │ fieldsJson.tolerance     │ relatedTemplateVersion
       │                          │
       │                          ▼
       │                ┌──────────────────┐
       └───────────────►│ DeviationReport  │
                        │ (偏离报告)         │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌───────────────────┐
                        │ DeviationStatistics│
                        │ (偏离统计)          │
                        └───────────────────┘

┌─────────────┐        ┌──────────────┐
│  Document   │        │  FilePreview │
│  (文档)      │───────►│  (预览缓存)   │
└─────────────┘        └──────────────┘
```

---

### 13.7 完整版业务规则汇总（BR-017 ~ BR-060）

#### Phase 7-8：配方偏离检测与版本管理

| 规则编号 | 规则描述 |
|---------|----------|
| BR-017 | 数值型字段可配置公差（范围公差 or 百分比公差），非数值型字段不支持 |
| BR-018 | 偏离检测在前端实时显示，后端提交时强制验证 |
| BR-019 | 偏离时必须填写偏离原因（最少10字，最多500字） |
| BR-020 | 偏离报告自动生成，不可手动修改，只能审批通过/拒绝 |
| BR-021 | 包含偏离的记录触发额外审批流程（正常：1级审批；偏离：2级审批） |
| BR-022 | 任务记录提交时锁定配方版本号，后续配方更新不影响已提交记录 |
| BR-023 | 配方公差配置修改后，版本号自动+0.1，历史记录按旧版本判断偏离 |
| BR-024 | 偏离报告状态：pending（待审批）→ approved（归档）/ rejected（驳回到创建人） |

#### Phase 9：数据导出

| 规则编号 | 规则描述 |
|---------|----------|
| BR-025 | 支持导出文档列表（Excel）、任务记录（Excel）、偏离报告（Excel） |
| BR-026 | 任务记录导出表头 = 固定列（ID、标题、状态、创建人、创建时间）+ 动态列（模板字段） |
| BR-027 | 动态列根据 Template.fieldsJson 自动生成，字段顺序与模板一致 |
| BR-028 | 导出权限：Admin 可导出全部，Leader 可导出本部门，User 可导出自己的 |
| BR-029 | 导出数量 ≤1000条同步返回，>1000条异步生成（返回任务ID，提供下载链接） |
| BR-030 | 异步导出文件保留7天，超期自动删除 |

> **说明**: Phase 10 (2级审批流程) 相关业务规则已移至第十四章 v2.0.0 工作流引擎部分（BR-071 至 BR-090）。

#### Phase 11：文件预览

| 规则编号 | 规则描述 |
|---------|----------|
| BR-041 | 支持 PDF、Word（.doc/.docx）、Excel（.xls/.xlsx）三种格式在线预览 |
| BR-042 | PDF 文件直接渲染，Word/Excel 文件需后端转换为 HTML 后预览 |
| BR-043 | 预览文件大小限制：≤10MB 直接预览，>10MB 提示建议下载（可强制预览） |
| BR-044 | Word/Excel 转换后的 HTML 缓存 7 天，文件更新后缓存失效 |
| BR-045 | 预览加载超时时间：转换 30 秒，渲染 10 秒，超时提示并提供下载链接 |
| BR-046 | 预览权限：拥有文档查看权限的用户才能预览文件 |
| BR-047 | Excel 多 Sheet 文件支持 Sheet 切换，单 Sheet 行数 >1000 时分页显示 |
| BR-048 | 预览窗口支持全屏、缩放、下载、打印（PDF）等操作 |
| BR-049 | 预览失败时，显示友好错误提示，并提供下载原文件的备用方案 |
| BR-050 | 预览缓存存储在 MinIO（/preview-cache 目录），定时任务每日清理过期缓存 |

#### Phase 12：偏离统计分析

| 规则编号 | 规则描述 |
|---------|----------|
| BR-051 | 偏离率 = (包含偏离的记录数 / 总记录数) * 100%，保留 2 位小数 |
| BR-052 | 统计时间范围支持预设（本周/本月/本季度）和自定义（开始日期-结束日期） |
| BR-053 | 偏离趋势支持按日/周/月聚合，周聚合按 ISO Week，月聚合按 YYYY-MM |
| BR-054 | 偏离字段分布按偏离次数降序排列，显示占比（保留 1 位小数） |
| BR-055 | 部门偏离对比按偏离率升序排列，偏离率低的部门排名靠前 |
| BR-056 | 偏离统计权限：Admin 可查看全部部门，Leader 可查看本部门，User 不可访问统计页面 |
| BR-057 | 异常峰值标注：偏离次数 > 平均值 + 2*标准差 的日期标记为异常 |
| BR-058 | 偏离统计数据可导出 Excel，包含多个 Sheet（总览、字段分布、部门对比、趋势数据） |
| BR-059 | 统计计算基于 DeviationReport 表，不直接查询 TaskRecord（性能优化） |
| BR-060 | 偏离统计支持实时刷新（点击刷新按钮，重新计算最新数据） |

---

### 13.8 完整版开发顺序与依赖（基于 v2.0.0 架构）

#### 13.8.1 推荐开发顺序

```
v2.0.0（工作流引擎 + 智能文档引擎，11周）
    ↓
Phase 7-8（偏离检测，依赖工作流引擎）
    ↓
Phase 12（偏离统计）─────┐
    ↓                    │
Phase 9（数据导出）────────┤
    ↓                    │
Phase 11（文件预览）      │（独立功能，可并行）
```

**说明**：
1. **v2.0.0 优先**：工作流引擎和智能文档引擎是 Phase 7-8 的前置依赖
2. **Phase 7-8 次之**：偏离检测依赖工作流引擎的2级审批能力
3. **Phase 12 第三**：统计分析依赖偏离数据积累
4. **Phase 9 第四**：导出功能需要完整的数据结构
5. **Phase 11 最后**：文件预览是独立功能，可并行开发

#### 13.8.2 依赖关系矩阵

| Phase | 依赖 Phase | 依赖原因 |
|-------|-----------|---------|
| Phase 7-8 | v2.0.0 工作流引擎 | 偏离记录触发2级审批流程，使用工作流引擎配置 |
| Phase 9 | Phase 7-8, Phase 12 | 导出偏离报告和统计数据 |
| Phase 11 | - | 独立功能，无依赖 |
| Phase 12 | Phase 7-8 | 统计偏离数据 |

#### 13.8.3 数据表创建顺序

```
1. v2.0.0 工作流引擎表（WorkflowTemplate, WorkflowInstance, WorkflowTask, DocumentReference）
   ↓
2. Template 表扩展 + TaskRecord 表扩展（Phase 7-8）
   ↓
3. DeviationReport 表（Phase 7-8）
   ↓
4. DeviationStatistics 表（Phase 12，可选，可用视图替代）
   ↓
5. FilePreview 表（Phase 11）
```

---

### 13.9 完整版工作量估算（包含 v2.0.0）

#### 13.9.1 总体开发工作量

| 阶段 | 后端开发 | 前端开发 | 测试 | 总计 |
|------|---------|---------|------|------|
| **v2.0.0（工作流+文档引擎）** | 25 天 | 30 天 | 10 天 | **65 天** |
| Phase 7-8（偏离检测） | 8 天 | 10 天 | 4 天 | 22 天 |
| Phase 9（数据导出） | 5 天 | 3 天 | 2 天 | 10 天 |
| Phase 11（文件预览） | 7 天 | 5 天 | 3 天 | 15 天 |
| Phase 12（偏离统计） | 6 天 | 8 天 | 3 天 | 17 天 |
| **总计** | **51 天** | **56 天** | **22 天** | **129 天** |

**说明**：
- 按 1 个后端工程师 + 1 个前端工程师 + 1 个测试工程师计算
- 实际工期约 **4-5 个月**（考虑并行开发和缓冲时间）
- v2.0.0 工作量参见第十四章 14.8 节

#### 13.9.2 详细工作量分解

##### Phase 7-8：偏离检测与版本管理（22 天）

**后端（8 天）**：
- 数据库扩展（Template/TaskRecord/DeviationReport）：1 天
- 偏离检测逻辑（范围公差+百分比公差）：2 天
- 版本锁定机制：1 天
- 偏离报告生成：2 天
- API 接口开发：2 天

**前端（10 天）**：
- 配方公差配置 UI：3 天
- 实时偏离检测（表单验证+标红提示）：3 天
- 偏离原因弹窗（强制填写）：2 天
- 偏离报告展示：2 天

**测试（4 天）**：
- 单元测试（偏离检测逻辑）：2 天
- 集成测试（端到端流程）：2 天

##### Phase 9：数据导出（10 天）

**后端（5 天）**：
- Excel 生成库集成（xlsx）：1 天
- 文档列表导出：1 天
- 任务记录导出（动态列生成）：2 天
- 偏离报告导出：1 天

**前端（3 天）**：
- 导出按钮 UI：1 天
- 异步导出任务状态查询：1 天
- 下载链接处理：1 天

**测试（2 天）**：
- 导出数据准确性测试：1 天
- 导出性能测试（大数据量）：1 天

##### Phase 11：文件预览（15 天）

**后端（7 天）**：
- LibreOffice 部署配置：2 天
- Word/Excel 转 HTML 接口：2 天
- 预览缓存机制：2 天
- API 接口开发：1 天

**前端（5 天）**：
- PDF.js 集成：2 天
- Word/Excel HTML 渲染：2 天
- 预览窗口 UI（缩放/翻页）：1 天

**测试（3 天）**：
- 三种格式预览测试：2 天
- 预览性能测试：1 天

##### Phase 12：偏离统计分析（17 天）

**后端（6 天）**：
- 偏离统计逻辑：2 天
- 统计 API 接口：2 天
- 预聚合表（可选）：2 天

**前端（8 天）**：
- ECharts 集成：1 天
- 偏离次数统计 UI：2 天
- 偏离趋势图表：2 天
- 部门对比图表：2 天
- 导出统计报告：1 天

**测试（3 天）**：
- 统计数据准确性测试：2 天
- 统计性能测试：1 天

---

### 13.10 技术风险与解决方案

#### 13.10.1 Phase 7-8 风险

| 风险 | 影响 | 概率 | 解决方案 |
|------|------|------|---------|
| 偏离检测逻辑复杂，边界条件多 | 高 | 中 | 编写详细的单元测试，覆盖各种公差配置场景 |
| 版本锁定机制实现不当，导致历史数据混乱 | 高 | 低 | 提交时强制记录版本号，代码审查确保逻辑正确 |
| 偏离报告数据量大，查询性能差 | 中 | 中 | 建立索引（recordId, templateId, createdAt），考虑分表或归档 |

#### 13.10.2 Phase 9 风险

| 风险 | 影响 | 概率 | 解决方案 |
|------|------|------|---------|
| 动态列导出逻辑复杂，字段映射错误 | 高 | 中 | 编写测试用例，对比导出数据与源数据一致性 |
| 大数据量导出超时（>10000条） | 中 | 高 | 使用异步导出 + 分页查询 + 流式写入 Excel |
| 导出文件格式不兼容（Excel 版本） | 低 | 低 | 使用标准 xlsx 格式（xlsx 库默认支持） |

> **说明**: Phase 10 相关风险已移至第十四章 v2.0.0 工作流引擎部分。

#### 13.10.3 Phase 11 风险

| 风险 | 影响 | 概率 | 解决方案 |
|------|------|------|---------|
| LibreOffice 转换性能差，首次预览慢 | 高 | 高 | 使用缓存机制，二次访问加载缓存；转换超时提示用户下载 |
| Word/Excel 转 HTML 格式丢失 | 中 | 中 | 测试常见文件格式，发现问题调整转换参数；复杂格式提示下载查看 |
| 预览缓存占用存储空间大 | 中 | 中 | 设置缓存过期时间（7天），定时任务清理过期缓存 |
| LibreOffice 转换失败（文件损坏） | 低 | 低 | 转换失败时提示用户并提供下载链接，不阻塞业务流程 |

#### 13.10.5 Phase 12 风险

| 风险 | 影响 | 概率 | 解决方案 |
|------|------|------|---------|
| 统计查询性能差（数据量大） | 高 | 高 | 使用预聚合表（DeviationStatistics），定时任务每日预计算 |
| 偏离率计算不准确 | 高 | 低 | 编写单元测试，手动抽查验证计算公式正确性 |
| 图表渲染慢（大数据量） | 中 | 中 | 限制图表数据点数量（最多 365 天），支持数据采样 |
| 统计维度组合爆炸（部门×模板×字段） | 中 | 低 | 限制统计维度数量，提供预设统计报表 |

#### 13.10.6 通用技术风险

| 风险 | 影响 | 概率 | 解决方案 |
|------|------|------|---------|
| 数据库迁移失败（扩展字段） | 高 | 低 | 备份数据库，灰度发布，回滚方案 |
| 向后兼容性问题（影响 MVP） | 高 | 低 | 扩展字段为可选项（nullable），不修改现有逻辑 |
| 第三方库版本冲突（xlsx/LibreOffice） | 中 | 低 | 锁定依赖版本，测试环境验证后再部署 |
| 性能退化（完整版功能增加） | 中 | 中 | 性能测试，关键路径优化（索引、缓存、分页） |

---

### 14.2 预留扩展字段

以下字段已在数据模型中预留，后续直接启用：

| 字段 | 表 | 用途 | 启用条件 |
|------|------|------|----------|
| email | users | 邮件地址 | 启用邮件通知功能 |
| phone | users | 手机号码 | 启用短信/微信通知 |
| workflow_config | documents | 审批流程配置 | 启用自定义审批流程 |
| tags | documents | 标签列表 | 启用标签搜索功能 |
| tags | templates | 标签列表 | 启用标签筛选功能 |
| description | departments | 部门描述 | 部门信息完善时 |

### 14.3 完整版数据模型扩展

```sql
-- 审批流程配置表（完整版）
approval_workflows (
  id              SnowflakeID   PRIMARY KEY,
  name            VARCHAR(100)  NOT NULL,           -- 流程名称
  levels          JSONB         NOT NULL,            -- 审批级别配置
  condition       JSONB,                            -- 触发条件
  timeout_hours   INT,                              -- 超时时间
  status          VARCHAR(10)  NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP   DEFAULT NOW(),
  updated_at      TIMESTAMP   DEFAULT NOW()
);

-- 标签表
tags (
  id          SnowflakeID   PRIMARY KEY,
  name        VARCHAR(50)   NOT NULL,               -- 标签名称
  color       VARCHAR(20),                          -- 标签颜色
  type        VARCHAR(20)   NOT NULL,               -- document/template
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 文件标签关联表
document_tags (
  id          SnowflakeID   PRIMARY KEY,
  document_id SnowflakeID   REFERENCES documents(id),
  tag_id      SnowflakeID   REFERENCES tags(id),
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- 邮件配置表
email_config (
  id          SnowflakeID   PRIMARY KEY,
  host        VARCHAR(100)  NOT NULL,               -- SMTP服务器
  port        INT           NOT NULL,               -- 端口
  username    VARCHAR(100)  NOT NULL,               -- 发件账号
  password    VARCHAR(255)  NOT NULL,               -- 发件密码
  from_name   VARCHAR(100),                         -- 发件人名称
  status      VARCHAR(10)   NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW()
);

-- 系统配置表
system_config (
  id          SnowflakeID   PRIMARY KEY,
  key         VARCHAR(50)   UNIQUE NOT NULL,        -- 配置键
  value       TEXT,                                 -- 配置值
  description VARCHAR(200),                         -- 说明
  updated_at  TIMESTAMP   DEFAULT NOW()
);
```

### 14.4 完整版API扩展

| 模块 | 端点 | 方法 | 说明 |
|------|------|------|------|
| **工作流** | | | |
| | /api/v1/workflows | GET | 流程列表 |
| | /api/v1/workflows | POST | 创建流程 |
| | /api/v1/workflows/:id | PUT | 更新流程 |
| | /api/v1/workflows/:id | DELETE | 删除流程 |
| **标签** | | | |
| | /api/v1/tags | GET | 标签列表 |
| | /api/v1/tags | POST | 创建标签 |
| | /api/v1/tags/:id | DELETE | 删除标签 |
| | /api/v1/tags/:id/documents | GET | 标签下的文档 |
| **统计** | | | |
| | /api/v1/stats/documents | GET | 文档统计 |
| | /api/v1/stats/approvals | GET | 审批统计 |
| | /api/v1/stats/tasks | GET | 任务统计 |
| **系统** | | | |
| | /api/v1/config | GET | 系统配置 |
| | /api/v1/config | PUT | 更新配置 |
| | /api/v1/email/test | POST | 发送测试邮件 |

### 14.5 完整版前端页面

在 MVP 侧边栏基础上，完整版增加：

```
侧边栏扩展:
├── 系统管理（Admin）
│   ├── 工作流配置 ← 新增
│   ├── 标签管理 ← 新增
│   ├── 邮件配置 ← 新增
│   └── 系统参数 ← 新增
├── 统计分析 ← 新增
│   ├── 文档统计
│   ├── 审批统计
│   └── 任务统计
└── 我的
    ├── 我的归档 ← 新增
    └── 个人设置 ← 新增（语言切换、邮箱绑定）
```

### 14.6 完整版组件扩展

| 组件 | 用途 | 说明 |
|------|------|------|
| WorkflowDesigner | 工作流设计器 | 可视化拖拽配置审批流程 |
| VersionCompare | 版本对比 | 文档版本差异对比 |
| TagManager | 标签管理 | 批量打标签、标签筛选 |
| DataExport | 数据导出 | 批量导出Excel |
| EmailSettings | 邮件设置 | SMTP配置、测试发送 |
| StatsDashboard | 统计面板 | 图表展示统计数据 |
| LanguageSwitch | 语言切换 | 中英文切换 |
| FilePreview | 文件预览 | 在线预览PDF/Word/Excel |

### 14.7 完整版开发顺序（Phase 7+）

| Phase | 模块 | 说明 |
|-------|------|------|
| Phase 7-8 | 偏离检测（依赖 v2.0.0） | 配方公差定义、自动偏离检测、2级审批流程（工作流引擎实现） |
| Phase 9 | 数据导出 | Excel批量导出 |
| Phase 11 | 文件预览 | 在线预览功能 |
| Phase 12 | 统计分析 | 报表和图表展示 |
| Phase 13 | 多语言 | 中英文切换框架 |
| Phase 14 | 邮件通知 | 留接口，不实现 |
| v2.0.0 | 工作流+智能文档 | 工作流引擎（替代 Phase 10）+ 智能文档引擎 |

### 14.8 数据联动与版本联动说明

#### 数据联动（自动带入）
**触发时机**：创建下游报表时
**业务场景**：配料表创建时，自动带入工艺配方的原料和比例

```
步骤：
1. 打开"配料表"模板创建新记录
2. 选择关联的"工艺配方"（比如：配方A）
3. 系统自动把配方A的原料和比例带入配料表
4. 保存 → 完成
```

#### 版本联动（自动更新）
**触发时机**：上游配方变更时
**业务场景**：配方从v1.0更新到v1.1，所有关联的生产记录自动更新

```
步骤：
1. 配方A版本从1.0更新到1.1（原料比例变了）
2. 系统检测到变更
3. 自动找到所有关联的生产记录
4. 把这些记录中的配方数据更新到1.1版本
```

#### 业务关系图
```
┌─────────────┐    创建时带入     ┌─────────────┐
│  工艺配方    │ ───────────────> │  生产报表   │
│  (配方A v1.0)│                  │  (带配方A)  │
└─────────────┘                  └─────────────┘
       │
       │ 配方更新 v1.0 → v1.1
       │
       ▼
┌─────────────┐    自动更新       ┌─────────────┐
│  工艺配方    │ ───────────────> │  生产报表   │
│  (配方A v1.1)│                  │  (同步更新) │
└─────────────┘                  └─────────────┘
```

### 14.9 完整版注意事项

1. **向后兼容**: 完整版改动不能影响 MVP 已有功能
2. **数据迁移**: 新增表需要处理存量数据
3. **平滑升级**: 支持配置开关控制功能启用/禁用
4. **性能考虑**: 大数据量时需要分表或归档策略
5. **安全增强**: 完整版需要更严格的权限校验和审计日志

---

## 十四、智能文档引擎与工作流系统（v2.0.0 - PRD-01整合）

[⬆️ 返回目录](#-完整目录) | [⬆️ 返回快速导航](#-快速导航)

> **重要说明**：
> - 本章节基于 BRCGS 体系认证 SaaS 系统 PRD-01《文档审核签字系统》的需求整合
> - 核心目标：**深度优化**现有文档管理系统，实现体系文件内容引用和工作流灵活配置
> - 实施原则：基于现有项目深度优化，而非简单功能叠加
> - 设计日期：2026-02-12

### 14.0 v2.0.0 功能总览

| 模块 | 核心功能 | 业务价值 | 优先级 |
|------|---------|---------|-------|
| **智能文档引擎** | 三级文件内容引用、自动同步、Block机制 | 消除重复内容维护、确保内容一致性 | P0 |
| **简化工作流引擎** | 部门级流程配置、并行会签、流程可视化 | 替代硬编码审批、提升流程灵活性 | P0 |
| **文档内容标准化** | Tiptap富文本编辑器、统一JSON格式 | 提升用户体验、支持引用功能 | P0 |
| **文档提取辅助** | Word/PDF内容提取、智能分段 | 加速文档电子化、内容标准化 | P1 |
| **引用关系可视化** | Vue Flow依赖图、影响范围分析 | 清晰展示文档关联关系 | P1 |

**实施顺序建议**：
```
Phase 1: 数据库设计与扩展（1周）
  ↓
Phase 2: 简化工作流引擎（4周）
  ↓
Phase 3: 智能文档引擎（4周）
  ↓
Phase 4: 系统集成与测试（2周）

总计：11周（约3个月）
```

---

### 14.1 业务背景与核心问题

#### 14.1.1 现有系统的局限性

**问题1：文档内容重复维护**
```
场景：食品企业体系文件中大量内容重复出现

《生产工艺规程》（三级文件）包含：
  - 工艺流程
  - 标准配方
  - 配料表

《HACCP计划》（三级文件）需要引用：
  - 《生产工艺规程》的工艺流程
  - 《生产工艺规程》的标准配方

《作业指导书》（三级文件）需要引用：
  - 《生产工艺规程》的部分工艺步骤

当前痛点：
❌ 需要手动复制粘贴内容到多个文档
❌ 源文档修改后，所有引用文档需要手动同步
❌ 容易出现内容不一致、版本混乱
```

**问题2：审批流程硬编码**
```
当前系统：
- 文档审批：创建人 → 上级（硬编码）
- 偏离记录：员工 → 主管 → 经理（硬编码）

局限性：
❌ 无法自定义审批流程
❌ 不支持并行会签（多部门同时审批）
❌ 不支持部门级流程配置
```

**问题3：文档格式不统一**
```
当前系统：
- Document.content 字段类型：Text（纯文本或HTML）
- 无统一的富文本编辑器
- 无法支持复杂的内容引用

需求：
✅ 统一的富文本编辑器（类似Notion）
✅ 结构化的内容存储（JSON格式）
✅ 支持引用Block（可视化标识、只读、溯源）
```

#### 14.1.2 核心业务价值

**价值1：内容一致性保障**
- 源文档修改后，所有引用自动同步
- 避免因手动复制粘贴导致的内容不一致
- 减少重复维护工作量，提升效率

**价值2：审批流程灵活化**
- 部门Leader可自定义本部门的审批流程
- 支持复杂审批场景（并行会签、条件分支）
- 流程可视化展示，进度一目了然

**价值3：用户体验提升**
- Notion级别的编辑体验
- 引用Block清晰标识，溯源清楚
- 文档内容标准化，便于管理

---

### 14.2 核心功能详细设计

#### 14.2.1 智能文档引擎

##### 功能范围

**支持的引用类型**：
- ✅ 三级文件 ← 引用 ← 三级文件
- ❌ 三级文件 ← 引用 ← 四级记录（不支持，四级记录为生产数据表格）

**引用粒度**：
- 章节级别引用（如：引用"第3章 生产工艺流程"）
- 支持富文本内容（段落、列表、表格等）

**引用特性**：
- **只读**：目标文档无法修改引用Block内容
- **可删除**：用户可删除整个引用Block
- **自动同步**：源文档审批通过后，异步同步到所有引用文档
- **手动刷新**：用户可手动触发引用内容刷新

##### 典型场景

**场景1：HACCP计划引用生产工艺规程**

```
源文档：《巧克力饼干生产工艺规程》（三级文件）
├── 第1章 范围
├── 第2章 职责
├── 第3章 生产工艺流程
│   ├── 3.1 工艺流程图
│   │   1. 原料验收
│   │   2. 配料混合
│   │   3. 成型
│   │   4. 烘烤（CCP1）
│   │   5. 冷却
│   │   6. 包装（CCP2）
│   ├── 3.2 标准配方（表格）
│   └── 3.3 关键控制点
└── 第4章 质量标准

目标文档：《巧克力饼干HACCP计划》（三级文件）
├── 第1部分：生产工艺流程
│   └── [引用Block: 《生产工艺规程》> 3.1 工艺流程图]  ← 自动同步
├── 第2部分：关键控制点（CCP）
│   └── 根据工艺流程，识别CCP1（烘烤）、CCP2（包装）
└── 第3部分：监控措施
```

**用户操作流程**：

1. **创建引用**：
   - 用户在《HACCP计划》中，光标定位到"第1部分"下方
   - 点击工具栏"插入引用"按钮
   - 选择源文档：《巧克力饼干生产工艺规程》
   - 选择章节：3.1 工艺流程图
   - 确认插入 → 系统创建引用Block

2. **查看引用**：
   ```html
   ┌────────────────────────────────────────────────────────┐
   │ 🔗 引用自：《巧克力饼干生产工艺规程》 > 3.1 工艺流程图  │
   │ [只读] [查看源] [刷新] [删除]                           │
   ├────────────────────────────────────────────────────────┤
   │ 3.1 工艺流程图                                          │
   │ 1. 原料验收                                            │
   │ 2. 配料混合                                            │
   │ 3. 成型                                                │
   │ 4. 烘烤（CCP1）                                        │
   │ 5. 冷却                                                │
   │ 6. 包装（CCP2）                                        │
   ├────────────────────────────────────────────────────────┤
   │ 最后同步：2026-02-12 14:30                             │
   └────────────────────────────────────────────────────────┘
   ```

3. **源文档修改后自动同步**：
   - 研发部修改《生产工艺规程》，增加工艺步骤"7. 金属检测"
   - 提交审批 → 审批通过
   - 系统触发异步同步队列
   - 所有引用此章节的文档自动更新
   - 通知目标文档负责人："引用内容已更新"

4. **手动刷新引用**：
   - 用户打开《HACCP计划》
   - 看到引用Block底部提示："源文档已更新"
   - 点击"刷新"按钮 → 立即同步最新内容

##### 技术实现方案

**1. 文档内容格式：Tiptap JSON**

```typescript
// Document.content 字段类型改为 Json
model Document {
  content Json  // Tiptap JSON格式
}

// Tiptap JSON 结构示例
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2, "id": "section-3-1" },
      "content": [{ "type": "text", "text": "3.1 工艺流程图" }]
    },
    {
      "type": "orderedList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "原料验收" }]
            }
          ]
        },
        // ... 其他步骤
      ]
    }
  ]
}
```

**2. 引用Block自定义扩展**

```typescript
// 自定义Tiptap扩展：ReferenceBlock
{
  "type": "referenceBlock",
  "attrs": {
    "sourceDocId": "doc-001",
    "sourceDocTitle": "巧克力饼干生产工艺规程",
    "sectionId": "section-3-1",
    "referenceId": "ref-abc-123",  // DocumentReference表的ID
    "editable": false,
    "lastSyncedAt": "2026-02-12T14:30:00Z"
  },
  "content": [
    // 自动同步的内容（从源文档复制）
    {
      "type": "heading",
      "attrs": { "level": 3 },
      "content": [{ "type": "text", "text": "3.1 工艺流程图" }]
    },
    {
      "type": "orderedList",
      "content": [...]
    }
  ]
}
```

**3. 章节ID自动生成**

```typescript
// 自定义Heading扩展，自动生成章节ID
import Heading from '@tiptap/extension-heading';

export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            // 基于标题文本自动生成ID
            const text = extractText(attributes.content);
            attributes.id = `section-${slugify(text)}`;
          }
          return { id: attributes.id };
        }
      }
    };
  }
});

// 生成效果
<h2 id="section-3-1">3.1 工艺流程图</h2>
```

**4. 异步同步队列**

```typescript
// 使用BullMQ处理引用同步
import { Queue, Worker } from 'bullmq';

// 监听Document状态变更
@OnEvent('document.approved')
async handleDocumentApproved(payload: { documentId: string }) {
  const { documentId } = payload;

  // 查找所有引用此文档的关系
  const references = await this.prisma.documentReference.findMany({
    where: { sourceDocId: documentId }
  });

  // 批量加入同步队列
  for (const ref of references) {
    await this.syncQueue.add('sync-reference', {
      referenceId: ref.id,
      sourceDocId: documentId,
      sectionId: ref.sectionId
    });
  }
}

// 同步队列处理器
@Process('sync-reference')
async syncReference(job: Job) {
  const { referenceId, sourceDocId, sectionId } = job.data;

  // 1. 提取源文档章节内容
  const sourceDoc = await this.findDocument(sourceDocId);
  const sectionContent = this.extractSection(sourceDoc.content, sectionId);

  // 2. 更新目标文档的引用Block
  const reference = await this.findReference(referenceId);
  const targetDoc = await this.findDocument(reference.targetDocId);
  const updatedContent = this.replaceReferenceBlock(
    targetDoc.content,
    referenceId,
    sectionContent
  );

  // 3. 保存目标文档
  await this.prisma.document.update({
    where: { id: reference.targetDocId },
    data: { content: updatedContent }
  });

  // 4. 通知目标文档负责人
  await this.notificationService.notify({
    userId: targetDoc.creatorId,
    type: 'reference_updated',
    content: `文档《${targetDoc.title}》的引用内容已更新`
  });
}
```

##### 数据模型

```prisma
// 扩展Document表
model Document {
  id              String   @id @default(cuid())
  title           String
  level           String   // level1/level2/level3
  content         Json     // ✅ 改为Json类型（Tiptap JSON）
  status          String   // draft/pending/approved

  // 新增：引用关系
  sourceReferences   DocumentReference[] @relation("SourceDoc")
  targetReferences   DocumentReference[] @relation("TargetDoc")

  @@index([level, status])
}

// 新增：文档引用关系表
model DocumentReference {
  id             String   @id @default(cuid())
  sourceDocId    String   // 源文档ID
  targetDocId    String   // 目标文档ID
  sectionId      String   // 引用章节ID（如：section-3-1）
  lastSyncedAt   DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  sourceDoc      Document @relation("SourceDoc", fields: [sourceDocId], references: [id], onDelete: Cascade)
  targetDoc      Document @relation("TargetDoc", fields: [targetDocId], references: [id], onDelete: Cascade)

  @@index([sourceDocId])
  @@index([targetDocId])
  @@unique([sourceDocId, targetDocId, sectionId])
}
```

##### 前端组件设计

**1. Tiptap编辑器集成**

```vue
<!-- DocumentEditor.vue -->
<template>
  <div class="document-editor">
    <el-card>
      <!-- 工具栏 -->
      <div class="editor-toolbar">
        <el-button @click="editor.chain().focus().toggleBold().run()">
          <el-icon><Bold /></el-icon> 粗体
        </el-button>
        <el-button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
          <el-icon><Heading /></el-icon> 标题
        </el-button>
        <el-divider direction="vertical" />
        <el-button @click="showInsertReferenceDialog">
          <el-icon><Link /></el-icon> 插入引用
        </el-button>
      </div>

      <!-- 编辑器 -->
      <editor-content :editor="editor" class="editor-content" />
    </el-card>

    <!-- 插入引用对话框 -->
    <InsertReferenceDialog
      v-model="insertDialogVisible"
      @confirm="insertReference"
    />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { HeadingWithId } from '@/extensions/heading-with-id';
import { ReferenceBlock } from '@/extensions/reference-block';

const editor = useEditor({
  extensions: [
    StarterKit,
    HeadingWithId,
    ReferenceBlock
  ],
  content: props.initialContent,
  onUpdate: ({ editor }) => {
    emit('update:content', editor.getJSON());
  }
});

const insertReference = (referenceData) => {
  editor.value.commands.insertReferenceBlock({
    sourceDocId: referenceData.sourceDocId,
    sourceDocTitle: referenceData.sourceDocTitle,
    sectionId: referenceData.sectionId,
    referenceId: referenceData.referenceId
  });
};
</script>
```

**2. 引用Block组件**

```vue
<!-- ReferenceBlockComponent.vue -->
<template>
  <node-view-wrapper class="reference-block">
    <!-- 引用头部 -->
    <div class="reference-header">
      <el-icon><Link /></el-icon>
      <span class="source-info">
        引用自：《{{ node.attrs.sourceDocTitle }}》 > {{ sectionTitle }}
      </span>
      <div class="actions">
        <el-tag size="small" type="info">只读</el-tag>
        <el-button size="small" text @click="viewSource">查看源</el-button>
        <el-button size="small" text @click="refresh">刷新</el-button>
        <el-button size="small" text type="danger" @click="deleteNode">删除</el-button>
      </div>
    </div>

    <!-- 引用内容（只读） -->
    <div class="reference-content" contenteditable="false">
      <node-view-content />
    </div>

    <!-- 引用脚注 -->
    <div class="reference-footer">
      <span class="sync-time">最后同步：{{ formatDate(node.attrs.lastSyncedAt) }}</span>
      <el-tag v-if="needsUpdate" type="warning" size="small">
        <el-icon><Warning /></el-icon>
        源文档已更新，点击"刷新"获取最新内容
      </el-tag>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';

const viewSource = () => {
  window.open(`/documents/${props.node.attrs.sourceDocId}`, '_blank');
};

const refresh = async () => {
  await api.post(`/document-references/${props.node.attrs.referenceId}/sync`);
  ElMessage.success('引用内容已刷新');
  location.reload();
};
</script>

<style scoped>
.reference-block {
  border: 2px dashed #409eff;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
}

.reference-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #d9ecff;
}

.reference-content {
  background: white;
  padding: 16px;
  border-radius: 4px;
  pointer-events: none;  /* 禁止编辑 */
  user-select: none;
  opacity: 0.95;
}

.reference-footer {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}
</style>
```

**3. 插入引用对话框**

```vue
<!-- InsertReferenceDialog.vue -->
<template>
  <el-dialog title="插入引用" v-model="visible" width="700px">
    <el-form :model="form" label-width="100px">
      <!-- 步骤1：选择源文档 -->
      <el-form-item label="选择源文档">
        <el-select
          v-model="form.sourceDocId"
          filterable
          remote
          :remote-method="searchDocuments"
          placeholder="搜索三级文件"
          @change="loadSections"
        >
          <el-option
            v-for="doc in availableDocs"
            :key="doc.id"
            :label="doc.title"
            :value="doc.id"
          >
            <span>{{ doc.title }}</span>
            <el-tag size="small">{{ doc.level }}</el-tag>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 步骤2：选择引用章节 -->
      <el-form-item label="选择章节">
        <el-tree
          :data="sectionTree"
          node-key="id"
          @node-click="handleSectionClick"
          highlight-current
        >
          <template #default="{ node, data }">
            <span>{{ data.title }}</span>
            <el-tag v-if="data.type === 'table'" size="small">表格</el-tag>
            <el-tag v-if="data.type === 'list'" size="small">列表</el-tag>
          </template>
        </el-tree>
      </el-form-item>

      <!-- 步骤3：预览内容 -->
      <el-form-item label="内容预览">
        <div class="preview-box">
          <editor-content :editor="previewEditor" />
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="!form.sectionId" @click="confirm">
        插入引用
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
const searchDocuments = async (query: string) => {
  const res = await api.get('/documents', {
    params: { level: 'level3', search: query }
  });
  availableDocs.value = res.data;
};

const loadSections = async (docId: string) => {
  const res = await api.get(`/documents/${docId}/sections`);
  sectionTree.value = res.data;
};

const handleSectionClick = async (section: any) => {
  form.value.sectionId = section.id;
  // 加载预览内容
  const res = await api.get(`/documents/${form.value.sourceDocId}/sections/${section.id}/preview`);
  previewEditor.value.commands.setContent(res.data);
};

const confirm = async () => {
  // 创建引用关系
  const res = await api.post('/document-references', {
    sourceDocId: form.value.sourceDocId,
    targetDocId: currentDocumentId.value,
    sectionId: form.value.sectionId
  });

  emit('confirm', {
    sourceDocId: form.value.sourceDocId,
    sourceDocTitle: availableDocs.value.find(d => d.id === form.value.sourceDocId)?.title,
    sectionId: form.value.sectionId,
    referenceId: res.data.id
  });

  visible.value = false;
};
</script>
```

##### API设计

```typescript
// 引用管理API
POST   /document-references              // 创建引用关系
GET    /document-references              // 查询引用关系
DELETE /document-references/:id          // 删除引用关系
POST   /document-references/:id/sync     // 手动同步引用内容

// 文档章节API
GET    /documents/:id/sections           // 获取文档章节树
GET    /documents/:id/sections/:sectionId/preview  // 预览章节内容

// 引用分析API
GET    /documents/:id/reference-impact   // 分析引用影响范围（哪些文档引用了我）
GET    /documents/:id/reference-graph    // 获取引用关系图数据
```

---

#### 14.2.2 简化工作流引擎

##### 功能范围

**支持的流程类型**：
- ✅ 顺序审批（步骤1 → 步骤2 → 步骤3）
- ✅ 并行会签（多人同时审批，全部通过才进入下一步）
- ❌ 条件分支（Phase 1不支持，延后到Phase 2）
- ❌ 子流程（Phase 1不支持）

**流程配置方式**：
- JSON配置（无可视化设计器，降低复杂度）
- 部门Leader可创建本部门的流程模板
- 流程模板支持版本管理（已进行中的流程不受影响）

**审批操作**：
- 同意（可选填写审批意见）
- 驳回到起草节点（必填驳回原因，≥5字）
- 删除整个流程（仅Admin）

**流程展示**：
- Vue Flow流程图（实时展示进度）
- 高亮当前节点
- 显示已完成节点的审批人和意见

**关键简化**：
- ❌ 移除超时催办功能（用户明确不需要）
- ❌ 移除转交/加签功能（降低复杂度）
- ✅ 保留核心能力：顺序+并行，满足80%场景

##### 典型场景

**场景1：供应商评估流程**

```json
{
  "templateId": "supplier-approval",
  "templateName": "供应商评估流程",
  "departmentId": "dept-purchase",  // 采购部
  "steps": [
    {
      "order": 1,
      "name": "采购专员提交",
      "type": "approval",
      "approvers": ["user-001"]  // 直接指定审批人ID
    },
    {
      "order": 2,
      "name": "质量部+财务部会签",
      "type": "parallel",
      "approvers": ["user-002", "user-003"],
      "parallelMode": "all"  // 全部通过才能进入下一步
    },
    {
      "order": 3,
      "name": "总经理审批",
      "type": "approval",
      "approvers": ["user-004"]
    }
  ]
}
```

**流程执行**：
```
步骤1：采购专员提交 → user-001审批通过
  ↓
步骤2：并行会签
  ├── user-002（质量部）：审批通过 ✅
  └── user-003（财务部）：审批通过 ✅
  → 全部通过，进入步骤3
  ↓
步骤3：user-004（总经理）审批通过
  ↓
流程完成，文档状态 = approved
```

**驳回场景**：
```
步骤2：并行会签
  ├── user-002（质量部）：审批通过 ✅
  └── user-003（财务部）：驳回 ❌（原因：供应商资质不全）
  → 任一驳回，流程立即终止
  ↓
流程状态 = rejected，回到步骤1（重新提交）
```

##### 技术实现方案

**1. 数据模型**

```prisma
// 工作流模板
model WorkflowTemplate {
  id            String   @id @default(cuid())
  code          String   @unique  // 模板代码（如：supplier-approval）
  name          String
  departmentId  String   // 所属部门（部门Leader可创建）
  steps         Json     // 步骤配置（JSON格式）
  version       Int      @default(1)
  status        String   @default("active")  // active/inactive
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  department    Department @relation(fields: [departmentId], references: [id])
  createdBy     User       @relation(fields: [createdById], references: [id])
  instances     WorkflowInstance[]

  @@index([departmentId, status])
  @@index([code])
}

// 工作流实例
model WorkflowInstance {
  id           String   @id @default(cuid())
  templateId   String
  template     WorkflowTemplate @relation(fields: [templateId], references: [id])
  documentId   String?
  document     Document? @relation(fields: [documentId], references: [id])
  currentStep  Int      @default(1)
  status       String   @default("running")  // running/completed/rejected
  initiatorId  String
  initiator    User     @relation(fields: [initiatorId], references: [id])
  startedAt    DateTime @default(now())
  completedAt  DateTime?

  tasks        WorkflowTask[]

  @@index([documentId])
  @@index([initiatorId, status])
  @@index([status, currentStep])
}

// 工作流任务
model WorkflowTask {
  id          String   @id @default(cuid())
  instanceId  String
  instance    WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  stepOrder   Int
  stepName    String
  assigneeId  String
  assignee    User     @relation(fields: [assigneeId], references: [id])
  status      String   @default("pending")  // pending/completed/rejected
  action      String?  // approved/rejected
  comment     String?  // 审批意见
  completedAt DateTime?
  createdAt   DateTime @default(now())

  // P0-4 修复：审批超时机制
  timeoutHours      Int      @default(24)  // 超时小时数（默认24小时）
  escalationUserId  String?               // 超时升级到的用户ID（如：上级领导）
  escalationUser    User?    @relation("EscalationUser", fields: [escalationUserId], references: [id])
  isOverdue         Boolean  @default(false)  // 是否超时（定时任务更新）
  overdueNotifiedAt DateTime?                 // 超时通知时间

  @@index([assigneeId, status])
  @@index([instanceId, stepOrder])
  @@index([isOverdue, status])  // P0-4 索引：用于定时任务查询超时任务
}
```

**2. 核心Service实现**

```typescript
// server/src/modules/workflow/workflow.service.ts

@Injectable()
export class WorkflowService {
  // 创建流程实例
  async createInstance(
    templateCode: string,
    documentId: string,
    initiatorId: string
  ): Promise<WorkflowInstance> {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { code: templateCode, status: 'active' }
    });

    if (!template) {
      throw new Error(`工作流模板 ${templateCode} 不存在`);
    }

    // 创建实例
    const instance = await this.prisma.workflowInstance.create({
      data: {
        templateId: template.id,
        documentId,
        initiatorId,
        currentStep: 1
      }
    });

    // 创建第1步任务
    const steps = template.steps as WorkflowStep[];
    await this.createTasksForStep(instance.id, steps[0]);

    // 通知审批人
    await this.notifyApprovers(instance.id, steps[0]);

    return instance;
  }

  // 创建任务（支持并行）
  private async createTasksForStep(
    instanceId: string,
    step: WorkflowStep
  ): Promise<void> {
    if (step.type === 'approval') {
      // 单人审批
      await this.prisma.workflowTask.create({
        data: {
          instanceId,
          stepOrder: step.order,
          stepName: step.name,
          assigneeId: step.approvers[0]
        }
      });
    } else if (step.type === 'parallel') {
      // 并行会签（创建多个任务）
      await this.prisma.workflowTask.createMany({
        data: step.approvers.map(approverId => ({
          instanceId,
          stepOrder: step.order,
          stepName: step.name,
          assigneeId: approverId
        }))
      });
    }
  }

  // 完成任务
  async completeTask(
    taskId: string,
    userId: string,
    action: 'approved' | 'rejected',
    comment?: string
  ): Promise<void> {
    // 1. 校验权限
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: taskId },
      include: { instance: { include: { template: true } } }
    });

    if (task.assigneeId !== userId) {
      throw new Error('无权审批此任务');
    }

    if (task.status !== 'pending') {
      throw new Error('任务已处理');
    }

    // 2. 驳回时校验原因
    if (action === 'rejected' && (!comment || comment.length < 5)) {
      throw new Error('驳回原因至少5个字');
    }

    // 3. 更新任务状态
    await this.prisma.workflowTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        action,
        comment,
        completedAt: new Date()
      }
    });

    // 4. 检查当前步骤是否全部完成
    const instance = task.instance;
    const currentStepTasks = await this.prisma.workflowTask.findMany({
      where: {
        instanceId: instance.id,
        stepOrder: task.stepOrder
      }
    });

    const allCompleted = currentStepTasks.every(t => t.status === 'completed');

    if (!allCompleted) {
      // 还有其他人未审批，等待
      return;
    }

    // 5. 检查是否全部通过
    const allApproved = currentStepTasks.every(t => t.action === 'approved');

    if (!allApproved) {
      // 任一驳回，流程终止
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: {
          status: 'rejected',
          completedAt: new Date()
        }
      });

      // 通知发起人
      await this.notifyInitiator(instance.id, 'rejected');
      return;
    }

    // 6. 全部通过，进入下一步
    await this.moveToNextStep(instance.id);
  }

  // 进入下一步
  private async moveToNextStep(instanceId: string): Promise<void> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { template: true }
    });

    const steps = instance.template.steps as WorkflowStep[];
    const nextStep = steps.find(s => s.order === instance.currentStep + 1);

    if (!nextStep) {
      // 没有下一步，流程完成
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });

      // 更新文档状态
      if (instance.documentId) {
        await this.prisma.document.update({
          where: { id: instance.documentId },
          data: { status: 'approved' }
        });
      }

      // 通知发起人
      await this.notifyInitiator(instanceId, 'approved');
      return;
    }

    // 更新当前步骤
    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { currentStep: nextStep.order }
    });

    // 创建下一步任务
    await this.createTasksForStep(instanceId, nextStep);

    // 通知下一步审批人
    await this.notifyApprovers(instanceId, nextStep);
  }
}

// 类型定义
interface WorkflowStep {
  order: number;
  name: string;
  type: 'approval' | 'parallel';
  approvers: string[];
  parallelMode?: 'all' | 'any';
}
```

**3. 前端流程图展示**

```vue
<!-- WorkflowProgress.vue -->
<template>
  <el-card>
    <template #header>
      <span>流程进度</span>
      <el-tag :type="statusType">{{ statusText }}</el-tag>
    </template>

    <!-- Vue Flow流程图 -->
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :default-zoom="1"
      :fit-view-on-init="true"
    >
      <!-- 自定义节点 -->
      <template #node-step="{ data }">
        <div
          :class="[
            'workflow-node',
            data.isCurrent ? 'current' : '',
            data.status === 'completed' ? 'completed' : '',
            data.status === 'rejected' ? 'rejected' : ''
          ]"
        >
          <div class="node-header">
            <span class="step-order">{{ data.order }}</span>
            <span class="step-name">{{ data.name }}</span>
          </div>
          <div class="node-body">
            <div v-for="task in data.tasks" :key="task.id" class="task-item">
              <el-avatar :size="24" :src="task.assignee.avatar" />
              <span>{{ task.assignee.name }}</span>
              <el-tag
                v-if="task.status === 'completed'"
                :type="task.action === 'approved' ? 'success' : 'danger'"
                size="small"
              >
                {{ task.action === 'approved' ? '通过' : '驳回' }}
              </el-tag>
              <el-tag v-else type="info" size="small">待审批</el-tag>
            </div>
          </div>
        </div>
      </template>

      <Controls />
      <Background />
    </VueFlow>
  </el-card>
</template>

<script setup lang="ts">
import { VueFlow } from '@vue-flow/core';

const nodes = computed(() => {
  return workflow.value.steps.map((step, index) => ({
    id: `step-${step.order}`,
    type: 'step',
    position: { x: index * 250, y: 100 },
    data: {
      order: step.order,
      name: step.name,
      isCurrent: step.order === workflow.value.currentStep,
      status: getStepStatus(step.order),
      tasks: getStepTasks(step.order)
    }
  }));
});

const edges = computed(() => {
  return workflow.value.steps.slice(0, -1).map((step, index) => ({
    id: `edge-${step.order}`,
    source: `step-${step.order}`,
    target: `step-${step.order + 1}`,
    type: 'smoothstep',
    animated: step.order === workflow.value.currentStep
  }));
});
</script>

<style scoped>
.workflow-node {
  padding: 16px;
  border-radius: 8px;
  background: white;
  border: 2px solid #dcdfe6;
  min-width: 200px;
}

.workflow-node.current {
  border-color: #409eff;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.3);
}

.workflow-node.completed {
  border-color: #67c23a;
  background: #f0f9ff;
}

.workflow-node.rejected {
  border-color: #f56c6c;
  background: #fef0f0;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.step-order {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 4px;
}
</style>
```

##### API设计

```typescript
// 工作流模板API
POST   /workflow-templates              // 创建流程模板（部门Leader）
GET    /workflow-templates              // 查询流程模板（按部门过滤）
PUT    /workflow-templates/:id          // 更新流程模板
DELETE /workflow-templates/:id          // 删除流程模板

// 工作流实例API
POST   /workflow-instances              // 创建流程实例
GET    /workflow-instances/:id          // 查询流程实例详情
GET    /workflow-instances/:id/graph    // 获取流程图数据

// 工作流任务API
GET    /workflow-tasks/my-tasks         // 我的待办任务
POST   /workflow-tasks/:id/approve      // 审批任务（同意/驳回）
GET    /workflow-tasks/:id/history      // 查询审批历史
```

---

#### 14.2.3 文档内容标准化

##### 功能范围

**核心目标**：
- 统一文档内容格式为Tiptap JSON
- 提供Word/PDF内容提取辅助工具
- 支持富文本编辑（标题、段落、列表、表格）
- 自动生成章节ID，支持引用定位

**文档上传流程**：
```
步骤1：用户上传Word/PDF文件（作为参考）
  ↓
步骤2：系统提取文本内容（Mammoth.js/PDF.js）
  ↓
步骤3：系统智能分段（识别标题、段落、列表）
  ↓
步骤4：转换为Tiptap JSON格式
  ↓
步骤5：用户在编辑器中查看并调整内容
  ↓
步骤6：用户插入引用Block、调整格式
  ↓
步骤7：保存为标准化文档
```

**关键点**：
- 上传的Word/PDF**仅作为参考**，不直接存储
- 最终所有文档都是Tiptap JSON格式
- 用户可以手动调整提取的内容

##### 技术实现方案

**1. 后端文件提取服务**

```typescript
// server/src/modules/document/document-extract.service.ts

import mammoth from 'mammoth';  // Word提取
import pdf from 'pdf-parse';    // PDF提取
import { generateJSON } from '@tiptap/core';

@Injectable()
export class DocumentExtractService {
  // 提取Word内容
  async extractWordContent(filePath: string): Promise<TiptapJSON> {
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = result.value;

    // HTML转Tiptap JSON
    return this.htmlToTiptapJson(html);
  }

  // 提取PDF内容
  async extractPdfContent(filePath: string): Promise<TiptapJSON> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    // 纯文本转Tiptap JSON（智能分段）
    return this.textToTiptapJson(text);
  }

  // 纯文本转Tiptap JSON（智能分段）
  private textToTiptapJson(text: string): TiptapJSON {
    const lines = text.split('\n');
    const content = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // 启发式判断：是否是标题
      if (this.isHeading(line)) {
        content.push({
          type: 'heading',
          attrs: { level: this.detectHeadingLevel(line) },
          content: [{ type: 'text', text: line.trim() }]
        });
      } else {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: line.trim() }]
        });
      }
    }

    return { type: 'doc', content };
  }

  // 判断是否是标题（启发式）
  private isHeading(line: string): boolean {
    // 规则1：以数字开头（如：1. 、1.1 ）
    if (/^\d+\./.test(line.trim())) return true;

    // 规则2：以中文数字开头（如：一、二、）
    if (/^[一二三四五六七八九十]+[、.]/.test(line.trim())) return true;

    // 规则3：以"第X章"开头
    if (/^第[一二三四五六七八九十]+章/.test(line.trim())) return true;

    return false;
  }

  // 检测标题级别
  private detectHeadingLevel(line: string): number {
    if (/^第[一二三四五六七八九十]+章/.test(line)) return 1;  // h1
    if (/^\d+\./.test(line)) {
      const depth = line.match(/\d+/g)?.length || 1;
      return Math.min(depth + 1, 6);  // h2~h6
    }
    return 2;  // 默认h2
  }
}
```

**2. 前端上传组件**

```vue
<!-- DocumentUploadExtract.vue -->
<template>
  <el-card>
    <template #header>
      <span>创建三级文件</span>
    </template>

    <!-- 创建方式选择 -->
    <el-radio-group v-model="createMode" class="mb-4">
      <el-radio label="manual">从头编辑</el-radio>
      <el-radio label="import">导入参考文件</el-radio>
    </el-radio-group>

    <!-- 方式1：从头编辑 -->
    <div v-if="createMode === 'manual'">
      <TiptapEditor v-model="documentContent" />
    </div>

    <!-- 方式2：导入参考文件 -->
    <div v-else>
      <el-upload
        :auto-upload="false"
        :on-change="handleFileChange"
        accept=".docx,.pdf"
        :limit="1"
        drag
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到这里 或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            仅支持.docx和.pdf格式，系统将提取内容供您参考和编辑
          </div>
        </template>
      </el-upload>

      <!-- 提取进度 -->
      <div v-if="extracting" class="mt-4">
        <el-progress :percentage="extractProgress" status="success" />
        <p class="text-center text-sm text-gray-500 mt-2">
          正在提取文档内容...
        </p>
      </div>

      <!-- 提取结果 -->
      <el-card v-if="extractedContent" class="mt-4">
        <template #header>
          <span>提取的内容（可编辑调整）</span>
          <el-button size="small" @click="resetContent">重新上传</el-button>
        </template>

        <TiptapEditor
          v-model="documentContent"
          :initial-content="extractedContent"
        />
      </el-card>
    </div>

    <template #footer>
      <el-button @click="saveDraft">保存草稿</el-button>
      <el-button type="primary" @click="submitForApproval">
        提交审批
      </el-button>
    </template>
  </el-card>
</template>

<script setup lang="ts">
const handleFileChange = async (file: UploadFile) => {
  extracting.value = true;
  extractProgress.value = 0;

  // 上传文件到服务器
  const formData = new FormData();
  formData.append('file', file.raw);

  try {
    extractProgress.value = 30;

    // 调用提取API
    const res = await api.post('/documents/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    extractProgress.value = 100;
    extractedContent.value = res.data.content;
    documentContent.value = res.data.content;

    ElMessage.success('文档内容提取成功，您可以在编辑器中调整内容');
  } catch (error) {
    ElMessage.error('文档内容提取失败，请重新上传');
  } finally {
    extracting.value = false;
  }
};
</script>
```

##### API设计

```typescript
POST   /documents/extract               // 提取Word/PDF内容
```

---

### 14.3 业务规则（BR-071 ~ BR-090）

| 规则编号 | 规则描述 | 规则类型 |
|---------|----------|---------|
| **BR-071** | 仅支持三级文件引用三级文件 | 约束 |
| **BR-072** | 引用Block不可编辑，但可删除 | 约束 |
| **BR-073** | 源文档审批通过后，触发异步同步队列 | 业务逻辑 |
| **BR-074** | 引用同步失败时，标记为"失效"并通知管理员 | 业务逻辑 |
| **BR-075** | 跨部门引用需要源文档查看权限 | 权限控制 |
| **BR-076** | 部门Leader可创建本部门工作流模板 | 权限控制 |
| **BR-077** | 工作流模板修改后，已进行中的流程不受影响 | 业务逻辑 |
| **BR-078** | 并行会签：任一审批人驳回，流程立即终止 | 业务逻辑 |
| **BR-079** | 驳回原因必填，且至少5个字 | 约束 |
| **BR-080** | 同意时审批意见可选 | 约束 |
| **BR-081** | 审批人离职/调岗，任务自动转给上级 | 业务逻辑 |
| **BR-082** | 审批人无上级时，任务转给Admin | 业务逻辑 |
| **BR-083** | Document.content 字段必须为Tiptap JSON格式 | 约束 |
| **BR-084** | 章节ID自动生成，格式：section-{slugified-title} | 业务逻辑 |
| **BR-085** | 上传的Word/PDF仅作为参考，不直接存储 | 业务逻辑 |
| **BR-086** | 引用关系创建时，需校验源文档和目标文档是否存在 | 约束 |
| **BR-087** | 引用关系创建时，需校验章节ID是否存在 | 约束 |
| **BR-088** | 同一源文档+目标文档+章节ID组合唯一 | 约束 |
| **BR-089** | 删除文档时，级联删除相关引用关系 | 业务逻辑 |
| **BR-090** | 工作流实例删除时，级联删除相关任务 | 业务逻辑 |
| **BR-091 (P0-4 修复)** | 审批任务超过24小时未处理，标记为超时（isOverdue=true） | 业务逻辑 |
| **BR-092 (P0-4 修复)** | 超时任务自动升级到上级领导（escalationUserId） | 业务逻辑 |
| **BR-093 (P0-4 修复)** | 超时后发送通知给审批人和升级领导 | 业务逻辑 |
| **BR-094 (P0-4 修复)** | 定时任务每小时检查一次超时任务 | 业务逻辑 |

---

### 14.4 数据模型汇总

#### 新增表

```prisma
// 1. 文档引用关系表
model DocumentReference {
  id             String   @id @default(cuid())
  sourceDocId    String
  targetDocId    String
  sectionId      String
  lastSyncedAt   DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  sourceDoc      Document @relation("SourceDoc", fields: [sourceDocId], references: [id], onDelete: Cascade)
  targetDoc      Document @relation("TargetDoc", fields: [targetDocId], references: [id], onDelete: Cascade)

  @@index([sourceDocId])
  @@index([targetDocId])
  @@unique([sourceDocId, targetDocId, sectionId])
}

// 2. 工作流模板表
model WorkflowTemplate {
  id            String   @id @default(cuid())
  code          String   @unique
  name          String
  departmentId  String
  steps         Json
  version       Int      @default(1)
  status        String   @default("active")
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  department    Department @relation(fields: [departmentId], references: [id])
  createdBy     User       @relation(fields: [createdById], references: [id])
  instances     WorkflowInstance[]

  @@index([departmentId, status])
  @@index([code])
}

// 3. 工作流实例表
model WorkflowInstance {
  id           String   @id @default(cuid())
  templateId   String
  template     WorkflowTemplate @relation(fields: [templateId], references: [id])
  documentId   String?
  document     Document? @relation(fields: [documentId], references: [id])
  currentStep  Int      @default(1)
  status       String   @default("running")
  initiatorId  String
  initiator    User     @relation(fields: [initiatorId], references: [id])
  startedAt    DateTime @default(now())
  completedAt  DateTime?

  tasks        WorkflowTask[]

  @@index([documentId])
  @@index([initiatorId, status])
  @@index([status, currentStep])
}

// 4. 工作流任务表
// 4. 工作流任务表
model WorkflowTask {
  id          String   @id @default(cuid())
  instanceId  String
  instance    WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  stepOrder   Int
  stepName    String
  assigneeId  String
  assignee    User     @relation(fields: [assigneeId], references: [id])
  status      String   @default("pending")
  action      String?
  comment     String?
  completedAt DateTime?
  createdAt   DateTime @default(now())

  // P0-4 修复：审批超时机制
  timeoutHours      Int      @default(24)  // 超时小时数（默认24小时）
  escalationUserId  String?               // 超时升级到的用户ID（如：上级领导）
  escalationUser    User?    @relation("EscalationUser", fields: [escalationUserId], references: [id])
  isOverdue         Boolean  @default(false)  // 是否超时（定时任务更新）
  overdueNotifiedAt DateTime?                 // 超时通知时间

  @@index([assigneeId, status])
  @@index([instanceId, stepOrder])
  @@index([isOverdue, status])  // P0-4 索引：用于定时任务查询超时任务
}
```

#### 扩展表

```prisma
// 扩展Document表
model Document {
  id      String @id @default(cuid())
  title   String
  level   String
  content Json    // ✅ 改为Json类型（Tiptap JSON格式）
  status  String

  // 新增：引用关系
  sourceReferences   DocumentReference[] @relation("SourceDoc")
  targetReferences   DocumentReference[] @relation("TargetDoc")

  // 新增：工作流关联
  workflowInstance   WorkflowInstance?

  @@index([level, status])
}

// 扩展Department表
model Department {
  id              String @id @default(cuid())
  name            String

  // 新增：工作流模板
  workflowTemplates WorkflowTemplate[]
}

// 扩展User表
model User {
  id                String @id @default(cuid())
  username          String

  // 新增：工作流相关
  createdTemplates  WorkflowTemplate[]  @relation("CreatedTemplates")
  initiatedWorkflows WorkflowInstance[]  @relation("InitiatedWorkflows")
  assignedTasks     WorkflowTask[]
}
```

---

### 14.5 开发顺序与工作量估算

#### Phase 1：数据库设计与扩展（1周）

**任务清单**：
- [ ] Prisma Schema设计（4张新表）
- [ ] 迁移脚本编写
- [ ] 本地环境测试

**工作量**：5人天

---

#### Phase 2：简化工作流引擎（4周）

**Week 1-2：后端开发**
- [ ] WorkflowService核心逻辑（2天）
- [ ] WorkflowTemplateService（1天）
- [ ] WorkflowTaskService（1天）
- [ ] 审批人变更监听（0.5天）
- [ ] API接口开发（1.5天）
- [ ] 单元测试（1天）
- [ ] 集成测试（1天）

**Week 3-4：前端开发**
- [ ] 工作流模板配置页（2天）
- [ ] 工作流实例详情页（2天）
- [ ] Vue Flow流程图展示（2天）
- [ ] 我的待办任务页（1.5天）
- [ ] 审批操作对话框（1.5天）
- [ ] E2E测试（1天）

**工作量**：40人天

---

#### Phase 3：智能文档引擎（4周）

**Week 1-2：后端开发**
- [ ] DocumentReferenceService（2天）
- [ ] DocumentExtractService（2天）
- [ ] 章节解析服务（1.5天）
- [ ] BullMQ异步同步队列（1.5天）
- [ ] API接口开发（1天）
- [ ] 单元测试（1天）
- [ ] 集成测试（1天）

**Week 3-4：前端开发**
- [ ] Tiptap编辑器集成（2天）
- [ ] HeadingWithId扩展（0.5天）
- [ ] ReferenceBlock扩展（2天）
- [ ] InsertReferenceDialog组件（2天）
- [ ] 文档上传提取组件（1.5天）
- [ ] Vue Flow引用关系图（2天）
- [ ] E2E测试（1天）

**工作量**：44人天

---

#### Phase 4：系统集成与测试（2周）

**任务清单**：
- [ ] 废弃现有Approval硬编码逻辑（2天）
- [ ] 创建对应工作流模板（1天）
- [ ] 历史文档内容格式检查（1天）
- [ ] 端到端测试（3天）
- [ ] 性能优化（2天）
- [ ] 文档更新（1天）

**工作量**：10人天

---

#### 总计

**总工期**：11周（约3个月）
**总工作量**：99人天
**团队配置**：
- 后端开发：1人（全职）
- 前端开发：1人（全职）
- 测试工程师：0.5人（兼职）

---

### 14.6 技术风险与缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Tiptap学习曲线陡峭 | 中 | 高 | 提前阅读官方文档，参考开源案例 |
| 引用同步性能问题 | 中 | 中 | 使用BullMQ异步队列，Redis缓存 |
| 章节解析准确度不足 | 中 | 中 | 启发式规则优化，允许手动调整 |
| 工作流配置错误 | 中 | 高 | JSON Schema校验，提供配置示例 |
| 并发引用冲突 | 低 | 中 | 数据库唯一约束，乐观锁 |
| 历史数据迁移复杂 | 低 | 中 | 保持历史数据独立，仅新数据用新格式 |

---

### 14.7 成功标准

**智能文档引擎**：
- ✅ 可创建三级文件间的引用关系
- ✅ 源文档修改后，引用自动同步
- ✅ 引用Block清晰标识，只读，可删除
- ✅ 支持手动刷新引用
- ✅ 引用关系图可视化展示

**简化工作流引擎**：
- ✅ 部门Leader可创建本部门工作流模板
- ✅ 支持顺序审批和并行会签
- ✅ 流程进度以Vue Flow流程图展示
- ✅ 驳回后可重新提交
- ✅ 审批人变更时任务自动转交

**文档内容标准化**：
- ✅ 所有新文档使用Tiptap JSON格式
- ✅ 支持Word/PDF内容提取
- ✅ 章节ID自动生成
- ✅ 富文本编辑体验良好

---

### 14.8 后续扩展方向（v2.1+）

**v2.1.0：工作流高级功能**
- 条件分支（根据字段值选择路径）
- 子工作流嵌套
- 可视化流程设计器（拖拽式）

**v2.2.0：智能文档高级功能**
- 引用版本对比（查看引用内容的历史变更）
- 引用影响分析（预测变更影响范围）
- 批量引用更新（一次性更新多个引用）

**v2.3.0：AI增强**
- AI文档合规预检（BRCGS条款覆盖检查）
- AI审批意见推荐（基于历史数据）
- AI内容提取优化（提升章节识别准确度）

---

**文档版本**: 4.0
**最后更新**: 2026-02-12

---

## 十五、培训管理系统（独立模块 - PRD-03 整合）⭐⭐ Phase C 体系管理

[⬆️ 返回目录](#-完整目录) | [⬆️ 返回快速导航](#-快速导航)

> **建议上线顺序**: Chapter 20（在动态表单引擎、批次追溯、移动端架构完成后）
> **优先级**: 中等（体系管理功能）
> **依赖**: Chapter 15（动态表单引擎）、Chapter 17（移动端应用）

> **设计版本**: v1.0
> **最后更新**: 2026-02-12
> **状态**: 待开发
> **关联 PRD**: PRD-03-培训系统.md

---

### 15.1 系统定位

#### 15.1.1 模块特性

**培训系统 = 独立业务模块(非文档体系)**

```
文档管理系统(核心)
├── 一级文件(质量手册)
├── 二级文件(SOP)
├── 三级文件(WI)
└── 四级文件(记录)

培训管理系统(独立模块) ← 不属于文档体系
├── 年度培训计划
├── 培训项目管理
├── 在线考试系统
├── 学习记录跟踪
├── 培训档案归档
└── 统一待办任务(TodoTask) ← 新增,跨模块复用
    ↓ 引用关联
    二级/三级/四级文件(作为培训资料)
```

**核心优势**:
- ✅ **架构清晰**: 培训业务独立,不污染文档体系
- ✅ **灵活复用**: 培训资料引用任意级别文档(二级/三级/四级)
- ✅ **统一待办**: TodoTask 支持培训、审批、设备维护等多种待办类型
- ✅ **可选归档**: 培训档案可选择性归档到文档系统
- ✅ **模块开关**: 可作为可选模块启用/禁用

---

### 15.2 业务流程

#### 15.2.1 完整业务流程

```
【年度培训计划管理】
Step 1: 创建年度培训计划
  ├── 输入: 年度、标题
  ├── 配置培训项目列表
  │   ├── 项目标题(如 "GMP 基础培训")
  │   ├── 部门(可选, null = 全员培训)
  │   ├── 季度(可选, null = 临时培训)
  │   ├── 培训讲师(默认部门主管)
  │   ├── 计划日期
  │   ├── 被培训人员(多选)
  │   ├── 培训资料(引用已有文档)
  │   └── 考试配置(及格分、考试次数)
  └── 提交审批

Step 2: 培训计划审批(v2.0.0 工作流引擎)
  ├── 发起审批流程(WorkflowInstance)
  ├── 审批人审批(WorkflowTask)
  └── 审批通过 / 驳回

Step 3: 审批通过后,自动生成待办任务(TodoTask)
  ├── 培训负责人待办:
  │   ├── 类型: training_organize
  │   ├── 标题: "组织'GMP 基础培训'(2024-Q1)"
  │   ├── 关联: TrainingProject.id
  │   └── 截止日期: 培训计划日期
  │
  └── 被培训员工待办:
      ├── 类型: training_attend
      ├── 标题: "参加'GMP 基础培训'并完成考试"
      ├── 关联: TrainingProject.id
      └── 截止日期: 培训计划日期

【培训执行】
Step 4: 员工查看待办任务
  ├── 进入"我的待办"页面
  ├── 查看待办类型: 培训、审批、设备维护等
  └── 点击培训待办 → 跳转到培训项目详情

Step 5: 员工学习培训资料
  ├── 查看培训项目信息
  ├── 下载/预览培训资料(引用的文档)
  └── 自主学习

Step 6: 员工参加在线考试
  ├── 点击"开始考试"
  ├── 显示题目(选择题 + 判断题)
  ├── 提交答案
  ├── 系统自动评分
  └── 显示考试结果
      ├── 通过(≥ 及格分) → 完成培训 → 待办任务标记为 completed
      └── 不通过(< 及格分) → 显示剩余考试次数 → 可重新考试

Step 7: 培训项目完成(所有学员考试完毕)
  ├── 系统判断: 所有 LearningRecord.passed = true
  ├── 自动生成培训档案 PDF
  │   ├── 培训计划信息
  │   ├── 参训人员名单
  │   ├── 考试成绩汇总
  │   └── 培训资料清单
  ├── 上传 PDF 到 MinIO
  └── 自动归档到文档系统(创建四级文件)
      ├── 文档编号: REC-TRAIN-{YYYY}-{序号}(自动生成)
      ├── 文档标题: {培训标题}-{日期}
      ├── 文档类型: 培训记录(固定)
      ├── 归属部门: 继承培训项目的 department
      └── 文件 URL: MinIO 路径

【培训计划调整】
Step 8: 修改培训计划(增删项目)
  ├── 新增项目 / 删除项目 / 修改项目
  ├── 计划状态 → pending_approval(重新审批)
  ├── 提交审批
  └── 审批通过后
      ├── 删除旧的待办任务(所有关联的 TodoTask)
      └── 重新生成待办任务(根据新的项目列表)

Step 9: 修改学员名单(不需要审批)
  ├── 新增学员 → 自动生成待办任务
  ├── 删除学员 → 自动删除待办任务
  └── 无需重新审批
```


---

### 15.3 数据模型

#### 15.3.1 统一待办任务表(TodoTask)

**设计说明**:
- 统一的待办任务系统,支持多种业务类型
- 培训待办、审批待办、设备待办等共用此表
- 通过 `type` 字段区分待办类型
- 通过 `relatedId` 字段关联不同业务实体

```prisma
// ========== 统一待办任务系统 ==========

model TodoTask {
  id          String   @id @default(cuid())
  userId      String   // 待办人
  type        String   // 待办类型
                       // - training_organize: 培训负责人 - 组织培训
                       // - training_attend: 被培训员工 - 参加培训并考试
                       // - approval: 审批待办
                       // - equipment_maintain: 设备维护待办(未来功能)
                       // - inventory: 盘点待办(未来功能)
                       // - change_request: 变更待办(未来功能)

  relatedId   String   // 关联业务 ID(根据 type 不同,含义不同)
                       // - training_organize/training_attend: TrainingProject.id
                       // - approval: WorkflowTask.id
                       // - equipment_maintain: EquipmentTask.id

  title       String   // 待办标题(如 "组织 GMP 培训")
  description String?  // 待办描述(可选)
  status      String   // pending, completed
  priority    String   @default("normal") // low, normal, high, urgent
  dueDate     DateTime? // 截止日期
  completedAt DateTime? // 完成时间
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User @relation(fields: [userId], references: [id])

  @@index([userId, status])
  @@index([type, relatedId])
  @@index([status, dueDate])
}
```

**待办类型枚举**(packages/types/todo.ts):
```typescript
export type TodoType =
  | 'training_organize'   // 培训负责人待办
  | 'training_attend'     // 被培训员工待办
  | 'approval'            // 审批待办
  | 'equipment_maintain'  // 设备维护待办
  | 'inventory'           // 盘点待办
  | 'change_request';     // 变更待办

export type TodoStatus = 'pending' | 'completed';
export type TodoPriority = 'low' | 'normal' | 'high' | 'urgent';
```

---

#### 15.3.2 培训模块核心表

```prisma
// ========== 培训管理模块 ==========

// 1. 年度培训计划
model TrainingPlan {
  id          String   @id @default(cuid())
  year        Int      // 年度(2024)
  title       String   // "2024 年度全员培训计划"
  status      String   // draft, pending_approval, approved, completed

  createdBy   String   // 创建人
  approvedBy  String?  // 审批人

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  approvedAt  DateTime? // 审批时间

  creator     User @relation("CreatedTrainingPlans", fields: [createdBy], references: [id])
  approver    User? @relation("ApprovedTrainingPlans", fields: [approvedBy], references: [id])
  projects    TrainingProject[]

  @@index([year, status])
  @@index([createdBy])
}

// 2. 培训项目(具体培训课程)
model TrainingProject {
  id              String   @id @default(cuid())
  planId          String   // 所属年度计划

  title           String   // "GMP 基础培训"
  description     String?  // 培训描述
  department      String?  // 部门(null = 全员培训)
  quarter         Int?     // 季度 1-4(null = 临时培训)

  trainerId       String   // 培训讲师(默认部门主管)
  trainees        String[] // 被培训人员 ID 数组

  scheduledDate   DateTime // 计划培训日期
  documentIds     String[] // 培训资料(引用文档 ID)

  // 考试配置
  passingScore    Int      @default(60)  // 及格分数
  maxAttempts     Int      @default(3)   // 最多考试次数

  status          String   // planned, ongoing, completed, cancelled

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  completedAt     DateTime? // 完成时间(所有人考试完毕)

  plan            TrainingPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  trainer         User @relation("TrainedProjects", fields: [trainerId], references: [id])
  questions       TrainingQuestion[]
  records         LearningRecord[]
  archive         TrainingArchive?

  @@index([planId, status])
  @@index([department, scheduledDate])
  @@index([trainerId])
}

// 3. 考试题目
model TrainingQuestion {
  id          String   @id @default(cuid())
  projectId   String   // 所属培训项目

  type        String   // multiple_choice, true_false
  question    String   // 题干
  options     Json?    // 选项(仅选择题)
                       // 格式: ["A. 选项1", "B. 选项2", "C. 选项3"]
  answer      String   // 正确答案("A" 或 "true"/"false")
  points      Int      @default(10) // 分值
  order       Int      // 题目顺序

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     TrainingProject @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, order])
}

// 4. 学习记录
model LearningRecord {
  id          String   @id @default(cuid())
  projectId   String   // 培训项目
  userId      String   // 学员

  // 考试结果
  examScore   Int?     // 最终考试分数(null = 未考试)
  attempts    Int      @default(0) // 已考试次数
  passed      Boolean  @default(false) // 是否通过

  completedAt DateTime? // 完成时间(通过考试的时间)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     TrainingProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user        User @relation("LearningRecords", fields: [userId], references: [id])
  examRecords ExamRecord[]

  @@unique([projectId, userId]) // 一个用户一个项目只有一条记录
  @@index([userId, passed])
  @@index([projectId, passed])
}

// 5. 考试记录(支持多次考试)
model ExamRecord {
  id          String   @id @default(cuid())
  recordId    String   // 学习记录 ID

  score       Int      // 本次考试分数
  answers     Json     // 答案
                       // 格式: { "q-001": "A", "q-002": "true", ... }

  createdAt   DateTime @default(now())

  record      LearningRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)

  @@index([recordId, createdAt])
}

// 6. 培训档案(自动归档到文档系统)
model TrainingArchive {
  id          String   @id @default(cuid())
  projectId   String   @unique // 培训项目 ID

  pdfUrl      String   // PDF 报告存储路径(MinIO)
  documentId  String   // 归档到文档系统的文档 ID

  createdAt   DateTime @default(now())

  project     TrainingProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  document    Document @relation(fields: [documentId], references: [id])

  @@index([documentId])
}
```

---

#### 15.3.3 User 表扩展

```prisma
model User {
  // ... 现有字段 ...

  // 培训相关
  createdTrainingPlans  TrainingPlan[] @relation("CreatedTrainingPlans")
  approvedTrainingPlans TrainingPlan[] @relation("ApprovedTrainingPlans")
  trainedProjects       TrainingProject[] @relation("TrainedProjects")
  learningRecords       LearningRecord[] @relation("LearningRecords")

  // 待办任务
  todoTasks             TodoTask[]
}
```

---

#### 15.3.4 Document 表扩展

```prisma
model Document {
  // ... 现有字段 ...

  // 培训档案归档
  trainingArchives      TrainingArchive[]
}
```


---

### 15.4 业务规则

#### 15.4.1 培训计划规则(BR-091 ~ BR-095)

**BR-091: 培训计划唯一性**
- 每年只能有一个培训计划
- 年度 + 年份必须唯一
- 违反规则返回: `409 Conflict`

**BR-092: 培训计划审批规则**
- 培训计划创建后,状态为 `draft`
- 提交审批后,状态变为 `pending_approval`
- 审批通过后,状态变为 `approved`,自动生成待办任务
- 审批驳回后,状态变为 `draft`,可重新修改

**BR-093: 培训计划修改规则**
- 状态为 `draft` 时,可直接修改
- 状态为 `approved` 时:
  - 增删培训项目: 必须重新审批(status → `pending_approval`)
  - 修改项目信息(时间、讲师): 必须重新审批
  - 修改学员名单: 无需审批,直接修改,自动同步待办任务

**BR-094: 培训项目删除规则**
- 状态为 `planned`(未开始): 可删除
- 状态为 `ongoing`(进行中)或 `completed`(已完成): 不能删除,只能标记为 `cancelled`
- 删除项目时,自动删除关联的待办任务

**BR-095: 培训计划完成条件**
- 所有培训项目状态为 `completed` 或 `cancelled`
- 满足条件后,计划状态自动变为 `completed`

---

#### 15.4.2 培训项目规则(BR-096 ~ BR-101)

**BR-096: 培训项目状态流转**
```
planned(已计划)
  ↓ 第一个学员开始考试
ongoing(进行中)
  ↓ 所有学员考试完毕
completed(已完成)

planned → cancelled(管理员取消)
```

**BR-097: 培训资料引用规则**
- 只能引用已发布的文档(status = `published`)
- 引用文档的最新版本(不指定版本号)
- 文档被撤销后,培训资料列表显示"⚠️ 文档已撤销"标记

**BR-098: 培训讲师权限**
- 培训讲师(trainerId)默认为部门主管
- 培训讲师可以:
  - 查看培训项目详情
  - 查看学员考试统计
  - 修改学员名单(无需审批)
- 培训讲师不能:
  - 修改考试题目(需重新审批)
  - 删除培训项目

**BR-099: 培训学员限制**
- 每个培训项目最少 1 个学员
- 每个培训项目最多 100 个学员
- 学员必须为在职员工(status = `active`)

**BR-100: 培训取消规则**
- 取消培训项目时:
  - 项目状态 → `cancelled`
  - 删除所有待办任务(training_organize + training_attend)
  - 保留已完成的学习记录(LearningRecord)
  - 不生成培训档案

**BR-101: 培训项目自动完成**
- 当所有学员都完成考试(LearningRecord.examScore 不为 null)
- 自动触发:
  - 项目状态 → `completed`
  - 生成培训档案 PDF
  - 归档到文档系统

---

#### 15.4.3 考试规则(BR-102 ~ BR-107)

**BR-102: 考试次数限制**
- 每个学员最多考试 `maxAttempts` 次(默认 3 次)
- 超过次数后,不能再考试
- 即使未通过,也算完成培训(待办任务标记为 completed,但 passed = false)

**BR-103: 考试及格规则**
- 考试分数 ≥ `passingScore`(默认 60 分) → passed = true
- 考试分数 < `passingScore` → passed = false
- 通过考试后,不能再次考试

**BR-104: 考试答案验证**
- 必须回答所有题目
- 选择题答案必须为 A/B/C/D 之一
- 判断题答案必须为 true/false
- 违反规则返回: `400 Bad Request`

**BR-105: 考试自动评分**
- 提交答案后,系统自动对比正确答案
- 每题答对 → 加分值(points)
- 每题答错 → 不加分
- 总分 = Σ(答对题目的分值)

**BR-106: 考试记录保存**
- 每次考试都创建 ExamRecord 记录
- 保存答案(answers JSON)和分数(score)
- 最终分数 = 最高分(examScore = MAX(ExamRecord.score))

**BR-107: 考试题目顺序**
- 题目按 `order` 字段升序排列
- 每次考试题目顺序一致(不随机)
- 如需随机,前端可随机打乱(不影响后端评分)

---

#### 15.4.4 待办任务规则(BR-108 ~ BR-111)

**BR-108: 待办任务自动生成**
- 培训计划审批通过后,自动生成待办任务:
  - 每个培训项目 → 1 个培训负责人待办(type = `training_organize`)
  - 每个培训项目 → N 个学员待办(type = `training_attend`,N = 学员数量)
- 待办任务的 `dueDate` = 培训项目的 `scheduledDate`

**BR-109: 待办任务自动完成**
- 学员通过考试后,自动完成待办任务(status = `completed`)
- 培训负责人需要手动完成待办(或所有学员考试完毕后自动完成)

**BR-110: 待办任务删除规则**
- 培训项目取消 → 自动删除待办任务
- 培训计划重新审批 → 删除旧待办,生成新待办
- 学员从培训项目中移除 → 删除该学员的待办任务

**BR-111: 待办任务逾期提醒**
- 待办任务逾期(dueDate < 当前日期 && status = `pending`)
- 系统每天定时发送逾期提醒(邮件/站内信)
- 逾期待办在待办列表中高亮显示

---

#### 15.4.5 培训档案规则(BR-112 ~ BR-115)

**BR-112: 培训档案生成时机**
- 培训项目状态变为 `completed` 时,自动生成
- 生成内容:
  - 培训计划信息(标题、日期、讲师)
  - 参训人员名单(姓名、部门、签到状态)
  - 考试成绩汇总(姓名、分数、是否通过)
  - 培训资料清单(文档编号、标题、级别)

**BR-113: 培训档案归档规则**
- 生成 PDF 后,自动归档到文档系统(创建四级文件)
- 文档编号: `REC-TRAIN-{YYYY}-{序号}`(自动生成)
- 文档标题: `{培训标题}-{日期}`
- 文档类型: `training_record`(固定)
- 归属部门: 继承培训项目的 `department`

**BR-114: 培训档案唯一性**
- 每个培训项目只能生成一次档案
- 重复生成返回: `409 Conflict`

**BR-115: 培训档案 PDF 格式**
```
【培训记录表】

基本信息:
- 培训主题: GMP 基础培训
- 培训时间: 2024-03-15
- 培训讲师: 张三
- 培训部门: 生产部

培训内容:
- 培训资料清单:
  1. [二级] GMP-SOP-001 车间清洁规程
  2. [三级] GMP-WI-001 清洁剂使用指南

参训人员及考核:
| 姓名 | 部门 | 考试成绩 | 是否通过 | 考试时间 |
|------|------|----------|----------|----------|
| 李四 | 生产部 | 85 | 通过 | 2024-03-15 14:30 |
| 王五 | 生产部 | 75 | 通过 | 2024-03-15 15:00 |

培训效果评估:
- 总参训人数: 10
- 考试通过率: 90%
- 平均分: 80

生成时间: 2024-03-20 10:00:00
```


---

### 15.5 开发工作量估算

#### 15.5.1 后端开发(10-12 天)

| 模块 | 工作内容 | 工作量 |
|------|----------|--------|
| **统一待办任务** | TodoTask 表设计、API 开发 | 1.5 天 |
| **培训计划管理** | TrainingPlan CRUD、审批集成 | 2 天 |
| **培训项目管理** | TrainingProject CRUD、学员管理 | 2 天 |
| **在线考试** | Question 表、答题逻辑、自动评分 | 2.5 天 |
| **学习记录** | LearningRecord、ExamRecord 管理 | 1 天 |
| **培训档案** | PDF 生成、自动归档 | 2 天 |
| **工作流集成** | 审批回调、待办任务生成 | 1 天 |
| **单元测试** | 核心逻辑测试 | 1.5 天 |

**小计: 13.5 天 → 预留缓冲 → 15 天**

---

#### 15.5.2 前端开发(12-14 天)

| 模块 | 工作内容 | 工作量 |
|------|----------|--------|
| **我的待办** | TodoList.vue(统一待办中心) | 2 天 |
| **培训计划** | TrainingPlanList.vue、TrainingPlanDetail.vue | 2.5 天 |
| **培训项目** | TrainingProjectDetail.vue | 2 天 |
| **在线考试** | OnlineExam.vue(答题界面、结果展示) | 3 天 |
| **培训档案** | TrainingArchiveList.vue | 1.5 天 |
| **状态管理** | Pinia store(培训模块) | 1 天 |
| **类型定义** | packages/types(培训相关类型) | 0.5 天 |
| **E2E 测试** | Playwright 测试(核心流程) | 2 天 |

**小计: 14.5 天 → 预留缓冲 → 16 天**

---

#### 15.5.3 总工作量

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| **后端开发** | 15 天 | 包含单元测试 |
| **前端开发** | 16 天 | 包含 E2E 测试 |
| **联调测试** | 2 天 | 前后端联调 |
| **文档编写** | 1 天 | API 文档、用户手册 |

**总计: 34 天(约 7 周)**

**并行开发**(1 名后端 + 1 名前端): **约 4-5 周**

---

### 15.6 依赖与风险

#### 15.6.1 技术依赖

| 依赖项 | 版本 | 用途 | 风险等级 |
|--------|------|------|----------|
| **v2.0.0 工作流引擎** | 待开发 | 培训计划审批 | 高 |
| **文档系统** | 已完成 | 培训资料引用、档案归档 | 低 |
| **MinIO** | 已部署 | 培训档案 PDF 存储 | 低 |
| **PDF 生成库** | pdfmake | 生成培训档案 PDF | 中 |

**关键依赖**:
- ⚠️ **v2.0.0 工作流引擎必须先完成**(培训计划审批依赖工作流)
- ✅ 文档系统、MinIO 已就绪

---

#### 15.6.2 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **培训计划频繁修改** | 待办任务大量变动 | 中 | 重大调整需重新审批,微调直接修改 |
| **考试作弊** | 考试结果不可信 | 中 | MVP 不防作弊,v2.0 增加防作弊(限时、打乱题目) |
| **培训档案 PDF 生成失败** | 档案无法归档 | 低 | 异步生成,失败重试,记录错误日志 |
| **待办任务过多** | 用户体验差 | 中 | 支持筛选、分页、逾期高亮 |

---

### 15.7 后续扩展方向(v1.1+)

#### v1.1.0: 考试增强
- ✅ 考试防作弊(限时、题目随机打乱)
- ✅ 考试题库管理(题库分类、题目复用)
- ✅ 考试答案解析(错题查看解析)

#### v1.2.0: 培训效果评估
- ✅ 培训满意度问卷(学员反馈)
- ✅ 培训效果统计(通过率、平均分、部门对比)
- ✅ 培训 KPI 仪表盘

#### v1.3.0: 培训资质联动(可选,依赖 PRD-02)
- ✅ 资质到期推荐相关培训
- ✅ 培训完成自动更新资质记录

#### v2.0.0: 视频培训
- ✅ 支持上传培训视频(MinIO)
- ✅ 视频学习进度跟踪
- ✅ 视频学习时长统计

---

### 15.8 成功标准

**培训计划管理**:
- ✅ 可创建年度培训计划,包含多个培训项目
- ✅ 培训计划支持审批流程(v2.0.0 工作流引擎)
- ✅ 审批通过后,自动生成待办任务

**在线考试**:
- ✅ 支持选择题、判断题
- ✅ 提交答案后,系统自动评分
- ✅ 考试通过后,自动完成待办任务

**培训档案**:
- ✅ 培训完成后,自动生成 PDF 档案
- ✅ 档案自动归档到文档系统(创建四级文件)
- ✅ 档案包含培训信息、参训人员、考试成绩

**统一待办**:
- ✅ 支持多种待办类型(培训、审批、设备维护等)
- ✅ 待办列表支持筛选、分页
- ✅ 逾期待办高亮显示

---

**本章节完成 ✅**


---

## 十六、内审管理系统（独立模块 - PRD-04 简化整合）⭐⭐ Phase C 体系管理

[⬆️ 返回目录](#-完整目录) | [⬆️ 返回快速导航](#-快速导航)

> **建议上线顺序**: Chapter 21（在动态表单引擎、批次追溯、移动端架构完成后）
> **优先级**: 中等（体系管理功能）
> **依赖**: Chapter 15（动态表单引擎）、Chapter 17（移动端应用）

> **设计版本**: v1.0
> **最后更新**: 2026-02-12
> **状态**: 待开发
> **关联 PRD**: PRD-04-内审管理.md（简化版）

---

### 16.1 系统定位

#### 16.1.1 模块特性

**内审系统 = 独立业务模块(简化版)**

```
文档管理系统(核心)
├── 一级文件(质量手册)
├── 二级文件(SOP)
├── 三级文件(WI)
└── 四级文件(记录)

内审管理系统(独立模块) ← 简化设计
├── 内审计划管理
│   ├── 创建计划(季度/半年/年度)
│   ├── 勾选审核文档(按级别/部门)
│   └── 复制历史计划(重复利用)
├── 审核执行
│   ├── 逐个审核文档
│   ├── 记录审核结果(符合/不符合)
│   └── 记录不符合项(问题类型、责任人)
├── 整改跟踪
│   ├── 自动生成整改待办(TodoTask)
│   ├── 责任人提交整改
│   └── 内审员复审验证
└── 内审报告归档
    ├── 自动生成 PDF 报告
    └── 归档到文档系统(四级文件)
    ↓ 关联
    现有文档系统(一级/二级/三级/四级文件)
```

**核心优势**:
- ✅ **架构简化**: 不做条款匹配,不做检查表自动生成,不做移动端
- ✅ **灵活复用**: 支持复制历史内审计划,季度/半年/年度计划可重复利用
- ✅ **流程清晰**: 创建计划 → 启动审核 → 记录发现 → 生成待办 → 整改复审 → 归档报告
- ✅ **统一待办**: 复用 TodoTask 系统,整改任务统一管理
- ✅ **自动归档**: 内审报告自动生成 PDF 并归档到文档系统

---

### 16.2 业务流程

#### 16.2.1 完整业务流程

```
【内审计划管理】
Step 1: 创建内审计划
  ├── 输入基本信息
  │   ├── 标题: "2024-Q1 内审"
  │   ├── 类型: 季度/半年/年度
  │   ├── 审核时间: 2024-03-01 ~ 2024-03-31
  │   └── 内审员: 张三
  ├── 勾选审核文档
  │   ├── 按文档级别筛选(一级/二级/三级/四级)
  │   ├── 按部门筛选(生产部/质量部/...)
  │   └── 批量勾选文档(如: 勾选所有二级文件)
  └── 保存计划(状态: draft, 可随时启动)

Step 1.5: 复制历史内审计划(可选)
  ├── 选择历史计划(如 "2023-Q4 内审")
  ├── 点击"复制"按钮
  ├── 系统自动复制
  │   ├── 文档列表(documentIds)
  │   ├── 计划类型
  │   └── 基本配置
  ├── 修改内容
  │   ├── 标题 → "2024-Q1 内审"
  │   ├── 审核时间 → 2024-03-01 ~ 2024-03-31
  │   └── 内审员 → 李四
  └── 保存新计划

【审核执行】
Step 2: 启动内审计划
  ├── 点击"启动内审"按钮
  ├── 状态变更: draft → ongoing
  └── 进入审核页面(不生成待办任务)

Step 3: 内审员逐个审核文档
  ├── 查看文档列表(已勾选的 50 个文档)
  ├── 审核进度显示: "已审核 0/50"
  ├── 逐个审核:
  │   ├── 点击"审核" doc-001
  │   ├── 查看文档内容(预览/下载)
  │   ├── 填写审核结果:
  │   │   ├── 审核结果: [符合] [不符合] ← 单选
  │   │   ├── 如果选"不符合" → 显示问题填写区域:
  │   │   │   ├── 问题类型: [需要修改] [缺失记录] [文档缺失]
  │   │   │   ├── 问题描述: [文本框, 必填]
  │   │   │   ├── 责任部门: [下拉选择]
  │   │   │   ├── 责任人: [下拉选择]
  │   │   │   └── 整改期限: 自动计算(审核日期 + 30 天)
  │   │   └── 如果选"符合" → 无需填写其他信息
  │   ├── 点击"保存" → 生成 AuditFinding 记录
  │   └── 审核进度更新: "已审核 1/50"
  │
  ├── 继续审核下一个文档...
  └── 所有文档审核完毕 → 审核进度: "已审核 50/50"

Step 4: 提交审核报告
  ├── 系统显示审核汇总:
  │   ├── 审核文档总数: 50
  │   ├── 符合: 45
  │   ├── 不符合: 5
  │   └── 不符合项清单: [doc-003, doc-010, doc-015, doc-020, doc-025]
  ├── 内审员确认审核结果
  └── 点击"提交审核报告"

【整改跟踪】
Step 5: 系统自动生成整改待办
  ├── 内审计划状态: ongoing → pending_rectification
  ├── 自动生成整改待办任务(TodoTask):
  │   ├── 待办 1:
  │   │   ├── 类型: audit_rectification
  │   │   ├── 关联: AuditFinding ID
  │   │   ├── 责任人: 李四(生产部)
  │   │   ├── 标题: "整改'GMP-SOP-001'审核发现"
  │   │   ├── 描述: "第 3.2 节清洁频次描述不清"
  │   │   └── 截止日期: 2024-04-15(审核日期 + 30 天)
  │   ├── 待办 2: 整改 GMP-WI-001 审核发现(责任人: 王五)
  │   └── ... (共 5 个待办, 只针对"不符合"项)
  ├── 不符合项状态: pending → rectifying
  └── 发送通知给责任人

Step 6: 责任人整改
  ├── 责任人收到待办任务
  ├── 进入"我的待办"查看详情
  ├── 点击待办 → 查看不符合项信息:
  │   ├── 文档: GMP-SOP-001 车间清洁规程
  │   ├── 问题类型: 需要修改
  │   ├── 问题描述: 第 3.2 节清洁频次描述不清
  │   └── 整改期限: 2024-04-15
  ├── 整改文档:
  │   ├── 场景 1: 需要修改 → 修改文档 → 提交审批 → 生成新版本 v2.0
  │   ├── 场景 2: 缺失记录 → 补填四级记录表
  │   └── 场景 3: 文档缺失 → 创建新文档 → 提交审批
  ├── 提交复审:
  │   ├── 系统自动关联整改后的文档版本
  │   │   └── rectificationDocumentId = doc-001, rectificationVersion = "v2.0"
  │   ├── 不符合项状态: rectifying → pending_verification
  │   └── 待办状态: pending → pending_verification
  └── 等待内审员复审

Step 7: 内审员复审验证
  ├── 查看待复审的不符合项列表(5 个)
  ├── 逐个验证:
  │   ├── 点击不符合项 → 查看整改详情:
  │   │   ├── 原问题: 第 3.2 节清洁频次描述不清
  │   │   ├── 整改证据: GMP-SOP-001 v2.0
  │   │   └── 对比新旧版本(系统提供版本对比功能)
  │   ├── 验证结果:
  │   │   ├── 通过:
  │   │   │   ├── 不符合项状态: pending_verification → verified
  │   │   │   ├── 待办任务状态: pending_verification → completed
  │   │   │   └── 记录验证人和验证时间
  │   │   └── 驳回:
  │   │       ├── 填写驳回原因
  │   │       ├── 不符合项状态: pending_verification → rectifying
  │   │       ├── 待办任务重新分配给责任人
  │   │       └── 责任人重新整改
  │   └── 继续验证下一个...
  └── 所有不符合项验证通过 → 可完成内审计划

【内审报告归档】
Step 8: 完成内审计划
  ├── 所有不符合项状态 = verified
  ├── 点击"完成内审"按钮
  └── 状态: pending_rectification → completed

Step 9: 系统自动生成内审报告
  ├── 生成 PDF 报告内容:
  │   ├── 基本信息(标题、日期、内审员)
  │   ├── 审核范围(文档数量、级别分布)
  │   ├── 审核结果汇总(符合/不符合统计)
  │   ├── 不符合项清单(按部门、问题类型分组)
  │   └── 整改验证记录
  ├── 上传 PDF 到 MinIO
  └── 自动归档到文档系统(创建四级文件):
      ├── 文档编号: REC-AUDIT-{YYYY}-{序号}(自动生成)
      ├── 文档标题: {内审标题}-内审报告-{日期}
      ├── 文档类型: 内审记录(固定)
      ├── 文件级别: 4
      └── 文件 URL: MinIO 路径
```

---

### 16.3 数据模型

#### 16.3.1 内审管理核心表

```prisma
// ========== 内审管理模块 ==========

// 1. 内审计划
model AuditPlan {
  id          String   @id @default(cuid())
  title       String   // "2024-Q1 内审"
  type        String   // "quarterly" | "semiannual" | "annual"
  
  startDate   DateTime // 审核起始日期
  endDate     DateTime // 审核结束日期
  
  documentIds String[] // 计划审核的文档 ID 列表(批量勾选)
  
  status      String   @default("draft")
                       // draft: 草稿(可启动)
                       // ongoing: 审核中
                       // pending_rectification: 等待整改
                       // completed: 已完成
  
  auditorId   String   // 内审员
  createdBy   String   // 创建人
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  startedAt   DateTime? // 启动时间
  completedAt DateTime? // 完成时间
  
  auditor     User @relation("AuditedPlans", fields: [auditorId], references: [id])
  creator     User @relation("CreatedAuditPlans", fields: [createdBy], references: [id])
  
  findings    AuditFinding[]
  report      AuditReport?
  
  @@index([status, startDate])
  @@index([auditorId])
  @@index([createdBy])
}

// 2. 审核发现(内审记录)
model AuditFinding {
  id          String   @id @default(cuid())
  planId      String   // 所属内审计划
  
  documentId  String   // 关联的文档
  auditResult String   // "符合" | "不符合"
  
  // 以下字段仅在 auditResult = "不符合" 时填写
  issueType   String?  // "需要修改" | "缺失记录" | "文档缺失"
  description String?  // 问题描述(必填)
  
  department  String?  // 责任部门
  assigneeId  String?  // 责任人
  dueDate     DateTime? // 整改期限(审核日期 + 30 天)
  
  status      String   @default("pending")
                       // pending: 待整改(仅"不符合"项有此状态)
                       // rectifying: 整改中
                       // pending_verification: 待复审
                       // verified: 已验证通过
                       // rejected: 复审驳回
  
  // 整改证据(系统自动记录)
  rectificationDocumentId String?  // 整改后的文档 ID
  rectificationVersion    String?  // 整改后的文档版本号
  
  verifiedBy       String?  // 验证人(内审员)
  verifiedAt       DateTime?
  rejectionReason  String?  // 驳回原因
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  plan        AuditPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  document    Document @relation("AuditFindings", fields: [documentId], references: [id])
  assignee    User? @relation("AssignedAuditFindings", fields: [assigneeId], references: [id])
  verifier    User? @relation("VerifiedAuditFindings", fields: [verifiedBy], references: [id])
  
  @@index([planId, auditResult])
  @@index([assigneeId, status])
  @@index([status, dueDate])
}

// 3. 内审报告(归档)
model AuditReport {
  id          String   @id @default(cuid())
  planId      String   @unique
  
  summary     Json     // 汇总信息
                       // {
                       //   totalDocuments: 50,
                       //   conformCount: 45,
                       //   nonConformCount: 5,
                       //   byLevel: { "1": 1, "2": 10, "3": 20, "4": 19 },
                       //   byDepartment: { "生产部": 3, "质量部": 2 },
                       //   byIssueType: { "需要修改": 3, "缺失记录": 2 }
                       // }
  
  pdfUrl      String   // PDF 报告路径(MinIO)
  documentId  String   // 归档到文档系统的文档 ID
  
  createdAt   DateTime @default(now())
  
  plan        AuditPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  document    Document @relation("AuditReports", fields: [documentId], references: [id])
  
  @@index([documentId])
}
```

---

#### 16.3.2 User 表扩展

```prisma
model User {
  // ... 现有字段 ...

  // 内审相关
  createdAuditPlans     AuditPlan[] @relation("CreatedAuditPlans")
  auditedPlans          AuditPlan[] @relation("AuditedPlans")
  assignedAuditFindings AuditFinding[] @relation("AssignedAuditFindings")
  verifiedAuditFindings AuditFinding[] @relation("VerifiedAuditFindings")
}
```

---

#### 16.3.3 Document 表扩展

```prisma
model Document {
  // ... 现有字段 ...

  // 内审相关
  auditFindings   AuditFinding[] @relation("AuditFindings")
  auditReports    AuditReport[] @relation("AuditReports")
}
```

---

#### 16.3.4 TodoTask 类型扩展

```typescript
// packages/types/todo.ts
export type TodoType =
  | 'training_organize'
  | 'training_attend'
  | 'approval'
  | 'audit_rectification'  // 新增: 内审整改待办
  | 'equipment_maintain'
  | 'inventory'
  | 'change_request';
```


---

### 16.4 业务规则

#### 16.4.1 内审计划规则(BR-116 ~ BR-120)

**BR-116: 内审计划创建规则**
- 标题必填,长度 5-100 字符
- 类型必选: quarterly(季度) / semiannual(半年) / annual(年度)
- 审核时间范围必填,startDate < endDate
- 内审员必选,且必须为在职员工
- 至少勾选 1 个审核文档

**BR-117: 内审计划文档勾选规则**
- 只能勾选已发布的文档(status = 'published')
- 支持按文档级别筛选(1/2/3/4)
- 支持按部门筛选
- 支持批量勾选/取消勾选
- 勾选后的文档列表保存到 documentIds 数组

**BR-118: 内审计划复制规则**
- 可以复制任意状态的历史计划
- 复制内容:
  - 文档列表(documentIds)
  - 计划类型(type)
- 不复制内容:
  - 审核发现(findings)
  - 审核报告(report)
  - 审核时间(需要手动修改)
  - 内审员(需要手动选择)
- 复制后的计划状态为 draft

**BR-119: 内审计划启动规则**
- 只有 draft 状态的计划可以启动
- 启动后状态变为 ongoing
- 启动时不生成待办任务
- 启动后直接进入审核页面

**BR-120: 内审计划状态流转**
```
draft(草稿)
  ↓ 点击"启动内审"
ongoing(审核中)
  ↓ 点击"提交审核报告"
pending_rectification(等待整改)
  ↓ 所有不符合项验证通过
completed(已完成)
```

---

#### 16.4.2 审核执行规则(BR-121 ~ BR-125)

**BR-121: 审核文档记录规则**
- 所有文档都必须记录审核结果(包括"符合"的)
- 审核结果只有两种: "符合" / "不符合"
- 审核结果为"符合":
  - 只记录 auditResult = "符合"
  - issueType, description, assigneeId 等字段为 null
- 审核结果为"不符合":
  - 必须填写 issueType(问题类型)
  - 必须填写 description(问题描述,最少 10 字符)
  - 必须填写 department(责任部门)
  - 必须填写 assigneeId(责任人)
  - dueDate 自动计算(审核日期 + 30 天)

**BR-122: 问题类型枚举**
- "需要修改": 文档内容有错误或不完善,需要修改
- "缺失记录": 四级记录文件缺少应有的记录
- "文档缺失": 应该存在的文档不存在,需要创建

**BR-123: 审核进度计算**
- 审核进度 = 已审核文档数 / 计划审核文档数 × 100%
- 已审核文档 = 有 AuditFinding 记录的文档
- 所有文档审核完毕 = 审核进度 100%

**BR-124: 审核报告提交条件**
- 必须所有文档都已审核(审核进度 = 100%)
- 提交后生成整改待办任务(仅针对"不符合"项)
- 提交后内审计划状态变为 pending_rectification

**BR-125: 审核结果不可修改规则**
- 审核报告提交后,审核结果不可修改
- 如需修改,必须"撤回审核报告"(状态: pending_rectification → ongoing)
- 撤回后,已生成的整改待办任务自动删除

---

#### 16.4.3 整改跟踪规则(BR-126 ~ BR-130)

**BR-126: 整改待办任务生成规则**
- 提交审核报告时,自动生成整改待办任务
- 只为"不符合"项生成待办
- 待办任务内容:
  - type = 'audit_rectification'
  - relatedId = AuditFinding.id
  - userId = AuditFinding.assigneeId
  - title = "整改'{文档标题}'审核发现"
  - description = AuditFinding.description
  - dueDate = AuditFinding.dueDate
  - priority = 'high'

**BR-127: 整改提交规则**
- 责任人修改/补填文档后,点击"提交复审"
- 系统自动记录整改证据:
  - rectificationDocumentId = 整改后的文档 ID
  - rectificationVersion = 整改后的文档版本号
- 不需要责任人填写整改说明
- 提交后:
  - 不符合项状态: rectifying → pending_verification
  - 待办任务状态: pending → pending_verification

**BR-128: 整改复审验证规则**
- 只有内审员可以验证整改
- 验证选项:
  - 通过:
    - 不符合项状态: pending_verification → verified
    - 待办任务状态: pending_verification → completed
    - 记录 verifiedBy, verifiedAt
  - 驳回:
    - 不符合项状态: pending_verification → rectifying
    - 待办任务重新分配给责任人
    - 记录 rejectionReason(驳回原因,必填)
    - 责任人重新整改

**BR-129: 整改期限监控规则**
- 整改期限默认为审核日期 + 30 天
- 超过期限未整改:
  - 待办任务标记为"逾期"(dueDate < 当前日期)
  - 系统每天发送逾期提醒(邮件/站内信)
- 允许延期:
  - 责任人可申请延期(需内审员审批)
  - 延期后更新 dueDate

**BR-130: 内审计划完成条件**
- 所有不符合项状态 = verified
- 满足条件后,可点击"完成内审"
- 完成后:
  - 内审计划状态: pending_rectification → completed
  - 自动生成内审报告 PDF
  - 自动归档到文档系统

---

#### 16.4.4 内审报告规则(BR-131 ~ BR-135)

**BR-131: 内审报告生成时机**
- 内审计划状态变为 completed 时,自动生成
- 生成内容:
  - 基本信息(标题、日期、内审员)
  - 审核范围(文档数量、级别分布、部门分布)
  - 审核结果汇总(符合/不符合统计)
  - 不符合项清单(按部门、问题类型分组)
  - 整改验证记录(责任人、整改证据、验证结果)

**BR-132: 内审报告归档规则**
- 生成 PDF 后,自动归档到文档系统(创建四级文件)
- 文档编号: `REC-AUDIT-{YYYY}-{序号}`(自动生成)
  - 序号为该年度内审报告的顺序号(如 001, 002...)
- 文档标题: `{内审标题}-内审报告-{完成日期}`
  - 示例: "2024-Q1 内审-内审报告-2024-04-30"
- 文档类型: `audit_record`(固定)
- 文件级别: 4
- 归属部门: 质量部(固定)

**BR-133: 内审报告 PDF 格式**
```markdown
【内审报告】

一、基本信息
- 内审标题: 2024-Q1 内审
- 审核类型: 季度内审
- 审核时间: 2024-03-01 ~ 2024-03-31
- 内审员: 张三
- 完成日期: 2024-04-30

二、审核范围
- 审核文档总数: 50
- 一级文件: 1 份
- 二级文件: 10 份
- 三级文件: 20 份
- 四级文件: 19 份
- 涉及部门: 生产部、质量部、采购部

三、审核结果汇总
- 符合: 45 (90%)
- 不符合: 5 (10%)

四、不符合项清单
| 序号 | 文档编号 | 文档标题 | 问题类型 | 问题描述 | 责任部门 | 责任人 | 整改期限 | 验证结果 |
|------|----------|----------|----------|----------|----------|--------|----------|----------|
| 1 | GMP-SOP-001 | 车间清洁规程 | 需要修改 | 第 3.2 节清洁频次描述不清 | 生产部 | 李四 | 2024-04-15 | 已通过 |
| 2 | GMP-WI-001 | 清洁剂使用指南 | 缺失记录 | 2024-02 月缺少 15 天记录 | 生产部 | 王五 | 2024-04-15 | 已通过 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

五、整改验证记录
| 不符合项 | 整改证据 | 验证人 | 验证时间 | 验证结果 |
|----------|----------|--------|----------|----------|
| GMP-SOP-001 | v2.0 (2024-04-10) | 张三 | 2024-04-12 | 通过 |
| GMP-WI-001 | 补填记录 | 张三 | 2024-04-13 | 通过 |
| ... | ... | ... | ... | ... |

六、统计分析
- 不符合项按部门分布: 生产部 3, 质量部 2
- 不符合项按问题类型分布: 需要修改 3, 缺失记录 2
- 整改及时率: 100% (5/5)
- 平均整改时长: 8 天

生成时间: 2024-04-30 10:00:00
```

**BR-134: 内审报告唯一性**
- 每个内审计划只能生成一次报告
- 重复生成返回: `409 Conflict`

**BR-135: 内审报告版本管理**
- 内审报告归档后,作为四级文件管理
- 如需修改报告,需要创建新版本(Document.version)
- 历史版本可追溯


---

### 16.5 开发工作量估算

#### 16.5.1 后端开发(8-10 天)

| 模块 | 工作内容 | 工作量 |
|------|----------|--------|
| **内审计划管理** | AuditPlan CRUD、文档勾选、复制功能 | 2 天 |
| **审核执行** | AuditFinding CRUD、审核进度计算 | 2 天 |
| **整改跟踪** | 整改待办生成、复审验证逻辑 | 2 天 |
| **内审报告** | PDF 生成、自动归档 | 1.5 天 |
| **单元测试** | 核心逻辑测试 | 1.5 天 |

**小计: 9 天 → 预留缓冲 → 10 天**

---

#### 16.5.2 前端开发(9-11 天)

| 模块 | 工作内容 | 工作量 |
|------|----------|--------|
| **内审计划** | AuditPlanList.vue、AuditPlanDetail.vue、文档勾选组件 | 2.5 天 |
| **审核执行** | AuditExecution.vue(审核页面、进度显示) | 2.5 天 |
| **整改管理** | RectificationList.vue、验证页面 | 2 天 |
| **内审报告** | AuditReportList.vue | 1.5 天 |
| **状态管理** | Pinia store(内审模块) | 0.5 天 |
| **类型定义** | packages/types(内审相关类型) | 0.5 天 |
| **E2E 测试** | Playwright 测试(核心流程) | 1.5 天 |

**小计: 11 天 → 预留缓冲 → 12 天**

---

#### 16.5.3 总工作量

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| **后端开发** | 10 天 | 包含单元测试 |
| **前端开发** | 12 天 | 包含 E2E 测试 |
| **联调测试** | 2 天 | 前后端联调 |
| **文档编写** | 1 天 | API 文档、用户手册 |

**总计: 25 天(约 5 周)**

**并行开发**(1 名后端 + 1 名前端): **约 3 周**

---

### 16.6 依赖与风险

#### 16.6.1 技术依赖

| 依赖项 | 版本 | 用途 | 风险等级 |
|--------|------|------|----------|
| **TodoTask 系统** | 已完成(Chapter 15) | 整改待办任务 | 低 |
| **文档系统** | 已完成 | 文档勾选、档案归档 | 低 |
| **MinIO** | 已部署 | 内审报告 PDF 存储 | 低 |
| **PDF 生成库** | pdfmake | 生成内审报告 PDF | 中 |

**关键依赖**:
- ✅ TodoTask 系统(Chapter 15 已设计)
- ✅ 文档系统、MinIO 已就绪
- ⚠️ 需要确认 PDF 生成库(pdfmake vs puppeteer)

---

#### 16.6.2 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **审核结果记录遗漏** | 无法证明审核覆盖 | 中 | 强制所有文档必须记录,审核进度监控 |
| **整改证据关联失败** | 无法追溯整改过程 | 低 | 自动关联文档版本,异常时手动补充 |
| **内审报告 PDF 生成失败** | 报告无法归档 | 低 | 异步生成,失败重试,记录错误日志 |
| **整改逾期率高** | 内审计划无法完成 | 中 | 30 天期限、逾期提醒、支持延期申请 |

---

### 16.7 后续扩展方向(v1.1+)

#### v1.1.0: 内审增强
- ✅ 检查表模板管理(预置标准检查要点)
- ✅ 审核记录导出(Excel 格式)
- ✅ 内审统计分析(趋势图、部门对比)

#### v1.2.0: 条款管理(可选)
- ✅ BRCGS 条款库管理
- ✅ 审核时关联条款
- ✅ 条款覆盖率统计

#### v1.3.0: 移动端审核(可选)
- ✅ 移动端审核界面
- ✅ 现场拍照上传证据
- ✅ 离线审核、联网同步

#### v2.0.0: AI 增强
- ✅ AI 审核建议(基于历史审核记录)
- ✅ 智能不符合项分类
- ✅ 重复问题预警

---

### 16.8 成功标准

**内审计划管理**:
- ✅ 可创建季度/半年/年度内审计划
- ✅ 支持按级别/部门批量勾选审核文档
- ✅ 支持复制历史计划,重复利用

**审核执行**:
- ✅ 逐个审核文档,记录审核结果(符合/不符合)
- ✅ 不符合项必须填写问题详情
- ✅ 显示审核进度(已审核 X/总数)

**整改跟踪**:
- ✅ 提交审核报告后,自动生成整改待办任务
- ✅ 责任人提交整改,系统自动关联文档版本
- ✅ 内审员复审验证,支持通过/驳回

**内审报告**:
- ✅ 自动生成 PDF 报告
- ✅ 报告自动归档到文档系统(四级文件)
- ✅ 报告包含审核汇总、不符合项清单、整改记录

**系统集成**:
- ✅ 复用 TodoTask 统一待办系统
- ✅ 与文档系统无缝集成
- ✅ 支持文档版本追溯

---

**本章节完成 ✅**

---

## 十七、仓库管理系统（独立模块 - PRD-05/10/15 整合）⭐⭐⭐ Phase B 核心生产

[⬆️ 返回目录](#-完整目录) | [⬆️ 返回快速导航](#-快速导航)

> **建议上线顺序**: Chapter 18（在动态表单引擎、批次追溯、移动端架构完成后）
> **优先级**: 最高（核心生产流程，原料→生产→成品）
> **依赖**: Chapter 15（动态表单引擎）、Chapter 16（批次追溯系统）、Chapter 17（移动端应用）

> **设计时间**: 2026-02-12
> **系统版本**: v1.0.0 (MVP)
> **依赖章节**: Chapter 15 (TodoTask 统一待办), Chapter 14 (v2.0.0 工作流引擎)
> **关联 PRD**: PRD-05 仓库管理, PRD-10 全链条追溯, PRD-15 来料检验

---

### 17.1 系统定位与核心优势

#### 17.1.1 系统定位

**仓库管理系统作为独立业务模块**,是整个 BRCGS 食品安全管理体系的**基础设施**。

**核心职责**:
1. **物料管理**: 物料基础信息、批次管理、库存管理
2. **出入库管理**: 物料入库、领料出库、退料、报废
3. **批次追溯**: 原料批次 → 生产批次 → 成品批次的全链条追溯
4. **供应商管理**: 供应商信息、资质管理、绩效评估
5. **物料平衡校验**: 领料数量 vs 配方用量 vs 实际产量的平衡验证
6. **库存预警**: 物料临期预警、过期锁定

---

#### 17.1.2 核心优势

| 优势 | 说明 |
|------|------|
| **架构清晰** | 独立业务模块,不污染其他系统 |
| **分阶段实施** | MVP 手工录入,v2.0 对接金蝶 ERP |
| **统一待办** | 复用 TodoTask 系统(Chapter 15) |
| **全链追溯** | 支持正向/反向追溯,满足 BRCGS 4 小时召回要求 |
| **数据闭环** | 仓库 ↔ 暂存间 ↔ 生产的完整数据流 |
| **灵活扩展** | 预留条形码字段,v2.0 可引入扫码功能 |

---

### 17.2 业务流程

#### 17.2.1 核心流程图

```
┌─────────────────────────────────────────────────────────────┐
│                      仓库管理核心流程                          │
└─────────────────────────────────────────────────────────────┘

1. 物料入库流程
   供应商送货 → 来料检验(IQC) → 检验合格 → 入库单 → 库存+

2. 领料出库流程
   创建领料单 → 选择批次(FIFO) → 审批 → 出库单 → 仓库库存- / 暂存间库存+

3. 暂存间盘点流程
   上班盘点(期初) → 记录物料批次数量 → 下班盘点(期末) → 计算实际消耗

4. 生产消耗流程
   生产开始 → 从暂存间领料 → 生产记录(四级文件) → 产品入库

5. 物料平衡校验流程
   产品入库 → 校验: 期初 + 领料 - 期末 ≈ 配方用量 × 产量 → 偏差预警

6. 退料流程
   发现质量问题 → 创建退料单 → 审批 → 入库单 → 仓库库存+

7. 报废流程
   物料过期/损坏 → 创建报废单 → 审批 → 库存- → 报废记录归档

8. 批次追溯流程
   反向追溯: 成品批次 → 生产批次 → 原料批次 → 供应商批次
   正向追溯: 供应商批次 → 原料批次 → 生产批次 → 成品批次
```

---

#### 17.2.2 关键业务场景

**场景 1: 原料入库**
```
1. 供应商送货(高筋面粉 500kg, 批次: SUP-001-20240101)
2. 质量部 IQC 检验(抽检 5 袋)
3. 检验合格 → 系统自动创建入库单
4. 仓库管理员确认入库
5. 系统记录:
   - MaterialBatch 表: 批次号、供应商批次、生产日期、保质期
   - StockRecord 表: 入库记录
   - Material 表: 库存数量 + 500kg
```

**场景 2: 生产领料**
```
1. 生产部创建领料单(需要高筋面粉 100kg)
2. 系统推荐批次(FIFO): 批次 A(最旧批次, 库存 150kg)
3. 审批人审批通过
4. 仓库管理员出库 → 暂存间(小料房)
5. 系统记录:
   - MaterialRequisition 表: 领料单
   - MaterialRequisitionItem 表: 领料明细(批次 A, 100kg)
   - StockRecord 表: 出库记录
   - Material 表: 库存 - 100kg
```

**场景 3: 物料平衡校验**
```
1. 生产批次 PROD-20240615-001 完成, 产出 500kg 曲奇饼干
2. 仓库录入产品入库单
3. 系统自动校验物料平衡:
   - 暂存间期初库存: 面粉 120kg
   - 当日领料: 100kg
   - 暂存间期末库存: 面粉 20kg
   - 实际消耗: 120 + 100 - 20 = 200kg
   - 理论消耗: 配方用量 0.4kg × 产量 500kg = 200kg
   - 偏差: 0% (符合预期)
4. 校验通过 → 产品入库
```

**场景 4: 批次追溯(反向)**
```
1. 客户投诉: 曲奇饼干批次 FG-P001-20240615-001 有异物
2. 质量部输入成品批次号查询
3. 系统自动追溯:
   - 成品批次 FG-P001-20240615-001
     → 生产批次 PROD-20240615-001
     → 领料单 REQ-20240615-001
     → 原料批次 B20240101 (高筋面粉)
     → 供应商批次 SUP-001-20240101
     → 供应商: XX面粉厂
4. 生成追溯报告(PDF), 耗时 < 4 小时(满足 BRCGS 要求)
```

---

### 17.3 数据模型设计

#### 17.3.1 核心数据表(13 个)

```prisma
// ==================== 物料管理 ====================

// 1. 物料基础信息表
model Material {
  id              String   @id @default(cuid())
  code            String   @unique  // 物料编码(来自金蝶)
  name            String              // 物料名称
  category        String?             // 分类(原料/辅料/包材)
  specification   String?             // 规格型号
  unit            String              // 单位(kg/个/箱)
  stockQuantity   Float    @default(0) // 当前库存数量
  safetyStock     Float?              // 安全库存(v2.0 扩展)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 关联
  batches         MaterialBatch[]     // 批次
  requisitions    MaterialRequisitionItem[] // 领料明细
  recipes         RecipeItem[]        // 配方明细

  @@map("materials")
}

// 2. 物料批次表
model MaterialBatch {
  id                  String   @id @default(cuid())
  materialId          String              // 物料 ID
  batchNumber         String   @unique    // 批次号(系统生成)
  supplierBatchNumber String?             // 供应商批次号
  supplierId          String?             // 供应商 ID
  productionDate      DateTime?           // 生产日期
  expiryDate          DateTime?           // 到期日期
  shelfLife           Int?                // 保质期(天)
  stockQuantity       Float    @default(0) // 批次库存数量
  barcode             String?             // 条形码(v2.0 扩展)
  status              String   @default("normal") // normal | expired | locked
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // 关联
  material            Material @relation(fields: [materialId], references: [id])
  stockRecords        StockRecord[]       // 出入库记录
  requisitionItems    MaterialRequisitionItem[] // 领料明细
  traceability        BatchTraceability[] @relation("MaterialBatch") // 追溯关系

  @@map("material_batches")
}

// 3. 库存记录表(出入库流水)
model StockRecord {
  id              String   @id @default(cuid())
  materialId      String              // 物料 ID
  batchId         String              // 批次 ID
  type            String              // in | out
  quantity        Float               // 数量(正数)
  relatedType     String?             // requisition | return | scrap | adjustment | stockin
  relatedId       String?             // 关联单据 ID
  operator        String              // 操作人
  remark          String?             // 备注
  createdAt       DateTime @default(now())

  // 关联
  batch           MaterialBatch @relation(fields: [batchId], references: [id])

  @@map("stock_records")
}

// ==================== 领料管理 ====================

// 4. 领料单表
model MaterialRequisition {
  id              String   @id @default(cuid())
  requisitionNumber String @unique     // 领料单号
  department      String              // 申请部门
  applicant       String              // 申请人 ID
  applicantName   String              // 申请人姓名
  purpose         String?             // 用途(生产/工程/质量)
  productionBatchId String?           // 关联生产批次(可选)
  status          String   @default("draft") // draft | pending | approved | rejected | completed
  workflowId      String?             // 工作流实例 ID(审批)
  approver        String?             // 审批人 ID
  approverName    String?             // 审批人姓名
  approvedAt      DateTime?           // 审批时间
  rejectReason    String?             // 驳回原因
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 关联
  items           MaterialRequisitionItem[] // 领料明细

  @@map("material_requisitions")
}

// 5. 领料明细表
model MaterialRequisitionItem {
  id              String   @id @default(cuid())
  requisitionId   String              // 领料单 ID
  materialId      String              // 物料 ID
  batchId         String              // 批次 ID
  requestedQuantity Float             // 申请数量
  approvedQuantity Float?             // 批准数量
  actualQuantity  Float?              // 实际出库数量
  createdAt       DateTime @default(now())

  // 关联
  requisition     MaterialRequisition @relation(fields: [requisitionId], references: [id], onDelete: Cascade)
  material        Material @relation(fields: [materialId], references: [id])
  batch           MaterialBatch @relation(fields: [batchId], references: [id])

  @@map("material_requisition_items")
}

// ==================== 配方管理 ====================

// 6. 配方表
model Recipe {
  id              String   @id @default(cuid())
  code            String   @unique     // 配方编号
  name            String              // 配方名称
  productId       String              // 成品 ID
  version         String   @default("1.0") // 版本号
  status          String   @default("draft") // draft | pending | approved | archived
  workflowId      String?             // 工作流实例 ID
  expectedYield   Float?              // 预期产量(kg)
  createdBy       String              // 创建人 ID
  createdByName   String              // 创建人姓名
  approver        String?             // 审批人 ID
  approverName    String?             // 审批人姓名
  approvedAt      DateTime?           // 审批时间
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 关联
  items           RecipeItem[]        // 配方明细

  @@map("recipes")
}

// 7. 配方明细表
model RecipeItem {
  id              String   @id @default(cuid())
  recipeId        String              // 配方 ID
  materialId      String              // 物料 ID
  quantity        Float               // 用量
  unit            String              // 单位
  percentage      Float?              // 百分比(可选)
  remark          String?             // 备注
  createdAt       DateTime @default(now())

  // 关联
  recipe          Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  material        Material @relation(fields: [materialId], references: [id])

  @@map("recipe_items")
}

// ==================== 批次追溯 ====================

// 8. 批次追溯关系表
model BatchTraceability {
  id                  String   @id @default(cuid())
  productionBatchId   String              // 生产批次 ID
  materialBatchId     String              // 原料批次 ID
  quantity            Float               // 使用数量
  requisitionId       String?             // 领料单 ID
  createdAt           DateTime @default(now())

  // 关联
  productionBatch     ProductionBatch @relation(fields: [productionBatchId], references: [id])
  materialBatch       MaterialBatch @relation("MaterialBatch", fields: [materialBatchId], references: [id])

  @@map("batch_traceability")
}

// 9. 生产批次表(简化版)
model ProductionBatch {
  id              String   @id @default(cuid())
  batchNumber     String   @unique     // 生产批次号
  recipeId        String?             // 配方 ID(可选)
  productId       String              // 成品 ID
  productName     String              // 成品名称
  plannedQuantity Float?              // 计划产量
  actualQuantity  Float?              // 实际产量
  productionDate  DateTime @default(now()) // 生产日期
  status          String   @default("in_progress") // in_progress | completed
  barcode         String?             // 条形码(v2.0 扩展)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 关联
  traceability    BatchTraceability[] // 追溯关系

  @@map("production_batches")
}

// ==================== 供应商管理 ====================

// 10. 供应商表
model Supplier {
  id              String   @id @default(cuid())
  code            String   @unique     // 供应商编号
  name            String              // 供应商名称
  type            String              // manufacturer | trader
  contactPerson   String?             // 联系人
  contactPhone    String?             // 联系电话
  address         String?             // 地址
  status          String   @default("active") // active | inactive
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 关联
  qualifications  SupplierQualification[] // 资质
  materials       MaterialBatch[]     // 物料批次

  @@map("suppliers")
}

// 11. 供应商资质表
model SupplierQualification {
  id              String   @id @default(cuid())
  supplierId      String              // 供应商 ID
  type            String              // business_license | production_license | sales_license
  number          String?             // 证书编号
  expiryDate      DateTime?           // 到期日期
  fileUrl         String?             // 文件 URL(MinIO)
  status          String   @default("valid") // valid | expiring | expired
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 关联
  supplier        Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  @@map("supplier_qualifications")
}

// ==================== 暂存间盘点 ====================

// 12. 暂存间盘点表
model StagingInventory {
  id              String   @id @default(cuid())
  location        String              // 暂存间位置(小料房/面粉房/称油间)
  inventoryDate   DateTime            // 盘点日期
  inventoryType   String              // opening | closing
  materialId      String              // 物料 ID
  batchId         String              // 批次 ID
  quantity        Float               // 数量
  operator        String              // 操作人
  remark          String?             // 备注
  createdAt       DateTime @default(now())

  @@map("staging_inventories")
}

// ==================== 物料平衡记录 ====================

// 13. 物料平衡记录表
model MaterialBalance {
  id                  String   @id @default(cuid())
  productionBatchId   String              // 生产批次 ID
  materialId          String              // 物料 ID
  openingStock        Float               // 期初库存
  requisitionQuantity Float               // 领料数量
  closingStock        Float               // 期末库存
  actualConsumption   Float               // 实际消耗 = 期初 + 领料 - 期末
  theoreticalConsumption Float            // 理论消耗 = 配方用量 × 产量
  deviation           Float               // 偏差(%)
  deviationReason     String?             // 偏差原因(超标时必填)
  status              String   @default("normal") // normal | warning | error
  createdAt           DateTime @default(now())

  @@map("material_balances")
}
```

---

#### 17.3.2 数据表关系图

```
Material (物料)
  ├─ MaterialBatch (批次) 1:N
  │    ├─ StockRecord (出入库记录) 1:N
  │    ├─ MaterialRequisitionItem (领料明细) 1:N
  │    └─ BatchTraceability (追溯关系) 1:N
  │
  ├─ RecipeItem (配方明细) 1:N
  └─ MaterialRequisitionItem (领料明细) 1:N

Recipe (配方)
  └─ RecipeItem (配方明细) 1:N

MaterialRequisition (领料单)
  └─ MaterialRequisitionItem (领料明细) 1:N

ProductionBatch (生产批次)
  └─ BatchTraceability (追溯关系) 1:N

Supplier (供应商)
  ├─ SupplierQualification (资质) 1:N
  └─ MaterialBatch (物料批次) 1:N

核心追溯链条:
Supplier → MaterialBatch → BatchTraceability → ProductionBatch → 成品批次
```

---

### 17.4 业务规则(BR-136 ~ BR-180, 共 45 条)

#### 17.4.1 物料管理规则(BR-136 ~ BR-145)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-136 | **物料编码唯一**: 每个物料的 code 必须唯一(来自金蝶) | `Material.code @unique` |
| BR-137 | **物料录入方式**: MVP 阶段支持手工录入 + Excel 批量导入 | API: `POST /api/materials/import` |
| BR-138 | **Excel 导入字段**: 物料编码、名称、规格、单位、批次号、供应商批次、生产日期、保质期(天) | 导入模板固定格式 |
| BR-139 | **批次号生成**: 优先使用供应商批次号,无则自动生成 `B{YYYYMMDD}-{序号}` | 后端自动生成 |
| BR-140 | **同一物料多批次**: 同一物料可以有多个批次同时存在库存中 | `MaterialBatch.materialId` 非唯一 |
| BR-141 | **批次状态**: `normal`(正常) / `expired`(过期) / `locked`(锁定,不可用) | `MaterialBatch.status` 枚举 |
| BR-142 | **过期自动锁定**: 系统每天自动检查批次到期日期,过期则锁定 | 定时任务(Cron Job) |
| BR-143 | **临期预警**: 距离过期 < 30 天时,生成待办任务通知仓库管理员 | TodoTask + 定时任务 |
| BR-144 | **过期物料处理**: 过期物料必须报废,生成报废单 | 报废流程 |
| BR-145 | **条形码预留**: 数据库预留 `barcode` 字段,v2.0 启用扫码功能 | `MaterialBatch.barcode?` 可选字段 |

---

#### 17.4.2 批次推荐规则(BR-146 ~ BR-150)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-146 | **FIFO 强制模式（可配置）**: 系统强制 FIFO，领料时优先推荐最旧批次（入库时间最早）| SystemConfig.fifoEnforced (true/false) |
| BR-146a | **手动批次选择开关**: 保留手动选择批次开关，用于应对特殊情况（用户业务规则 BR-1.41）| SystemConfig.allowManualBatchSelection |
| BR-146b | **多批次混用**: 最早批次库存不足时，允许从多个批次领料（用户业务规则 BR-1.42）| 领料单可选择多个批次 |
| BR-147 | **临期不优先（简化）**: 不要把系统搞太复杂，按入库时间 FIFO 即可（用户业务规则 BR-1.43）| 移除临期优先逻辑 |
| BR-148 | **过期批次过滤**: 过期物料(status = expired)不显示在领料选择列表中 | 查询时过滤 `WHERE status != 'expired'` |
| BR-149 | **库存充足校验**: 领料数量 > 批次库存时,提示"库存不足",允许选择其他批次 | 前端校验 + 后端校验 |
| BR-150 | **批次自动推荐**: 系统推荐 FIFO 批次，但允许手动修改（根据 allowManualBatchSelection 配置）| 前端批次选择器根据配置启用/禁用 |

---

#### 17.4.3 领料流程规则(BR-151 ~ BR-160)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-151 | **领料单状态**: `draft`(草稿) → `pending`(待审批) → `approved`(已批准) → `completed`(已出库) / `rejected`(已驳回) | `MaterialRequisition.status` 状态机 |
| BR-152 | **领料不关联配方**: 领料单不需要关联配方,不需要指定生产批次 | `MaterialRequisition.productionBatchId?` 可选 |
| BR-153 | **领料审批**: 所有领料单必须经过审批(复用 v2.0.0 工作流引擎) | `MaterialRequisition.workflowId` |
| BR-154 | **审批待办**: 领料单提交后,自动生成待办任务给审批人 | TodoTask 集成 |
| BR-155 | **领料出库**: 审批通过后,仓库管理员确认出库,生成 StockRecord(type=out) | 出库操作 |
| BR-156 | **库存扣减**: 出库时扣减批次库存 `MaterialBatch.stockQuantity -= actualQuantity` | 事务操作 |
| BR-157 | **领料部门**: 支持生产部、工程部、质量部领料 | `MaterialRequisition.department` |
| BR-158 | **补料单**: 补料单就是领料单,不单独设计 | 复用 MaterialRequisition |
| BR-159 | **领料单号生成**: `REQ-{YYYYMMDD}-{序号}` | 后端自动生成 |
| BR-160 | **领料历史**: 支持查询历史领料单,按日期/部门/物料筛选 | 查询 API |

---

#### 17.4.4 退料流程规则(BR-161 ~ BR-165)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-161 | **退料场景**: 领料后发现质量问题,退回仓库 | 退料单(复用 MaterialRequisition, 标记 type=return) |
| BR-162 | **退料审批**: 退料单需要审批 | 工作流集成 |
| BR-163 | **退料入库**: 审批通过后,自动生成入库单,恢复批次库存 | StockRecord(type=in) + 库存恢复 |
| BR-164 | **退料数量**: 退料数量 ≤ 原领料数量 | 前端校验 + 后端校验 |
| BR-165 | **数据闭环**: 出库数量 = 实际消耗 + 退料数量 | 物料平衡计算时考虑退料 |

---

#### 17.4.5 报废流程规则(BR-166 ~ BR-170)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-166 | **报废场景**: 物料过期、损坏、质量问题 | 报废单 |
| BR-167 | **报废审批**: 报废单需要审批 | 工作流集成 |
| BR-168 | **报废出库**: 审批通过后,扣减库存,生成 StockRecord(type=out, relatedType=scrap) | 出库操作 |
| BR-169 | **报废记录归档**: 报废单作为四级文件归档到文档系统 | 文档系统集成 |
| BR-170 | **报废单号生成**: `SCRAP-{YYYYMMDD}-{序号}` | 后端自动生成 |

---

#### 17.4.6 盘点流程规则(BR-171 ~ BR-175)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-171 | **盘点类型**: 仓库盘点 + 暂存间盘点(上班/下班各一次) | `StagingInventory.inventoryType` = opening / closing |
| BR-172 | **盘点审批**: 盘盈盘亏需要审批 | 工作流集成 |
| BR-173 | **库存调整**: 审批通过后,按实际盘点数量更新库存 | `MaterialBatch.stockQuantity = 实际盘点数量` |
| BR-174 | **盘点单录入**: 在系统内直接录入,不支持 Excel 导入 | 前端表单 |
| BR-175 | **盘点单号生成**: `INV-{YYYYMMDD}-{序号}` | 后端自动生成 |

---

#### 17.4.7 物料平衡规则(BR-176 ~ BR-180)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-176 | **校验时机**: 产品入库时触发物料平衡校验 | 入库 API 触发 |
| BR-177 | **校验公式**: `期初 + 领料 - 期末 ≈ 配方用量 × 产量` | 后端计算 |
| BR-178 | **允许偏差**: 由用户在系统设置中自定义(例如: ±5%) | 系统配置表 |
| BR-179 | **偏差超标**: 超标时警告(不阻止保存),但需要填写偏差原因 | `MaterialBalance.deviationReason` 必填 |
| BR-180 | **补料影响**: 补料会影响物料平衡计算,领料数量 += 补料数量 | 计算时汇总所有领料单 |

---

#### 17.4.8 供应商资质管理规则（BR-181 ~ BR-185）⭐ P0-6 修复

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| **BR-181 (P0-6)** | **资质状态**: valid(有效) / expiring(临期，< 30天) / expired(已过期) | `SupplierQualification.status` |
| **BR-182 (P0-6)** | **自动过期检查**: 定时任务每天检查资质到期日期，自动更新状态 | 定时任务 + 状态更新 |
| **BR-183 (P0-6)** | **临期预警**: 距离过期 < 30 天时，标记为 expiring，生成待办任务通知采购部 | TodoTask + 定时任务 |
| **BR-184 (P0-6)** | **过期自动停用**: 资质过期后，供应商状态自动变为 inactive，禁止继续采购 | 定时任务 + Supplier.status 更新 |
| **BR-185 (P0-6)** | **过期供应商限制**: status = inactive 的供应商不能创建新的入库单 | 前端限制 + 后端校验 |

---

### 17.5 API 设计(32 个端点)

#### 17.5.1 物料管理 API(8 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/materials` | 查询物料列表 | `?page=1&limit=20&keyword=` | `{ items: Material[], total: number }` |
| GET | `/api/materials/:id` | 查询物料详情 | - | `Material` |
| POST | `/api/materials` | 创建物料(手工录入) | `{ code, name, category, ... }` | `Material` |
| PUT | `/api/materials/:id` | 更新物料 | `{ name, specification, ... }` | `Material` |
| DELETE | `/api/materials/:id` | 删除物料 | - | `{ success: true }` |
| POST | `/api/materials/import` | Excel 批量导入 | `FormData(file)` | `{ success: true, count: 10 }` |
| GET | `/api/materials/:id/batches` | 查询物料的所有批次 | - | `MaterialBatch[]` |
| GET | `/api/materials/:id/stock-history` | 查询物料库存历史 | `?startDate=&endDate=` | `StockRecord[]` |

---

#### 17.5.2 批次管理 API(6 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/batches` | 查询批次列表 | `?materialId=&status=` | `MaterialBatch[]` |
| GET | `/api/batches/:id` | 查询批次详情 | - | `MaterialBatch` |
| POST | `/api/batches` | 创建批次(入库) | `{ materialId, supplierBatchNumber, ... }` | `MaterialBatch` |
| PUT | `/api/batches/:id` | 更新批次 | `{ expiryDate, ... }` | `MaterialBatch` |
| POST | `/api/batches/:id/lock` | 锁定批次 | - | `{ success: true }` |
| GET | `/api/batches/expiring` | 查询临期批次 | `?days=30` | `MaterialBatch[]` |

---

#### 17.5.3 领料管理 API(7 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/requisitions` | 查询领料单列表 | `?status=&department=` | `MaterialRequisition[]` |
| GET | `/api/requisitions/:id` | 查询领料单详情 | - | `MaterialRequisition + items[]` |
| POST | `/api/requisitions` | 创建领料单 | `{ department, items: [{ materialId, batchId, quantity }] }` | `MaterialRequisition` |
| PUT | `/api/requisitions/:id` | 更新领料单(草稿状态) | `{ items: [...] }` | `MaterialRequisition` |
| POST | `/api/requisitions/:id/submit` | 提交审批 | - | `{ success: true, workflowId }` |
| POST | `/api/requisitions/:id/approve` | 审批通过 | `{ approver, approverName }` | `{ success: true }` |
| POST | `/api/requisitions/:id/reject` | 审批驳回 | `{ rejectReason }` | `{ success: true }` |

---

#### 17.5.4 配方管理 API(6 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/recipes` | 查询配方列表 | `?productId=&status=` | `Recipe[]` |
| GET | `/api/recipes/:id` | 查询配方详情 | - | `Recipe + items[]` |
| POST | `/api/recipes` | 创建配方 | `{ code, name, productId, items: [{ materialId, quantity }] }` | `Recipe` |
| PUT | `/api/recipes/:id` | 更新配方 | `{ items: [...] }` | `Recipe` |
| POST | `/api/recipes/:id/submit` | 提交审批 | - | `{ success: true, workflowId }` |
| POST | `/api/recipes/:id/copy` | 复制配方(新版本) | - | `Recipe` |

---

#### 17.5.5 批次追溯 API(3 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/traceability/forward` | 正向追溯(原料 → 成品) | `?materialBatchId=` | `{ chain: [...] }` |
| GET | `/api/traceability/backward` | 反向追溯(成品 → 原料) | `?productionBatchId=` | `{ chain: [...] }` |
| POST | `/api/traceability/report` | 生成追溯报告(PDF) | `{ type, batchId }` | `{ reportUrl }` |

---

#### 17.5.6 供应商管理 API(2 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/suppliers` | 查询供应商列表 | `?type=&status=` | `Supplier[]` |
| POST | `/api/suppliers/:id/qualifications` | 上传供应商资质 | `{ type, number, expiryDate, file }` | `SupplierQualification` |

---

### 17.6 前端设计(8 个页面)

#### 17.6.1 页面列表

| 页面路径 | 页面名称 | 功能 |
|---------|---------|------|
| `/warehouse/materials` | 物料管理 | 物料列表、新增、编辑、导入 |
| `/warehouse/batches` | 批次管理 | 批次列表、查看、锁定、临期预警 |
| `/warehouse/requisitions` | 领料管理 | 领料单列表、创建、审批、出库 |
| `/warehouse/recipes` | 配方管理 | 配方列表、创建、审批、版本管理 |
| `/traceability` | 批次追溯（主权威入口） | 正向/反向追溯、生成报告 |
| `/warehouse/traceability` | 批次追溯（桥接页，已弃用） | 重定向至 `/traceability` |
| `/warehouse/suppliers` | 供应商管理 | 供应商列表、资质管理、绩效评估 |
| `/warehouse/inventory` | 库存盘点 | 暂存间盘点、盘盈盘亏 |
| `/warehouse/balance` | 物料平衡 | 物料平衡记录、偏差分析 |

---

#### 17.6.2 批次追溯页面详细设计（TraceabilityQuery）

> **说明**：追溯系统已于 2026-04-25 完成收敛。`/traceability` → `TraceabilityQuery.vue` 为唯一权威入口。`TraceQuery.vue`（`/warehouse/traceability`）和 `TraceReport.vue`（`/batch-trace/report`）已改为桥接页，仅执行重定向，不再承载业务逻辑。以下设计规格适用于 `TraceabilityQuery.vue`。

> **类型权威**：`packages/types/traceability.ts`，字段规范：`result.risk.items`、`canInitiateLinkage`、`result.ledger.rows`、`node.nodeId/nodeType`、`edge.edgeId/sourceNodeId/targetNodeId/relationType`。

##### TraceabilityQuery.vue（路由：`/traceability`）（原 TraceQuery.vue，路由 `/warehouse/traceability` 已改为桥接重定向）

**页面布局**：
```
┌──────────────────────────────────────────────────────────────┐
│ 批次追溯查询                                                   │
├──────────────────────────────────────────────────────────────┤
│ 批次号：[______________________]  方向：[正向▼]  [查询]        │
│         （支持扫码枪输入）          正向/反向切换               │
├──────────────────────────────────────────────────────────────┤
│ 追溯结果（ECharts 树图）                                       │
│                                                              │
│         [原料批次 MAT-2024-001]                               │
│               ↓                                              │
│         [生产批次 PRD-2024-042]                               │
│               ↓                                              │
│    ┌──────────┬──────────┐                                   │
│    [成品批次A]  [成品批次B]                                    │
│         ↓                                                    │
│    [出库记录 → 客户 XXX]                                      │
│                                                              │
│  每个节点显示：批次号 | 日期 | 数量 | 状态                     │
│  点击节点：跳转对应详情页                                       │
├──────────────────────────────────────────────────────────────┤
│                           [导出追溯报告 PDF]                  │
└──────────────────────────────────────────────────────────────┘
```

**交互规则**：
- 追溯方向：正向（原料→成品→客户）/ 反向（成品→生产→原料）
- 输入空批次号点击查询：弹出 `ElMessage.warning('请输入批次号')`
- 无追溯记录：显示空状态提示「未找到相关批次追溯链路」
- 节点颜色区分：原料批次（蓝色）/ 生产批次（橙色）/ 成品批次（绿色）/ 异常状态（红色）
- 导出 PDF：调用 `GET /api/v1/trace-export/:batchNumber/pdf`，下载文件

**API 调用**：
- `GET /api/v1/trace/forward/:batchNumber`：正向追溯
- `GET /api/v1/trace/backward/:batchNumber`：反向追溯
- `GET /api/v1/trace-export/:batchNumber/pdf`：导出 PDF

---

##### TraceReport.vue（路由：`/batch-trace/report`，已改为桥接页，重定向至 `/traceability`）

**页面布局**：
```
┌──────────────────────────────────────────────────────────────┐
│ 追溯报告                            [打印]  [导出 PDF]         │
├──────────────────────────────────────────────────────────────┤
│ 追溯摘要                                                      │
│   批次号：MAT-2024-001    追溯方向：正向                        │
│   操作人：张三             生成时间：2026-02-25 10:30           │
├──────────────────────────────────────────────────────────────┤
│ 完整追溯链路                                                   │
│ ┌────────────┬────────────┬────────┬────────┬────────────┐   │
│ │ 批次号     │ 类型       │ 日期   │ 数量   │ 状态       │   │
│ ├────────────┼────────────┼────────┼────────┼────────────┤   │
│ │ MAT-001    │ 原料批次   │ 01-15  │ 500kg  │ 已用完     │   │
│ │ PRD-042    │ 生产批次   │ 01-20  │ 480kg  │ 已完成     │   │
│ │ FG-201     │ 成品批次   │ 01-22  │ 460kg  │ 已出库     │   │
│ └────────────┴────────────┴────────┴────────┴────────────┘   │
├──────────────────────────────────────────────────────────────┤
│ 签名区（BRCGS 合规）：_______________________ 日期：________   │
└──────────────────────────────────────────────────────────────┘
```

**API 调用**：
- 同 TraceQuery 数据，通过路由参数传递批次号，不重复请求
- PDF 导出：`GET /api/v1/trace-export/:batchNumber/pdf`

---

### 17.7 开发工作量估算

#### 17.7.1 后端开发(20 天)

| 模块 | 工作量 | 说明 |
|------|--------|------|
| **物料管理** | 3 天 | Material + MaterialBatch CRUD + Excel 导入 |
| **批次管理** | 2 天 | 批次查询、锁定、临期预警(定时任务) |
| **领料管理** | 4 天 | 领料单 CRUD + 审批集成 + 出库逻辑 |
| **配方管理** | 3 天 | 配方 CRUD + 审批集成 + 版本管理 |
| **批次追溯** | 3 天 | 正向/反向追溯 + PDF 报告生成 |
| **供应商管理** | 2 天 | 供应商 CRUD + 资质管理 |
| **物料平衡** | 2 天 | 物料平衡计算 + 偏差校验 |
| **单元测试** | 1 天 | 核心业务逻辑测试 |

**后端合计: 20 天**

---

#### 17.7.2 前端开发(22 天)

| 模块 | 工作量 | 说明 |
|------|--------|------|
| **物料管理页面** | 3 天 | 列表、表单、Excel 导入组件 |
| **批次管理页面** | 2 天 | 列表、详情、临期预警列表 |
| **领料管理页面** | 4 天 | 列表、创建表单、批次推荐、审批流程 |
| **配方管理页面** | 3 天 | 列表、表单、配方明细编辑器 |
| **批次追溯页面** | 3 天 | 追溯查询、关系图可视化、PDF 预览 |
| **供应商管理页面** | 2 天 | 列表、表单、资质上传 |
| **库存盘点页面** | 2 天 | 盘点表单、盘盈盘亏处理 |
| **物料平衡页面** | 2 天 | 物料平衡记录列表、偏差分析 |
| **E2E 测试** | 1 天 | 关键流程测试(领料、追溯) |

**前端合计: 22 天**

---

#### 17.7.3 总工作量

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| **后端开发** | 20 天 | 包含单元测试 |
| **前端开发** | 22 天 | 包含 E2E 测试 |
| **联调测试** | 2 天 | 前后端联调 |
| **文档编写** | 1 天 | API 文档、用户手册 |

**总计: 45 天(约 9 周)**

**并行开发**(1 名后端 + 1 名前端): **约 5 周**

---

### 17.8 依赖与风险

#### 17.8.1 技术依赖

| 依赖项 | 版本 | 用途 | 风险等级 |
|--------|------|------|----------|
| **TodoTask 系统** | 已完成(Chapter 15) | 领料审批待办 | 低 |
| **v2.0.0 工作流引擎** | 已完成(Chapter 14) | 领料/配方审批流程 | 低 |
| **文档系统** | 已完成 | 报废单归档 | 低 |
| **MinIO** | 已部署 | 追溯报告 PDF 存储 | 低 |
| **PDF 生成库** | pdfmake | 生成追溯报告 PDF | 中 |
| **Excel 解析库** | xlsx | 解析导入的 Excel 文件 | 低 |

**关键依赖**:
- ✅ TodoTask、v2.0.0 工作流、文档系统、MinIO 已就绪
- ⚠️ 需要确认 PDF 生成库(pdfmake vs puppeteer)

---

#### 17.8.2 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **金蝶集成延期** | MVP 无法对接 ERP | 高 | 先手工录入 + Excel 导入,v2.0 再对接 |
| **批次推荐算法错误** | 违反 FIFO,影响追溯 | 中 | 强制 FIFO,系统自动推荐,用户不能手动选择 |
| **物料平衡偏差过大** | 无法找到偏差原因 | 中 | 强制填写偏差原因,支持重新盘点 |
| **追溯查询慢** | 无法满足 4 小时召回要求 | 低 | 优化查询 SQL,建立追溯关系索引 |
| **暂存间盘点遗漏** | 物料平衡数据不准 | 高 | 强制每天盘点(上班/下班),系统提醒 |

---

### 17.9 后续扩展方向(v2.0+)

#### v2.0.0: 金蝶 ERP 集成
- ✅ 实时 API 对接金蝶
- ✅ 物料基础信息自动同步
- ✅ 库存数量实时更新
- ✅ 批次信息自动导入

#### v2.1.0: 条形码扫码
- ✅ 物料批次条形码打印
- ✅ 领料扫码录入
- ✅ 盘点扫码录入
- ✅ 追溯扫码查询

#### v2.2.0: 移动端
- ✅ 移动端领料审批
- ✅ 移动端盘点录入
- ✅ 移动端追溯查询

#### v2.3.0: 智能预警
- ✅ 库存不足预警(安全库存)
- ✅ 批次临期预警(提前 30 天)
- ✅ 物料平衡偏差预警
- ✅ 供应商资质到期预警

---

### 17.10 成功标准

**物料管理**:
- ✅ 支持手工录入 + Excel 批量导入
- ✅ 批次号优先使用供应商批次,无则自动生成
- ✅ 同一物料可以有多个批次同时存在

**领料管理**:
- ✅ 领料单支持审批流程
- ✅ 强制 FIFO,系统自动推荐最旧批次
- ✅ 临期物料优先推荐
- ✅ 过期物料自动锁定,不允许领用

**批次追溯**:
- ✅ 支持正向追溯(原料 → 成品)
- ✅ 支持反向追溯(成品 → 原料)
- ✅ 追溯查询 < 4 小时(满足 BRCGS 要求)
- ✅ 自动生成追溯报告(PDF)

**物料平衡**:
- ✅ 产品入库时自动校验物料平衡
- ✅ 允许偏差可由用户自定义(例如: ±5%)
- ✅ 偏差超标时警告,需要填写原因

**供应商管理**:
- ✅ 区分供应商类型(生产商/贸易商)
- ✅ 资质分类管理(营业执照/生产许可证/销售许可证)
- ✅ 资质到期提前 30 天预警

**系统集成**:
- ✅ 复用 TodoTask 统一待办系统
- ✅ 复用 v2.0.0 工作流引擎
- ✅ 与文档系统无缝集成(报废单归档)

---

**本章节完成 ✅**


---

## 十八、设备管理系统（独立模块）⭐⭐ Phase B 核心生产

[⬆️ 返回目录](#-完整目录) | [⬆️ 返回快速导航](#-快速导航)

> **建议上线顺序**: Chapter 19（在仓库管理系统完成后）
> **优先级**: 高（生产设备维护保养）
> **依赖**: Chapter 15（动态表单引擎）、Chapter 17（移动端应用）

> **设计时间**: 2026-02-12
> **系统版本**: v1.0.0 (完整版)
> **依赖章节**: Chapter 15 (TodoTask 统一待办), Chapter 14 (v2.0.0 工作流引擎)
> **移动端支持**: ✅ 微信小程序 + H5 + APP (uniapp)

---

### 18.1 系统定位与核心优势

#### 18.1.1 系统定位

**设备管理系统作为独立业务模块**，负责工厂所有设备的全生命周期管理。

**核心职责**:
1. **设备台账管理**: 设备基础信息、分类、状态管理
2. **维护保养计划**: 自动生成维护计划、到期提醒、日历视图
3. **维保记录管理**: 在线填写维保记录、移动端拍照、审批流程
4. **设备统计分析**: 故障率、使用率、维保成本分析
5. **移动端支持**: 现场填写、拍照上传、电子签名、离线填写

---

#### 18.1.2 核心优势

| 优势 | 说明 |
|------|------|
| **自动化提醒** | 根据维护周期自动生成待办任务，提前提醒 |
| **移动端支持** | 现场维保可直接在手机填写，拍照上传 |
| **数据电子化** | 维保记录在线填写，数据库存储，可追溯 |
| **日历可视化** | 维护计划日历视图，一目了然 |
| **审批流程** | 维保记录需上级审核通过，关闭待办 |
| **离线填写** | 无网络环境也能填写，联网后自动同步 |

---

### 18.2 业务流程

#### 18.2.1 核心流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    设备管理核心流程                            │
└─────────────────────────────────────────────────────────────┘

1. 设备台账录入
   工程部录入设备信息 → 设置维护周期 → 设置责任人

2. 维护计划自动生成
   系统根据维护周期 → 自动计算下次维护日期 → 生成维护计划

3. 到期提醒
   维护日期临近 → 提前 N 天生成待办任务 → 通知责任人（微信/站内信）

4. 维保执行（移动端）
   责任人查看待办 → 现场维保 → 填写维保记录 → 拍照上传 → 电子签名

5. 维保记录审批
   提交维保记录 → 生成审批待办 → 上级审核 → 审批通过 → 关闭待办

6. 下次维护计划
   系统自动计算下次维护日期 → 生成新的维护计划

7. 设备统计分析
   统计维保次数、故障率、维保成本 → 生成分析报表
```

---

#### 18.2.2 关键业务场景

**场景 1: 设备台账录入**
```
1. 工程部录入新设备
   - 设备编号: EQ-001
   - 设备名称: 搅拌机A
   - 设备型号: JB-2000
   - 分类: 生产设备
   - 位置: 生产车间1楼
   - 购买日期: 2024-01-01
   - 启用日期: 2024-01-15
   - 维护周期: 30 天
   - 提前提醒: 3 天
   - 责任人: 张三

2. 系统自动计算下次维护日期
   - 下次维护日期 = 启用日期 + 维护周期 = 2024-02-14

3. 系统生成维护计划
   - 计划编号: MP-20240214-001
   - 设备: 搅拌机A
   - 计划日期: 2024-02-14
   - 状态: 待执行
```

**场景 2: 维保提醒与执行（移动端）**
```
1. 系统自动提醒（2024-02-11）
   - 距离维护日期还有 3 天
   - 生成待办任务（TodoTask）
   - 发送微信通知给张三

2. 张三收到通知（微信小程序）
   - 查看待办任务
   - 点击"开始维保"

3. 现场维保（移动端填写）
   - 设备编号: EQ-001（自动带出）
   - 设备名称: 搅拌机A（自动带出）
   - 维保日期: 2024-02-14（默认今天）
   - 维保类型: 日常保养
   - 维保内容: 清洁搅拌叶片、检查轴承、加润滑油
   - 维保前状态: 正常
   - 维保后状态: 正常
   - 现场照片: [拍照上传 3 张]
   - 更换零件: 无
   - 维保人员签名: [手写签字板签名]

4. 提交维保记录
   - 生成记录编号: MAINT-20240214-001
   - 状态: 待审批
   - 生成审批待办任务给工程部经理

5. 离线填写（可选）
   - 如果现场无网络，数据存储到本地
   - 联网后自动同步到服务器
```

**场景 3: 维保记录审批**
```
1. 工程部经理收到审批待办
   - 查看维保记录详情（PC 或移动端）
   - 查看现场照片
   - 查看维保人员签名

2. 审批通过
   - 审批意见: 维保记录完整，通过
   - 审批人签名: [手写签字板签名]

3. 系统自动处理
   - 维保记录状态: 已审批
   - 关闭维保待办任务
   - 计算下次维护日期: 2024-03-15
   - 生成下次维护计划
```

**场景 4: 日历视图查看**
```
工程部经理打开日历视图:

2024 年 2 月:
┌──────────────────────────────────────┐
│ 周日 周一 周二 周三 周四 周五 周六     │
├──────────────────────────────────────┤
│  28   29   30   31    1    2    3   │
│                       🔧  🔧        │
│   4    5    6    7    8    9   10   │
│  🔧              🔧                  │
│  11   12   13   14   15   16   17   │
│             🔧  🔧                   │
│  18   19   20   21   22   23   24   │
│                                      │
│  25   26   27   28   29              │
└──────────────────────────────────────┘

图例:
🔧 = 维护计划

点击某一天:
- 显示当天所有维护计划
- 搅拌机A（日常保养）
- 烤箱B（年度检修）
- 包装机C（故障维修）
```

---

### 18.3 数据模型设计

#### 18.3.1 核心数据表(4 个)

```prisma
// ==================== 设备管理 ====================

// 1. 设备台账表
model Equipment {
  id                String   @id @default(cuid())
  code              String   @unique     // 设备编号
  name              String              // 设备名称
  model             String?             // 设备型号
  category          String              // 分类（生产设备/检验设备/辅助设备）
  location          String?             // 位置（车间/楼层）
  purchaseDate      DateTime?           // 购买日期
  commissionDate    DateTime?           // 启用日期
  status            String   @default("active") // active | inactive | scrapped

  // ============ 分级保养配置（新增）============
  maintenanceConfig Json?               // 保养配置 JSON，示例：
                                        // {
                                        //   "daily": { "enabled": true, "cycle": 1, "reminderDays": 0 },
                                        //   "weekly": { "enabled": true, "cycle": 7, "reminderDays": 1 },
                                        //   "monthly": { "enabled": true, "cycle": 30, "reminderDays": 3 },
                                        //   "quarterly": { "enabled": false, "cycle": 90, "reminderDays": 7 },
                                        //   "annual": { "enabled": true, "cycle": 365, "reminderDays": 14 }
                                        // }

  responsiblePerson String?             // 责任人 ID
  responsibleName   String?             // 责任人姓名
  manufacturer      String?             // 制造商
  serialNumber      String?             // 序列号
  warrantyExpiry    DateTime?           // 保修到期日期
  remark            String?             // 备注
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 关联
  maintenanceRecords MaintenanceRecord[] // 维保记录
  maintenancePlans   MaintenancePlan[]   // 维护计划
  faults             EquipmentFault[]    // 报修单（新增）

  @@map("equipment")
}

// 2. 维护计划表（支持分级保养）
model MaintenancePlan {
  id                String   @id @default(cuid())
  planNumber        String   @unique     // 计划编号
  equipmentId       String              // 设备 ID
  equipmentCode     String              // 设备编号（冗余）
  equipmentName     String              // 设备名称（冗余）
  plannedDate       DateTime            // 计划维护日期

  // ============ 分级保养字段（新增）============
  maintenanceLevel  String              // 保养级别：daily | weekly | monthly | quarterly | annual

  maintenanceType   String   @default("routine") // routine | repair | annual
  status            String   @default("pending") // pending | in_progress | completed | cancelled
  responsiblePerson String?             // 责任人 ID
  responsibleName   String?             // 责任人姓名
  reminderDays      Int      @default(3) // 提前提醒天数（不同级别不同）
  reminderSent      Boolean  @default(false) // 是否已发送提醒
  todoTaskId        String?             // 待办任务 ID
  completedAt       DateTime?           // 完成时间
  remark            String?             // 备注
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 关联
  equipment         Equipment @relation(fields: [equipmentId], references: [id])

  @@index([equipmentId])
  @@index([maintenanceLevel])
  @@index([plannedDate])
  @@map("maintenance_plans")
}

// 3. 维保记录表（四级记录文件）
model MaintenanceRecord {
  id                  String   @id @default(cuid())
  recordNumber        String   @unique     // 记录编号
  equipmentId         String              // 设备 ID
  equipmentCode       String              // 设备编号（冗余）
  equipmentName       String              // 设备名称（冗余）
  maintenanceDate     DateTime            // 维保日期

  // ============ 分级保养字段（新增）============
  maintenanceLevel    String?             // 保养级别：daily | weekly | monthly | quarterly | annual

  maintenanceType     String              // 类型（日常保养/故障维修/年度检修）
  maintenanceContent  String              // 维保内容
  statusBefore        String?             // 维保前状态
  statusAfter         String?             // 维保后状态
  replacedParts       String?             // 更换的零件
  photos              Json?               // 现场照片（数组）
  maintenancePerson   String              // 维保人员 ID
  maintenancePersonName String            // 维保人员姓名
  maintenancePersonSignature String?     // 维保人员签名（图片 URL）
  reviewer            String?             // 审核人员 ID
  reviewerName        String?             // 审核人员姓名
  reviewerSignature   String?             // 审核人员签名（图片 URL）
  reviewDate          DateTime?           // 审核日期
  reviewComment       String?             // 审核意见
  status              String   @default("draft") // draft | submitted | approved | rejected
  workflowId          String?             // 工作流实例 ID
  nextMaintenanceDate DateTime?           // 下次维保日期
  cost                Float?              // 维保成本
  duration            Int?                // 维保耗时（分钟）
  remark              String?             // 备注
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // 关联
  equipment           Equipment @relation(fields: [equipmentId], references: [id])

  @@index([equipmentId])
  @@index([maintenanceLevel])
  @@map("maintenance_records")
}

// 4. 设备报修单表（新增）
model EquipmentFault {
  id                String   @id @default(cuid())
  faultNumber       String   @unique           // 报修单号，格式：FR-{YYYYMMDD}-{序号}
  equipmentId       String                     // 设备 ID
  equipmentCode     String                     // 设备编号（冗余）
  equipmentName     String                     // 设备名称（冗余）
  location          String                     // 报修区域（车间/楼层）

  // ============ 报修信息 ============
  reporterId        String                     // 报修人 ID
  reporterName      String                     // 报修人姓名
  reportTime        DateTime @default(now())   // 报修时间
  faultDescription  String                     // 故障描述
  urgencyLevel      String   @default("normal") // 紧急程度：urgent(紧急) | normal(一般) | low(低)

  // ============ 维修信息 ============
  status            String   @default("pending") // pending(待处理) | in_progress(处理中) | completed(已完成) | cancelled(已取消)
  assignedTo        String?                     // 指派给（工程部人员 ID）
  assignedToName    String?                     // 指派给（工程部人员姓名）
  acceptedAt        DateTime?                   // 接单时间

  // ============ 维修记录（完成时填写）============
  faultCause        String?                     // 故障原因
  repairMeasure     String?                     // 处理措施
  photos            Json?                       // 现场照片（数组）
  repairPerson      String?                     // 维修人员 ID
  repairPersonName  String?                     // 维修人员姓名
  repairSignature   String?                     // 维修人员签名（图片 URL）
  completedAt       DateTime?                   // 完成时间
  duration          Int?                        // 维修耗时（分钟）

  // ============ 待办任务 ============
  todoTaskId        String?                     // 待办任务 ID

  remark            String?                     // 备注
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 关联
  equipment         Equipment @relation(fields: [equipmentId], references: [id])

  @@index([equipmentId])
  @@index([reporterId])
  @@index([status])
  @@index([urgencyLevel])
  @@index([reportTime])
  @@map("equipment_faults")
}
```

---

#### 18.3.2 数据表关系图

```
Equipment (设备)
  ├─ MaintenancePlan (维护计划) 1:N  ← 支持分级保养（一个设备多个计划）
  ├─ MaintenanceRecord (维保记录) 1:N
  └─ EquipmentFault (报修单) 1:N  ← 新增

核心逻辑:
1. 设备启用后，根据 maintenanceConfig 自动生成多个维护计划（日/周/月/季/年）
2. 维保记录提交后，系统自动生成该级别的下次维护计划
3. 维护计划到期前 N 天，生成待办任务（不同级别提醒天数不同）
4. 维保记录审批通过后，关闭待办任务
5. 员工发起报修后，自动生成待办任务给工程部
6. 工程部完成维修后，关闭报修单和待办任务
```

---

### 18.4 业务规则(BR-181 ~ BR-210, 共 30 条)

#### 18.4.1 设备台账规则(BR-181 ~ BR-190)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-181 | **设备编号唯一**: 每个设备的 code 必须唯一 | `Equipment.code @unique` |
| BR-182 | **设备分类**: 生产设备/检验设备/辅助设备 | `Equipment.category` 枚举 |
| BR-183 | **设备状态**: active(启用) / inactive(停用) / scrapped(报废) | `Equipment.status` 枚举 |
| BR-184 | **维护周期**: 每个设备可以有不同的维护周期（天数） | `Equipment.maintenanceCycle` |
| BR-185 | **提前提醒**: 用户可自定义提前几天提醒（默认 3 天） | `Equipment.reminderDays` |
| BR-186 | **下次维护日期**: 系统自动计算并更新 | 自动计算：上次维护日期 + 维护周期 |
| BR-187 | **责任人**: 每个设备必须指定责任人 | `Equipment.responsiblePerson` |
| BR-188 | **保修期**: 记录保修到期日期，到期前提醒 | `Equipment.warrantyExpiry` |
| BR-189 | **设备报废**: 报废后不再生成维护计划 | `status = scrapped` 时停止生成计划 |
| BR-190 | **设备编号生成**: 格式 `EQ-{YYYYMMDD}-{序号}` | 后端自动生成 |

---

#### 18.4.2 分级保养规则(BR-191 ~ BR-200，新增)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-191 | **保养级别定义**: 日保养(daily)/周保养(weekly)/月保养(monthly)/季度保养(quarterly)/年度保养(annual) | `MaintenancePlan.maintenanceLevel` 枚举 |
| BR-192 | **日保养周期**: 每天，当天早上提醒（reminderDays=0） | cycle=1, reminderDays=0 |
| BR-193 | **周保养周期**: 每周，提前1天提醒 | cycle=7, reminderDays=1 |
| BR-194 | **月保养周期**: 每月（30天），提前3天提醒 | cycle=30, reminderDays=3 |
| BR-195 | **季度保养周期**: 每季度（90天），提前7天提醒 | cycle=90, reminderDays=7 |
| BR-196 | **年度保养周期**: 每年（365天），提前14天提醒 | cycle=365, reminderDays=14 |
| BR-197 | **多计划并行**: 一个设备可以同时有多个不同级别的保养计划 | MaintenancePlan 一对多关系 |
| BR-198 | **保养级别必填**: 创建保养计划时必须指定级别 | `MaintenancePlan.maintenanceLevel` 非空 |
| BR-199 | **下次计划生成**: 当前级别保养完成后，自动生成该级别的下次计划 | 保养日期 + 对应级别周期 |
| BR-200 | **灵活配置**: 用户可自定义启用哪些保养级别 | `Equipment.maintenanceConfig` JSON |

---

#### 18.4.3 维护计划规则(BR-201 ~ BR-210)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-191 | **自动生成**: 设备启用后自动生成首次维护计划 | 启用日期 + 维护周期 |
| BR-192 | **计划状态**: pending(待执行) → in_progress(进行中) → completed(已完成) / cancelled(已取消) | `MaintenancePlan.status` 状态机 |
| BR-193 | **提醒时机**: 计划日期前 N 天生成待办任务 | 定时任务检查 |
| BR-194 | **逾期提醒**: 计划日期过后仍未完成，持续提醒 | 定时任务检查 |
| BR-195 | **待办任务**: 生成待办任务时，关联 TodoTask | `MaintenancePlan.todoTaskId` |
| BR-196 | **计划取消**: 设备停用/报废时，取消未完成的维护计划 | 批量更新 status = cancelled |
| BR-197 | **计划调整**: 责任人可以延期维护计划（需审批） | 工作流集成 |
| BR-198 | **日历视图**: 维护计划在日历上显示 | 前端日历组件 |
| BR-199 | **看板视图**: 维护计划在看板上显示（待执行/进行中/已完成） | 前端看板组件 |
| BR-200 | **计划编号**: 格式 `MP-{YYYYMMDD}-{序号}` | 后端自动生成 |

---

#### 18.4.3 维护计划规则(BR-201 ~ BR-210)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-201 | **自动生成**: 设备启用后根据配置自动生成多个保养计划 | 启用日期 + 对应级别周期 |
| BR-202 | **计划状态**: pending(待执行) → in_progress(进行中) → completed(已完成) / cancelled(已取消) | `MaintenancePlan.status` 状态机 |
| BR-203 | **提醒时机**: 计划日期前 N 天生成待办任务（不同级别N不同） | 定时任务检查 |
| BR-204 | **逾期提醒**: 计划日期过后仍未完成，持续提醒 | 定时任务检查 |
| BR-205 | **待办任务**: 生成待办任务时，关联 TodoTask | `MaintenancePlan.todoTaskId` |
| BR-206 | **计划取消**: 设备停用/报废时，取消未完成的维护计划 | 批量更新 status = cancelled |
| BR-207 | **计划调整**: 责任人可以延期维护计划（需审批） | 工作流集成 |
| BR-208 | **日历视图**: 维护计划在日历上显示 | 前端日历组件 |
| BR-209 | **看板视图**: 维护计划在看板上显示（待执行/进行中/已完成） | 前端看板组件 |
| BR-210 | **计划编号**: 格式 `MP-{YYYYMMDD}-{序号}` | 后端自动生成 |

---

#### 18.4.4 维保记录规则(BR-211 ~ BR-220)

#### 18.4.4 维保记录规则(BR-211 ~ BR-220)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-211 | **记录状态**: draft(草稿) → submitted(已提交) → approved(已审批) / rejected(已驳回) | `MaintenanceRecord.status` 状态机 |
| BR-212 | **必填字段**: 维保日期、维保级别、维保内容、维保人员签名 | 前端校验 + 后端校验 |
| BR-213 | **现场拍照**: 支持上传多张照片（最多 9 张） | `MaintenanceRecord.photos` JSON 数组 |
| BR-214 | **电子签名**: 维保人员和审核人员必须电子签名 | 手写签字板 |
| BR-215 | **审批流程**: 维保记录提交后，生成审批待办任务 | 工作流集成 |
| BR-216 | **审批通过**: 审批通过后，关闭维保待办任务，生成该级别的下次维护计划 | 自动触发 |
| BR-217 | **审批驳回**: 审批驳回后，维保记录回到草稿状态，可修改重新提交 | 状态回退 |
| BR-218 | **离线填写**: 移动端支持离线填写，联网后自动同步 | 本地存储 + 同步队列 |
| BR-219 | **记录编号**: 格式 `MAINT-{YYYYMMDD}-{序号}` | 后端自动生成 |
| BR-220 | **记录查询**: 支持按设备/日期/级别/类型/责任人查询 | 查询 API |

---

#### 18.4.5 设备报修规则(BR-221 ~ BR-230，新增)

### 18.5 API 设计(18 个端点)

#### 18.5.1 设备台账 API(6 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/equipment` | 查询设备列表 | `?page=1&limit=20&category=&status=` | `{ items: Equipment[], total: number }` |
| GET | `/api/equipment/:id` | 查询设备详情 | - | `Equipment` |
| POST | `/api/equipment` | 创建设备 | `{ code, name, category, ... }` | `Equipment` |
| PUT | `/api/equipment/:id` | 更新设备 | `{ name, location, ... }` | `Equipment` |
| DELETE | `/api/equipment/:id` | 删除设备 | - | `{ success: true }` |
| PUT | `/api/equipment/:id/status` | 更新设备状态 | `{ status: 'scrapped' }` | `Equipment` |

---

#### 18.5.2 维护计划 API(6 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/maintenance-plans` | 查询维护计划列表 | `?status=&equipmentId=&startDate=&endDate=` | `MaintenancePlan[]` |
| GET | `/api/maintenance-plans/:id` | 查询维护计划详情 | - | `MaintenancePlan` |
| GET | `/api/maintenance-plans/calendar` | 日历视图数据 | `?year=2024&month=2` | `{ [date]: MaintenancePlan[] }` |
| POST | `/api/maintenance-plans/:id/start` | 开始维保 | - | `{ success: true }` |
| POST | `/api/maintenance-plans/:id/complete` | 完成维保 | - | `{ success: true }` |
| POST | `/api/maintenance-plans/:id/cancel` | 取消维保 | `{ reason }` | `{ success: true }` |

---

#### 18.5.3 维保记录 API(6 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/maintenance-records` | 查询维保记录列表 | `?status=&equipmentId=&startDate=&endDate=` | `MaintenanceRecord[]` |
| GET | `/api/maintenance-records/:id` | 查询维保记录详情 | - | `MaintenanceRecord` |
| POST | `/api/maintenance-records` | 创建维保记录 | `{ equipmentId, maintenanceDate, ... }` | `MaintenanceRecord` |
| PUT | `/api/maintenance-records/:id` | 更新维保记录（草稿状态） | `{ maintenanceContent, photos, ... }` | `MaintenanceRecord` |
| POST | `/api/maintenance-records/:id/submit` | 提交审批 | - | `{ success: true, workflowId }` |
| POST | `/api/maintenance-records/:id/approve` | 审批通过 | `{ reviewComment, reviewerSignature }` | `{ success: true }` |

---

### 18.6 前端设计(5 个页面)

#### 18.6.1 PC 端页面列表

| 页面路径 | 页面名称 | 功能 |
|---------|---------|------|
| `/equipment/list` | 设备台账列表 | 设备列表、新增、编辑、删除、状态管理 |
| `/equipment/detail/:id` | 设备详情 | 查看设备详情、维保历史、维护计划 |
| `/maintenance/plans` | 维护计划列表 | 维护计划列表、筛选、开始/完成/取消 |
| `/maintenance/calendar` | 维护计划日历 | 日历视图、点击查看当天计划 |
| `/maintenance/records` | 维保记录列表 | 维保记录列表、查询、查看详情、审批 |

---

#### 18.6.2 移动端页面列表（uniapp）

| 页面路径 | 页面名称 | 功能 |
|---------|---------|------|
| `/pages/equipment/list` | 设备列表 | 查看设备列表、搜索 |
| `/pages/equipment/detail` | 设备详情 | 查看设备详情、扫码识别 |
| `/pages/maintenance/todo` | 维保待办 | 查看维保待办、开始维保 |
| `/pages/maintenance/create` | 填写维保记录 | 在线填写、拍照、签名 |
| `/pages/maintenance/calendar` | 维护计划日历 | 日历视图、点击查看 |

---

### 18.7 开发工作量估算

#### 18.7.1 后端开发(2 周)

| 模块 | 工作量 | 说明 |
|------|--------|------|
| **设备台账管理** | 3 天 | Equipment CRUD + 状态管理 |
| **维护计划管理** | 3 天 | 自动生成计划 + 定时任务 + 待办集成 |
| **维保记录管理** | 3 天 | 维保记录 CRUD + 审批集成 |
| **API 开发** | 2 天 | 日历视图 API + 统计 API |
| **单元测试** | 1 天 | 核心业务逻辑测试 |

**后端合计: 2 周**

---

#### 18.7.2 前端开发(3 周)

| 模块 | 工作量 | 说明 |
|------|--------|------|
| **PC 端页面** | 1.5 周 | 设备列表/详情、维护计划、日历视图 |
| **移动端页面（uniapp）** | 1 周 | 设备列表、维保填写、拍照签名 |
| **E2E 测试** | 0.5 周 | 关键流程测试 |

**前端合计: 3 周**

---

#### 18.7.3 总工作量

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| **后端开发** | 2 周 | 包含单元测试 |
| **前端开发（PC + 移动端）** | 3 周 | 包含 E2E 测试 |
| **联调测试** | 0.5 周 | 前后端 + 移动端联调 |
| **文档编写** | 0.5 周 | API 文档、用户手册 |

**总计: 6 周**

**并行开发**(1 名后端 + 1 名前端): **约 3 周**

---

### 18.8 依赖与风险

#### 18.8.1 技术依赖

| 依赖项 | 版本 | 用途 | 风险等级 |
|--------|------|------|----------|
| **TodoTask 系统** | 已完成(Chapter 15) | 维保待办任务 | 低 |
| **v2.0.0 工作流引擎** | 已完成(Chapter 14) | 维保记录审批流程 | 低 |
| **uniapp** | 最新版 | 移动端跨平台开发 | 低 |
| **定时任务** | node-cron | 维护计划提醒 | 低 |

**关键依赖**:
- ✅ TodoTask、v2.0.0 工作流已就绪
- ✅ uniapp 社区成熟，风险低

---

#### 18.8.2 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **维保记录遗漏** | 设备维护不及时 | 中 | 多次提醒、逾期升级通知 |
| **离线同步失败** | 数据丢失 | 低 | 本地持久化存储、同步队列重试 |
| **拍照失败** | 现场照片缺失 | 低 | 支持后续补充照片 |
| **电子签名不规范** | 审计问题 | 中 | 强制签名、签名预览确认 |

---

#### 18.4.5 设备报修规则(BR-221 ~ BR-230，新增)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-221 | **所有员工可发起报修**: 任何员工都可以提交设备报修单 | 前端权限控制 + API 权限检查 |
| BR-222 | **报修单号自动生成**: 格式 `FR-{YYYYMMDD}-{序号}` | 后端自动生成 |
| BR-223 | **自动生成待办任务**: 报修单提交后，自动为工程部生成待办 | TodoTask 集成 |
| BR-224 | **紧急报修优先级高**: urgent 级别的报修单优先显示 | 待办任务优先级设置 |
| BR-225 | **接单后状态变更**: 工程部人员接单后，状态变为 in_progress | 状态机 |
| BR-226 | **完成维修后关闭待办**: 提交完成工单后，关闭对应的待办任务 | TodoTask 状态更新 |
| BR-227 | **移动端支持**: 工程部人员可在移动端填写维修记录、拍照、签名 | uniapp 移动端 |
| BR-228 | **报修单不可删除**: 只能取消，保留历史记录 | 软删除或状态标记 |
| BR-229 | **报修统计**: 统计每月报修次数、平均响应时间、完成率 | 定时任务 + 统计 API |
| BR-230 | **区域设备联动**: 选择区域后，自动过滤该区域的设备 | 前端联动 + Equipment.location |

---

### 18.5补. 设备报修 API(8 个，新增)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/equipment/faults` | 发起报修（所有员工） | `{ equipmentId, location, faultDescription, urgencyLevel }` | `EquipmentFault` |
| GET | `/api/equipment/faults` | 查询报修单列表（工程部） | `?status=&urgencyLevel=&page=1&limit=20` | `{ items: EquipmentFault[], total }` |
| GET | `/api/equipment/faults/my` | 查询我的报修单（普通员工） | `?page=1&limit=20` | `{ items: EquipmentFault[], total }` |
| GET | `/api/equipment/faults/:id` | 查询报修单详情 | - | `EquipmentFault` |
| POST | `/api/equipment/faults/:id/accept` | 接单（工程部人员） | `{ assignedTo }` | `{ success: true }` |
| POST | `/api/equipment/faults/:id/complete` | 完成维修（工程部，移动端） | `{ faultCause, repairMeasure, photos, repairSignature, duration }` | `{ success: true }` |
| POST | `/api/equipment/faults/:id/cancel` | 取消报修（报修人） | `{ reason }` | `{ success: true }` |
| GET | `/api/equipment/faults/stats` | 报修统计 | `?startDate=&endDate=` | `{ totalFaults, avgResponseTime, completionRate }` |

---

### 18.9 成功标准

**设备台账管理**:
- ✅ 支持设备分类、状态管理
- ✅ 支持分级保养配置（日/周/月/季/年）

**维护计划管理**:
- ✅ 系统自动生成多级保养计划
- ✅ 不同级别提前提醒天数不同
- ✅ 日历视图清晰展示维护计划

**维保记录管理**:
- ✅ 移动端在线填写（拍照、签名）
- ✅ 支持离线填写、联网同步
- ✅ 审批通过后自动关闭待办并生成该级别下次计划

**设备报修功能（新增）**:
- ✅ 所有员工可发起报修
- ✅ 选择区域自动过滤设备
- ✅ 自动生成待办任务给工程部
- ✅ 工程部移动端完成维修
- ✅ 报修统计分析

**移动端支持**:
- ✅ 微信小程序 + H5 + APP
- ✅ 现场拍照、电子签名
- ✅ 离线填写、自动同步

---

**本章节完成 ✅**


---

## 十九、动态表单引擎与记录管理（核心架构）⭐⭐⭐ Phase A 基础设施

[⬆️ 返回目录](#-完整目录) | [⬆️ 返回快速导航](#-快速导航)

> **建议上线顺序**: Chapter 15（第一优先级，所有业务模块的基础）
> **优先级**: 最高（核心基础设施）
> **依赖**: Chapter 14（工作流引擎）
> **说明**: 本章节是整个系统的核心基础设施，所有业务模块（培训、审核、仓库、设备、生产）的记录管理都基于此动态表单引擎

> **设计时间**: 2026-02-12
> **系统版本**: v1.0.0 (完整版)
> **依赖章节**: Chapter 14 (v2.0.0 工作流引擎), Chapter 15 (TodoTask)
> **核心定位**: 统一的四级记录文件管理平台

---

### 19.1 系统定位与核心优势

#### 19.1.1 系统定位

**动态表单引擎是整个数据电子化平台的核心基础设施**，解决"每家公司需求不同、记录文件种类繁多"的问题。

**核心职责**:
1. **记录模板管理**: 管理员可视化配置记录模板（低代码）
2. **动态表单渲染**: 根据模板动态渲染表单（PC + 移动端）
3. **记录实例管理**: 用户在线填写记录，数据库存储
4. **统一查询导出**: 所有四级记录文件统一查询/导出/打印
5. **审批流程集成**: 记录提交后自动触发审批流程
6. **PDF 导出**: 按需导出 PDF（外审需要）

---

#### 19.1.2 核心优势

| 优势 | 说明 |
|------|------|
| **灵活配置** | 管理员可自己创建新的记录类型，不需要开发 |
| **多端统一** | PC + 移动端（小程序/H5/APP）统一渲染 |
| **数据电子化** | 数据存数据库，不是上传 PDF |
| **适应变化** | 适应不同公司需求，业务变化无需重新开发 |
| **审批集成** | 与工作流引擎无缝集成 |
| **移动端支持** | 现场填写、拍照、签名、离线填写 |

---

### 19.2 业务流程

#### 19.2.1 核心流程图

```
┌─────────────────────────────────────────────────────────────┐
│              动态表单引擎核心流程                               │
└─────────────────────────────────────────────────────────────┘

1. 管理员创建记录模板
   选择记录类型 → 拖拽字段 → 配置属性 → 配置逻辑 → 保存模板

2. 用户填写记录（PC/移动端）
   选择记录模板 → 动态渲染表单 → 在线填写 → 自动保存草稿

3. 提交审批（可选）
   提交记录 → 触发审批流程 → 生成待办任务 → 审批人审核

4. 审批通过
   记录状态更新 → 关闭待办任务 → 可导出 PDF

5. 统一查询
   按部门/类型/时间筛选 → 查看记录详情 → 导出/打印
```

---

#### 19.2.2 关键业务场景

**场景 1: 管理员创建"清洁消毒记录"模板**
```
1. 进入模板管理页面
   - 点击"创建记录模板"

2. 基本信息
   - 模板名称: 清洁消毒记录
   - 分类: 生产部
   - 记录编号前缀: CLEAN-
   - 是否需要审批: 是

3. 拖拽字段
   从字段库拖拽到表单预览区:
   - 清洁日期（日期选择）
   - 清洁区域（下拉选择: 生产车间/仓库/办公区）
   - 清洁人员（下拉选择: 从用户表获取）
   - 清洁内容（多行文本）
   - 消毒剂类型（下拉选择: 84消毒液/75%酒精/其他）
   - 消毒浓度（数字输入）
   - 现场照片（图片上传，最多 5 张）
   - 清洁人员签名（电子签名）

4. 配置字段属性
   - 清洁区域:
     * 字段名称: area
     * 字段标签: 清洁区域
     * 字段类型: 下拉选择
     * 是否必填: 是
     * 选项: 生产车间、仓库、办公区

5. 配置字段逻辑（可选）
   - 显隐规则:
     当"消毒剂类型 = 其他"时，显示"其他消毒剂名称"字段

6. 配置打印模板
   - 选择模板布局: 两列
   - 配置页眉: 公司 Logo + 标题
   - 配置页脚: 审批人签名 + 日期

7. 保存模板
   - 模板状态: 启用
   - 生成模板 ID
```

**场景 2: 用户填写"清洁消毒记录"（移动端）**
```
1. 打开微信小程序
   - 首页 → 记录填写 → 选择"清洁消毒记录"

2. 系统动态渲染表单
   - 根据模板 formSchema 动态生成表单

3. 用户填写
   - 清洁日期: 2024-06-15（默认今天）
   - 清洁区域: 生产车间（下拉选择）
   - 清洁人员: 张三（自动带出当前用户）
   - 清洁内容: 清洁地面、墙面、设备表面
   - 消毒剂类型: 84消毒液
   - 消毒浓度: 500（ppm）
   - 现场照片: [拍照上传 3 张]
   - 清洁人员签名: [手写签字板签名]

4. 保存草稿
   - 数据存储到本地（离线也可以）
   - 自动保存，防止数据丢失

5. 提交记录
   - 校验必填字段
   - 上传到服务器
   - 生成记录编号: CLEAN-20240615-001
   - 触发审批流程
```

**场景 3: 审批人审核记录（PC 端）**
```
1. 收到审批待办
   - 待办列表显示: "清洁消毒记录待审批"

2. 查看记录详情
   - 动态渲染记录内容（只读）
   - 查看现场照片（大图预览）
   - 查看清洁人员签名

3. 审批通过
   - 填写审批意见: 清洁到位，通过
   - 审批人签名: [手写签字板签名]
   - 提交审批

4. 系统自动处理
   - 记录状态: 已审批
   - 关闭待办任务
   - 可导出 PDF
```

---

### 19.3 数据模型设计

#### 19.3.1 核心数据表(2 个)

```prisma
// ==================== 动态表单引擎 ====================

// 1. 记录模板表
model RecordTemplate {
  id              String   @id @default(cuid())
  code            String   @unique     // 模板编号（REC-TPL-001）
  name            String              // 模板名称（设备维保记录）
  category        String              // 分类（工程部/质量部/生产部/仓库）
  description     String?             // 描述
  formSchema      Json                // 表单结构（JSON Schema）
  printTemplate   Json?               // 打印模板（JSON 配置）
  status          String   @default("active") // active | archived
  numberPrefix    String              // 记录编号前缀（MAINT-）
  numberSequence  Int      @default(1) // 记录编号序号
  approvalRequired Boolean  @default(false) // 是否需要审批
  workflowConfig  Json?               // 工作流配置（审批人角色等）
  version         String   @default("1.0") // 模板版本

  // P0-5 修复：记录保留期限管理
  retentionYears  Int      @default(5) // 保留年限（用户业务规则：默认 5 年，BRCGS 投诉记录 5 年）

  // 批次关联配置（与批次追溯系统集成，代码中已实现）
  batchLinkEnabled Boolean  @default(false) // 是否关联批次
  batchLinkType    String?                  // 批次类型（material/production/finished）
  batchLinkField   String?                  // 批次关联字段名

  createdBy       String              // 创建人 ID
  createdByName   String              // 创建人姓名
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 关联
  records         Record[]            // 记录实例

  @@map("record_templates")
}

// 2. 记录实例表（通用）
model Record {
  id              String   @id @default(cuid())
  templateId      String              // 模板 ID
  templateName    String              // 模板名称（冗余）
  recordNumber    String   @unique     // 记录编号
  category        String              // 分类（冗余，便于查询）
  formData        Json                // 表单数据（JSON 格式）
  status          String   @default("draft") // draft | submitted | approved | rejected | deleted
  workflowId      String?             // 工作流实例 ID（如果需要审批）
  pdfUrl          String?             // PDF 文件 URL（导出后）

  // ============ 批次关联（与批次追溯系统集成）============
  relatedBatchType   String?          // "production" | "finished_goods" | "material"
  relatedBatchId     String?          // 批次 ID
  relatedBatchNumber String?          // 批次号（冗余，加速查询）

  // ============ 防篡改机制（BRCGS 合规要求）============
  signatureTimestamp DateTime?        // 电子签名时的服务器时间（锁定）
  offlineFilled      Boolean @default(false) // 是否离线填写
  syncedAt           DateTime?        // 离线同步时间

  // ============ P0-5 修复：记录保留期限管理 ============
  retentionUntil     DateTime?        // 保留截止日期（计算得出：createdAt + retentionYears）
  autoArchiveStatus  String @default("active") // active | to_archive | archived

  // ============ 审批流程 ============
  createdBy       String              // 创建人 ID
  createdByName   String              // 创建人姓名
  submittedAt     DateTime?           // 提交时间（服务器时间，不可篡改）
  approver        String?             // 审批人 ID
  approverName    String?             // 审批人姓名
  approvedAt      DateTime?           // 审批时间
  rejectReason    String?             // 驳回原因

  // ============ 时间戳（服务器时间，防篡改）============
  createdAt       DateTime @default(now()) // 服务器时间，不信任客户端
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?           // 软删除时间

  // ============ 关联 ============
  template        RecordTemplate @relation(fields: [templateId], references: [id])
  changeLogs      RecordChangeLog[]   // 记录变更历史（防篡改）

  @@index([category])
  @@index([status])
  @@index([createdAt])
  @@index([relatedBatchNumber])
  @@index([autoArchiveStatus])  // P0-5 索引：用于定时任务查询待归档记录
  @@map("records")
}

// 3. 记录变更历史表（BRCGS 合规：防篡改）
model RecordChangeLog {
  id            String   @id @default(cuid())
  recordId      String                        // 记录 ID
  fieldName     String                        // 修改的字段名
  oldValue      Json                          // 原值
  newValue      Json                          // 新值
  changedBy     String                        // 修改人 ID
  changedByName String                        // 修改人姓名
  changedAt     DateTime @default(now())      // 修改时间（服务器时间）
  reason        String?                       // 修改原因
  approvedBy    String?                       // 批准人 ID（修改已审批记录需要审批）
  approvedByName String?                      // 批准人姓名

  // 关联
  record        Record @relation(fields: [recordId], references: [id], onDelete: Cascade)

  @@index([recordId])
  @@index([changedAt])
  @@map("record_change_logs")
}
```

---

#### 19.3.2 formSchema 字段结构

```typescript
interface FormSchema {
  title: string;            // 表单标题
  description?: string;     // 表单描述
  layout?: {
    columns?: number;       // 列数（1/2/3）
    labelWidth?: string;    // 标签宽度
  };
  fields: FormField[];      // 字段数组
}

interface FormField {
  name: string;             // 字段名称（唯一）
  label: string;            // 字段标签
  type: FieldType;          // 字段类型
  required?: boolean;       // 是否必填
  placeholder?: string;     // 占位符
  defaultValue?: any;       // 默认值
  
  // 校验规则
  validation?: {
    min?: number;           // 最小值/最小长度
    max?: number;           // 最大值/最大长度
    pattern?: string;       // 正则表达式
    message?: string;       // 错误提示
  };
  
  // 数据源（下拉选择）
  options?: Option[] | string;  // 静态选项 或 动态数据源名称
  
  // 文件上传
  accept?: string;          // 接受的文件类型
  maxCount?: number;        // 最大上传数量
  maxSize?: number;         // 最大文件大小（MB）
  
  // 级联选择
  cascadeSource?: string;   // 级联数据源
  
  // 显隐规则
  visibleWhen?: {
    field: string;          // 依赖的字段
    operator: '==' | '!=' | '>' | '<' | 'in';
    value: any;             // 条件值
  };
  
  // 联动规则
  linkTo?: {
    field: string;          // 关联的字段
    mapping: string;        // 映射关系
  };
  
  // 计算规则
  computed?: {
    formula: string;        // 计算公式（例如: "fieldA * fieldB"）
  };
  
  // 其他配置
  width?: string;           // 字段宽度（1/2/3/4）
  readonly?: boolean;       // 是否只读
  hidden?: boolean;         // 是否隐藏
  remark?: string;          // 字段说明
}

type FieldType = 
  | 'text'              // 文本输入
  | 'number'            // 数字输入
  | 'textarea'          // 多行文本
  | 'date'              // 日期选择
  | 'time'              // 时间选择
  | 'datetime'          // 日期时间
  | 'select'            // 下拉单选
  | 'multiselect'       // 下拉多选
  | 'radio'             // 单选按钮
  | 'checkbox'          // 多选框
  | 'cascade'           // 级联选择
  | 'tree'              // 树形选择
  | 'upload'            // 文件上传
  | 'image'             // 图片上传
  | 'signature'         // 电子签名
  | 'richtext'          // 富文本编辑器
  | 'location'          // 地理位置
  | 'scan'              // 扫码输入
  | 'divider'           // 分割线
  | 'title';            // 标题

interface Option {
  label: string;        // 显示文本
  value: any;           // 值
  disabled?: boolean;   // 是否禁用
}
```

---

#### 19.3.3 formSchema 完整示例

**示例 1: 设备维保记录**

```json
{
  "title": "设备维保记录",
  "description": "用于记录设备维护保养情况",
  "layout": {
    "columns": 2,
    "labelWidth": "120px"
  },
  "fields": [
    {
      "name": "equipmentCode",
      "label": "设备编号",
      "type": "select",
      "required": true,
      "options": "equipment",
      "placeholder": "请选择设备"
    },
    {
      "name": "equipmentName",
      "label": "设备名称",
      "type": "text",
      "readonly": true,
      "linkTo": {
        "field": "equipmentCode",
        "mapping": "name"
      }
    },
    {
      "name": "maintenanceDate",
      "label": "维保日期",
      "type": "date",
      "required": true,
      "defaultValue": "today"
    },
    {
      "name": "maintenanceType",
      "label": "维保类型",
      "type": "radio",
      "required": true,
      "options": [
        { "label": "日常保养", "value": "routine" },
        { "label": "故障维修", "value": "repair" },
        { "label": "年度检修", "value": "annual" }
      ]
    },
    {
      "name": "faultReason",
      "label": "故障原因",
      "type": "textarea",
      "required": true,
      "visibleWhen": {
        "field": "maintenanceType",
        "operator": "==",
        "value": "repair"
      }
    },
    {
      "name": "maintenanceContent",
      "label": "维保内容",
      "type": "textarea",
      "required": true,
      "placeholder": "请详细描述维保内容",
      "validation": {
        "min": 10,
        "message": "维保内容至少 10 个字"
      }
    },
    {
      "name": "statusBefore",
      "label": "维保前状态",
      "type": "text"
    },
    {
      "name": "statusAfter",
      "label": "维保后状态",
      "type": "text"
    },
    {
      "name": "replacedParts",
      "label": "更换的零件",
      "type": "textarea"
    },
    {
      "name": "photos",
      "label": "现场照片",
      "type": "image",
      "accept": "image/*",
      "maxCount": 9,
      "maxSize": 5,
      "width": "full"
    },
    {
      "name": "maintenancePersonSignature",
      "label": "维保人员签名",
      "type": "signature",
      "required": true,
      "width": "full"
    },
    {
      "name": "cost",
      "label": "维保成本（元）",
      "type": "number",
      "validation": {
        "min": 0
      }
    },
    {
      "name": "duration",
      "label": "维保耗时（分钟）",
      "type": "number",
      "validation": {
        "min": 0
      }
    },
    {
      "name": "remark",
      "label": "备注",
      "type": "textarea",
      "width": "full"
    }
  ]
}
```

---

**示例 2: 报废单**

```json
{
  "title": "报废单",
  "layout": {
    "columns": 2
  },
  "fields": [
    {
      "name": "scrapDate",
      "label": "报废日期",
      "type": "date",
      "required": true,
      "defaultValue": "today"
    },
    {
      "name": "materialCode",
      "label": "物料编号",
      "type": "select",
      "required": true,
      "options": "material"
    },
    {
      "name": "materialName",
      "label": "物料名称",
      "type": "text",
      "readonly": true,
      "linkTo": {
        "field": "materialCode",
        "mapping": "name"
      }
    },
    {
      "name": "batchNumber",
      "label": "批次号",
      "type": "select",
      "required": true,
      "options": "batch"
    },
    {
      "name": "stockQuantity",
      "label": "库存数量",
      "type": "number",
      "readonly": true,
      "linkTo": {
        "field": "batchNumber",
        "mapping": "stockQuantity"
      }
    },
    {
      "name": "scrapQuantity",
      "label": "报废数量",
      "type": "number",
      "required": true,
      "validation": {
        "min": 0,
        "message": "报废数量必须大于 0"
      }
    },
    {
      "name": "scrapReason",
      "label": "报废原因",
      "type": "select",
      "required": true,
      "options": [
        { "label": "过期", "value": "expired" },
        { "label": "损坏", "value": "damaged" },
        { "label": "质量问题", "value": "quality" },
        { "label": "其他", "value": "other" }
      ]
    },
    {
      "name": "scrapReasonDetail",
      "label": "详细说明",
      "type": "textarea",
      "required": true,
      "width": "full"
    },
    {
      "name": "photos",
      "label": "现场照片",
      "type": "image",
      "maxCount": 5,
      "width": "full"
    },
    {
      "name": "applicantSignature",
      "label": "申请人签名",
      "type": "signature",
      "required": true,
      "width": "full"
    }
  ]
}
```

---

### 19.4 前端设计（可视化表单设计器）

#### 19.4.1 管理员端 - 表单设计器界面

```
页面路径: /admin/record-templates/designer

布局结构（三栏）:

┌──────────────────────────────────────────────────────┐
│                     顶部工具栏                          │
│  [保存模板] [预览] [导入] [导出] [返回]                 │
├───────────┬────────────────────────┬────────────────┤
│           │                        │                │
│  字段库   │      表单预览区         │   属性配置区    │
│           │                        │                │
│  基础字段 │  ┌──────────────────┐ │  字段属性      │
│  ☰ 文本   │  │  设备维保记录     │ │  字段名称:     │
│  ☰ 数字   │  ├──────────────────┤ │  equipmentCode│
│  ☰ 日期   │  │ [设备编号*]       │ │                │
│  ☰ 下拉   │  │ [设备名称]        │ │  字段标签:     │
│  ☰ 单选   │  │ [维保日期*]       │ │  设备编号      │
│  ☰ 多选   │  │ [维保类型*]       │ │                │
│  ☰ 文本域 │  │ [维保内容*]       │ │  字段类型:     │
│           │  │ [现场照片]        │ │  下拉选择 ▼    │
│  高级字段 │  │ [维保人员签名*]   │ │                │
│  ☰ 级联   │  └──────────────────┘ │  是否必填:     │
│  ☰ 树形   │                        │  ☑ 是          │
│  ☰ 上传   │  拖拽字段到此处          │                │
│  ☰ 图片   │  或点击字段添加         │  数据源:       │
│  ☰ 签名   │                        │  设备台账 ▼    │
│  ☰ 富文本 │                        │                │
│  ☰ 位置   │                        │  [删除字段]    │
│  ☰ 扫码   │                        │                │
│           │                        │                │
└───────────┴────────────────────────┴────────────────┘

操作说明:
1. 从左侧字段库拖拽字段到中间预览区
2. 点击预览区的字段，右侧显示属性配置
3. 配置字段属性（名称、标签、类型、必填、数据源等）
4. 配置字段逻辑（显隐规则、联动规则、计算规则）
5. 支持拖拽调整字段顺序
6. 支持删除字段
7. 实时预览表单效果
```

---

#### 19.4.2 字段属性配置面板

```
当选中某个字段时，右侧显示属性配置:

┌────────────────────────────────┐
│       字段属性配置              │
├────────────────────────────────┤
│                                │
│  基本属性                       │
│  ┌──────────────────────────┐ │
│  │ 字段名称: equipmentCode   │ │
│  │ 字段标签: 设备编号         │ │
│  │ 字段类型: 下拉选择 ▼      │ │
│  │ 字段宽度: 1/2 ▼          │ │
│  │ 是否必填: ☑              │ │
│  │ 是否只读: ☐              │ │
│  │ 占位符: 请选择设备         │ │
│  └──────────────────────────┘ │
│                                │
│  数据源配置（下拉选择）          │
│  ┌──────────────────────────┐ │
│  │ 数据源类型:               │ │
│  │   ○ 静态选项              │ │
│  │   ● 动态数据源            │ │
│  │                          │ │
│  │ 数据源: 设备台账 ▼        │ │
│  │ 显示字段: code - name     │ │
│  │ 值字段: id                │ │
│  └──────────────────────────┘ │
│                                │
│  校验规则                       │
│  ┌──────────────────────────┐ │
│  │ 最小值/最小长度: [空]     │ │
│  │ 最大值/最大长度: [空]     │ │
│  │ 正则表达式: [空]          │ │
│  │ 错误提示: [空]            │ │
│  └──────────────────────────┘ │
│                                │
│  显隐规则（可选）               │
│  ┌──────────────────────────┐ │
│  │ 依赖字段: [选择字段 ▼]    │ │
│  │ 条件: == ▼                │ │
│  │ 条件值: [输入值]          │ │
│  │                          │ │
│  │ [+ 添加规则]              │ │
│  └──────────────────────────┘ │
│                                │
│  联动规则（可选）               │
│  ┌──────────────────────────┐ │
│  │ 关联字段: equipmentName   │ │
│  │ 映射关系: 自动带出设备名称 │ │
│  └──────────────────────────┘ │
│                                │
│  [保存配置] [取消]              │
│                                │
└────────────────────────────────┘
```

---

#### 19.4.3 用户端 - 动态表单渲染（PC）

```vue
<!-- PC 端动态表单组件 -->
<template>
  <div class="dynamic-form">
    <el-form 
      :model="formData" 
      :rules="rules" 
      ref="formRef"
      :label-width="template.formSchema.layout?.labelWidth || '120px'"
    >
      <!-- 动态渲染字段 -->
      <el-row :gutter="20">
        <el-col 
          v-for="field in visibleFields" 
          :key="field.name"
          :span="getColSpan(field)"
        >
          <!-- 文本输入 -->
          <el-form-item 
            v-if="field.type === 'text'" 
            :label="field.label"
            :prop="field.name"
          >
            <el-input 
              v-model="formData[field.name]" 
              :placeholder="field.placeholder"
              :readonly="field.readonly"
            />
          </el-form-item>

          <!-- 数字输入 -->
          <el-form-item 
            v-if="field.type === 'number'" 
            :label="field.label"
            :prop="field.name"
          >
            <el-input-number 
              v-model="formData[field.name]"
              :min="field.validation?.min"
              :max="field.validation?.max"
            />
          </el-form-item>

          <!-- 日期选择 -->
          <el-form-item 
            v-if="field.type === 'date'" 
            :label="field.label"
            :prop="field.name"
          >
            <el-date-picker 
              v-model="formData[field.name]"
              type="date"
            />
          </el-form-item>

          <!-- 下拉选择 -->
          <el-form-item 
            v-if="field.type === 'select'" 
            :label="field.label"
            :prop="field.name"
          >
            <el-select 
              v-model="formData[field.name]"
              :placeholder="field.placeholder"
              @change="handleFieldChange(field.name)"
            >
              <el-option
                v-for="option in getOptions(field)"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <!-- 单选按钮 -->
          <el-form-item 
            v-if="field.type === 'radio'" 
            :label="field.label"
            :prop="field.name"
          >
            <el-radio-group 
              v-model="formData[field.name]"
              @change="handleFieldChange(field.name)"
            >
              <el-radio
                v-for="option in field.options"
                :key="option.value"
                :label="option.value"
              >
                {{ option.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 多行文本 -->
          <el-form-item 
            v-if="field.type === 'textarea'" 
            :label="field.label"
            :prop="field.name"
          >
            <el-input 
              v-model="formData[field.name]" 
              type="textarea"
              :rows="3"
              :placeholder="field.placeholder"
            />
          </el-form-item>

          <!-- 图片上传 -->
          <el-form-item 
            v-if="field.type === 'image'" 
            :label="field.label"
            :prop="field.name"
          >
            <el-upload
              v-model:file-list="formData[field.name]"
              :action="uploadUrl"
              list-type="picture-card"
              :limit="field.maxCount"
              :accept="field.accept"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-form-item>

          <!-- 电子签名 -->
          <el-form-item 
            v-if="field.type === 'signature'" 
            :label="field.label"
            :prop="field.name"
          >
            <SignaturePad 
              v-model="formData[field.name]"
              :width="400"
              :height="200"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <el-button @click="handleSaveDraft">保存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RecordTemplate, FormField } from '@/types'

const props = defineProps<{
  template: RecordTemplate
  recordId?: string
}>()

const formData = ref<Record<string, any>>({})
const formRef = ref()

// 初始化表单数据
function initFormData() {
  props.template.formSchema.fields.forEach(field => {
    if (field.defaultValue === 'today') {
      formData.value[field.name] = new Date()
    } else {
      formData.value[field.name] = field.defaultValue || null
    }
  })
}

// 动态生成校验规则
const rules = computed(() => {
  const result: any = {}
  props.template.formSchema.fields.forEach(field => {
    if (field.required) {
      result[field.name] = [
        { required: true, message: `请输入${field.label}`, trigger: 'blur' }
      ]
    }
    if (field.validation) {
      const rules = []
      if (field.validation.min !== undefined) {
        rules.push({ min: field.validation.min, message: field.validation.message })
      }
      if (field.validation.max !== undefined) {
        rules.push({ max: field.validation.max, message: field.validation.message })
      }
      if (field.validation.pattern) {
        rules.push({ pattern: new RegExp(field.validation.pattern), message: field.validation.message })
      }
      result[field.name] = rules
    }
  })
  return result
})

// 根据显隐规则过滤字段
const visibleFields = computed(() => {
  return props.template.formSchema.fields.filter(field => {
    if (!field.visibleWhen) return true
    
    const dependentValue = formData.value[field.visibleWhen.field]
    const { operator, value } = field.visibleWhen
    
    switch (operator) {
      case '==': return dependentValue === value
      case '!=': return dependentValue !== value
      case '>': return dependentValue > value
      case '<': return dependentValue < value
      case 'in': return Array.isArray(value) && value.includes(dependentValue)
      default: return true
    }
  })
})

// 获取列宽
function getColSpan(field: FormField) {
  const columns = props.template.formSchema.layout?.columns || 1
  if (field.width === 'full') return 24
  return 24 / columns
}

// 获取下拉选项
async function getOptions(field: FormField) {
  if (Array.isArray(field.options)) {
    return field.options
  }
  
  // 动态数据源
  if (typeof field.options === 'string') {
    const res = await fetch(`/api/data-source/${field.options}`)
    return res.json()
  }
  
  return []
}

// 字段变化处理（联动）
function handleFieldChange(fieldName: string) {
  const field = props.template.formSchema.fields.find(f => f.name === fieldName)
  if (!field?.linkTo) return
  
  // 自动带出关联字段的值
  const linkedField = props.template.formSchema.fields.find(f => f.name === field.linkTo.field)
  if (linkedField) {
    // 从选中的选项中获取映射的值
    const selectedOption = getOptions(field).find(opt => opt.value === formData.value[fieldName])
    if (selectedOption) {
      formData.value[linkedField.name] = selectedOption[field.linkTo.mapping]
    }
  }
}

// 保存草稿
async function handleSaveDraft() {
  const res = await fetch('/api/records', {
    method: 'POST',
    body: JSON.stringify({
      templateId: props.template.id,
      formData: formData.value,
      status: 'draft'
    })
  })
  ElMessage.success('草稿保存成功')
}

// 提交
async function handleSubmit() {
  const valid = await formRef.value.validate()
  if (!valid) return
  
  const res = await fetch('/api/records', {
    method: 'POST',
    body: JSON.stringify({
      templateId: props.template.id,
      formData: formData.value,
      status: 'submitted'
    })
  })
  
  ElMessage.success('提交成功')
  router.push('/records')
}

onMounted(() => {
  initFormData()
  if (props.recordId) {
    // 加载已有记录
    fetch(`/api/records/${props.recordId}`).then(res => {
      formData.value = res.formData
    })
  }
})
</script>
```

---

#### 19.4.4 管理员端 - RecordTemplate 拖拽式设计器（TemplateDesigner.vue）

> **说明**：本节补充 RecordTemplate 拖拽设计器的完整页面设计，作为 P2 待实现功能的前端规格。
> **路由**：`/record-templates/:id/designer`

**页面布局**：
```
┌──────────────────────────────────────────────────────────────────────────┐
│ 模板设计器：[质量记录模板]                          [预览] [保存] [取消]   │
├───────────────────┬──────────────────────────────────────────────────────┤
│ 字段类型（拖拽）   │ 画布（可拖拽排序）                                     │
│                   │                                                      │
│ 📝 文本           │ ┌──────────────────────────────────────────────┐    │
│ 🔢 数字           │ │ [≡] 产品名称        [text]    [必填] [编辑][删]│    │
│ 📋 下拉选择       │ ├──────────────────────────────────────────────┤    │
│ 📅 日期           │ │ [≡] 生产批次号      [text]    [必填] [编辑][删]│    │
│ ☑  复选框         │ ├──────────────────────────────────────────────┤    │
│                   │ │ [≡] 检验温度(℃)    [number]  [必填] [编辑][删]│    │
│                   │ │     公差：±2℃                               │    │
│                   │ ├──────────────────────────────────────────────┤    │
│                   │ │ [≡] 检验结果       [select]  [必填] [编辑][删]│    │
│                   │ │     选项：合格/不合格                         │    │
│                   │ └──────────────────────────────────────────────┘    │
│                   │ [+ 点击右侧字段类型或拖拽到画布添加字段]               │
└───────────────────┴──────────────────────────────────────────────────────┘
```

**字段属性编辑面板**（点击字段「编辑」按钮后弹出抽屉）：

| 属性 | 控件 | 适用类型 |
|------|------|----------|
| 字段标签 (`label`) | Input（必填） | 所有类型 |
| 是否必填 (`required`) | Switch 开关 | 所有类型 |
| 占位文本 (`placeholder`) | Input | text / number / date |
| 下拉选项 (`options`) | Tag 输入（可增删） | select |
| 公差配置 (`tolerance`) | `{min: number, max: number, unit: string}` | number |
| 默认值 (`defaultValue`) | 对应类型的控件 | 所有类型 |

**支持字段类型**：

| 类型 | 渲染控件（DynamicForm.vue） | 说明 |
|------|---------------------------|------|
| `text` | `el-input` | 单行文本 |
| `number` | `el-input-number` | 数值，支持公差校验 |
| `select` | `el-select` | 单选下拉 |
| `date` | `el-date-picker` | 日期选择 |
| `checkbox` | `el-checkbox-group` | 多选 |

**保存格式**（写入 `RecordTemplate.fieldsJson`）：
```typescript
[
  {
    key: "product_name",
    label: "产品名称",
    type: "text",
    required: true,
    placeholder: "请输入产品名称"
  },
  {
    key: "temperature",
    label: "检验温度(℃)",
    type: "number",
    required: true,
    tolerance: { min: -2, max: 2, unit: "℃" }
  },
  {
    key: "result",
    label: "检验结果",
    type: "select",
    required: true,
    options: ["合格", "不合格"]
  }
]
```

**预览模式**：切换到「预览」tab 后，直接调用 `<DynamicForm :fields="fields" />` 渲染表单，让管理员所见即所得验证设计结果。

---

### 19.4补. 防篡改机制设计（BRCGS 合规核心）⭐⭐⭐

#### 19.4补1. 问题背景

**BRCGS 审核员的质疑**：
> "如何证明这些记录是实时填写的，不是事后补填的？"
> "如何证明审批通过后的记录未被修改？"
> "如何证明电子签名是本人当时签署的？"

**当前设计的风险**：
- ❌ 客户端可能篡改系统时间，提交虚假记录
- ❌ 审批通过后记录仍可修改，无变更历史
- ❌ 电子签名时间戳可能不准确

---

#### 19.4补2. 解决方案架构

```
┌─────────────────────────────────────────────────────────────┐
│              防篡改机制三层防护                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  第一层：服务器时间戳强制覆盖                                │
│  ┌────────────────────────────────────────────────────┐   │
│  │ • 客户端提交时间 → 丢弃                             │   │
│  │ • 服务器时间戳 → 写入 createdAt, submittedAt      │   │
│  │ • 时间差校验 → 超过 5 分钟拒绝提交                 │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  第二层：记录变更历史（RecordChangeLog）                     │
│  ┌────────────────────────────────────────────────────┐   │
│  │ • 记录状态 = approved 后，任何修改记录变更历史      │   │
│  │ • 记录修改人、修改时间、原值、新值、修改原因         │   │
│  │ • 修改已审批记录需要特殊权限 + 二次审批             │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  第三层：电子签名时间戳锁定                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │ • 签名时锁定服务器时间戳 signatureTimestamp         │   │
│  │ • 签名时间不可修改                                  │   │
│  │ • 离线填写标记 offlineFilled = true                 │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### 19.4补3. 服务器时间戳校验逻辑

```typescript
// 后端 API：创建记录时强制使用服务器时间
async function createRecord(dto: CreateRecordDto, userId: string) {
  const serverTime = new Date().getTime()
  const clientSubmitTime = dto.submittedAt
    ? new Date(dto.submittedAt).getTime()
    : serverTime

  // 1. 时间校验：客户端时间与服务器时间差不能超过 5 分钟
  const timeDiff = Math.abs(clientSubmitTime - serverTime)
  if (timeDiff > 300000) { // 5分钟 = 300,000ms
    throw new BadRequestException(
      `记录提交时间异常（与服务器时间差 ${Math.floor(timeDiff / 60000)} 分钟），` +
      `可能存在系统时间篡改`
    )
  }

  // 2. 强制使用服务器时间（不信任客户端时间）
  const record = await prisma.record.create({
    data: {
      ...dto,
      createdBy: userId,
      createdAt: new Date(),      // 服务器时间
      submittedAt: dto.status === 'submitted' ? new Date() : null,
      offlineFilled: dto.offlineFilled || false
    }
  })

  return record
}
```

**关键点**：
- ✅ 服务器时间戳不可篡改（数据库 `@default(now())`）
- ✅ 客户端时间只用于校验，不写入数据库
- ✅ 离线填写的记录标记 `offlineFilled = true`，审核时重点关注

---

#### 19.4补4. 记录变更历史拦截器

```typescript
// 后端拦截器：自动记录已审批记录的变更
@Injectable()
export class RecordChangeInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest()
    const recordId = request.params.id
    const userId = request.user.id

    // 获取原记录
    const oldRecord = await prisma.record.findUnique({
      where: { id: recordId }
    })

    // 执行更新
    const result = await next.handle().toPromise()

    // 如果记录状态是 approved，记录变更历史
    if (oldRecord.status === 'approved') {
      const newFormData = request.body.formData
      const changeLogs = []

      // 对比字段变化
      for (const [fieldName, newValue] of Object.entries(newFormData)) {
        const oldValue = oldRecord.formData[fieldName]
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changeLogs.push({
            recordId,
            fieldName,
            oldValue,
            newValue,
            changedBy: userId,
            changedByName: request.user.name,
            reason: request.body.reason || '修改记录'
          })
        }
      }

      // 批量创建变更日志
      if (changeLogs.length > 0) {
        await prisma.recordChangeLog.createMany({
          data: changeLogs
        })
      }
    }

    return result
  }
}
```

**关键点**：
- ✅ 拦截器自动记录，开发者无需手动调用
- ✅ 只记录已审批记录的变更（draft 状态的修改不记录）
- ✅ 记录字段级别的变更（精确到每个字段）

---

#### 19.4补5. 电子签名时间戳锁定

```typescript
// 后端 API：保存电子签名时锁定服务器时间戳
async function saveSignature(
  recordId: string,
  dto: SaveSignatureDto,
  userId: string
) {
  // 1. 上传签名图片到 MinIO
  const signatureBuffer = Buffer.from(
    dto.signatureBase64.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  )
  const signatureUrl = await minioService.upload({
    buffer: signatureBuffer,
    filename: `signature-${recordId}-${Date.now()}.png`,
    mimetype: 'image/png'
  })

  // 2. 锁定服务器时间戳（不可篡改）
  const signatureTimestamp = new Date()

  // 3. 更新记录（使用 Prisma JSON 字段更新）
  const record = await prisma.record.findUnique({ where: { id: recordId } })
  const updatedFormData = {
    ...record.formData,
    [dto.fieldName]: signatureUrl  // 例如 operatorSignature
  }

  await prisma.record.update({
    where: { id: recordId },
    data: {
      formData: updatedFormData,
      signatureTimestamp  // 签名时的服务器时间
    }
  })

  return {
    signatureUrl,
    signatureTimestamp
  }
}
```

**关键点**：
- ✅ 签名时间戳是服务器时间，不可篡改
- ✅ 签名 URL 存在 formData 中，时间戳单独存储
- ✅ 审核时可验证签名时间与记录提交时间的合理性

---

#### 19.4补6. 软删除实现

```typescript
// 后端 API：软删除记录（不真正删除数据）
async function deleteRecord(recordId: string, userId: string) {
  const record = await prisma.record.findUnique({ where: { id: recordId } })

  // 只有草稿状态可以删除
  if (record.status === 'approved') {
    throw new BadRequestException('已审批的记录不允许删除')
  }

  // 软删除：设置 deletedAt 时间戳
  await prisma.record.update({
    where: { id: recordId },
    data: {
      status: 'deleted',
      deletedAt: new Date()
    }
  })

  return { success: true }
}

// 查询时自动过滤已删除记录
async function findRecords(filters: RecordFilters) {
  return await prisma.record.findMany({
    where: {
      ...filters,
      deletedAt: null  // 排除已删除记录
    }
  })
}
```

**关键点**：
- ✅ 已删除的记录数据仍保留在数据库
- ✅ 审核时可以查看删除记录（WHERE deletedAt IS NOT NULL）
- ✅ 符合 BRCGS "数据可追溯"要求

##### 19.4补6.1 回收站前端设计（RecycleBin.vue）

> **说明**：后端软删除 API 已完整，本节补充前端页面设计规格，供 RecycleBin.vue 开发直接参考。

**页面路由**：`/recycle-bin`

**页面布局**：
```
┌──────────────────────────────────────────────────────────────┐
│ 回收站                                [批量恢复] [批量彻底删除] │
├──────────────┬───────────────────────────────────────────────┤
│ 类型筛选     │ 筛选条件：[删除时间范围] [删除人] [名称搜索]      │
│              ├───────────────────────────────────────────────┤
│ ● 全部       │ ☐ 名称          类型   删除时间   删除人  操作  │
│ ○ 文档       │ ☐ 质量手册V1    文档   02-20 14:30 张三   [恢复][删除] │
│ ○ 记录       │ ☐ 生产记录#042  记录   02-18 09:15 李四   [恢复][删除] │
│ ○ 模板       │ ☐ 入库模板旧版  模板   02-15 11:00 王五   [恢复][删除] │
│              │                                               │
│              │              共 12 条  每页 20 条  1/1 页     │
└──────────────┴───────────────────────────────────────────────┘
```

**交互规则**：
- **恢复操作**：调用 `POST /recycle-bin/:id/restore`，成功后从列表移除，`ElMessage.success('已恢复到原位置')`
- **彻底删除操作**：先弹 `ElMessageBox.confirm('此操作不可撤销，确认彻底删除？', { type: 'warning' })`，确认后调用 `DELETE /recycle-bin/:id`
- **批量操作**：全选 checkbox 选中后，顶部批量按钮激活；批量彻底删除同样需二次确认
- **分页**：默认 20 条/页，支持切换

**字段说明**：
| 字段 | 来源 | 说明 |
|------|------|------|
| 名称 | `Record.title` / `Document.title` | 被删除资源的标题 |
| 类型 | 枚举：文档/记录/模板 | 用于左侧类型筛选 |
| 删除时间 | `deletedAt` | 软删除时间戳 |
| 删除人 | `deletedBy → User.name` | 执行删除操作的用户 |

**API 调用**：
- `GET /recycle-bin?type=record&page=1&limit=20`：分页列表
- `POST /recycle-bin/:id/restore`：恢复
- `DELETE /recycle-bin/:id`：彻底删除

---

#### 19.4补7. BRCGS 审核时的证据展示

**审核员问题 1**：如何证明记录是实时填写的？

**回答**：
1. 记录的 `createdAt` 是服务器时间，不可篡改
2. 提交时校验客户端时间与服务器时间差（< 5 分钟）
3. 离线填写的记录有 `offlineFilled = true` 标记，并记录同步时间 `syncedAt`

**审核员问题 2**：如何证明审批通过后的记录未被修改？

**回答**：
1. 查询记录变更历史：`GET /api/records/:id/change-logs`
2. 变更历史记录了修改人、修改时间、原值、新值、修改原因
3. 修改已审批记录需要特殊权限（只有质量部 + 管理层）

**审核员问题 3**：如何证明电子签名是本人当时签署的？

**回答**：
1. 签名时锁定了服务器时间戳 `signatureTimestamp`
2. 签名时间戳与记录提交时间接近（合理性校验）
3. 签名 URL 存储在 MinIO，有访问日志

---

#### 19.4补8. 成功标准

**防篡改机制**：
- ✅ 服务器时间戳强制覆盖客户端时间
- ✅ 时间差超过 5 分钟拒绝提交
- ✅ 已审批记录的修改记录变更历史
- ✅ 电子签名时间戳锁定
- ✅ 软删除保留数据
- ✅ 离线填写标记明确
- ✅ 变更历史可查询、可导出

**BRCGS 审核通过标准**：
- ✅ 记录真实性可验证（服务器时间戳）
- ✅ 记录完整性可验证（变更历史完整）
- ✅ 责任人可追溯（签名时间戳 + 修改记录）

---

### 19.5 业务规则(BR-211 ~ BR-260, 共 50 条)

#### 19.5.1 记录模板规则(BR-211 ~ BR-220)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-211 | **模板编号唯一**: 每个模板的 code 必须唯一 | `RecordTemplate.code @unique` |
| BR-212 | **模板状态**: active(启用) / archived(归档) | `RecordTemplate.status` |
| BR-213 | **模板版本**: 支持版本管理，修改模板时生成新版本 | `RecordTemplate.version` |
| BR-214 | **模板归档**: 归档后不能新建记录，已有记录可查看 | 前端限制 + 后端校验 |
| BR-215 | **字段唯一性**: 同一模板内字段名称必须唯一 | 前端校验 + 后端校验 |
| BR-216 | **字段类型**: 支持 20+ 种字段类型 | FieldType 枚举 |
| BR-217 | **数据源配置**: 支持静态选项 + 动态数据源 | options 字段配置 |
| BR-218 | **显隐规则**: 支持基于其他字段值的显隐控制 | visibleWhen 配置 |
| BR-219 | **联动规则**: 支持字段间联动（自动带出） | linkTo 配置 |
| BR-220 | **计算规则**: 支持字段计算（例如：总价 = 单价 × 数量） | computed 配置 |

---

#### 19.5.2 记录实例规则(BR-221 ~ BR-230)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-221 | **记录编号生成**: 格式 `{前缀}-{YYYYMMDD}-{序号}` | 后端自动生成 |
| BR-222 | **记录状态**: draft(草稿) → submitted(已提交) → approved(已审批) / rejected(已驳回) | `Record.status` 状态机 |
| BR-223 | **草稿自动保存**: 填写过程中自动保存草稿（每 30 秒） | 前端定时保存 |
| BR-224 | **必填校验**: 提交时校验必填字段 | 前端校验 + 后端校验 |
| BR-225 | **格式校验**: 根据字段类型和 validation 配置校验 | 前端校验 + 后端校验 |
| BR-226 | **审批集成**: 如果模板配置需要审批，提交后触发工作流 | 工作流引擎集成 |
| BR-227 | **审批通过**: 审批通过后，记录状态变为 approved，可导出 PDF | 状态更新 |
| BR-228 | **审批驳回**: 审批驳回后，记录回到 draft 状态，可修改重新提交 | 状态回退 |
| BR-229 | **记录删除**: 只有草稿状态可以删除 | 前端限制 + 后端校验 |
| BR-230 | **记录编辑**: 只有草稿状态可以编辑 | 前端限制 + 后端校验 |

---

#### 19.5.3 统一查询规则(BR-231 ~ BR-240)

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-231 | **按部门筛选**: 支持按分类（部门）筛选记录 | 查询条件 WHERE category |
| BR-232 | **按类型筛选**: 支持按记录模板筛选 | 查询条件 WHERE templateId |
| BR-233 | **按时间筛选**: 支持按创建时间范围筛选 | 查询条件 WHERE createdAt BETWEEN |
| BR-234 | **按状态筛选**: 支持按记录状态筛选 | 查询条件 WHERE status |
| BR-235 | **关键字搜索**: 支持按记录编号、创建人搜索 | 查询条件 WHERE recordNumber LIKE |
| BR-236 | **导出 Excel**: 支持将查询结果导出为 Excel | xlsx 库导出 |
| BR-237 | **导出 PDF**: 支持将单条记录导出为 PDF | pdfmake 生成 |
| BR-238 | **打印**: 支持打印记录（使用打印模板） | window.print() |
| BR-239 | **权限控制**: 只能查看自己部门的记录 | 后端权限过滤 |
| BR-240 | **分页查询**: 支持分页，默认每页 20 条 | 查询参数 page/limit |

---

#### 19.5.4 防篡改与合规规则（BR-251 ~ BR-260）⭐ BRCGS 核心要求

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-251 | **记录变更历史**: 记录状态为 `approved` 后，任何修改必须记录到 RecordChangeLog | 后端拦截器自动记录 |
| BR-252 | **修改已审批记录**: 修改已审批记录需要特殊权限 + 二次审批 | RBAC 权限校验 + 工作流 |
| BR-253 | **软删除**: 删除记录不真正删除数据，设置 `deletedAt` 时间戳 | `Record.deletedAt` + 查询过滤 |
| BR-254 | **服务器时间戳**: 记录创建/提交时间必须使用服务器时间，不信任客户端 | 后端强制覆盖 `createdAt`, `submittedAt` |
| BR-255 | **时间校验**: 提交时间与服务器时间差超过 5 分钟，拒绝提交 | 后端 API 校验逻辑 |
| BR-256 | **离线标记**: 离线填写的记录标记 `offlineFilled = true`，审核时重点关注 | 移动端提交时标识 |
| BR-257 | **签名时间锁定**: 电子签名时，锁定服务器时间戳 `signatureTimestamp` | 后端签名 API 自动记录 |
| BR-258 | **批次自动关联**: 如果模板启用批次关联，记录提交时自动关联批次 | 后端自动填充 `relatedBatchId` |
| BR-259 | **变更审计轨迹**: RecordChangeLog 记录修改人、修改时间、修改原因、批准人 | 数据库字段完整记录 |
| BR-260 | **记录状态流转**: draft → submitted → approved/rejected → deleted，状态不可逆向 | 状态机校验 |

---

#### 19.5.5 记录保留期限管理规则（BR-261 ~ BR-265）⭐ P0-5 修复

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| **BR-261 (P0-5)** | **保留期限配置**: RecordTemplate 可配置保留年限（默认 3 年，投诉记录 5 年） | `RecordTemplate.retentionYears` |
| **BR-262 (P0-5)** | **保留截止日期计算**: Record 创建时自动计算 `retentionUntil = createdAt + retentionYears` | 后端创建记录时自动计算 |
| **BR-263 (P0-5)** | **自动归档标记**: 定时任务每天检查，将过期记录标记为 `to_archive` | 定时任务 + 状态更新 |
| **BR-264 (P0-5)** | **归档确认**: 管理员审核 `to_archive` 记录，确认后标记为 `archived` | 手动确认 + API |
| **BR-265 (P0-5)** | **归档记录只读**: `archived` 状态的记录不可修改，只能查看和导出 | 前端限制 + 后端校验 |

---

### 19.6 API 设计(12 个端点)

#### 19.6.1 记录模板 API(6 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/record-templates` | 查询模板列表 | `?category=&status=` | `RecordTemplate[]` |
| GET | `/api/record-templates/:id` | 查询模板详情 | - | `RecordTemplate` |
| POST | `/api/record-templates` | 创建模板 | `{ name, category, formSchema, ... }` | `RecordTemplate` |
| PUT | `/api/record-templates/:id` | 更新模板 | `{ formSchema, ... }` | `RecordTemplate` |
| POST | `/api/record-templates/:id/archive` | 归档模板 | - | `{ success: true }` |
| GET | `/api/record-templates/:id/preview` | 预览模板 | - | `HTML` |

---

#### 19.6.2 记录实例 API(6 个)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/records` | 查询记录列表 | `?category=&status=&startDate=&endDate=` | `{ items: Record[], total: number }` |
| GET | `/api/records/:id` | 查询记录详情 | - | `Record` |
| POST | `/api/records` | 创建记录 | `{ templateId, formData, status }` | `Record` |
| PUT | `/api/records/:id` | 更新记录（草稿） | `{ formData }` | `Record` |
| POST | `/api/records/:id/submit` | 提交审批 | - | `{ success: true, workflowId }` |
| GET | `/api/records/:id/export-pdf` | 导出 PDF | - | `{ pdfUrl }` |

---

#### 19.6.3 防篡改与审计 API（3 个）⭐ BRCGS 合规

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/records/:id/change-logs` | 查询记录变更历史 | - | `RecordChangeLog[]` |
| POST | `/api/records/:id/signature` | 保存电子签名（锁定时间戳） | `{ signatureBase64, fieldName }` | `{ signatureUrl, signatureTimestamp }` |
| PUT | `/api/records/:id/approved-modify` | 修改已审批记录（需特殊权限） | `{ formData, reason }` | `{ success: true, changeLogId }` |

**API 详细说明**：

**1. 查询记录变更历史**
```typescript
GET /api/records/:id/change-logs

Response: {
  "success": true,
  "data": [
    {
      "id": "log-001",
      "recordId": "rec-001",
      "fieldName": "maintenanceContent",
      "oldValue": "清洁设备外壳",
      "newValue": "清洁设备外壳，更换滤芯",
      "changedBy": "user-001",
      "changedByName": "张三",
      "changedAt": "2024-06-15T15:30:00Z",
      "reason": "补充维保内容",
      "approvedBy": "user-manager",
      "approvedByName": "李经理"
    }
  ]
}
```

**2. 保存电子签名（锁定服务器时间戳）**
```typescript
POST /api/records/:id/signature
Body: {
  signatureBase64: "data:image/png;base64,iVBORw0KGgo...",
  fieldName: "operatorSignature"  // formData 中的字段名
}

// 后端逻辑：
async function saveSignature(recordId: string, dto: SaveSignatureDto) {
  // 1. 上传签名图片到 MinIO
  const signatureUrl = await uploadSignature(dto.signatureBase64)

  // 2. 锁定服务器时间戳
  const signatureTimestamp = new Date()

  // 3. 更新记录
  await prisma.record.update({
    where: { id: recordId },
    data: {
      [`formData.${dto.fieldName}`]: signatureUrl,
      signatureTimestamp  // 服务器时间，不可篡改
    }
  })

  return { signatureUrl, signatureTimestamp }
}

Response: {
  "success": true,
  "signatureUrl": "https://minio.example.com/signatures/xxx.png",
  "signatureTimestamp": "2024-06-15T10:23:45.000Z"
}
```

**3. 修改已审批记录（需特殊权限 + 记录变更历史）**
```typescript
PUT /api/records/:id/approved-modify
Body: {
  formData: { maintenanceContent: "清洁设备外壳，更换滤芯" },
  reason: "补充维保内容"
}

// 后端逻辑：
async function modifyApprovedRecord(recordId: string, dto: ModifyDto, userId: string) {
  // 1. 权限校验（只有质量部 + 管理层可以修改已审批记录）
  if (!hasPermission(userId, 'MODIFY_APPROVED_RECORD')) {
    throw new ForbiddenException('无权限修改已审批记录')
  }

  // 2. 获取原记录
  const record = await prisma.record.findUnique({ where: { id: recordId } })
  if (record.status !== 'approved') {
    throw new BadRequestException('只能修改已审批的记录')
  }

  // 3. 记录变更历史
  const changeLogs = []
  for (const [fieldName, newValue] of Object.entries(dto.formData)) {
    const oldValue = record.formData[fieldName]
    if (oldValue !== newValue) {
      changeLogs.push({
        recordId,
        fieldName,
        oldValue,
        newValue,
        changedBy: userId,
        changedByName: '张三',
        reason: dto.reason
      })
    }
  }

  // 4. 批量创建变更日志
  await prisma.recordChangeLog.createMany({ data: changeLogs })

  // 5. 更新记录
  await prisma.record.update({
    where: { id: recordId },
    data: {
      formData: { ...record.formData, ...dto.formData }
    }
  })

  return { success: true, changeLogId: changeLogs[0].id }
}

Response: {
  "success": true,
  "changeLogId": "log-001",
  "message": "记录已更新，变更历史已记录"
}
```

---

### 19.7 开发工作量估算

#### 19.7.1 后端开发(5 周)

| 模块 | 工作量 | 说明 |
|------|--------|------|
| **记录模板管理** | 1 周 | RecordTemplate CRUD + 版本管理 |
| **记录实例管理** | 1 周 | Record CRUD + 草稿自动保存 |
| **动态数据源** | 0.5 周 | 动态获取下拉选项（设备/物料/用户） |
| **审批集成** | 0.5 周 | 与工作流引擎集成 |
| **防篡改机制** | 1 周 | RecordChangeLog + 时间戳校验 + 签名锁定 ⭐ |
| **PDF 导出** | 1 周 | pdfmake 生成 PDF + 模板渲染 |
| **单元测试** | 0.5 周 | 核心业务逻辑测试 |

**后端合计: 5.5 周**

---

#### 19.7.2 前端开发(6.5 周)

| 模块 | 工作量 | 说明 |
|------|--------|------|
| **表单设计器（PC）** | 2 周 | 拖拽式设计器 + 属性配置 |
| **动态表单渲染（PC）** | 1 周 | 根据 schema 动态渲染 20+ 字段类型 |
| **动态表单渲染（移动端）** | 1.5 周 | uniapp 实现动态渲染 + 移动端特有组件 |
| **记录查询页面** | 0.5 周 | 统一查询入口 + 筛选 + 导出 |
| **变更历史查看** | 0.5 周 | 记录变更历史展示 + 对比视图 ⭐ |
| **E2E 测试** | 1 周 | 关键流程测试 |

**前端合计: 6.5 周**

---

#### 19.7.3 总工作量

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| **后端开发** | 5.5 周 | 包含防篡改机制 + 单元测试 |
| **前端开发（PC + 移动端）** | 6.5 周 | 包含变更历史 + E2E 测试 |
| **联调测试** | 1 周 | 前后端 + 移动端联调 |
| **文档编写** | 0.5 周 | API 文档、用户手册 |

**总计: 11.5 周（约 3 个月）**

**并行开发**(1 名后端 + 2 名前端): **约 6 周（1.5 个月）**

---

### 19.8 成功标准

**记录模板管理**:
- ✅ 管理员可视化创建记录模板（拖拽式）
- ✅ 支持 20+ 种字段类型
- ✅ 支持字段显隐规则、联动规则、计算规则
- ✅ 支持模板版本管理

**动态表单渲染**:
- ✅ PC 端动态渲染表单（Element Plus）
- ✅ 移动端动态渲染表单（uniapp）
- ✅ 支持实时校验、自动保存草稿

**记录实例管理**:
- ✅ 用户在线填写记录
- ✅ 支持审批流程
- ✅ 支持导出 PDF/Excel

**统一查询**:
- ✅ 按部门/类型/时间/状态筛选
- ✅ 查看记录详情
- ✅ 导出/打印

---

**本章节完成 ✅**


---

## 十九章补充：批次追溯系统（BRCGS 核心）⭐⭐⭐ Phase A 基础设施

[⬆️ 返回目录](#-完整目录) | [⬆️ 返回快速导航](#-快速导航)

> **建议上线顺序**: Chapter 16（在动态表单引擎完成后）
> **优先级**: 最高（BRCGS 认证核心要求）
> **依赖**: Chapter 15（动态表单引擎）、Chapter 17（仓库管理系统）
> **说明**: 本章节定义硬编码的批次追溯数据表，是 BRCGS 4 小时追溯的基础保障

---

### 19补1. 系统定位与核心要求

#### 19补1.1 BRCGS 批次追溯要求

**BRCGS 标准 3.9 批次追溯要求**:
- ✅ **4 小时追溯**: 任意成品批次能在 4 小时内追溯到所有原料批次
- ✅ **正向追溯**: 原料批次 → 生产批次 → 成品批次 → 客户
- ✅ **反向追溯**: 成品批次 → 生产批次 → 原料批次
- ✅ **完整链条**: 批次关联不能断裂，每个环节都有明确的批次号
- ✅ **可验证性**: 追溯报告格式规范，外审员可快速验证

---

#### 19补1.2 架构决策：硬编码批次表 vs 动态表单

**最终决策**: ✅ **硬编码批次表 + 动态表单扩展**

| 数据类型 | 存储方式 | 原因 |
|---------|---------|------|
| 批次号 | 硬编码表 | 追溯主线，不可配置 |
| 批次关联关系 | 硬编码表 | 外键约束保证完整性 |
| 产品、原料基础信息 | 硬编码表 | 引用主数据 |
| 生产参数（温度、时间） | 动态表单 | 不同产品参数不同 |
| 质检指标 | 动态表单 | 不同产品标准不同 |
| 操作员签名、照片 | 动态表单 | 符合电子记录需求 |

**硬编码方案优势**:
1. **追溯稳定性**: 数据库外键约束保证追溯链不会断裂
2. **查询性能**: 直接 JOIN 查询，毫秒级响应（4 小时追溯要求）
3. **审核可信度**: 外审员更信任结构化的数据表
4. **数据完整性**: 禁止删除有关联的批次记录
5. **向后兼容**: 系统升级不影响历史追溯数据

---

### 19补2. 数据模型设计

#### 19补2.1 核心批次表（4 个硬编码表）

```prisma
// ==================== 批次追溯系统（硬编码） ====================

// 1. 原料批次表（Chapter 17 仓库管理系统定义）
model MaterialBatch {
  id                String   @id @default(cuid())
  batchNumber       String   @unique              // 批次号（供应商提供 或 系统生成）
  materialId        String                        // 原料 ID
  materialCode      String                        // 原料编号
  materialName      String                        // 原料名称
  supplierId        String                        // 供应商 ID
  supplierName      String                        // 供应商名称
  quantity          Float                         // 入库数量
  unit              String                        // 单位
  productionDate    DateTime?                     // 生产日期
  expiryDate        DateTime?                     // 过期日期
  receivedDate      DateTime                      // 收货日期
  status            String   @default("in_stock") // in_stock | used | expired | scrapped

  // 批次追溯关联
  usedInProduction  BatchMaterialUsage[]          // 用于哪些生产批次

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([batchNumber])
  @@index([materialId])
  @@map("material_batches")
}

// 2. 生产批次表（核心追溯表）
model ProductionBatch {
  id                String   @id @default(cuid())
  batchNumber       String   @unique              // 生产批次号（系统生成）
  productId         String                        // 产品 ID
  productCode       String                        // 产品编号
  productName       String                        // 产品名称
  recipeId          String?                       // 配方 ID
  recipeName        String?                       // 配方名称
  productionDate    DateTime                      // 生产日期
  plannedQuantity   Float                         // 计划数量
  actualQuantity    Float                         // 实际数量
  unit              String                        // 单位
  status            String   @default("in_progress") // in_progress | completed | cancelled

  // 生产信息
  workshopId        String?                       // 车间 ID
  productionLine    String?                       // 生产线
  shift             String?                       // 班次（早班/中班/晚班）

  // 批次追溯关联
  materialsUsed     BatchMaterialUsage[]          // 使用的原料批次
  finishedGoods     FinishedGoodsBatch[]          // 产出的成品批次
  relatedRecords    Record[]                      // 关联的生产记录（动态表单）

  // 创建信息
  createdBy         String
  createdByName     String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  completedAt       DateTime?

  @@index([batchNumber])
  @@index([productId])
  @@index([productionDate])
  @@map("production_batches")
}

// 3. 批次物料使用表（关联原料批次和生产批次）
model BatchMaterialUsage {
  id                String   @id @default(cuid())
  productionBatchId String                        // 生产批次 ID
  productionBatchNo String                        // 生产批次号（冗余，加速查询）
  materialBatchId   String                        // 原料批次 ID
  materialBatchNo   String                        // 原料批次号（冗余）
  materialId        String                        // 原料 ID
  materialCode      String                        // 原料编号
  materialName      String                        // 原料名称
  quantity          Float                         // 使用数量
  unit              String                        // 单位
  requisitionId     String?                       // 领料单 ID（关联到仓库管理）
  requisitionItemId String?                       // 领料明细 ID

  // 外键关联
  productionBatch   ProductionBatch @relation(fields: [productionBatchId], references: [id], onDelete: Restrict)
  materialBatch     MaterialBatch @relation(fields: [materialBatchId], references: [id], onDelete: Restrict)

  createdAt         DateTime @default(now())

  @@index([productionBatchId])
  @@index([materialBatchId])
  @@index([productionBatchNo])
  @@index([materialBatchNo])
  @@map("batch_material_usage")
}

// 4. 成品批次表
model FinishedGoodsBatch {
  id                String   @id @default(cuid())
  batchNumber       String   @unique              // 成品批次号（系统生成 或 与生产批次号一致）
  productionBatchId String                        // 生产批次 ID
  productionBatchNo String                        // 生产批次号（冗余）
  productId         String                        // 产品 ID
  productCode       String                        // 产品编号
  productName       String                        // 产品名称
  quantity          Float                         // 数量
  unit              String                        // 单位
  productionDate    DateTime                      // 生产日期
  expiryDate        DateTime?                     // 过期日期
  status            String   @default("in_stock") // in_stock | shipped | expired | recalled

  // 仓库信息
  warehouseId       String?
  warehouseName     String?
  location          String?                       // 库位

  // 批次追溯关联
  productionBatch   ProductionBatch @relation(fields: [productionBatchId], references: [id], onDelete: Restrict)
  relatedRecords    Record[]                      // 关联的质检记录（动态表单）
  shipments         ShipmentItem[]                // 出库记录

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([batchNumber])
  @@index([productionBatchId])
  @@index([productId])
  @@map("finished_goods_batches")
}

// 5. 出库明细表（追溯到客户）
model ShipmentItem {
  id                String   @id @default(cuid())
  shipmentId        String                        // 出库单 ID
  shipmentNumber    String                        // 出库单号
  finishedGoodsBatchId String                     // 成品批次 ID
  finishedGoodsBatchNo String                     // 成品批次号（冗余）
  productId         String
  productCode       String
  productName       String
  quantity          Float
  unit              String

  // 客户信息
  customerId        String
  customerName      String

  // 批次追溯关联
  finishedGoodsBatch FinishedGoodsBatch @relation(fields: [finishedGoodsBatchId], references: [id], onDelete: Restrict)

  shippedAt         DateTime
  createdAt         DateTime @default(now())

  @@index([finishedGoodsBatchId])
  @@index([shipmentId])
  @@map("shipment_items")
}
```

---

#### 19补2.2 批次号生成规则配置

```prisma
// 系统配置表（支持批次号格式自定义）
model SystemConfig {
  id          String   @id @default(cuid())
  key         String   @unique                   // 配置键
  value       String                             // 配置值
  label       String                             // 配置名称
  description String?                            // 说明
  type        String   @default("text")          // text | number | json | boolean
  category    String   @default("system")        // system | batch | notification

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("system_configs")
}

// 批次号格式配置示例:
// key: "production_batch_number_format"
// value: "PB-{YYYYMMDD}-{序号}"
// 或: "PB-{产品编号}-{YYYYMMDD}-{序号}"

// key: "material_batch_number_format"
// value: "MAT-{原料编号}-{YYYYMMDD}-{序号}"

// key: "finished_goods_batch_number_format"
// value: "FG-{YYYYMMDD}-{序号}"
// 或: "same_as_production" （与生产批次号一致）
```

---

### 19补3. 追溯 API 示例

**反向追溯（成品 → 原料）**:
```typescript
POST /api/trace/backward
Body: { finishedGoodsBatchNumber: "FG-20240615-001" }

Response: {
  "finishedGoodsBatch": { ... },
  "productionBatch": { ... },
  "materials": [
    { "materialName": "面粉", "batchNumber": "MAT-FLOUR-20240610-001", ... },
    { "materialName": "鸡蛋", "batchNumber": "SUPPLIER-EGG-20240614", ... }
  ],
  "relatedRecords": [ ... ],  // 生产记录（动态表单）
  "duration": "120ms"
}
```

**正向追溯（原料 → 成品 → 客户）**:
```typescript
POST /api/trace/forward
Body: { materialBatchNumber: "MAT-FLOUR-20240610-001" }

Response: {
  "materialBatch": { ... },
  "usedInProductions": [
    {
      "productionBatchNumber": "PB-20240615-001",
      "finishedGoods": [
        {
          "batchNumber": "FG-20240615-001",
          "shipments": [
            { "customerName": "沃尔玛", "quantity": 60 },
            { "customerName": "家乐福", "quantity": 40 }
          ]
        }
      ]
    }
  ]
}
```

---

### 19补4. 动态表单与批次关联

**RecordTemplate 批次关联配置**:
```prisma
model RecordTemplate {
  // ...原有字段

  // 批次关联配置
  batchLinkEnabled Boolean  @default(false)       // 是否启用批次关联
  batchLinkType    String?                        // "production" | "finished_goods"
  batchLinkField   String?                        // 哪个字段存储批次号
}
```

**Record 自动关联到批次**:
```prisma
model Record {
  // ...原有字段

  // 批次关联
  relatedBatchType   String?                      // "production" | "finished_goods"
  relatedBatchId     String?                      // 批次 ID
  relatedBatchNumber String?                      // 批次号（冗余，加速查询）

  productionBatch    ProductionBatch? @relation(...)
  finishedGoodsBatch FinishedGoodsBatch? @relation(...)

  @@index([relatedBatchNumber])
}
```

---

### 19补5. 业务规则

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-241 | **批次号唯一性**: 所有批次号必须全局唯一 | `@unique` 约束 |
| BR-242 | **批次号不可修改**: 批次创建后批次号不能修改 | 前端禁用 + 后端校验 |
| **BR-243 (P0-2 修复)** | **批次关联不可删除**: 有关联的批次不能删除，外键设置 `onDelete: Restrict` | Prisma 外键约束 |
| BR-244 | **4 小时追溯**: 任意成品批次能在 4 小时内完成追溯 | 数据库索引优化 |
| **BR-245 (P0-2 修复)** | **追溯链完整性**: 成品 → 生产 → 原料 链条不能断裂，所有外键必须有索引 | Prisma 外键约束 + 索引 |
| BR-246 | **批次号格式可配置**: 支持企业自定义批次号格式 | SystemConfig 配置 |
| BR-247 | **追溯权限控制**: 只有质量部 + 管理层可查看 | RBAC 权限 |
| BR-248 | **追溯报告导出**: 支持导出 PDF 格式 | pdfmake 生成 |

---

### 19补6. 成功标准

**批次追溯系统**:
- ✅ 原料入库自动创建 MaterialBatch
- ✅ 生产计划自动创建 ProductionBatch
- ✅ 领料完成自动关联 BatchMaterialUsage
- ✅ 成品入库自动创建 FinishedGoodsBatch
- ✅ 反向追溯：成品 → 原料（4 小时内完成）
- ✅ 正向追溯：原料 → 成品 → 客户
- ✅ 追溯报告 PDF 导出
- ✅ 动态表单记录自动关联到批次
- ✅ 批次号格式可配置
- ✅ 外键约束保证数据完整性

---

**本章节补充完成 ✅**


---

## 二十、移动端应用设计（uniapp 跨平台）⭐⭐⭐ Phase A 基础设施

[⬆️ 返回目录](#-完整目录) | [⬆️ 返回快速导航](#-快速导航)

> **建议上线顺序**: Chapter 17（在动态表单引擎和批次追溯系统完成后）
> **优先级**: 最高（核心基础设施）
> **依赖**: Chapter 15（动态表单引擎）、Chapter 16（批次追溯系统）
> **说明**: 移动端是现场人员（生产、仓库、设备维护）的主要工作界面，必须在业务模块实施前完成

> **设计时间**: 2026-02-12
> **技术方案**: uniapp + Vue 3 + uni-ui
> **编译目标**: 微信小程序 + H5 + Android APP + iOS APP
> **核心定位**: 移动端数据采集与审批平台

---

### 20.1 系统定位与核心优势

#### 20.1.1 系统定位

**移动端应用作为 PC 端的延伸**，专注于"现场数据采集"和"移动审批"场景。

**核心职责**:
1. **现场数据采集**: 维保记录、检验记录、清洁记录等现场填写
2. **移动审批**: 待办任务查看、审批操作
3. **日历视图**: 维护计划、培训计划可视化
4. **消息通知**: 微信推送、站内消息
5. **离线填写**: 无网络环境也能填写，联网后自动同步
6. **扫码追溯**: 扫描批次码追溯（v2.0 条形码）

---

#### 20.1.2 核心优势

| 优势 | 说明 |
|------|------|
| **一套代码多端运行** | 编译为微信小程序 + H5 + APP，降低开发成本 |
| **现场拍照上传** | 调用手机相机，现场拍照上传 |
| **电子签名** | 手写签字板，电子签名 |
| **离线填写** | 本地存储，联网后自动同步 |
| **微信生态** | 微信通知推送，用户体验好 |
| **语音输入** | 语音转文字，提高填写效率 |

---

### 20.2 技术架构

#### 20.2.1 技术选型

```
前端技术栈:
- uniapp (基于 Vue 3 Composition API)
- uni-ui 组件库
- Pinia (状态管理)
- uni-request (网络请求)
- uni-storage (本地存储)

编译目标:
- 微信小程序（主推，80% 用户）
- H5 网页（备用，20% 用户）
- Android APP（可选）
- iOS APP（可选）

后端 API:
- 复用 PC 端 API
- 新增移动端专用 API（文件上传、消息推送）
```

---

#### 20.2.2 整体架构图

```
┌────────────────────────────────────────────────────────┐
│                   移动端应用层                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 微信小程序   │  │   H5 网页   │  │   原生 APP  │   │
│  │  (80%)      │  │   (15%)     │  │   (5%)      │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│         │                 │                │           │
│         └─────────────────┴────────────────┘           │
│                         │                              │
│                  uniapp 统一编译                        │
│                         │                              │
└─────────────────────────┼──────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────┐
│                     后端 API                           │
├─────────────────────────┼──────────────────────────────┤
│  - 待办任务 API (复用)                                  │
│  - 动态表单 API (复用)                                  │
│  - 记录查询 API (复用)                                  │
│  - 文件上传 API (移动端优化)                            │
│  - 微信推送 API (新增)                                  │
│  - 离线同步 API (新增)                                  │
└────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────┐
│                  第三方服务                             │
├─────────────────────────┼──────────────────────────────┤
│  - 微信小程序 API (扫码、拍照、位置)                    │
│  - 微信公众号 API (消息推送)                            │
│  - 腾讯云 COS (文件加速上传)                            │
└────────────────────────────────────────────────────────┘
```

---

### 20.3 核心功能设计

#### 20.3.1 首页（/pages/index/index）

```
页面布局:

┌─────────────────────────────────┐
│  顶部导航栏                      │
│  [← 返回] 首页      [🔔消息(3)] │
├─────────────────────────────────┤
│                                 │
│  用户信息卡片                    │
│  ┌───────────────────────────┐ │
│  │ 👤 张三  |  工程部          │ │
│  │ 今日待办: 3 个               │ │
│  │ 未读消息: 5 条               │ │
│  └───────────────────────────┘ │
│                                 │
│  待办任务（优先）                │
│  ┌───────────────────────────┐ │
│  │ 🔧 设备维保待办              │ │
│  │ 搅拌机A需要维保              │ │
│  │ 截止日期: 2024-06-15         │ │
│  │                [去处理 →]   │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ ✅ 清洁消毒记录待审批        │ │
│  │ 张三提交的清洁记录           │ │
│  │ 提交时间: 2024-06-14 15:30  │ │
│  │                [去审批 →]   │ │
│  └───────────────────────────┘ │
│                                 │
│  快捷入口（宫格）                │
│  ┌─────┬─────┬─────┬─────┐    │
│  │ 📝  │ 📋  │ 📅  │ 📊  │    │
│  │记录  │查询  │日历  │统计  │    │
│  │填写  │记录  │视图  │分析  │    │
│  ├─────┼─────┼─────┼─────┤    │
│  │ 🔍  │ 📦  │ 🔧  │ ⚙️  │    │
│  │扫码  │仓库  │设备  │设置  │    │
│  │追溯  │管理  │台账  │     │    │
│  └─────┴─────┴─────┴─────┘    │
│                                 │
└─────────────────────────────────┘

底部 Tabbar:
[首页] [待办] [记录] [我的]
```

---

#### 20.3.2 待办列表（/pages/todo/list）

```
页面布局:

┌─────────────────────────────────┐
│  [← 返回] 我的待办               │
├─────────────────────────────────┤
│                                 │
│  Tab 切换                        │
│  [待处理(3)] [已完成(15)]        │
│                                 │
│  待处理列表（卡片式）             │
│  ┌───────────────────────────┐ │
│  │ 🔧 设备维保待办              │ │
│  │ 搅拌机A需要日常保养          │ │
│  │ 计划日期: 2024-06-15         │ │
│  │ 提前 2 天提醒               │ │
│  │ [开始维保]                   │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ ✅ 清洁消毒记录待审批        │ │
│  │ 张三 | 生产车间清洁          │ │
│  │ 提交时间: 2024-06-14 15:30  │ │
│  │ [查看详情] [审批]            │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 📋 领料单待审批              │ │
│  │ 李四 | 面粉 100kg            │ │
│  │ 提交时间: 2024-06-14 10:00  │ │
│  │ [查看详情] [审批]            │ │
│  └───────────────────────────┘ │
│                                 │
│  已完成列表                      │
│  ┌───────────────────────────┐ │
│  │ ✅ 设备维保记录              │ │
│  │ 烤箱B年度检修 | 已审批       │ │
│  │ 完成时间: 2024-06-10         │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

#### 20.3.3 动态表单填写（/pages/records/create）

```
页面布局（以设备维保记录为例）:

┌─────────────────────────────────┐
│  [← 返回] 设备维保记录           │
├─────────────────────────────────┤
│                                 │
│  表单字段（动态渲染）             │
│                                 │
│  设备编号 *                      │
│  ┌───────────────────────────┐ │
│  │ 请选择设备       [▼]       │ │
│  └───────────────────────────┘ │
│                                 │
│  设备名称（自动带出）             │
│  ┌───────────────────────────┐ │
│  │ 搅拌机A                    │ │
│  └───────────────────────────┘ │
│                                 │
│  维保日期 *                      │
│  ┌───────────────────────────┐ │
│  │ 2024-06-15      [📅]      │ │
│  └───────────────────────────┘ │
│                                 │
│  维保类型 *                      │
│  ○ 日常保养  ○ 故障维修  ○ 年度检修│
│                                 │
│  维保内容 *                      │
│  ┌───────────────────────────┐ │
│  │ 请输入维保内容...           │ │
│  │                           │ │
│  │                           │ │
│  └───────────────────────────┘ │
│                                 │
│  现场照片                        │
│  ┌─────┬─────┬─────┐          │
│  │ 📷  │ 📷  │  +  │          │
│  │     │     │添加 │          │
│  └─────┴─────┴─────┘          │
│                                 │
│  维保人员签名 *                  │
│  ┌───────────────────────────┐ │
│  │                           │ │
│  │    请在此处签名 ✍️          │ │
│  │                           │ │
│  └───────────────────────────┘ │
│  [清除] [重签]                  │
│                                 │
│  操作按钮                        │
│  [保存草稿]      [提交审批]     │
│                                 │
└─────────────────────────────────┘

移动端特有功能:
- 拍照: 调用手机相机，现场拍照
- 签名: 手写签字板，支持触摸签名
- 语音: 语音输入维保内容（v2.0）
- 扫码: 扫描设备二维码自动填充（v2.0）
```

---

#### 20.3.4 日历视图（/pages/calendar/index）

```
页面布局:

┌─────────────────────────────────┐
│  [← 返回] 维护计划日历           │
├─────────────────────────────────┤
│                                 │
│  月份切换                        │
│  [<] 2024 年 6 月 [>]           │
│                                 │
│  日历                            │
│  ┌─────────────────────────────┐│
│  │ 日 一 二 三 四 五 六         ││
│  ├─────────────────────────────┤│
│  │       1   2   3             ││
│  │   🔧      🔧                 ││
│  │ 4   5   6   7   8   9  10   ││
│  │🔧                            ││
│  │11  12  13  14  15  16  17   ││
│  │         🔧  🔧               ││
│  │18  19  20  21  22  23  24   ││
│  │                              ││
│  │25  26  27  28  29  30       ││
│  └─────────────────────────────┘│
│                                 │
│  今日计划（2024-06-15）          │
│  ┌───────────────────────────┐ │
│  │ 🔧 搅拌机A - 日常保养        │ │
│  │ 责任人: 张三                │ │
│  │ 状态: 待执行                │ │
│  │         [开始维保]          │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 🔧 烤箱B - 年度检修          │ │
│  │ 责任人: 李四                │ │
│  │ 状态: 进行中                │ │
│  │         [查看详情]          │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

#### 20.3.5 记录查询（/pages/records/list）

```
页面布局:

┌─────────────────────────────────┐
│  [← 返回] 记录查询               │
├─────────────────────────────────┤
│                                 │
│  搜索框                          │
│  ┌───────────────────────────┐ │
│  │ 🔍 搜索记录编号/设备名...   │ │
│  └───────────────────────────┘ │
│                                 │
│  筛选条件（折叠式）               │
│  ┌───────────────────────────┐ │
│  │ 筛选  [▼]                   │ │
│  ├───────────────────────────┤ │
│  │ 部门: [全部 ▼]              │ │
│  │ 记录类型: [全部 ▼]          │ │
│  │ 状态: [全部 ▼]              │ │
│  │ 时间: [最近一周 ▼]          │ │
│  │         [重置] [应用]       │ │
│  └───────────────────────────┘ │
│                                 │
│  快捷筛选（Tag）                 │
│  [全部] [待审批] [已审批] [草稿]│
│                                 │
│  记录列表（卡片式）               │
│  ┌───────────────────────────┐ │
│  │ 设备维保记录                │ │
│  │ MAINT-20240615-001         │ │
│  │ 维保日期: 2024-06-15        │ │
│  │ 设备: 搅拌机A               │ │
│  │ 状态: ✅ 已审批             │ │
│  │         [查看详情]          │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 清洁消毒记录                │ │
│  │ CLEAN-20240614-002         │ │
│  │ 清洁日期: 2024-06-14        │ │
│  │ 区域: 生产车间              │ │
│  │ 状态: ⏳ 待审批             │ │
│  │         [查看详情]          │ │
│  └───────────────────────────┘ │
│                                 │
│  [加载更多...]                  │
│                                 │
└─────────────────────────────────┘
```

---

### 20.4 移动端特有功能实现

#### 20.4.1 拍照上传

```vue
<!-- 拍照上传组件 -->
<template>
  <view class="photo-upload">
    <view class="photo-list">
      <view 
        v-for="(photo, index) in photos" 
        :key="index"
        class="photo-item"
      >
        <image :src="photo" mode="aspectFill" />
        <view class="photo-delete" @click="handleDelete(index)">
          <text>×</text>
        </view>
      </view>
      
      <view 
        v-if="photos.length < maxCount"
        class="photo-add"
        @click="handleChooseImage"
      >
        <text class="icon">📷</text>
        <text class="text">拍照</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  maxCount: { type: Number, default: 9 },
  maxSize: { type: Number, default: 5 } // MB
})

const photos = ref([])

// 选择图片（拍照或相册）
async function handleChooseImage() {
  uni.chooseImage({
    count: props.maxCount - photos.value.length,
    sizeType: ['compressed'], // 压缩图
    sourceType: ['camera', 'album'], // 相机 + 相册
    success: async (res) => {
      const tempFilePaths = res.tempFilePaths
      
      // 上传到服务器
      for (const filePath of tempFilePaths) {
        const uploadedUrl = await uploadImage(filePath)
        photos.value.push(uploadedUrl)
      }
    }
  })
}

// 上传图片
async function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: '/api/upload',
      filePath: filePath,
      name: 'file',
      success: (uploadRes) => {
        const data = JSON.parse(uploadRes.data)
        resolve(data.url)
      },
      fail: reject
    })
  })
}

// 删除图片
function handleDelete(index) {
  photos.value.splice(index, 1)
}
</script>
```

---

#### 20.4.2 电子签名

```vue
<!-- 电子签名组件 -->
<template>
  <view class="signature-pad">
    <canvas 
      canvas-id="signatureCanvas"
      class="canvas"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    />
    
    <view class="actions">
      <button @click="handleClear">清除</button>
      <button @click="handleSave" type="primary">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const canvasContext = ref(null)
const isDrawing = ref(false)
const lastPoint = ref({ x: 0, y: 0 })

onMounted(() => {
  canvasContext.value = uni.createCanvasContext('signatureCanvas')
  canvasContext.value.setStrokeStyle('#000')
  canvasContext.value.setLineWidth(3)
  canvasContext.value.setLineCap('round')
})

function handleTouchStart(e) {
  isDrawing.value = true
  const touch = e.touches[0]
  lastPoint.value = { x: touch.x, y: touch.y }
}

function handleTouchMove(e) {
  if (!isDrawing.value) return
  
  const touch = e.touches[0]
  const currentPoint = { x: touch.x, y: touch.y }
  
  canvasContext.value.beginPath()
  canvasContext.value.moveTo(lastPoint.value.x, lastPoint.value.y)
  canvasContext.value.lineTo(currentPoint.x, currentPoint.y)
  canvasContext.value.stroke()
  canvasContext.value.draw(true)
  
  lastPoint.value = currentPoint
}

function handleTouchEnd() {
  isDrawing.value = false
}

function handleClear() {
  canvasContext.value.clearRect(0, 0, 400, 200)
  canvasContext.value.draw()
}

async function handleSave() {
  uni.canvasToTempFilePath({
    canvasId: 'signatureCanvas',
    success: async (res) => {
      const signatureUrl = await uploadSignature(res.tempFilePath)
      emit('update:modelValue', signatureUrl)
      uni.showToast({ title: '签名保存成功' })
    }
  })
}

async function uploadSignature(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: '/api/upload',
      filePath: filePath,
      name: 'file',
      success: (uploadRes) => {
        const data = JSON.parse(uploadRes.data)
        resolve(data.url)
      },
      fail: reject
    })
  })
}
</script>
```

---

#### 20.4.3 离线填写与同步

```typescript
// utils/offline.ts

import { ref } from 'vue'

// 离线数据队列
const offlineQueue = ref<any[]>([])

// 检查网络状态
async function checkNetwork() {
  return new Promise<boolean>((resolve) => {
    uni.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== 'none')
      },
      fail: () => resolve(false)
    })
  })
}

// 保存到离线队列
export async function saveToOfflineQueue(data: any) {
  const queueItem = {
    ...data,
    timestamp: Date.now(),
    synced: false,
    retryCount: 0
  }
  
  offlineQueue.value.push(queueItem)
  
  // 存储到本地
  uni.setStorageSync('offlineQueue', offlineQueue.value)
  
  // 尝试同步
  await syncOfflineData()
}

// 同步离线数据
export async function syncOfflineData() {
  const isOnline = await checkNetwork()
  if (!isOnline) {
    console.log('网络不可用，暂不同步')
    return
  }
  
  const queue = uni.getStorageSync('offlineQueue') || []
  
  for (const item of queue) {
    if (item.synced) continue
    
    try {
      // 上传到服务器
      const res = await uni.request({
        url: '/api/records',
        method: 'POST',
        data: item.data
      })
      
      // 标记为已同步
      item.synced = true
      
      uni.showToast({ title: '数据已同步' })
    } catch (error) {
      console.error('同步失败', error)
      
      // 重试计数
      item.retryCount++
      
      // 重试次数超过 3 次，提示用户
      if (item.retryCount >= 3) {
        uni.showToast({ 
          title: '数据同步失败，请检查网络', 
          icon: 'none' 
        })
      }
    }
  }
  
  // 更新存储（移除已同步的）
  const unsynced = queue.filter(item => !item.synced)
  uni.setStorageSync('offlineQueue', unsynced)
  
  // 更新队列
  offlineQueue.value = unsynced
}

// 监听网络状态变化
uni.onNetworkStatusChange((res) => {
  if (res.isConnected) {
    console.log('网络已连接，开始同步')
    syncOfflineData()
  }
})

// 获取未同步数据数量
export function getUnsyncedCount() {
  return offlineQueue.value.filter(item => !item.synced).length
}
```

---

#### 20.4.4 微信消息推送

```typescript
// server/src/wechat/wechat.service.ts

import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WechatService {
  private readonly appId = process.env.WECHAT_APPID;
  private readonly appSecret = process.env.WECHAT_APPSECRET;
  private accessToken: string;
  
  // 获取 Access Token
  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }
    
    const res = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`
    );
    
    this.accessToken = res.data.access_token;
    
    // 2 小时后过期，提前 10 分钟刷新
    setTimeout(() => {
      this.accessToken = null;
    }, 110 * 60 * 1000);
    
    return this.accessToken;
  }
  
  // 发送订阅消息（待办提醒）
  async sendTodoNotification(userId: string, todo: any) {
    const openId = await this.getUserOpenId(userId);
    const accessToken = await this.getAccessToken();
    
    const data = {
      touser: openId,
      template_id: process.env.WECHAT_TEMPLATE_TODO,
      page: `/pages/todo/detail?id=${todo.id}`,
      data: {
        thing1: { value: todo.title },         // 待办标题
        time2: { value: todo.dueDate },        // 截止时间
        thing3: { value: todo.type },          // 待办类型
      }
    };
    
    await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      data
    );
  }
  
  // 发送临期预警
  async sendExpiryAlert(userId: string, batch: any) {
    const openId = await this.getUserOpenId(userId);
    const accessToken = await this.getAccessToken();
    
    const data = {
      touser: openId,
      template_id: process.env.WECHAT_TEMPLATE_EXPIRY,
      page: `/pages/warehouse/batch-detail?id=${batch.id}`,
      data: {
        thing1: { value: `物料批次 ${batch.batchNumber}` },
        date2: { value: batch.expiryDate },
        thing3: { value: '即将过期，请尽快处理' },
      }
    };
    
    await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      data
    );
  }
  
  // 发送审批通知
  async sendApprovalNotification(userId: string, record: any) {
    const openId = await this.getUserOpenId(userId);
    const accessToken = await this.getAccessToken();
    
    const data = {
      touser: openId,
      template_id: process.env.WECHAT_TEMPLATE_APPROVAL,
      page: `/pages/records/detail?id=${record.id}`,
      data: {
        thing1: { value: record.templateName },  // 记录类型
        thing2: { value: record.createdByName }, // 提交人
        time3: { value: record.submittedAt },    // 提交时间
      }
    };
    
    await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      data
    );
  }
  
  // 获取用户 OpenID
  private async getUserOpenId(userId: string): Promise<string> {
    // 从数据库查询用户的 OpenID
    const user = await this.userService.findOne(userId);
    return user.wechatOpenId;
  }
}
```

---

### 20.5 API 设计(4 个移动端专用 API)

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/mobile/upload` | 移动端文件上传（优化） | `FormData(file)` | `{ url, thumbnail }` |
| POST | `/api/mobile/sync` | 离线数据同步 | `{ queue: [...] }` | `{ success: true, synced: number }` |
| GET | `/api/mobile/config` | 获取小程序配置 | - | `{ appId, version, ... }` |
| POST | `/api/mobile/feedback` | 用户反馈 | `{ content, images }` | `{ success: true }` |

---

### 20.6 开发工作量估算

#### 20.6.1 移动端开发(5 周)

| 模块 | 工作量 | 说明 |
|------|--------|------|
| **基础框架搭建** | 0.5 周 | uniapp 项目初始化 + 路由 + 状态管理 |
| **首页 + 待办列表** | 0.5 周 | 首页布局 + 待办列表 |
| **动态表单渲染** | 1.5 周 | 支持 20+ 字段类型（移动端适配） |
| **拍照 + 签名** | 0.5 周 | 拍照上传 + 电子签名组件 |
| **离线填写** | 0.5 周 | 本地存储 + 同步队列 |
| **日历视图** | 0.5 周 | 日历组件 + 计划展示 |
| **记录查询** | 0.5 周 | 查询列表 + 筛选 |
| **微信推送集成** | 0.5 周 | 订阅消息 + 模板配置 |
| **E2E 测试** | 0.5 周 | 关键流程测试 |

**移动端合计: 5 周**

---

#### 20.6.2 后端 API 调整(1 周)

| 模块 | 工作量 | 说明 |
|------|--------|------|
| **文件上传优化** | 0.3 周 | 移动端文件压缩 + 缩略图 |
| **离线同步 API** | 0.3 周 | 批量同步接口 |
| **微信推送服务** | 0.4 周 | 微信 API 集成 + 消息模板 |

**后端合计: 1 周**

---

#### 20.6.3 总工作量

| 阶段 | 工作量 | 说明 |
|------|--------|------|
| **移动端开发** | 5 周 | 包含 E2E 测试 |
| **后端 API 调整** | 1 周 | 移动端专用 API |
| **联调测试** | 0.5 周 | 移动端 + 后端联调 |
| **小程序审核** | 1 周 | 微信小程序提审 + 发布 |

**总计: 7.5 周（约 2 个月）**

**并行开发**(1 名移动端 + 1 名后端): **约 5 周**

---

### 20.7 依赖与风险

#### 20.7.1 技术依赖

| 依赖项 | 版本 | 用途 | 风险等级 |
|--------|------|------|----------|
| **uniapp** | 最新版 | 跨平台开发框架 | 低 |
| **uni-ui** | 最新版 | UI 组件库 | 低 |
| **微信小程序 API** | 最新版 | 拍照、扫码、推送 | 低 |
| **腾讯云 COS** | 最新版 | 文件加速上传 | 低 |

**关键依赖**:
- ✅ uniapp 社区成熟，风险低
- ✅ 微信小程序 API 稳定

---

#### 20.7.2 业务风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **微信小程序审核不通过** | 无法上线 | 中 | 提前了解审核规则，避免违规内容 |
| **离线同步数据丢失** | 用户数据丢失 | 低 | 本地持久化存储，同步失败重试 |
| **拍照文件过大** | 上传失败 | 中 | 自动压缩图片，限制大小 |
| **电子签名不清晰** | 审计问题 | 低 | 签名预览确认，支持重签 |

---

### 20.8 成功标准

**移动端基础功能**:
- ✅ 一套代码编译为微信小程序 + H5 + APP
- ✅ 首页 + 待办列表 + 记录查询

**移动端特有功能**:
- ✅ 现场拍照上传（调用相机）
- ✅ 电子签名（手写签字板）
- ✅ 离线填写（本地存储 + 自动同步）

**动态表单渲染**:
- ✅ 支持 20+ 字段类型（移动端适配）
- ✅ 实时校验、自动保存草稿

**微信生态集成**:
- ✅ 微信订阅消息推送
- ✅ 微信扫码（v2.0 条形码）

---

**本章节完成 ✅**


---

## 二十一、系统运维与监控设计 ⭐⭐⭐ Phase A 基础设施

[⬆️ 返回目录](#-完整目录) | [⬆️ 返回快速导航](#-快速导航)

> **建议上线顺序**: Chapter 21（与 Phase A 其他模块同步实施）
> **优先级**: 最高（系统稳定性保障）
> **依赖**: 无（独立模块）
> **说明**: 本章节定义系统运维、监控、备份、部署、审计日志的完整方案

> **设计时间**: 2026-02-12
> **系统版本**: v1.0.0 (MVP)
> **审查来源**: IT 系统管理员（李工）多部门需求审查
---

### 21.1 数据备份与恢复设计

#### 21.1.1 备份策略总览

| 备份对象 | 备份方式 | 备份频率 | 保留时长 | RPO | RTO |
|---------|---------|---------|---------|-----|-----|
| PostgreSQL | pg_dump 全量 | 每天凌晨 2:00 | 7 天 | 24h | 2h |
| MinIO 文件 | mc mirror | 每天凌晨 3:00 | 7 天 | 24h | 2h |
| Redis | RDB 快照 | 每天凌晨 1:00 | 3 天 | 24h | 1h |
| 应用配置 | Git 版本控制 | 实时 | 永久 | 0 | 10min |

**RPO（Recovery Point Objective）**: 数据恢复点目标，最多丢失 24 小时数据
**RTO（Recovery Time Objective）**: 恢复时间目标，2 小时内恢复系统

---

#### 21.1.2 PostgreSQL 备份方案

**方案：pg_dump + 定时任务 + 本地存储**

**Docker Compose 配置**：

```yaml
# docker-compose.yml 新增备份服务
services:
  postgres-backup:
    image: postgres:15
    container_name: doc_postgres_backup
    restart: unless-stopped
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=document_system
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - ./backups/postgres:/backups
    entrypoint: ["/bin/bash", "-c"]
    command:
      - |
        echo "等待 PostgreSQL 启动..."
        sleep 30
        echo "开始备份循环..."
        while true; do
          timestamp=$(date +%Y%m%d_%H%M%S)
          echo "[$(date)] 开始备份数据库..."
          PGPASSWORD=${POSTGRES_PASSWORD} pg_dump \
            -h postgres \
            -U ${POSTGRES_USER} \
            -d document_system \
            --format=custom \
            --compress=9 \
            > /backups/backup_$timestamp.dump

          if [ $? -eq 0 ]; then
            echo "[$(date)] 备份成功: backup_$timestamp.dump"
          else
            echo "[$(date)] 备份失败!"
          fi

          # 只保留最近 7 天的备份
          find /backups -name "backup_*.dump" -mtime +7 -delete
          echo "[$(date)] 清理旧备份完成"

          # 等待 24 小时
          sleep 86400
        done
    depends_on:
      - postgres
```

**手动备份命令**：
```bash
# 立即执行备份
docker exec doc_postgres_backup bash -c 'PGPASSWORD=${POSTGRES_PASSWORD} pg_dump -h postgres -U ${POSTGRES_USER} -d document_system --format=custom > /backups/manual_$(date +%Y%m%d_%H%M%S).dump'

# 验证备份文件
ls -lh backups/postgres/
```

**恢复命令**：
```bash
# 1. 停止应用服务
docker-compose stop server

# 2. 恢复数据库
docker exec -i doc_postgres pg_restore \
  -U postgres \
  -d document_system \
  --clean \
  --if-exists \
  < backups/postgres/backup_20260212_020000.dump

# 3. 重启应用
docker-compose start server
```

---

#### 21.1.3 MinIO 文件备份方案

**方案：mc mirror + 定时任务**

**Docker Compose 配置**：

```yaml
services:
  minio-backup:
    image: minio/mc:latest
    container_name: doc_minio_backup
    restart: unless-stopped
    volumes:
      - ./backups/minio:/backups
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        echo "等待 MinIO 启动..."
        sleep 30

        echo "配置 mc 别名..."
        mc alias set local http://minio:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

        echo "开始备份循环..."
        while true; do
          timestamp=$(date +%Y%m%d_%H%M%S)
          echo "[$(date)] 开始备份 MinIO 文件..."

          # 镜像备份所有桶
          mc mirror local/documents /backups/$timestamp/documents
          mc mirror local/templates /backups/$timestamp/templates
          mc mirror local/audit-archive /backups/$timestamp/audit-archive

          if [ $? -eq 0 ]; then
            echo "[$(date)] 备份成功: $timestamp"
          else
            echo "[$(date)] 备份失败!"
          fi

          # 只保留最近 7 天
          find /backups -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
          echo "[$(date)] 清理旧备份完成"

          # 等待 24 小时
          sleep 86400
        done
    depends_on:
      - minio
```

**手动备份命令**：
```bash
# 立即备份
docker exec doc_minio_backup mc mirror local/documents /backups/$(date +%Y%m%d)/documents

# 验证备份
ls -lh backups/minio/
```

**恢复命令**：
```bash
# 恢复指定日期的文件
docker exec doc_minio_backup mc mirror /backups/20260212/documents local/documents
```

---

#### 21.1.4 灾难恢复演练

**每月演练内容**：

1. **模拟数据库损坏**：
   ```bash
   # 备份当前数据
   docker exec doc_postgres pg_dump -U postgres document_system > /tmp/before_test.sql

   # 删除测试表
   docker exec -it doc_postgres psql -U postgres -d document_system \
     -c "DROP TABLE documents;"

   # 从备份恢复
   docker exec -i doc_postgres pg_restore -U postgres -d document_system \
     < backups/postgres/backup_latest.dump

   # 验证数据完整性
   docker exec -it doc_postgres psql -U postgres -d document_system \
     -c "SELECT COUNT(*) FROM documents;"
   ```

2. **完整系统恢复**：
   - 目标：2 小时内完成
   - 步骤：停止服务 → 恢复数据库 → 恢复文件 → 恢复配置 → 启动服务 → 验证功能

---

### 21.2 系统监控设计

#### 21.2.1 监控架构

```
┌─────────────────────────────────────────────────────────────┐
│                     监控与日志架构                            │
└─────────────────────────────────────────────────────────────┘

应用层
  ├── NestJS (metrics 端点 /metrics)
  │     └── @willsoto/nestjs-prometheus
  │
  ├── Docker 容器日志
  │     └── JSON 格式日志输出
  │
  └── PostgreSQL 慢查询日志

           ↓

采集层
  ├── Prometheus (指标采集)
  │     └── 抓取 /metrics 端点
  │
  └── Promtail (日志采集)
        └── 读取 Docker 日志

           ↓

存储层
  ├── Prometheus TSDB (30天)
  └── Loki (日志存储，30天)

           ↓

可视化层
  └── Grafana
        ├── 系统仪表板
        ├── 应用仪表板
        ├── 业务仪表板
        └── 日志查询界面

           ↓

告警层
  └── Alertmanager
        ├── 企业微信
        ├── 邮件
        └── 钉钉
```

---

#### 21.2.2 监控指标清单

**系统指标**（自动采集）：

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `node_cpu_seconds_total` | CPU 使用时间 | > 80% 持续 5min |
| `node_memory_MemAvailable_bytes` | 可用内存 | < 512MB |
| `node_disk_io_time_seconds_total` | 磁盘 I/O 时间 | > 90% 持续 5min |
| `node_filesystem_avail_bytes` | 磁盘可用空间 | < 10% |

**应用指标**（NestJS）：

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `doc_system_http_requests_total` | HTTP 请求总数 | 监控 QPS |
| `doc_system_http_request_duration_seconds` | 请求响应时间 | P99 > 2s |
| `doc_system_http_errors_total{status="5xx"}` | 服务端错误数 | 错误率 > 5% |
| `doc_system_db_query_duration_seconds` | 数据库查询耗时 | P99 > 1s |

**业务指标**（自定义）：

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `doc_system_document_uploads_total` | 文档上传次数 | 监控趋势 |
| `doc_system_approval_duration_seconds` | 审批耗时 | P99 > 24h |
| `doc_system_active_users` | 在线用户数 | 监控峰值 |
| `doc_system_login_failures_total` | 登录失败次数 | > 10/min（暴力破解） |

---

#### 21.2.3 NestJS 集成 Prometheus

**1. 安装依赖**：

```bash
cd server
npm install @willsoto/nestjs-prometheus prom-client
```

**2. 配置 app.module.ts**：

```typescript
import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'doc_system_',
        },
      },
      path: '/metrics',
      defaultLabels: {
        app: 'document-system',
        environment: process.env.NODE_ENV || 'development',
      },
    }),
    // ... 其他模块
  ],
})
export class AppModule {}
```

**3. 自定义业务指标**：

```typescript
// monitoring/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('doc_system_document_uploads_total')
    public documentUploadsCounter: Counter<string>,

    @InjectMetric('doc_system_approval_duration_seconds')
    public approvalDurationHistogram: Histogram<string>,

    @InjectMetric('doc_system_active_users')
    public activeUsersGauge: Gauge<string>,
  ) {}

  // 记录文档上传
  recordDocumentUpload(level: string, department: string) {
    this.documentUploadsCounter.labels(level, department).inc();
  }

  // 记录审批耗时
  recordApprovalDuration(duration: number, result: 'approved' | 'rejected') {
    this.approvalDurationHistogram.labels(result).observe(duration);
  }

  // 更新在线用户数
  updateActiveUsers(count: number) {
    this.activeUsersGauge.set(count);
  }
}
```

---

#### 21.2.4 告警规则

**monitoring/alerts/app-alerts.yml**：

```yaml
groups:
  - name: application_alerts
    interval: 30s
    rules:
      # HTTP 错误率过高
      - alert: HighHTTPErrorRate
        expr: |
          rate(doc_system_http_errors_total{status=~"5.."}[5m])
          /
          rate(doc_system_http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "HTTP 5xx 错误率过高"
          description: "最近 5 分钟错误率: {{ $value | humanizePercentage }}"

      # API 响应慢
      - alert: SlowAPIResponse
        expr: |
          histogram_quantile(0.99,
            rate(doc_system_http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API 响应时间过长"
          description: "P99 响应时间: {{ $value | humanizeDuration }}"

      # 登录失败次数异常（疑似暴力破解）
      - alert: SuspiciousBruteForce
        expr: |
          rate(doc_system_login_failures_total[1m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "检测到疑似暴力破解攻击"
          description: "1 分钟内登录失败 {{ $value }} 次"

  - name: system_alerts
    interval: 30s
    rules:
      # CPU 使用率高
      - alert: HighCPUUsage
        expr: |
          100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高"
          description: "CPU 使用率: {{ $value | humanize }}%"

      # 内存不足
      - alert: LowMemory
        expr: |
          node_memory_MemAvailable_bytes < 512 * 1024 * 1024
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "可用内存不足"
          description: "剩余内存: {{ $value | humanize1024 }}B"

      # 服务宕机
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "服务 {{ $labels.job }} 宕机"
          description: "服务已停止响应超过 1 分钟"
```

---

### 21.3 部署架构设计

#### 21.3.1 MVP 阶段部署架构

**单节点 Docker Compose 架构**：

```
┌──────────────────────────────────────────────────────────┐
│               单服务器 (4C8G / 8C16G)                      │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────┐                                          │
│  │   Nginx     │  ← 反向代理 + 静态文件                    │
│  │   :80/:443  │                                          │
│  └──────┬──────┘                                          │
│         │                                                  │
│  ┌──────▼──────┐     ┌─────────────┐                     │
│  │  NestJS     │────▶│ PostgreSQL  │                     │
│  │  :3000      │     │  :5432      │                     │
│  └──────┬──────┘     └─────────────┘                     │
│         │                                                  │
│         ├────────────▶ Redis :6379                        │
│         │                                                  │
│         └────────────▶ MinIO :9000                        │
│                                                            │
│  ┌─────────────────────────────────────┐                 │
│  │          监控栈                       │                 │
│  │  Prometheus + Grafana + Loki         │                 │
│  └─────────────────────────────────────┘                 │
│                                                            │
│  ┌─────────────────────────────────────┐                 │
│  │          备份服务                     │                 │
│  │  PostgreSQL Backup + MinIO Backup    │                 │
│  └─────────────────────────────────────┘                 │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**服务器配置要求**：

| 阶段 | CPU | 内存 | 磁盘 | 并发用户 |
|------|-----|------|------|----------|
| 开发/测试 | 2C | 4G | 50GB SSD | 10 |
| MVP 生产 | 4C | 8G | 100GB SSD | 100 |
| 扩展 | 8C | 16G | 200GB SSD | 500 |

---

#### 21.3.2 部署命令

**初始化部署**：

```bash
# 1. 克隆代码
git clone <repository-url>
cd noidear

# 2. 配置环境变量
cp .env.example .env.production
vi .env.production  # 修改密码和配置

# 3. 构建前端
cd client
npm install
npm run build

# 4. 启动所有服务
cd ..
docker-compose -f docker-compose.prod.yml up -d

# 5. 初始化数据库
docker exec doc_server npx prisma migrate deploy
docker exec doc_server npx prisma db seed

# 6. 验证服务状态
docker-compose -f docker-compose.prod.yml ps
```

**日常运维**：

```bash
# 查看日志
docker-compose -f docker-compose.prod.yml logs -f server

# 重启服务
docker-compose -f docker-compose.prod.yml restart server

# 更新代码
git pull
docker-compose -f docker-compose.prod.yml build server
docker-compose -f docker-compose.prod.yml up -d server

# 备份数据（手动触发）
docker exec doc_postgres_backup bash -c '<备份命令>'

# 查看资源使用
docker stats
```

---

#### 21.3.3 高可用方案（未来扩展）

**Phase 2: 高可用架构**（生产规模）：

```
┌────────────────────────────────────────────────────────┐
│                  负载均衡器                              │
│            Nginx + Keepalived (主备)                    │
└───────────┬──────────────┬─────────────────────────────┘
            │              │
    ┌───────▼──┐      ┌───▼────────┐      ┌────────────┐
    │ NestJS 1 │      │ NestJS 2   │      │ NestJS 3   │
    └───────┬──┘      └───┬────────┘      └──────┬─────┘
            │             │                       │
            └─────────────┼───────────────────────┘
                          │
          ┌───────────────┼───────────────────────┐
          │               │                       │
   ┌──────▼─────┐  ┌─────▼──────┐  ┌────────────▼────┐
   │ PostgreSQL │  │   Redis    │  │  MinIO Cluster  │
   │  主 + 从    │  │  Sentinel  │  │    (4 节点)      │
   └────────────┘  └────────────┘  └─────────────────┘
```

**扩展方案**：

| 组件 | MVP | 高可用方案 |
|------|-----|-----------|
| NestJS | 单实例 | 3+ 实例 + 负载均衡 |
| PostgreSQL | 单节点 | 主从复制（Patroni + etcd） |
| Redis | 单节点 | Sentinel（1主2从） |
| MinIO | 单节点 | 分布式集群（4节点，纠删码） |
| Nginx | 单实例 | Keepalived 双机热备 |

---

### 21.4 安全审计日志设计

#### 21.4.1 审计日志分类

| 日志类型 | 内容 | 保留时长 | 重要性 | BRCGS 要求 |
|---------|------|---------|--------|-----------|
| **登录日志** | 用户登录/登出、IP、设备 | 90 天 | P0 | ✅ 3.5.4 |
| **权限变更日志** | 角色分配、权限修改 | 永久 | P0 | ✅ 3.5.3 |
| **敏感操作日志** | 文档删除、数据导出、审批 | 永久 | P0 | ✅ 3.5.2 |
| **操作日志** | 文档上传、编辑、查看 | 30 天 | P1 | - |
| **系统日志** | 应用启动、错误、异常 | 30 天 | P1 | - |

---

#### 21.4.2 数据模型

```prisma
// ==================== 登录日志 ====================
model LoginLog {
  id          String   @id @default(cuid())
  userId      String?  // 登录失败时为 null
  username    String
  action      String   // "login" | "logout" | "login_failed"
  ipAddress   String
  userAgent   String
  location    String?  // IP 地理位置（可选）
  loginTime   DateTime @default(now())
  logoutTime  DateTime?
  status      String   // "success" | "failed"
  failReason  String?  // 失败原因

  @@index([userId])
  @@index([loginTime])
  @@index([ipAddress])
  @@index([status])
  @@map("login_logs")
}

// ==================== 权限变更日志 ====================
model PermissionLog {
  id              String   @id @default(cuid())
  operatorId      String   // 操作人 ID
  operatorName    String
  targetUserId    String   // 被操作用户 ID
  targetUsername  String
  action          String   // "assign_role" | "revoke_role" | "change_department"
  beforeValue     Json     // 变更前值
  afterValue      Json     // 变更后值
  reason          String?  // 变更原因
  approvedBy      String?  // 批准人 ID（如需要审批）
  approvedByName  String?
  ipAddress       String
  createdAt       DateTime @default(now())

  @@index([operatorId])
  @@index([targetUserId])
  @@index([action])
  @@index([createdAt])
  @@map("permission_logs")
}

// ==================== 敏感操作日志 ====================
model SensitiveLog {
  id            String   @id @default(cuid())
  userId        String
  username      String
  action        String   // "delete_document" | "export_data" | "approve" | "reject"
  resourceType  String   // "document" | "task" | "record" | "user"
  resourceId    String
  resourceName  String
  details       Json     // 详细信息
  ipAddress     String
  userAgent     String
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([resourceType])
  @@index([createdAt])
  @@map("sensitive_logs")
}
```

---

#### 21.4.3 审计日志 API

```typescript
// ==================== 登录日志 API ====================
POST   /api/v1/audit/login-logs/query      // 查询登录日志
GET    /api/v1/audit/login-logs/export     // 导出登录日志
GET    /api/v1/audit/login-logs/stats      // 登录统计

// ==================== 权限变更日志 API ====================
POST   /api/v1/audit/permission-logs/query
GET    /api/v1/audit/permission-logs/export
GET    /api/v1/audit/permission-logs/:userId  // 查询某用户的权限变更历史

// ==================== 敏感操作日志 API ====================
POST   /api/v1/audit/sensitive-logs/query
GET    /api/v1/audit/sensitive-logs/export
GET    /api/v1/audit/sensitive-logs/stats    // 敏感操作统计

// ==================== 综合查询 API ====================
POST   /api/v1/audit/search                  // 跨日志类型搜索
GET    /api/v1/audit/dashboard                // 审计仪表板统计
GET    /api/v1/audit/timeline/:userId        // 用户操作时间线
```

---

#### 21.4.4 自动记录拦截器

**敏感操作装饰器**：

```typescript
// audit/decorators/sensitive-log.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const SENSITIVE_LOG_KEY = 'sensitive_log';

export const SensitiveLog = (action: string, resourceType: string) =>
  SetMetadata(SENSITIVE_LOG_KEY, { action, resourceType });
```

**使用示例**：

```typescript
// document.controller.ts
import { UseInterceptors } from '@nestjs/common';
import { SensitiveLog } from '@/audit/decorators/sensitive-log.decorator';
import { SensitiveLogInterceptor } from '@/audit/interceptors/sensitive-log.interceptor';

@Controller('documents')
@UseInterceptors(SensitiveLogInterceptor)
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  // 删除文档 - 敏感操作
  @Delete(':id')
  @SensitiveLog('delete_document', 'document')
  async deleteDocument(@Param('id') id: string) {
    return this.documentService.delete(id);
  }

  // 批量导出数据 - 敏感操作
  @Post('export')
  @SensitiveLog('export_data', 'document')
  async exportDocuments(@Body() dto: ExportDto) {
    return this.documentService.export(dto);
  }

  // 审批通过 - 敏感操作
  @Post(':id/approve')
  @SensitiveLog('approve', 'document')
  async approveDocument(@Param('id') id: string) {
    return this.documentService.approve(id);
  }
}
```

---

#### 21.4.5 审计日志归档策略

**定时归档任务**：

```typescript
// audit/tasks/archive.task.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { MinioService } from '@/minio/minio.service';

@Injectable()
export class AuditArchiveTask {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
  ) {}

  // 每月 1 号凌晨执行
  @Cron('0 0 1 * *')
  async archiveLoginLogs() {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // 查询需要归档的日志
    const logs = await this.prisma.loginLog.findMany({
      where: { loginTime: { lt: threeMonthsAgo } },
    });

    if (logs.length === 0) {
      console.log('[归档任务] 无需归档登录日志');
      return;
    }

    // 导出到 JSON 文件
    const filename = `login_logs_${format(threeMonthsAgo, 'yyyyMM')}.json`;
    const content = JSON.stringify(logs, null, 2);

    // 上传到 MinIO
    await this.minioService.upload(
      'audit-archive',
      filename,
      Buffer.from(content),
      'application/json',
    );

    // 删除已归档数据
    await this.prisma.loginLog.deleteMany({
      where: { loginTime: { lt: threeMonthsAgo } },
    });

    console.log(`[归档任务] 已归档 ${logs.length} 条登录日志到 ${filename}`);
  }
}
```

---

#### 21.4.6 BRCGS 审计报告生成

```typescript
// audit/audit-report.service.ts
@Injectable()
export class AuditReportService {
  constructor(private prisma: PrismaService) {}

  // 生成 BRCGS 审计报告
  async generateBRCGSReport(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. 登录日志统计
    const loginStats = await this.prisma.loginLog.count({
      where: { loginTime: { gte: start, lte: end } },
    });

    const loginFailures = await this.prisma.loginLog.count({
      where: {
        loginTime: { gte: start, lte: end },
        status: 'failed',
      },
    });

    // 2. 权限变更记录
    const permissionChanges = await this.prisma.permissionLog.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. 敏感操作记录
    const sensitiveOps = await this.prisma.sensitiveLog.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. 记录修改历史
    const recordChanges = await this.prisma.recordChangeLog.findMany({
      where: {
        changedAt: { gte: start, lte: end },
      },
      orderBy: { changedAt: 'desc' },
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalLogins: loginStats,
        loginFailures,
        loginFailureRate: (loginFailures / loginStats * 100).toFixed(2) + '%',
        permissionChanges: permissionChanges.length,
        sensitiveOperations: sensitiveOps.length,
        recordModifications: recordChanges.length,
      },
      brcgsCompliance: {
        '3.5.2': recordChanges.length > 0 ? '✅ 已记录所有记录修改' : '⚠️ 无记录修改',
        '3.5.3': permissionChanges.length >= 0 ? '✅ 已记录权限变更' : 'N/A',
        '3.5.4': loginStats > 0 ? '✅ 已记录所有登录' : 'N/A',
      },
    };
  }
}
```

---

### 21.5 业务规则

| 规则编号 | 规则描述 | 实施方式 |
|---------|---------|---------|
| **BR-261** | PostgreSQL 每天自动备份，保留 7 天 | Docker 定时任务 |
| **BR-262** | MinIO 文件每天自动备份，保留 7 天 | mc mirror 定时任务 |
| **BR-263** | 系统 RPO 目标 24 小时，RTO 目标 2 小时 | 备份策略 + 恢复演练 |
| **BR-264** | Prometheus 指标保留 30 天 | Prometheus 配置 |
| **BR-265** | Loki 日志保留 30 天 | Loki 配置 |
| **BR-266** | API P99 响应时间 > 2秒 触发告警 | Prometheus 告警规则 |
| **BR-267** | HTTP 5xx 错误率 > 5% 触发告警 | Prometheus 告警规则 |
| **BR-268** | 登录失败次数 > 10次/分钟 触发告警（疑似暴力破解） | Prometheus 告警规则 |
| **BR-269** | 登录日志保留 90 天，权限变更/敏感操作永久保留 | 定时归档任务 |
| **BR-270** | 所有敏感操作必须记录审计日志 | SensitiveLog 拦截器 |
| **BR-271** | 每月执行一次灾难恢复演练 | 运维流程 |
| **BR-272** | 审计日志归档到 MinIO audit-archive 桶 | 定时任务 + MinIO |

---

### 21.6 成功标准

**数据安全**:
- ✅ PostgreSQL 备份成功率 100%
- ✅ MinIO 文件备份成功率 100%
- ✅ 灾难恢复演练 RTO < 2 小时

**系统监控**:
- ✅ Prometheus 成功采集所有指标
- ✅ Grafana 可视化仪表板正常显示
- ✅ 告警规则触发准确，无误报

**审计日志**:
- ✅ 登录/权限/敏感操作 100% 记录
- ✅ 审计日志可查询、可导出
- ✅ 符合 BRCGS 3.5.2/3.5.3/3.5.4 要求

**部署架构**:
- ✅ Docker Compose 一键部署
- ✅ 所有服务健康检查通过
- ✅ 支持 100 并发用户

---

**本章节完成 ✅**

---

## 第二十二章：技术债务与待实施改进

> **目的**: 记录代码实现与设计文档的差异，作为后续开发的改进清单
> **更新时间**: 2026-02-13
> **检查范围**: DESIGN.md vs schema.prisma + Controller + Vue 组件

---

### 22.1 数据模型待补充（P1 优先级）

#### 22.1.1 Document 表归档/作废字段（P1-1）

**问题描述**:
- 当前 Document 表缺少归档/作废相关字段
- 文档状态只有 draft/under_review/approved，无法标记为 archived/obsolete
- 不符合 BRCGS 文档管理合规要求

**影响范围**:
- BRCGS 3.11.2 文档作废流程无法实施
- 无法追踪归档原因和时间
- 无法记录作废责任人

**修复方案**:

```prisma
// server/src/prisma/schema.prisma
model Document {
  id              String    @id
  level           Int
  number          String    @unique
  title           String
  filePath        String
  fileName        String
  fileSize        Int
  fileType        String
  version         Decimal   @default(1.0) @db.Decimal(3, 1)
  status          String    // 新增状态: "archived" | "obsolete"
  creatorId       String
  approverId      String?
  approvedAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  // ==================== 新增归档/作废字段 ====================
  archiveReason   String?    // 归档原因
  archivedAt      DateTime?  // 归档时间
  archivedBy      String?    // 归档人 ID（关联 User.id）

  obsoleteReason  String?    // 作废原因
  obsoletedAt     DateTime?  // 作废时间
  obsoletedBy     String?    // 作废人 ID（关联 User.id）

  // 关联关系
  creator         User      @relation("DocumentCreator", fields: [creatorId], references: [id])
  approver        User?     @relation("DocumentApprover", fields: [approverId], references: [id])
  archiver        User?     @relation("DocumentArchiver", fields: [archivedBy], references: [id])
  obsoleter       User?     @relation("DocumentObsoleter", fields: [obsoletedBy], references: [id])

  @@index([status])
  @@index([archivedAt])
  @@index([obsoletedAt])
  @@map("documents")
}
```

**迁移命令**:

```bash
# 生成迁移文件
npx prisma migrate dev --name add_document_archive_fields

# 迁移内容
ALTER TABLE documents ADD COLUMN archive_reason VARCHAR(500);
ALTER TABLE documents ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN archived_by VARCHAR(50);
ALTER TABLE documents ADD COLUMN obsolete_reason VARCHAR(500);
ALTER TABLE documents ADD COLUMN obsoleted_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN obsoleted_by VARCHAR(50);

CREATE INDEX idx_documents_archived_at ON documents(archived_at);
CREATE INDEX idx_documents_obsoleted_at ON documents(obsoleted_at);
```

**配套实现**:
- API 端点: `POST /api/v1/documents/:id/archive` 和 `POST /api/v1/documents/:id/obsolete`
- DTO 验证: ArchiveDocumentDto、ObsoleteDocumentDto
- 前端界面: DocumentDetail.vue 新增归档/作废按钮和对话框
- 业务规则: BR-273 ~ BR-277（归档/作废流程规则）

**预估工作量**: 2-3 小时

---

#### 22.1.2 Permission 和 UserPermission 表（P1-2）

**问题描述**:
- 当前系统只有简单的角色权限（admin/manager/user）
- 无法实现细粒度权限控制（如跨部门查看特定记录）
- 无法满足 BR-017/018/019 业务规则要求

**影响范围**:
- 质量部无法跨部门查看记录
- 无法实现资源级权限（查看特定文档、特定记录）
- 权限变更无法审计

**修复方案**:

```prisma
// server/src/prisma/schema.prisma

model Permission {
  id          String   @id @default(cuid())
  code        String   @unique  // 权限编码: "viewRecords:production"
  name        String              // 权限名称: "查看生产记录"
  category    String              // 权限类别: document | record | approval | system
  scope       String   @default("department")  // 权限范围: department | cross_department | global
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       UserPermission[]

  @@index([category])
  @@index([scope])
  @@map("permissions")
}

model UserPermission {
  id            String   @id @default(cuid())
  userId        String
  permissionId  String
  grantedBy     String   // 授权人 ID
  grantedByName String   // 授权人姓名
  grantedAt     DateTime @default(now())
  expiresAt     DateTime?  // 权限过期时间（可选）
  reason        String?    // 授权原因

  // 资源级权限（可选）
  resourceType  String?  // 资源类型: document | record | task
  resourceId    String?  // 资源 ID

  user          User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission    Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([userId, permissionId, resourceType, resourceId])
  @@index([userId])
  @@index([permissionId])
  @@index([expiresAt])
  @@map("user_permissions")
}
```

**配套实现**:
- 权限定义: 初始化 12+ 权限（文档、记录、审批、系统权限）
- 权限装饰器: `@RequirePermission('viewRecords:crossDepartment')`
- 权限守卫: PermissionGuard（检查用户权限、过期时间）
- API 端点: `/api/v1/permissions`（查询、授予、撤销权限）
- 前端界面: UserPermissions.vue（权限管理页面）
- 业务规则: BR-017/018/019、BR-278 ~ BR-280

**预估工作量**: 8-16 小时

---

#### 22.1.3 WorkflowTemplate/Instance/Task 表（P1-3）

**问题描述**:
- 当前审批流程硬编码在业务逻辑中
- 无法实现可配置的工作流引擎
- 无法满足审批超时升级、并行审批等复杂需求

**影响范围**:
- 审批流程不灵活，新增审批节点需要修改代码
- 无法实现审批超时自动升级（BR-1.19 ~ BR-1.22）
- 无法实现并行审批（BR-1.15 ~ BR-1.18）
- 无法实现工作流取消（BR-1.26）

**修复方案**:

```prisma
// server/src/prisma/schema.prisma

model WorkflowTemplate {
  id            String   @id @default(cuid())
  code          String   @unique  // 工作流编码: "document_approval_001"
  name          String              // 工作流名称
  departmentId  String              // 所属部门 ID
  category      String              // 类别: document | task | record
  steps         Json                // 工作流步骤配置（JSON 数组）
  version       Int      @default(1)
  status        String   @default("active")  // active | inactive
  createdBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  department    Department        @relation(fields: [departmentId], references: [id])
  instances     WorkflowInstance[]

  @@index([departmentId])
  @@index([category])
  @@index([status])
  @@map("workflow_templates")
}

model WorkflowInstance {
  id              String   @id @default(cuid())
  templateId      String
  templateCode    String
  resourceType    String      // 资源类型: document | task | record
  resourceId      String      // 资源 ID
  resourceTitle   String
  initiatorId     String      // 发起人 ID
  initiatorName   String
  status          String      // pending | in_progress | approved | rejected | cancelled | timeout
  currentStep     Int         // 当前步骤序号
  startedAt       DateTime    @default(now())
  completedAt     DateTime?
  cancelledAt     DateTime?
  cancelledBy     String?
  cancelReason    String?

  template        WorkflowTemplate @relation(fields: [templateId], references: [id])
  tasks           WorkflowTask[]

  @@index([templateId])
  @@index([resourceType, resourceId])
  @@index([initiatorId])
  @@index([status])
  @@map("workflow_instances")
}

model WorkflowTask {
  id              String   @id @default(cuid())
  instanceId      String
  stepIndex       Int
  stepName        String
  assigneeId      String      // 审批人 ID
  assigneeName    String
  parallelMode    Boolean     @default(false)  // 是否并行审批
  parallelGroupId String?     // 并行组 ID
  status          String      // pending | approved | rejected | timeout | skipped
  action          String?     // approve | reject | timeout
  comment         String?     // 审批意见
  dueAt           DateTime?   // 截止时间
  startedAt       DateTime?
  completedAt     DateTime?
  escalatedTo     String?     // 超时升级给谁（User ID）
  escalatedAt     DateTime?

  instance        WorkflowInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@index([instanceId])
  @@index([assigneeId])
  @@index([status])
  @@index([dueAt])
  @@map("workflow_tasks")
}
```

**配套实现**:
- 工作流引擎: WorkflowService（启动、审批、取消、超时检查）
- 定时任务: WorkflowScheduler（每 10 分钟检查超时任务）
- API 端点: `/api/v1/workflows`（启动、审批、取消、查询）
- 前端配置界面: WorkflowTemplateEditor.vue（可视化工作流设计器）
- 业务规则: BR-1.12 ~ BR-1.22、BR-1.26

**预估工作量**: 24-40 小时

---

### 22.2 完整技术方案（API + 业务规则 + 前端界面）

> **目的**: 补充 P1-1、P1-2、P1-3 的完整实现方案，确保开发时有清晰的技术指导

---

#### 22.2.1 P1-1: Document 归档/作废功能完整方案

##### 📋 业务规则补充

**BR-346: 文档归档规则**
- 归档条件：文档状态必须为 `approved`（已发布），不能归档草稿或审核中的文档
- 归档原因：必填，最少 10 个字符，说明归档原因
- 归档权限：仅文档创建者或管理员可归档
- 归档后状态：文档状态变更为 `archived`，不可再编辑
- 归档后访问：归档后仍可查看和下载，但搜索时默认不显示（需勾选"包含归档文档"）

**BR-347: 文档作废规则**
- 作废条件：文档状态必须为 `approved`（已发布）
- 作废原因：必填，最少 10 个字符，说明作废原因（如"发现重大错误"、"流程变更"）
- 作废权限：仅质量部管理员或系统管理员可作废文档
- 作废后状态：文档状态变更为 `obsolete`，完全不可编辑
- 作废后访问：作废后仍可查看（只读），但搜索时默认不显示，需勾选"包含作废文档"
- 作废通知：作废后自动通知所有曾引用该文档的用户

**BR-348: 归档/作废文档恢复规则**
- 归档恢复：归档的文档可恢复到 `approved` 状态，需提供恢复原因
- 作废不可恢复：作废的文档不可恢复，符合 BRCGS 3.11.2 要求（作废文档应永久标记）
- 恢复权限：仅管理员可恢复归档文档
- 恢复通知：恢复后自动通知相关用户

##### 🔌 API 设计

**1. 归档文档**

```
POST /api/v1/documents/:id/archive
```

**请求体**:
```typescript
{
  "reason": "该文档已过时，新版本为 DOC-2026-002"  // 必填，最少 10 个字符
}
```

**响应**:
```typescript
{
  "success": true,
  "data": {
    "id": "doc_123",
    "status": "archived",
    "archiveReason": "该文档已过时，新版本为 DOC-2026-002",
    "archivedAt": "2026-02-13T10:30:00Z",
    "archivedBy": "user_456"
  }
}
```

**错误响应**:
```typescript
// 400 Bad Request
{
  "success": false,
  "error": "归档原因不能少于 10 个字符"
}

// 403 Forbidden
{
  "success": false,
  "error": "只有文档创建者或管理员可以归档文档"
}

// 422 Unprocessable Entity
{
  "success": false,
  "error": "只能归档已发布的文档，当前状态为 draft"
}
```

**2. 作废文档**

```
POST /api/v1/documents/:id/obsolete
```

**请求体**:
```typescript
{
  "reason": "发现重大错误，需废止使用"  // 必填，最少 10 个字符
}
```

**响应** 同上（status 为 `obsolete`）

**3. 恢复归档文档**

```
POST /api/v1/documents/:id/restore
```

**请求体**:
```typescript
{
  "reason": "文档仍需使用，恢复为有效版本"  // 必填
}
```

**响应**:
```typescript
{
  "success": true,
  "data": {
    "id": "doc_123",
    "status": "approved",
    "restoredAt": "2026-02-13T11:00:00Z",
    "restoredBy": "user_789"
  }
}
```

**4. 查询文档（支持归档/作废筛选）**

```
GET /api/v1/documents?includeArchived=true&includeObsolete=false
```

**查询参数**:
- `includeArchived`: 是否包含归档文档（默认 `false`）
- `includeObsolete`: 是否包含作废文档（默认 `false`）

##### 🎨 前端界面设计

**1. 文档详情页新增按钮**

按钮位置：文档详情页右上角操作按钮组

按钮顺序（从左到右）:
1. `[编辑]` - 主按钮（仅草稿状态可见）
2. `[归档]` - 次要按钮（仅已发布状态 + 有权限时可见）
3. `[作废]` - 危险按钮（仅已发布状态 + 质量部管理员可见）
4. `[下载]` - 次要按钮（始终可见）

**按钮状态映射**:
| 按钮 | 显示条件 | 启用条件 |
|------|---------|----------|
| 归档 | 状态=approved | 当前用户=创建者 或 管理员 |
| 作废 | 状态=approved | 当前用户=质量部管理员 或 系统管理员 |
| 恢复 | 状态=archived | 当前用户=管理员 |

**2. 归档/作废对话框**

对话框尺寸：`60% × 40%`（选择对话框）

对话框内容：
```
┌─────────────────────────────────────────┐
│ 归档文档                         [×]     │
├─────────────────────────────────────────┤
│ 文档名称: 质量手册 V2.0                  │
│ 文档编号: DOC-2026-001                   │
│                                         │
│ *归档原因:                               │
│ [___________________________________]   │
│ [___________________________________]   │
│ [___________________________________]   │
│ 最少 10 个字符                           │
│                                         │
│ ⚠️ 归档后文档将不再显示在默认列表中       │
│ ⚠️ 仍可通过"包含归档文档"选项查看         │
│                                         │
│              [取消]  [确定归档]          │
└─────────────────────────────────────────┘
```

**3. 文档列表页筛选**

搜索栏新增复选框：
```
[✓] 包含归档文档    [ ] 包含作废文档
```

**4. 归档/作废标签显示**

状态标签：
```vue
<el-tag type="primary">已归档</el-tag>  <!-- 蓝色 -->
<el-tag type="danger">已作废</el-tag>   <!-- 红色 -->
```

**5. Vue 3 代码示例**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { archiveDocument, obsoleteDocument } from '@/api/document'

const archiveDialogVisible = ref(false)
const archiveReason = ref('')

const handleArchive = async () => {
  if (archiveReason.value.length < 10) {
    ElMessage.warning('归档原因不能少于 10 个字符')
    return
  }

  try {
    await archiveDocument(documentId, { reason: archiveReason.value })
    ElMessage.success('文档已归档')
    archiveDialogVisible.value = false
    // 刷新文档详情
    fetchDocumentDetail()
  } catch (error) {
    ElMessage.error(error.message || '归档失败')
  }
}

const handleObsolete = async () => {
  const { value: reason } = await ElMessageBox.prompt(
    '请输入作废原因（最少 10 个字符）',
    '作废文档',
    {
      confirmButtonText: '确定作废',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputValidator: (value) => {
        if (!value || value.length < 10) {
          return '作废原因不能少于 10 个字符'
        }
        return true
      }
    }
  )

  try {
    await obsoleteDocument(documentId, { reason })
    ElMessage.success('文档已作废')
    fetchDocumentDetail()
  } catch (error) {
    ElMessage.error(error.message || '作废失败')
  }
}
</script>

<template>
  <div class="document-detail">
    <!-- 操作按钮 -->
    <div class="actions">
      <el-button v-if="canArchive" @click="archiveDialogVisible = true">
        归档
      </el-button>
      <el-button
        v-if="canObsolete"
        type="danger"
        @click="handleObsolete"
      >
        作废
      </el-button>
    </div>

    <!-- 归档对话框 -->
    <el-dialog
      v-model="archiveDialogVisible"
      title="归档文档"
      width="60%"
    >
      <el-form label-width="100px">
        <el-form-item label="文档名称">
          {{ document.title }}
        </el-form-item>
        <el-form-item label="文档编号">
          {{ document.number }}
        </el-form-item>
        <el-form-item label="归档原因" required>
          <el-input
            v-model="archiveReason"
            type="textarea"
            :rows="3"
            placeholder="请输入归档原因（最少 10 个字符）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-alert
          title="归档后文档将不再显示在默认列表中"
          type="warning"
          :closable="false"
        />
      </el-form>
      <template #footer>
        <el-button @click="archiveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleArchive">确定归档</el-button>
      </template>
    </el-dialog>
  </div>
</template>
```

##### ✅ 实施检查清单

```
□ 1. 数据模型
   □ 1a. Document 表新增 6 个归档/作废字段
   □ 1b. 索引创建成功（archived_at, obsoleted_at）
   □ 1c. User 关联关系正确（archiver, obsoleter）

□ 2. API 实现
   □ 2a. POST /api/v1/documents/:id/archive 实现
   □ 2b. POST /api/v1/documents/:id/obsolete 实现
   □ 2c. POST /api/v1/documents/:id/restore 实现
   □ 2d. GET /api/v1/documents 支持 includeArchived/includeObsolete 参数
   □ 2e. DTO 验证（ArchiveDocumentDto, ObsoleteDocumentDto）

□ 3. 业务逻辑
   □ 3a. BR-346 归档规则验证通过
   □ 3b. BR-347 作废规则验证通过
   □ 3c. BR-348 恢复规则验证通过
   □ 3d. 权限校验正确（创建者/管理员）

□ 4. 前端界面
   □ 4a. 文档详情页新增归档/作废按钮
   □ 4b. 归档/作废对话框实现
   □ 4c. 列表页筛选复选框实现
   □ 4d. 归档/作废状态标签显示正确

□ 5. 通知系统
   □ 5a. 作废文档后通知相关用户
   □ 5b. 恢复文档后通知相关用户

□ 6. 测试
   □ 6a. 归档场景测试通过
   □ 6b. 作废场景测试通过
   □ 6c. 恢复场景测试通过
   □ 6d. 权限校验测试通过
```

---

#### 22.2.2 P1-2: 细粒度权限系统完整方案

##### 📋 业务规则补充

**BR-349: 权限定义规则**
- 权限编码格式：`{action}:{scope}:{resource}`，如 `view:cross_department:document`
- 权限类别：document（文档）、record（记录）、task（任务）、approval（审批）、system（系统）
- 权限范围：department（本部门）、cross_department（跨部门）、global（全局）
- 权限不可删除：已使用的权限不可删除，只能停用

**BR-350: 权限授予规则**
- 授权权限：仅管理员或部门主管可授予权限
- 授权原因：必须填写授权原因（如"质量部需要跨部门查看生产记录"）
- 权限过期：可设置权限过期时间（如临时授予 1 个月查看权限）
- 授权通知：权限授予后自动通知被授权用户

**BR-351: 权限撤销规则**
- 撤销权限：管理员或原授权人可撤销权限
- 立即生效：撤销后立即生效，用户刷新页面后失去权限
- 撤销通知：权限撤销后自动通知被撤销用户

**BR-352: 资源级权限规则**
- 资源级权限：可针对特定资源授予权限（如仅查看特定文档 DOC-001）
- 优先级：资源级权限优先于全局权限（如禁止查看 DOC-001，即使有全局查看权限）
- 资源删除：资源删除时，自动删除该资源的所有资源级权限

**BR-353: 权限过期处理规则**
- 定时检查：每日凌晨 1 点检查过期权限
- 自动撤销：过期权限自动撤销
- 过期通知：过期前 3 天通知用户和授权人

##### 🔌 API 设计

**1. 查询所有权限定义**

```
GET /api/v1/permissions
```

**响应**:
```typescript
{
  "success": true,
  "data": [
    {
      "id": "perm_001",
      "code": "document:view",
      "name": "查看文档",
      "category": "document",
      "scope": "department",
      "description": "查看本部门文档"
    },
    {
      "id": "perm_002",
      "code": "document:view:cross_department",
      "name": "跨部门查看文档",
      "category": "document",
      "scope": "cross_department",
      "description": "查看其他部门文档"
    }
  ]
}
```

**2. 授予权限**

```
POST /api/v1/user-permissions
```

**请求体**:
```typescript
{
  "userId": "user_123",
  "permissionId": "perm_002",
  "reason": "质量部需要跨部门查看生产记录",
  "expiresAt": "2026-03-13T23:59:59Z",  // 可选，权限过期时间
  "resourceType": "document",            // 可选，资源类型
  "resourceId": "doc_456"                // 可选，资源 ID
}
```

**响应**:
```typescript
{
  "success": true,
  "data": {
    "id": "up_789",
    "userId": "user_123",
    "permissionId": "perm_002",
    "grantedBy": "user_admin",
    "grantedByName": "管理员",
    "grantedAt": "2026-02-13T10:00:00Z",
    "expiresAt": "2026-03-13T23:59:59Z",
    "reason": "质量部需要跨部门查看生产记录"
  }
}
```

**3. 撤销权限**

```
DELETE /api/v1/user-permissions/:id
```

**响应**:
```typescript
{
  "success": true,
  "message": "权限已撤销"
}
```

**4. 查询用户权限列表**

```
GET /api/v1/user-permissions?userId=user_123
```

**响应**:
```typescript
{
  "success": true,
  "data": [
    {
      "id": "up_789",
      "permission": {
        "code": "document:view:cross_department",
        "name": "跨部门查看文档"
      },
      "grantedBy": "管理员",
      "grantedAt": "2026-02-13T10:00:00Z",
      "expiresAt": "2026-03-13T23:59:59Z",
      "status": "active"  // active | expired
    }
  ]
}
```

**5. 检查用户是否有特定权限**

```
GET /api/v1/user-permissions/check?userId=user_123&permissionCode=document:view:cross_department
```

**响应**:
```typescript
{
  "success": true,
  "data": {
    "hasPermission": true,
    "expiresAt": "2026-03-13T23:59:59Z"
  }
}
```

##### 🎨 前端界面设计

**1. 用户权限管理页面**

页面路由：`/users/:id/permissions`

页面布局：
```
┌────────────────────────────────────────────────────────────┐
│ 用户权限管理 - 张三（生产部）                 [+ 授予权限]  │
├────────────────────────────────────────────────────────────┤
│ 权限列表                                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 权限名称           │ 范围     │ 授予人 │ 过期时间 │操作│ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ 查看文档            │ 本部门   │ 管理员 │ 永久     │[撤]│ │
│ │ 跨部门查看文档      │ 跨部门   │ 管理员 │ 2026-03 │[撤]│ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**2. 授予权限对话框**

对话框尺寸：`60% × 70%`

对话框内容：
```
┌─────────────────────────────────────────┐
│ 授予权限                         [×]     │
├─────────────────────────────────────────┤
│ *权限类别: [文档权限 ▼]                  │
│                                         │
│ *权限名称: [跨部门查看文档 ▼]            │
│                                         │
│ *授权原因:                               │
│ [___________________________________]   │
│ [___________________________________]   │
│                                         │
│ 权限过期时间: [2026-03-13 ▼]  (可选)    │
│                                         │
│ 资源级权限 (可选):                       │
│ 资源类型: [文档 ▼]                       │
│ 资源ID: [DOC-2026-001]                  │
│                                         │
│              [取消]  [确定授予]          │
└─────────────────────────────────────────┘
```

**3. Vue 3 代码示例**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getUserPermissions,
  grantPermission,
  revokePermission
} from '@/api/permission'

const userId = ref('')
const permissions = ref([])
const grantDialogVisible = ref(false)

const grantForm = ref({
  permissionId: '',
  reason: '',
  expiresAt: null,
  resourceType: null,
  resourceId: null
})

const fetchPermissions = async () => {
  const res = await getUserPermissions(userId.value)
  permissions.value = res.data
}

const handleGrant = async () => {
  try {
    await grantPermission({
      userId: userId.value,
      ...grantForm.value
    })
    ElMessage.success('权限授予成功')
    grantDialogVisible.value = false
    fetchPermissions()
  } catch (error) {
    ElMessage.error(error.message || '授予失败')
  }
}

const handleRevoke = async (permissionId: string) => {
  await ElMessageBox.confirm('确定撤销该权限？', '撤销权限', {
    type: 'warning'
  })

  try {
    await revokePermission(permissionId)
    ElMessage.success('权限已撤销')
    fetchPermissions()
  } catch (error) {
    ElMessage.error(error.message || '撤销失败')
  }
}

onMounted(() => {
  fetchPermissions()
})
</script>

<template>
  <div class="user-permissions">
    <el-button type="primary" @click="grantDialogVisible = true">
      + 授予权限
    </el-button>

    <el-table :data="permissions">
      <el-table-column prop="permission.name" label="权限名称" />
      <el-table-column prop="permission.scope" label="范围" />
      <el-table-column prop="grantedByName" label="授予人" />
      <el-table-column label="过期时间">
        <template #default="{ row }">
          {{ row.expiresAt || '永久' }}
        </template>
      </el-table-column>
      <el-table-column label="状态">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? '有效' : '已过期' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ row }">
          <el-button
            link
            type="danger"
            @click="handleRevoke(row.id)"
          >
            撤销
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 授予权限对话框 -->
    <el-dialog
      v-model="grantDialogVisible"
      title="授予权限"
      width="60%"
    >
      <el-form :model="grantForm" label-width="120px">
        <el-form-item label="权限名称" required>
          <el-select v-model="grantForm.permissionId" placeholder="请选择">
            <el-option label="跨部门查看文档" value="perm_002" />
            <el-option label="编辑任务" value="perm_003" />
          </el-select>
        </el-form-item>
        <el-form-item label="授权原因" required>
          <el-input
            v-model="grantForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入授权原因"
          />
        </el-form-item>
        <el-form-item label="权限过期时间">
          <el-date-picker
            v-model="grantForm.expiresAt"
            type="datetime"
            placeholder="选择日期时间"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="grantDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleGrant">确定授予</el-button>
      </template>
    </el-dialog>
  </div>
</template>
```

##### ✅ 实施检查清单

```
□ 1. 数据模型
   □ 1a. Permission 表创建成功
   □ 1b. UserPermission 表创建成功
   □ 1c. 索引创建成功（userId, permissionId, expiresAt）
   □ 1d. 初始化 12+ 权限定义

□ 2. API 实现
   □ 2a. GET /api/v1/permissions 实现
   □ 2b. POST /api/v1/user-permissions 实现
   □ 2c. DELETE /api/v1/user-permissions/:id 实现
   □ 2d. GET /api/v1/user-permissions 实现
   □ 2e. GET /api/v1/user-permissions/check 实现

□ 3. 权限守卫
   □ 3a. PermissionGuard 实现
   □ 3b. @RequirePermission() 装饰器实现
   □ 3c. 权限校验逻辑正确（含过期检查）
   □ 3d. 资源级权限校验正确

□ 4. 定时任务
   □ 4a. 每日检查过期权限定时任务
   □ 4b. 过期权限自动撤销
   □ 4c. 过期前 3 天通知用户

□ 5. 业务规则
   □ 5a. BR-349 权限定义规则验证通过
   □ 5b. BR-350 权限授予规则验证通过
   □ 5c. BR-351 权限撤销规则验证通过
   □ 5d. BR-352 资源级权限规则验证通过
   □ 5e. BR-353 权限过期处理规则验证通过

□ 6. 前端界面
   □ 6a. 用户权限管理页面实现
   □ 6b. 授予权限对话框实现
   □ 6c. 权限列表显示正确
   □ 6d. 过期状态标签显示正确

□ 7. 测试
   □ 7a. 权限授予场景测试通过
   □ 7b. 权限撤销场景测试通过
   □ 7c. 权限过期场景测试通过
   □ 7d. 资源级权限场景测试通过
```

---

#### 22.2.3 P1-3: 工作流引擎完整方案

##### 📋 业务规则补充

**BR-354: 工作流模板规则**
- 模板创建：仅管理员或部门主管可创建工作流模板
- 模板编码：唯一，格式为 `{category}_{department}_{seq}`，如 `document_production_001`
- 步骤配置：工作流步骤使用 JSON 配置，包含步骤名称、审批人角色、超时时间、并行模式
- 模板版本：修改模板时创建新版本，旧版本仍可查看但不可使用
- 模板停用：停用模板后，已启动的工作流实例仍可继续执行

**BR-355: 工作流启动规则**
- 启动条件：资源（文档/任务/记录）必须满足启动条件（如文档状态为 draft）
- 模板选择：根据资源类型和部门自动匹配工作流模板
- 发起人记录：记录工作流发起人和发起时间
- 初始状态：工作流启动后状态为 `pending`，第一步任务为 `pending`

**BR-356: 串行审批规则**
- 顺序执行：串行审批按步骤顺序执行，前一步未完成时后一步不可执行
- 自动分配：当前步骤完成后，自动创建下一步任务并通知审批人
- 审批超时：超过截止时间未审批，状态变为 `timeout`，自动升级给上级

**BR-357: 并行审批规则（会签）**
- 同步开始：并行审批的所有任务同时创建，同时通知所有审批人
- 全部通过：所有并行任务都通过后，才进入下一步
- 一人拒绝：任一并行任务拒绝，整个工作流状态变为 `rejected`，其他并行任务自动跳过
- 一人超时：任一并行任务超时，其他并行任务不能继续，整个工作流状态变为 `timeout`

**BR-358: 审批超时升级规则**
- 超时时间：每个步骤可配置超时时间（如 24 小时、48 小时）
- 自动升级：超时后自动升级给上级审批人（escalatedTo）
- 升级通知：升级后通知原审批人和上级审批人
- 原审批人仍可审批：升级后原审批人仍可完成审批

**BR-359: 工作流取消规则**
- 取消权限：仅工作流发起人或管理员可取消
- 取消时机：仅 `pending` 或 `in_progress` 状态可取消
- 取消原因：必须填写取消原因
- 取消通知：取消后通知所有相关审批人

##### 🔌 API 设计

**1. 创建工作流模板**

```
POST /api/v1/workflow-templates
```

**请求体**:
```typescript
{
  "code": "document_production_001",
  "name": "生产部文档审批流程",
  "departmentId": "dept_123",
  "category": "document",
  "steps": [
    {
      "index": 0,
      "name": "部门主管审批",
      "assigneeRole": "manager",  // 审批人角色
      "parallelMode": false,
      "timeoutHours": 24
    },
    {
      "index": 1,
      "name": "质量部会签",
      "assigneeRole": "quality_manager",
      "parallelMode": true,       // 并行审批
      "parallelAssignees": ["user_001", "user_002"],  // 指定审批人
      "timeoutHours": 48
    }
  ]
}
```

**响应**:
```typescript
{
  "success": true,
  "data": {
    "id": "wft_789",
    "code": "document_production_001",
    "name": "生产部文档审批流程",
    "version": 1,
    "status": "active"
  }
}
```

**2. 启动工作流**

```
POST /api/v1/workflow-instances
```

**请求体**:
```typescript
{
  "templateId": "wft_789",
  "resourceType": "document",
  "resourceId": "doc_456",
  "resourceTitle": "质量手册 V2.0"
}
```

**响应**:
```typescript
{
  "success": true,
  "data": {
    "id": "wfi_101",
    "templateCode": "document_production_001",
    "status": "in_progress",
    "currentStep": 0,
    "tasks": [
      {
        "id": "wft_201",
        "stepName": "部门主管审批",
        "assigneeId": "user_manager",
        "status": "pending",
        "dueAt": "2026-02-14T10:00:00Z"
      }
    ]
  }
}
```

**3. 审批工作流任务**

```
POST /api/v1/workflow-tasks/:taskId/approve
```

**请求体**:
```typescript
{
  "action": "approve",  // approve | reject
  "comment": "文档内容符合要求，同意发布"
}
```

**响应**:
```typescript
{
  "success": true,
  "data": {
    "taskId": "wft_201",
    "status": "approved",
    "completedAt": "2026-02-13T14:00:00Z",
    "nextTask": {
      "id": "wft_202",
      "stepName": "质量部会签",
      "assigneeId": "user_001",
      "status": "pending"
    }
  }
}
```

**4. 取消工作流**

```
POST /api/v1/workflow-instances/:id/cancel
```

**请求体**:
```typescript
{
  "reason": "文档内容需重新修订"
}
```

**响应**:
```typescript
{
  "success": true,
  "message": "工作流已取消"
}
```

**5. 查询我的待审批任务**

```
GET /api/v1/workflow-tasks/my-tasks?status=pending
```

**响应**:
```typescript
{
  "success": true,
  "data": [
    {
      "id": "wft_201",
      "instanceId": "wfi_101",
      "stepName": "部门主管审批",
      "resourceType": "document",
      "resourceTitle": "质量手册 V2.0",
      "initiatorName": "张三",
      "status": "pending",
      "dueAt": "2026-02-14T10:00:00Z"
    }
  ]
}
```

##### 🎨 前端界面设计

**1. 工作流模板编辑器（可视化设计器）**

页面路由：`/workflow-templates/editor`

页面布局（简化版，详细设计见 INTERACTION_DESIGN.md）:
```
┌──────────────────────────────────────────────────────────┐
│ 工作流设计器                             [保存] [预览]    │
├──────────────────────────────────────────────────────────┤
│ 基本信息:                                                 │
│ 模板名称: [生产部文档审批流程__________]                   │
│ 所属部门: [生产部 ▼]  类别: [文档 ▼]                      │
│                                                          │
│ 审批步骤:                                                 │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 步骤 1: 部门主管审批                    [编辑][删除]│   │
│ │ 审批人角色: 部门主管  超时: 24小时                  │   │
│ │                                                    │   │
│ │              ↓                                     │   │
│ │                                                    │   │
│ │ 步骤 2: 质量部会签（并行）              [编辑][删除]│   │
│ │ 审批人: 张三, 李四   超时: 48小时                   │   │
│ └────────────────────────────────────────────────────┘   │
│ [+ 添加步骤]                                              │
└──────────────────────────────────────────────────────────┘
```

**2. 我的待办任务页面**

页面路由：`/my-tasks`

页面布局：
```
┌──────────────────────────────────────────────────────────┐
│ 我的待办                     [全部] [文档] [任务] [记录]  │
├──────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐   │
│ │ 资源标题    │ 步骤     │ 发起人 │ 截止时间 │ 操作 │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ 质量手册V2  │ 主管审批 │ 张三   │ 明天     │[审]│   │
│ │ 生产记录001 │ 质量会签 │ 李四   │ 2天后    │[审]│   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**3. 审批对话框**

对话框尺寸：`70% × 80%`

对话框内容：
```
┌─────────────────────────────────────────┐
│ 审批 - 质量手册 V2.0             [×]     │
├─────────────────────────────────────────┤
│ 审批流程:                                │
│ [✓] 部门主管审批 → [●] 质量部会签        │
│                                         │
│ 文档预览:                                │
│ [PDF预览区域........................]   │
│                                         │
│ 审批意见:                                │
│ [___________________________________]   │
│ [___________________________________]   │
│                                         │
│          [拒绝]  [通过]                  │
└─────────────────────────────────────────┘
```

**4. Vue 3 代码示例**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getMyTasks, approveTask, rejectTask } from '@/api/workflow'

const myTasks = ref([])
const approveDialogVisible = ref(false)
const currentTask = ref(null)
const approveComment = ref('')

const fetchMyTasks = async () => {
  const res = await getMyTasks({ status: 'pending' })
  myTasks.value = res.data
}

const handleApprove = async (action: 'approve' | 'reject') => {
  try {
    if (action === 'approve') {
      await approveTask(currentTask.value.id, {
        action: 'approve',
        comment: approveComment.value
      })
      ElMessage.success('审批通过')
    } else {
      await rejectTask(currentTask.value.id, {
        action: 'reject',
        comment: approveComment.value
      })
      ElMessage.success('已拒绝')
    }

    approveDialogVisible.value = false
    fetchMyTasks()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

onMounted(() => {
  fetchMyTasks()
})
</script>

<template>
  <div class="my-tasks">
    <h2>我的待办</h2>

    <el-table :data="myTasks">
      <el-table-column prop="resourceTitle" label="资源标题" />
      <el-table-column prop="stepName" label="步骤" />
      <el-table-column prop="initiatorName" label="发起人" />
      <el-table-column label="截止时间">
        <template #default="{ row }">
          <span :class="{ 'text-danger': isOverdue(row.dueAt) }">
            {{ formatDueDate(row.dueAt) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            @click="openApproveDialog(row)"
          >
            审批
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 审批对话框 -->
    <el-dialog
      v-model="approveDialogVisible"
      :title="`审批 - ${currentTask?.resourceTitle}`"
      width="70%"
    >
      <div v-if="currentTask">
        <!-- 审批流程展示 -->
        <div class="workflow-steps">
          <el-steps :active="currentTask.stepIndex" finish-status="success">
            <el-step title="部门主管审批" />
            <el-step title="质量部会签" />
          </el-steps>
        </div>

        <!-- 审批意见 -->
        <el-form label-width="100px">
          <el-form-item label="审批意见">
            <el-input
              v-model="approveComment"
              type="textarea"
              :rows="4"
              placeholder="请输入审批意见"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button type="danger" @click="handleApprove('reject')">
          拒绝
        </el-button>
        <el-button type="success" @click="handleApprove('approve')">
          通过
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
```

##### ✅ 实施检查清单

```
□ 1. 数据模型
   □ 1a. WorkflowTemplate 表创建成功
   □ 1b. WorkflowInstance 表创建成功
   □ 1c. WorkflowTask 表创建成功
   □ 1d. 索引创建成功

□ 2. 工作流引擎
   □ 2a. WorkflowService 实现
   □ 2b. 启动工作流逻辑正确
   □ 2c. 串行审批逻辑正确
   □ 2d. 并行审批逻辑正确
   □ 2e. 审批超时升级逻辑正确
   □ 2f. 工作流取消逻辑正确

□ 3. 定时任务
   □ 3a. WorkflowScheduler 实现
   □ 3b. 每 10 分钟检查超时任务
   □ 3c. 超时任务自动升级
   □ 3d. 超时通知发送正确

□ 4. API 实现
   □ 4a. POST /api/v1/workflow-templates 实现
   □ 4b. POST /api/v1/workflow-instances 实现
   □ 4c. POST /api/v1/workflow-tasks/:id/approve 实现
   □ 4d. POST /api/v1/workflow-instances/:id/cancel 实现
   □ 4e. GET /api/v1/workflow-tasks/my-tasks 实现

□ 5. 业务规则
   □ 5a. BR-354 工作流模板规则验证通过
   □ 5b. BR-355 工作流启动规则验证通过
   □ 5c. BR-356 串行审批规则验证通过
   □ 5d. BR-357 并行审批规则验证通过
   □ 5e. BR-358 审批超时升级规则验证通过
   □ 5f. BR-359 工作流取消规则验证通过

□ 6. 前端界面
   □ 6a. 工作流模板编辑器实现（可视化设计器）
   □ 6b. 我的待办任务页面实现
   □ 6c. 审批对话框实现
   □ 6d. 审批流程可视化显示正确

□ 7. 测试
   □ 7a. 串行审批场景测试通过
   □ 7b. 并行审批场景测试通过
   □ 7c. 审批超时升级场景测试通过
   □ 7d. 工作流取消场景测试通过
   □ 7e. 一人拒绝全部失效场景测试通过
   □ 7f. 一人超时阻塞场景测试通过
```

---

##### 🎨 P2 扩展：工作流节点图式可视化设计器

> **说明**：现有「工作流模板编辑器」采用步骤列表式 UI（串行步骤添加）。本节定义升级版节点图式设计器，支持条件分支（IF/ELSE）节点，作为 P2 功能的前端规格。
> **技术选型**：Vue Flow（`@vue-flow/core`）实现节点画布

**页面路由**：`/workflow-templates/designer`（替换或新增路由）

**节点类型定义**：

| 节点类型 | 图标 | 配置项 | 说明 |
|----------|------|--------|------|
| `start` | ▶ 开始 | 无 | 每个工作流有且仅有一个起始节点 |
| `approval` | 👤 审批 | 审批人角色/人员、超时时间、并行模式 | 审批步骤节点，可并行（会签） |
| `condition` | ◆ 条件 | 条件表达式（如 `record.amount > 10000`）、true/false 分支标签 | 条件分支节点，有两条出边 |
| `end` | ⬛ 结束 | 无 | 工作流结束节点 |

**画布交互规则**：
```
┌─────────────────────────────────────────────────────────────────┐
│ 工作流设计器：[发起文档审批流程]              [保存] [预览] [取消] │
├──────────────┬──────────────────────────────────────────────────┤
│ 节点面板     │ 画布（Vue Flow）                                   │
│              │                                                  │
│ [▶ 开始]     │     [▶ 开始]                                      │
│ [👤 审批]    │          │                                        │
│ [◆ 条件]    │     [👤 部门主管审批]  ← 点击显示属性面板           │
│ [⬛ 结束]    │          │                                        │
│              │     [◆ 金额 > 1万?]                              │
│              │    是↙       ↘否                                  │
│              │ [👤 总监审批]  [⬛ 结束]                           │
│              │     │                                            │
│              │  [⬛ 结束]                                        │
└──────────────┴──────────────────────────────────────────────────┘
```

**连线规则**：
- start 节点：只能有一条出边
- approval 节点：一条入边 + 一条出边
- condition 节点：一条入边 + 两条出边（true/false）
- end 节点：只能有入边，无出边
- 禁止循环：不允许节点连接自己或形成环路（连接时前端检测）

**节点属性面板**（点击节点后右侧抽屉展开）：

```typescript
// approval 节点配置
interface ApprovalNodeConfig {
  stepName: string         // 步骤名称，如"部门主管审批"
  approverType: 'role' | 'user'  // 按角色或指定人员
  approverRoleId?: string  // 角色 ID
  approverUserIds?: string[] // 指定人员 ID 列表
  timeoutHours: number     // 超时时间（小时）
  parallelMode: boolean    // 是否并行（会签）
}

// condition 节点配置
interface ConditionNodeConfig {
  conditionExpression: string  // 条件表达式，如 "record.amount > 10000"
  trueLabel: string    // true 分支标签，如"金额超 1 万"
  falseLabel: string   // false 分支标签，如"金额不超 1 万"
}
```

**保存格式**（写入 `WorkflowTemplate.config`）：
```typescript
{
  nodes: [
    { id: "node_1", type: "start", position: { x: 300, y: 50 } },
    { id: "node_2", type: "approval", position: { x: 300, y: 150 },
      config: { stepName: "部门主管审批", approverType: "role", approverRoleId: "role_manager", timeoutHours: 24, parallelMode: false } },
    { id: "node_3", type: "condition", position: { x: 300, y: 280 },
      config: { conditionExpression: "record.amount > 10000", trueLabel: "金额超1万", falseLabel: "金额不超1万" } },
    { id: "node_4", type: "end", position: { x: 150, y: 400 } },
    { id: "node_5", type: "end", position: { x: 450, y: 400 } }
  ],
  edges: [
    { id: "e1", source: "node_1", target: "node_2" },
    { id: "e2", source: "node_2", target: "node_3" },
    { id: "e3", source: "node_3", target: "node_4", label: "true" },
    { id: "e4", source: "node_3", target: "node_5", label: "false" }
  ]
}
```

---

### 22.3 API 端点规范化（P2 优先级）

#### 22.2.1 统一 API 路径前缀（P2-1）

**问题描述**:
- DESIGN.md 定义所有 API 使用 `/api/v1` 前缀
- 实际实现缺少版本前缀（如 `POST /documents` 而非 `POST /api/v1/documents`）

**修复方案**:

```typescript
// server/src/main.ts

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 设置全局 API 前缀
  app.setGlobalPrefix('api/v1');

  // ... 其他配置 ...

  await app.listen(3000);
}
```

**预估工作量**: 10 分钟

---

### 22.3 实施策略与优先级

#### 22.3.1 实施原则 ⚠️ 重要

**核心原则**: **技术债务优先于新需求**

在开发新功能前，必须先处理相关的技术债务，避免债务累积：

| 场景 | 处理策略 | 原因 |
|------|---------|------|
| **开发新 Phase 功能** | 先修复 P1 债务，再开发新功能 | 避免在有缺陷的基础上叠加功能 |
| **功能依赖技术债务** | 必须先修复债务再开发 | 例如：跨部门权限功能需要先实施 P1-2 |
| **独立功能** | 可并行开发，但优先修复债务 | 资源有限时优先债务修复 |
| **紧急需求** | 评估是否可延后债务修复 | 特殊情况需项目主导者批准 |

**反例**（禁止）：
- ❌ 先开发 Phase 10-12 功能，把技术债务留到最后
- ❌ 因为"工作量大"跳过 P1-3 工作流引擎，继续用硬编码
- ❌ 新功能与债务并行开发，导致冲突和返工

**正例**（推荐）：
- ✅ 开发 Phase 10 前，先修复 P1-2 权限系统
- ✅ 开发 Phase 11 前，先修复 P1-3 工作流引擎
- ✅ 每个迭代预留 20% 时间修复技术债务

---

#### 22.3.2 实施路线图

**阶段 0: 立即修复（本周内）**

| 改进项 | 工作量 | 优先级 | 原因 |
|-------|--------|--------|------|
| **P1-1** Document 归档/作废字段 | 2-3 小时 | 🔴 最高 | BRCGS 合规要求 |
| **P2-1** API 路径前缀统一 | 10 分钟 | 🟡 中 | 影响所有后续 API 开发 |

**总工作量**: 3 小时

**完成标准**:
- ✅ Document 表新增 6 个归档/作废字段
- ✅ 归档/作废 API 实现并测试通过
- ✅ 前端归档/作废界面可用
- ✅ 全局 API 前缀改为 `/api/v1`

---

**阶段 1: Phase 10 开发前置（需求确认后 1 周内）**

| 改进项 | 工作量 | 依赖关系 |
|-------|--------|----------|
| **P1-2** Permission/UserPermission 表 | 8-16 小时 | Phase 10 跨部门权限功能的基础 |

**实施时机**: Phase 10（培训管理、跨部门协作）启动前

**完成标准**:
- ✅ Permission 和 UserPermission 表创建
- ✅ 12+ 权限定义初始化
- ✅ 权限装饰器和守卫实现
- ✅ 权限管理 API 可用
- ✅ 前端权限管理界面完成

**风险**: 如果跳过此步骤，Phase 10 无法实现跨部门权限控制

---

**阶段 2: Phase 11 开发前置（需求确认后 1.5-2 周内）**

| 改进项 | 工作量 | 依赖关系 |
|-------|--------|----------|
| **P1-3** WorkflowTemplate 相关表 | 24-40 小时 | Phase 11 内审管理、复杂审批流程的基础 |

**实施时机**: Phase 11（内审管理、高级工作流）启动前

**完成标准**:
- ✅ WorkflowTemplate/Instance/Task 表创建
- ✅ 工作流引擎核心逻辑实现
- ✅ 并行审批、超时升级功能可用
- ✅ 定时任务正常运行
- ✅ 工作流配置界面完成

**风险**: 如果跳过此步骤，Phase 11 审批流程仍然硬编码，无法灵活配置

---

#### 22.3.3 总工作量与时间规划

| 阶段 | 工作量 | 建议时间安排 | 可并行度 |
|------|--------|-------------|----------|
| 阶段 0（立即） | 3 小时 | 本周内完成 | 单人即可 |
| 阶段 1（Phase 10 前） | 8-16 小时 | 1-2 个工作日 | 1-2 人并行 |
| 阶段 2（Phase 11 前） | 24-40 小时 | 3-5 个工作日 | 2-3 人并行 |
| **总计** | **35-59 小时** | **4-7 个工作日** | **可分阶段实施** |

**建议排期**:
- 第 1 周：修复 P1-1 + P2-1（阶段 0）
- 第 2-3 周：修复 P1-2（阶段 1，与 Phase 10 需求调研并行）
- 第 4-5 周：修复 P1-3（阶段 2，与 Phase 11 需求调研并行）

---

#### 22.3.4 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **技术债务拖延** | 后续功能无法正常开发，返工成本高 | 严格执行"债务优先于新需求"原则 |
| **P1-3 工作量大** | 可能延误 Phase 11 开发 | 提前 2 周启动，预留缓冲时间 |
| **并行开发冲突** | 债务修复与新功能冲突 | 强制串行：先债务后新功能 |
| **测试不充分** | 债务修复引入新 bug | 每个阶段必须有完整测试验证 |

---

### 22.4 技术债务管理流程

1. **记录债务**: 所有发现的不一致问题记录到本章节
2. **优先级评估**: P0（立即修复）、P1（新功能前置条件）、P2（优化改进）
3. **实施时机**: ⚠️ **新功能开发前强制修复相关债务**
4. **验收标准**:
   - 数据库迁移成功
   - API 测试通过（单元测试 + 集成测试）
   - 前端界面验收通过
   - 业务规则验证通过
   - 代码审查通过

---

### 22.5 实施检查清单

每个阶段完成后，必须通过以下检查：

#### 阶段 0 检查清单

```
□ 1. Document 表迁移成功
   □ 1a. 数据库新增 6 个归档/作废字段
   □ 1b. 索引创建成功
   □ 1c. 现有数据不受影响

□ 2. 归档/作废 API 实现
   □ 2a. POST /api/v1/documents/:id/archive 可用
   □ 2b. POST /api/v1/documents/:id/obsolete 可用
   □ 2c. DTO 验证通过（reason 必填）
   □ 2d. 权限检查正常（管理员才能作废）

□ 3. 前端界面完成
   □ 3a. DocumentDetail 页面有归档/作废按钮
   □ 3b. 归档对话框可用（填写原因）
   □ 3c. 作废对话框可用（显示警告）
   □ 3d. 操作成功后刷新页面

□ 4. API 路径前缀统一
   □ 4a. main.ts 设置 app.setGlobalPrefix('api/v1')
   □ 4b. 前端所有 API 调用路径更新
   □ 4c. 现有功能正常运行
   □ 4d. Swagger 文档路径正确

□ 5. 测试验证
   □ 5a. 单元测试通过
   □ 5b. 集成测试通过
   □ 5c. 手动测试通过
   □ 5d. 无回归 bug
```

#### 阶段 1 检查清单

```
□ 1. Permission 表初始化
   □ 1a. 表结构创建成功
   □ 1b. 12+ 权限定义插入
   □ 1c. 权限分类正确（document/record/approval/system）

□ 2. UserPermission 表创建
   □ 2a. 表结构创建成功
   □ 2b. 与 User 表关联正常
   □ 2c. 唯一约束生效

□ 3. 权限系统实现
   □ 3a. RequirePermission 装饰器可用
   □ 3b. PermissionGuard 守卫正常
   □ 3c. 管理员拥有所有权限
   □ 3d. 权限过期检查正常

□ 4. 权限管理 API
   □ 4a. GET /api/v1/permissions 返回所有权限
   □ 4b. POST /api/v1/permissions/grant 授予权限
   □ 4c. DELETE /api/v1/permissions/:id 撤销权限
   □ 4d. GET /api/v1/permissions/user/:userId 查询用户权限

□ 5. 前端权限管理界面
   □ 5a. UserPermissions.vue 页面可用
   □ 5b. 权限列表显示正常
   □ 5c. 授予权限对话框可用
   □ 5d. 撤销权限功能正常

□ 6. 业务规则验证
   □ 6a. BR-017 质量部跨部门查看记录
   □ 6b. BR-018 其他部门只能查看本部门
   □ 6c. BR-019 权限授予记录原因
   □ 6d. BR-278 权限变更记录审计日志

□ 7. 测试验证
   □ 7a. 权限检查单元测试通过
   □ 7b. API 集成测试通过
   □ 7c. 跨部门权限场景测试通过
   □ 7d. 权限过期测试通过
```

#### 阶段 2 检查清单

```
□ 1. WorkflowTemplate 表创建
   □ 1a. 表结构创建成功
   □ 1b. 与 Department 表关联正常
   □ 1c. steps JSON 字段可用

□ 2. WorkflowInstance 表创建
   □ 2a. 表结构创建成功
   □ 2b. 与 WorkflowTemplate 关联正常
   □ 2c. 索引创建成功

□ 3. WorkflowTask 表创建
   □ 3a. 表结构创建成功
   □ 3b. 级联删除配置正常
   □ 3c. 索引创建成功

□ 4. 工作流引擎实现
   □ 4a. startWorkflow 方法可用
   □ 4b. approveTask 方法可用
   □ 4c. cancelWorkflow 方法可用
   □ 4d. checkTimeouts 方法可用

□ 5. 并行审批逻辑
   □ 5a. 并行任务创建正常
   □ 5b. 一人拒绝 → 所有任务失效
   □ 5c. 所有人通过 → 进入下一步
   □ 5d. 并行组 ID 正确

□ 6. 超时升级逻辑
   □ 6a. 定时任务正常运行
   □ 6b. 超时任务标记正确
   □ 6c. 超时通知发送成功
   □ 6d. 原审批人仍可审批

□ 7. 工作流取消功能
   □ 7a. 发起人可取消工作流
   □ 7b. 待处理任务标记为 skipped
   □ 7c. 取消原因记录正确

□ 8. 业务规则验证
   □ 8a. BR-1.12 串行和并行审批
   □ 8b. BR-1.15 ~ BR-1.18 并行审批规则
   □ 8c. BR-1.19 ~ BR-1.22 审批超时规则
   □ 8d. BR-1.26 工作流取消规则

□ 9. 测试验证
   □ 9a. 工作流引擎单元测试通过
   □ 9b. 串行审批场景测试通过
   □ 9c. 并行审批场景测试通过
   □ 9d. 超时升级场景测试通过
   □ 9e. 工作流取消场景测试通过
```

---

### 22.6 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 1.2 | 2026-02-13 | **补充 P1-1/P1-2/P1-3 完整技术方案**：数据模型 + API 设计 + 业务规则（BR-346 ~ BR-359，共 14 条）+ 前端界面设计 + Vue 3 代码示例 + 完整实施检查清单 |
| 1.1 | 2026-02-13 | 调整实施策略，明确"技术债务优先于新需求"原则，新增实施检查清单 |
| 1.0 | 2026-02-13 | 初始版本，记录 3 个 P1 问题和 1 个 P2 问题 |

---

**本章节完成 ✅**
