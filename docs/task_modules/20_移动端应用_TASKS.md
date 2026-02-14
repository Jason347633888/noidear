# 移动端应用 - Task 分解

> **来源**: docs/design/layer3_移动端/16_移动端应用.md
> **总工作量**: 280h
> **优先级**: P0（现场人员核心工具）
> **依赖**: 动态表单引擎、TodoTask 统一待办

---

## Task 统计

| 类型 | 数量 | 工作量 |
|------|------|--------|
| 项目初始化 | 2 | 32h |
| 核心组件 | 4 | 80h |
| 业务页面 | 5 | 80h |
| 后端适配 | 2 | 40h |
| 微信生态集成 | 1 | 24h |
| 测试与发布 | 2 | 24h |
| **总计** | **16** | **280h** |

---

## Phase 1: 项目初始化（32h）

### TASK-343: uniapp 项目初始化

**类型**: 项目初始化

**工作量**: 16h

**优先级**: P0（阻塞其他 Task）

**依赖**: 无

**描述**:
创建 uniapp 项目，配置 Vue 3 + TypeScript + Pinia，支持编译为微信小程序、H5、APP。

**验收标准**:
- [ ] uniapp 项目创建完成（HBuilderX 或 CLI）
- [ ] Vue 3 Composition API 配置正确
- [ ] TypeScript 支持配置完成（tsconfig.json）
- [ ] Pinia 状态管理配置完成
- [ ] uni-ui 组件库安装配置完成
- [ ] manifest.json 配置正确（appid、小程序配置）
- [ ] pages.json 配置完成（首页路由）
- [ ] 支持编译为微信小程序（npm run dev:mp-weixin）
- [ ] 支持编译为 H5（npm run dev:h5）
- [ ] 支持编译为 APP（npm run dev:app）
- [ ] 开发环境运行正常

**技术要点**:
- 使用 uniapp CLI 创建项目（vue3 + ts 模板）
- 配置 ESLint + Prettier
- 配置环境变量（开发/生产）
- 配置网络请求拦截器

**相关文件**:
- mobile/package.json
- mobile/tsconfig.json
- mobile/manifest.json
- mobile/pages.json
- mobile/vite.config.ts

**后续 Task**: TASK-344（基础架构搭建）

---

### TASK-344: 移动端基础架构搭建

**类型**: 项目初始化

**工作量**: 16h

**优先级**: P0（阻塞其他 Task）

**依赖**: TASK-343

**描述**:
搭建移动端基础架构，包括网络请求、本地存储、状态管理、工具函数等。

**验收标准**:
- [ ] 网络请求封装完成（utils/request.ts）
- [ ] 支持请求拦截器（添加 token）
- [ ] 支持响应拦截器（处理错误）
- [ ] 本地存储工具封装完成（utils/storage.ts）
- [ ] 图片压缩工具封装完成（utils/image.ts）
- [ ] 用户状态管理完成（stores/user.ts）
- [ ] 待办状态管理完成（stores/todo.ts）
- [ ] 离线状态管理完成（stores/offline.ts）
- [ ] 通用组件创建完成（LoadingMore, EmptyState, ErrorState）
- [ ] 路由守卫配置完成（登录校验）

**技术要点**:
- 使用 uni.request 封装网络请求
- 使用 uni.setStorageSync/getStorageSync 封装本地存储
- 使用 canvas 实现图片压缩
- 使用 Pinia 管理全局状态

**相关文件**:
- mobile/utils/request.ts
- mobile/utils/storage.ts
- mobile/utils/image.ts
- mobile/stores/user.ts
- mobile/stores/todo.ts
- mobile/stores/offline.ts
- mobile/components/LoadingMore.vue
- mobile/components/EmptyState.vue

**后续 Task**: TASK-345（动态表单渲染组件）

---

## Phase 2: 核心组件（80h）

### TASK-345: 实现动态表单渲染组件

**类型**: 核心组件

**工作量**: 24h

**优先级**: P0

**依赖**: TASK-344

**描述**:
实现移动端动态表单渲染组件，支持 20+ 字段类型，移动端适配，实时校验，自动保存草稿。

**支持的字段类型**:
- 基础输入：text, number, textarea, date, time, datetime
- 选择类型：select, multiselect, radio, checkbox
- 特殊类型：image（拍照上传）, signature（电子签名）, scan（扫码输入，v2.0）

**验收标准**:
- [ ] DynamicForm.vue 组件创建完成
- [ ] 支持所有字段类型渲染（text, number, textarea, date, time, datetime）
- [ ] 支持选择类型渲染（select, multiselect, radio, checkbox）
- [ ] 支持图片字段渲染（调用 Camera 组件）
- [ ] 支持签名字段渲染（调用 Signature 组件）
- [ ] 实时校验功能正常（required, pattern, min, max）
- [ ] 显示错误提示（字段下方红色文字）
- [ ] 单列布局适配小屏
- [ ] 自动保存草稿（每 30 秒保存到本地）
- [ ] 草稿恢复功能（打开表单时恢复草稿）
- [ ] 提交前整体校验
- [ ] 表单数据格式化（提交到后端）

**技术要点**:
- 使用 v-for 动态渲染字段
- 使用 v-model 双向绑定
- 使用 async-validator 进行校验
- 使用 uni.setStorageSync 保存草稿
- 使用 uni.showToast 显示错误提示

**相关文件**:
- mobile/components/DynamicForm.vue
- mobile/components/FormField.vue
- mobile/utils/validator.ts

**后续 Task**: TASK-349（首页 + 待办列表）

---

### TASK-346: 实现现场拍照上传组件

**类型**: 核心组件

**工作量**: 20h

**优先级**: P0

**依赖**: TASK-344

**描述**:
实现现场拍照上传组件，支持调用相机拍照、选择相册、图片压缩、批量上传。

**验收标准**:
- [ ] Camera.vue 组件创建完成
- [ ] 支持调用相机拍照（uni.chooseImage sourceType: camera）
- [ ] 支持选择相册图片（uni.chooseImage sourceType: album）
- [ ] 支持批量选择（最多 9 张）
- [ ] 图片自动压缩（最大 800px 宽度，质量 80%）
- [ ] 生成缩略图（200x200）
- [ ] 图片预览功能（uni.previewImage）
- [ ] 删除图片功能
- [ ] 上传到 MinIO（调用 POST /api/v1/mobile/upload API）
- [ ] 上传进度显示（uni.uploadFile onProgressUpdate）
- [ ] 上传失败重试（最多重试 3 次）
- [ ] 显示上传状态（上传中、成功、失败）

**技术要点**:
- 使用 uni.chooseImage 选择图片
- 使用 canvas 压缩图片
- 使用 uni.uploadFile 上传文件
- 使用 v-model 绑定图片 URL 数组

**相关文件**:
- mobile/components/Camera.vue
- mobile/utils/image.ts

**后续 Task**: TASK-345（动态表单集成拍照）

---

### TASK-347: 实现电子签名组件

**类型**: 核心组件

**工作量**: 16h

**优先级**: P0

**依赖**: TASK-344

**描述**:
实现电子签名组件，支持手写签字板、签名预览、重新签名、签名上传。

**验收标准**:
- [ ] Signature.vue 组件创建完成
- [ ] 手写签字板功能正常（canvas 实现）
- [ ] 支持手指/触控笔绘制
- [ ] 支持清空签名
- [ ] 支持重新签名
- [ ] 签名预览功能（显示签名图片）
- [ ] 签名图片导出（canvas.toDataURL）
- [ ] 签名图片上传到 MinIO（调用 POST /api/v1/mobile/upload API）
- [ ] 签名图片尺寸规范（宽度 400px，高度 200px）
- [ ] 签名必填校验（未签名时提示）
- [ ] 横屏模式支持（签名时横屏显示更大面积）

**技术要点**:
- 使用 canvas 2D API 绘制签名
- 监听 touchstart, touchmove, touchend 事件
- 使用 canvas.toDataURL 导出图片
- 使用 uni.uploadFile 上传签名图片

**相关文件**:
- mobile/components/Signature.vue

**后续 Task**: TASK-345（动态表单集成签名）

---

### TASK-348: 实现离线存储管理

**类型**: 核心组件

**工作量**: 20h

**优先级**: P1

**依赖**: TASK-344

**描述**:
实现离线存储管理，支持离线填写记录、同步队列、自动同步、同步失败重试。

**验收标准**:
- [ ] offline.ts 状态管理完成（Pinia store）
- [ ] 支持离线保存记录（uni.setStorageSync）
- [ ] 同步队列实现（queue: { id, type, data, retries, createdAt }[]）
- [ ] 自动同步功能（联网时自动上传）
- [ ] 监听网络状态（uni.onNetworkStatusChange）
- [ ] 同步失败重试（最多重试 3 次）
- [ ] 同步成功后删除队列记录
- [ ] 同步失败显示错误提示
- [ ] 显示同步状态（待同步数量、同步中、同步失败）
- [ ] 手动触发同步功能
- [ ] 清空失败队列功能

**技术要点**:
- 使用 uni.setStorageSync 保存离线数据
- 使用 uni.getNetworkType 检查网络状态
- 使用 uni.onNetworkStatusChange 监听网络变化
- 使用队列机制管理未同步数据

**相关文件**:
- mobile/stores/offline.ts
- mobile/utils/sync.ts

**后续 Task**: TASK-349（首页显示同步状态）

---

## Phase 3: 业务页面（80h）

### TASK-349: 实现首页 + 待办列表

**类型**: 业务页面

**工作量**: 20h

**优先级**: P0

**依赖**: TASK-344, TASK-345

**描述**:
实现移动端首页和待办列表页面，支持显示待办任务、快捷入口、同步状态。

**页面路由**:
- /pages/index/index - 首页
- /pages/todo/list - 待办列表

**功能要求**:
- 首页顶部：用户信息、通知铃铛
- 首页快捷入口：待办、记录、日历、设备（4 个卡片）
- 首页待办列表：显示最近 5 条待办
- 待办列表：显示所有待办（支持筛选：全部/培训/审批/设备）
- 待办类型筛选：training_attend, approval, equipment_maintain, audit_rectification
- 待办排序：截止日期升序（逾期优先）
- 逾期待办高亮显示（红色文字）
- 点击待办跳转到详情页
- 下拉刷新、上拉加载更多

**验收标准**:
- [ ] 首页布局符合设计稿
- [ ] 用户信息显示正常（头像、姓名、部门）
- [ ] 快捷入口功能正常（点击跳转到对应页面）
- [ ] 待办列表展示正常（调用 GET /api/v1/todos）
- [ ] 待办类型筛选功能正常
- [ ] 待办排序功能正常（逾期优先）
- [ ] 逾期待办高亮显示（截止日期 < 当前日期）
- [ ] 点击待办跳转到详情页
- [ ] 下拉刷新功能正常
- [ ] 上拉加载更多功能正常
- [ ] 同步状态显示（待同步数量）
- [ ] 响应式布局

**主要组件**:
- pages/index/index.vue - 首页
- pages/todo/list.vue - 待办列表
- components/TodoCard.vue - 待办卡片组件

**相关文件**:
- mobile/pages/index/index.vue
- mobile/pages/todo/list.vue
- mobile/components/TodoCard.vue

**后续 Task**: TASK-350（记录查询页面）

---

### TASK-350: 实现记录查询页面

**类型**: 业务页面

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-344, TASK-345

**描述**:
实现记录查询页面，支持查询历史记录、筛选、预览。

**页面路由**:
- /pages/records/list - 记录查询
- /pages/records/detail - 记录详情

**功能要求**:
- 记录列表展示（表单标题、提交时间、提交人、状态）
- 记录类型筛选（维保、巡检、清洁、温控等）
- 记录状态筛选（待审批、已通过、已驳回）
- 时间范围筛选（今天、本周、本月、自定义）
- 关键词搜索
- 点击记录查看详情（只读表单）
- 下拉刷新、上拉加载更多

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 列表展示功能正常（调用 GET /api/v1/form-submissions）
- [ ] 类型筛选功能正常
- [ ] 状态筛选功能正常
- [ ] 时间范围筛选功能正常
- [ ] 关键词搜索功能正常
- [ ] 点击记录查看详情
- [ ] 详情页显示完整表单数据（只读）
- [ ] 下拉刷新功能正常
- [ ] 上拉加载更多功能正常
- [ ] 响应式布局

**主要组件**:
- pages/records/list.vue - 记录列表
- pages/records/detail.vue - 记录详情
- components/RecordCard.vue - 记录卡片组件

**相关文件**:
- mobile/pages/records/list.vue
- mobile/pages/records/detail.vue
- mobile/components/RecordCard.vue

**后续 Task**: TASK-351（日历视图页面）

---

### TASK-351: 实现日历视图页面

**类型**: 业务页面

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-344

**描述**:
实现日历视图页面，支持维护计划日历、培训计划日历。

**页面路由**:
- /pages/calendar/index - 日历视图

**功能要求**:
- 日历组件（月视图）
- 显示维护计划（每日维保、巡检、清洁任务）
- 显示培训计划（培训项目日期）
- 日期高亮（有计划的日期显示红点）
- 点击日期查看当日计划列表
- 计划列表：标题、类型、时间
- 点击计划跳转到详情页

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 日历组件显示正常（使用 uni-ui calendar 或自定义）
- [ ] 维护计划显示正常（调用 GET /api/v1/equipment/tasks）
- [ ] 培训计划显示正常（调用 GET /api/v1/training/projects）
- [ ] 日期高亮功能正常（有计划的日期显示红点）
- [ ] 点击日期查看当日计划列表
- [ ] 计划列表显示正常
- [ ] 点击计划跳转到详情页
- [ ] 响应式布局

**主要组件**:
- pages/calendar/index.vue - 日历视图
- components/CalendarView.vue - 日历组件
- components/PlanCard.vue - 计划卡片组件

**相关文件**:
- mobile/pages/calendar/index.vue
- mobile/components/CalendarView.vue
- mobile/components/PlanCard.vue

**后续 Task**: TASK-352（设备管理页面）

---

### TASK-352: 实现设备管理页面

**类型**: 业务页面

**工作量**: 16h

**优先级**: P1

**依赖**: TASK-344

**描述**:
实现设备管理页面，支持设备列表、设备详情、设备二维码扫描（v2.0）。

**页面路由**:
- /pages/equipment/list - 设备列表
- /pages/equipment/detail - 设备详情

**功能要求**:
- 设备列表展示（设备编号、设备名称、所在区域、状态）
- 设备状态筛选（正常、故障、维修中）
- 关键词搜索（设备编号、设备名称）
- 点击设备查看详情
- 设备详情：基本信息、维护记录、维护计划
- 扫码功能（扫描设备二维码，v2.0）

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 列表展示功能正常（调用 GET /api/v1/equipment）
- [ ] 状态筛选功能正常
- [ ] 关键词搜索功能正常
- [ ] 点击设备查看详情
- [ ] 详情页显示完整设备信息
- [ ] 维护记录列表显示正常
- [ ] 维护计划列表显示正常
- [ ] 下拉刷新功能正常
- [ ] 上拉加载更多功能正常
- [ ] 响应式布局

**主要组件**:
- pages/equipment/list.vue - 设备列表
- pages/equipment/detail.vue - 设备详情
- components/EquipmentCard.vue - 设备卡片组件

**相关文件**:
- mobile/pages/equipment/list.vue
- mobile/pages/equipment/detail.vue
- mobile/components/EquipmentCard.vue

**后续 Task**: TASK-353（用户中心页面）

---

### TASK-353: 实现用户中心页面

**类型**: 业务页面

**工作量**: 12h

**优先级**: P2

**依赖**: TASK-344

**描述**:
实现用户中心页面，支持个人信息、修改密码、退出登录、关于我们。

**页面路由**:
- /pages/user/index - 用户中心

**功能要求**:
- 用户信息：头像、姓名、部门、岗位
- 功能菜单：修改密码、退出登录、关于我们
- 修改密码：旧密码、新密码、确认密码
- 退出登录：清空 token、跳转到登录页
- 关于我们：版本号、公司信息

**验收标准**:
- [ ] 页面布局符合设计稿
- [ ] 用户信息显示正常（调用 GET /api/v1/auth/profile）
- [ ] 修改密码功能正常（调用 PUT /api/v1/auth/password）
- [ ] 密码校验规则正确（长度 6-20 位）
- [ ] 退出登录功能正常（清空 token、跳转到登录页）
- [ ] 关于我们显示正常（版本号、公司信息）
- [ ] 响应式布局

**主要组件**:
- pages/user/index.vue - 用户中心
- components/MenuItem.vue - 菜单项组件

**相关文件**:
- mobile/pages/user/index.vue
- mobile/components/MenuItem.vue

**后续 Task**: 无

---

## Phase 4: 后端适配（40h）

### TASK-354: 实现移动端文件上传 API

**类型**: 后端 API

**工作量**: 20h

**优先级**: P0

**依赖**: 无

**描述**:
实现移动端文件上传 API，支持图片上传、签名上传、图片压缩、批量上传。

**API 端点**:
- POST /api/v1/mobile/upload - 移动端文件上传

**验收标准**:
- [ ] 支持单文件上传（file 字段）
- [ ] 支持批量上传（files 字段）
- [ ] 支持图片类型（jpg, jpeg, png）
- [ ] 文件大小限制（单个文件最大 5MB）
- [ ] 文件类型校验（只允许图片）
- [ ] 上传到 MinIO（路径：mobile/{userId}/{date}/{filename}）
- [ ] 生成缩略图（200x200）
- [ ] 返回文件 URL（原图 + 缩略图）
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] 异常处理（文件格式错误、文件过大）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**技术要点**:
- 使用 @nestjs/platform-express 处理文件上传
- 使用 multer 解析 multipart/form-data
- 使用 sharp 生成缩略图
- 使用 MinIO Client 上传文件

**相关文件**:
- server/src/modules/mobile/mobile.controller.ts
- server/src/modules/mobile/mobile.service.ts
- server/src/modules/mobile/dto/upload.dto.ts
- server/test/mobile.e2e-spec.ts

**后续 Task**: TASK-346（拍照组件调用上传 API）

---

### TASK-355: 实现离线同步 API

**类型**: 后端 API

**工作量**: 20h

**优先级**: P1

**依赖**: 无

**描述**:
实现离线同步 API，支持批量提交表单记录、同步状态查询。

**API 端点**:
- POST /api/v1/mobile/sync - 批量同步表单记录
- GET /api/v1/mobile/sync/status - 查询同步状态

**验收标准**:
- [ ] 支持批量提交表单记录（submissions: { formId, data }[]）
- [ ] 支持事务处理（全部成功或全部失败）
- [ ] 支持部分失败处理（返回失败记录列表）
- [ ] 同步状态查询（返回待同步数量、最后同步时间）
- [ ] 去重逻辑（根据客户端生成的 UUID 去重）
- [ ] 数据校验（表单字段校验）
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] 异常处理（表单不存在、字段校验失败）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**技术要点**:
- 使用 Prisma Transaction 处理批量插入
- 使用 UUID 去重（客户端生成 UUID）
- 使用 class-validator 校验表单数据

**相关文件**:
- server/src/modules/mobile/sync.controller.ts
- server/src/modules/mobile/sync.service.ts
- server/src/modules/mobile/dto/sync.dto.ts
- server/test/mobile.e2e-spec.ts

**后续 Task**: TASK-348（离线存储调用同步 API）

---

## Phase 5: 微信生态集成（24h）

### TASK-356: 实现微信订阅消息推送

**类型**: 微信生态集成

**工作量**: 24h

**优先级**: P1

**依赖**: 无

**描述**:
实现微信订阅消息推送，支持待办提醒、临期预警、审批通知。

**推送类型**:
- 待办提醒：培训待办、设备维保待办、审批待办
- 临期预警：物料批次即将过期
- 审批通知：记录审批结果通知

**API 端点**:
- POST /api/v1/wechat/subscribe - 订阅消息推送
- GET /api/v1/wechat/templates - 查询消息模板

**验收标准**:
- [ ] 微信小程序配置完成（appid, secret）
- [ ] 订阅消息模板创建完成（待办提醒、临期预警、审批通知）
- [ ] 支持订阅消息推送（调用微信 API）
- [ ] 待办提醒推送正常（待办标题、截止时间）
- [ ] 临期预警推送正常（物料批次、到期日期）
- [ ] 审批通知推送正常（审批结果、驳回原因）
- [ ] 推送记录保存（WechatMessage 表）
- [ ] 推送失败重试（最多重试 3 次）
- [ ] 权限校验（@UseGuards(JwtAuthGuard)）
- [ ] 异常处理（微信 API 调用失败）
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] API 文档（Swagger）生成

**技术要点**:
- 使用 wx-server-sdk 或 axios 调用微信 API
- 订阅消息模板 ID 配置在环境变量
- 推送记录保存到数据库

**相关文件**:
- server/src/modules/wechat/wechat.controller.ts
- server/src/modules/wechat/wechat.service.ts
- server/src/modules/wechat/dto/subscribe.dto.ts
- server/test/wechat.e2e-spec.ts

**后续 Task**: 无

---

## Phase 6: 测试与发布（24h）

### TASK-357: 编写移动端 E2E 测试

**类型**: 测试

**工作量**: 16h

**优先级**: P2

**依赖**: TASK-349~353

**描述**:
编写移动端 E2E 测试，验证关键用户流程。

**测试场景**:
1. 用户登录 → 查看待办列表 → 点击待办 → 填写表单 → 拍照上传 → 电子签名 → 提交表单
2. 用户登录 → 离线填写表单 → 保存草稿 → 联网 → 自动同步 → 同步成功
3. 用户登录 → 查看记录查询 → 筛选记录 → 查看详情
4. 用户登录 → 查看日历视图 → 点击日期 → 查看当日计划
5. 用户登录 → 查看设备管理 → 点击设备 → 查看设备详情

**验收标准**:
- [ ] 所有关键用户流程有对应测试用例
- [ ] 测试覆盖正常流程和异常流程
- [ ] 所有测试通过
- [ ] 测试报告生成

**技术要点**:
- 使用 Playwright 或 uniapp 自动化测试框架
- Mock 微信小程序环境

**相关文件**:
- mobile/e2e/login.spec.ts
- mobile/e2e/form.spec.ts
- mobile/e2e/offline.spec.ts

**后续 Task**: 无

---

### TASK-358: 小程序提审与发布

**类型**: 测试与发布

**工作量**: 8h

**优先级**: P2

**依赖**: TASK-357

**描述**:
微信小程序提审与发布，完成小程序上线。

**验收标准**:
- [ ] 小程序基本信息配置完成（名称、图标、描述）
- [ ] 小程序隐私政策配置完成
- [ ] 小程序服务器域名配置完成
- [ ] 小程序业务域名配置完成
- [ ] 小程序版本上传成功（使用 HBuilderX 或 CLI）
- [ ] 小程序提审成功
- [ ] 小程序审核通过
- [ ] 小程序发布成功
- [ ] 用户可正常访问小程序

**技术要点**:
- 使用 HBuilderX 或 CLI 上传小程序版本
- 配置小程序服务器域名（https）
- 配置小程序业务域名
- 准备小程序截图（5 张）

**相关文件**:
- mobile/manifest.json
- mobile/README.md（发布说明）

**后续 Task**: 无

---

**本文档完成 ✅**
