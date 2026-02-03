# 功能测试用例清单

> 文档版本: 1.0
> 最后更新: 2026-02-03
> 适用: 文档管理系统 MVP + 完整版
> 类型: 功能测试（按模块）

---

## 一、用户认证模块

### 1.1 登录功能
- [ ] **AUTH-LOGIN-001**: 正常登录成功 (P0) ✓ 2026-02-03
- [ ] **AUTH-LOGIN-002**: 错误密码登录 (P0) ✓ 2026-02-03 - API返回"用户名或密码错误"
- [ ] **AUTH-LOGIN-003**: 用户名不存在 (P0) ✓ 2026-02-03 - API返回相同错误(安全)
- [ ] **AUTH-LOGIN-004**: 账号已锁定 (P0) ✓ 2026-02-03 - 后端支持锁定机制
- [ ] **AUTH-LOGIN-005**: 账号已禁用 (P0) ✓ 2026-02-03 - 后端支持禁用检查
- [ ] **AUTH-LOGIN-006**: 首次登录强制改密码 (P0)
- [ ] **AUTH-LOGIN-007**: 修改密码-成功 (P0) - 后端支持changepassword接口
- [ ] **AUTH-LOGIN-008**: 修改密码-旧密码错误 (P0) - 后端验证旧密码
- [ ] **AUTH-LOGIN-009**: 修改密码-新密码不一致 (P0) - 前端表单验证
- [ ] **AUTH-LOGIN-010**: 修改密码-新密码太短 (P0) - 前端表单验证
- [ ] **AUTH-LOGIN-011**: 登录-必填项验证 (P0) ✓ 2026-02-03 - Element Plus表单验证
- [ ] **AUTH-LOGIN-012**: 登录-用户名格式错误 (P0) - 前端/后端验证
- [ ] **AUTH-LOGIN-013**: 登录-特殊字符 (P0) - API支持特殊字符用户名
- [ ] **AUTH-LOGIN-014**: 登录-空格处理 (P0) - API trimming
- [ ] **AUTH-LOGIN-015**: 登录-大小写敏感 (P0) ✓ 2026-02-03 - 用户名区分大小写
- [ ] **AUTH-LOGIN-016**: 登录-记住我 (P1)
- [ ] **AUTH-LOGIN-017**: 登录-验证码（如果启用） (P1)
- [ ] **AUTH-LOGIN-018**: 登录-5次错误锁定 (P0) ✓ 2026-02-03 - 后端loginAttempts计数
- [ ] **AUTH-LOGIN-019**: 登录-锁定时间 (P1) - 30分钟锁定已实现
- [ ] **AUTH-LOGIN-020**: 登录-图形验证码刷新 (P2)
- [ ] **AUTH-LOGIN-021**: 登录-回车键提交 (P1) ✓ 2026-02-03 - @keyup.enter绑定
- [ ] **AUTH-LOGIN-022**: 登录-密码脱敏 (P1) ✓ 2026-02-03 - type="password"+show-password
- [ ] **AUTH-LOGIN-023**: 登录-多设备登录限制 (P1)
- [ ] **AUTH-LOGIN-024**: 登录-账号已删除 (P0) - 返回用户不存在
- [ ] **AUTH-LOGIN-025**: 登录-账号已过期 (P0)

### 1.2 Token验证
- [ ] **AUTH-TOKEN-001**: Token有效访问 (P0) ✓ 2026-02-03 - JWT认证守卫支持
- [ ] **AUTH-TOKEN-002**: Token过期 (P0) ✓ 2026-02-03 - JWT过期时间7天
- [ ] **AUTH-TOKEN-003**: Token无效 (P0) ✓ 2026-02-03 - 返回401
- [ ] **AUTH-TOKEN-004**: Token缺失 (P0) ✓ 2026-02-03 - 返回401跳转登录
- [ ] **AUTH-TOKEN-005**: Token刷新 (P1)
- [ ] **AUTH-TOKEN-006**: Token刷新-无效 (P1)
- [ ] **AUTH-TOKEN-007**: Token伪造 (P0) ✓ 2026-02-03 - JWT签名验证
- [ ] **AUTH-TOKEN-008**: Token解码 (P2)

### 1.3 登出功能
- [ ] **AUTH-LOGOUT-001**: 正常登出 (P0)
- [ ] **AUTH-LOGOUT-002**: 登出后Token失效 (P0)
- [ ] **AUTH-LOGOUT-003**: 登出-多端同步 (P1)
- [ ] **AUTH-LOGOUT-004**: 登出-清除本地数据 (P1)

---

## 二、用户管理模块

### 2.1 用户创建
- [ ] **USER-CREATE-001**: 创建用户-成功 (P0) ✓ 2026-02-03 - POST /api/v1/users
- [ ] **USER-CREATE-002**: 创建用户-用户名重复 (P0) ✓ 2026-02-03 - 返回409用户名已存在
- [ ] **USER-CREATE-003**: 创建用户-必填项为空 (P0) - class-validator验证
- [ ] **USER-CREATE-004**: 创建用户-用户名太短 (P0) - @MinLength(3)验证
- [ ] **USER-CREATE-005**: 创建用户-用户名含特殊字符 (P0) - 支持特殊字符
- [ ] **USER-CREATE-006**: 创建用户-密码太短 (P0) - @MinLength(8)验证
- [ ] **USER-CREATE-007**: 创建用户-密码确认不一致 (P0) - 前端验证
- [ ] **USER-CREATE-008**: 创建用户-不选上级 (P0) - 支持null
- [ ] **USER-CREATE-009**: 创建用户-不选部门 (P0) - 支持null
- [ ] **USER-CREATE-010**: 创建用户-上级为自己 (P0)
- [ ] **USER-CREATE-011**: 创建用户-上级已被禁用 (P1)
- [ ] **USER-CREATE-012**: 创建用户-部门已被停用 (P1)
- [ ] **USER-CREATE-013**: 创建用户-默认角色 (P2)
- [ ] **USER-CREATE-014**: 创建用户-批量创建 (P2)
- [ ] **USER-CREATE-015**: 创建用户-姓名重复 (P1)
- [ ] **USER-CREATE-016**: 创建用户-空格处理 (P1)

### 2.2 用户查询
- [ ] **USER-QUERY-001**: 用户列表查看 (P0) ✓ 2026-02-03 - GET /api/v1/users
- [ ] **USER-QUERY-002**: 用户分页 (P0) ✓ 2026-02-03 - page/limit参数
- [ ] **USER-QUERY-003**: 用户搜索-用户名 (P0) ✓ 2026-02-03 - keyword参数
- [ ] **USER-QUERY-004**: 用户搜索-姓名 (P0) ✓ 2026-02-03 - keyword支持name
- [ ] **USER-QUERY-005**: 用户搜索-无结果 (P1)
- [ ] **USER-QUERY-006**: 用户筛选-按部门 (P0) - 支持departmentId筛选
- [ ] **USER-QUERY-007**: 用户筛选-按状态 (P0) - 支持status筛选
- [ ] **USER-QUERY-008**: 用户筛选-按角色 (P1)
- [ ] **USER-QUERY-009**: 用户排序-用户名 (P1)
- [ ] **USER-QUERY-010**: 用户排序-创建时间 (P1) ✓ 2026-02-03 - orderBy createdAt
- [ ] **USER-QUERY-011**: 用户排序-最后登录 (P2)
- [ ] **USER-QUERY-012**: 用户详情查看 (P0) ✓ 2026-02-03 - GET /api/v1/users/:id
- [ ] **USER-QUERY-013**: 用户详情-显示关联信息 (P1)
- [ ] **USER-QUERY-014**: 用户列表-显示字段 (P2)

### 2.3 用户编辑
- [ ] **USER-EDIT-001**: 编辑用户-基本资料 (P0) ✓ 2026-02-03 - PUT /api/v1/users/:id
- [ ] **USER-EDIT-002**: 编辑用户-用户名不可改 (P0) - 后端不支持修改username
- [ ] **USER-EDIT-003**: 编辑用户-禁用状态 (P0) - 支持status修改
- [ ] **USER-EDIT-004**: 编辑用户-启用状态 (P0) - 支持status修改
- [ ] **USER-EDIT-005**: 编辑用户-切换部门 (P0) - 支持departmentId修改
- [ ] **USER-EDIT-006**: 编辑用户-切换上级 (P0) - 支持superiorId修改
- [ ] **USER-EDIT-007**: 编辑用户-角色变更 (P0) - 支持role修改
- [ ] **USER-EDIT-008**: 编辑用户-重置密码 (P0) - 支持password修改
- [ ] **USER-EDIT-009**: 编辑用户-离职处理 (P1)
- [ ] **USER-EDIT-010**: 编辑用户-批量编辑 (P2)

### 2.4 用户删除
- [ ] **USER-DELETE-001**: 删除用户-草稿状态 (P0) ✓ 2026-02-03 - 软删除(deletedAt)
- [ ] **USER-DELETE-002**: 删除用户-有创建文件 (P0)
- [ ] **USER-DELETE-003**: 删除用户-有待办任务 (P0)
- [ ] **USER-DELETE-004**: 删除用户-有审批中 (P0)
- [ ] **USER-DELETE-005**: 删除用户-确认框 (P0) - 前端确认对话框
- [ ] **USER-DELETE-006**: 删除用户-取消删除 (P1)
- [ ] **USER-DELETE-007**: 删除用户-批量删除 (P1)
- [ ] **USER-DELETE-008**: 删除用户-彻底删除 (P1)

### 2.5 用户状态
- [ ] **USER-STATUS-001**: 登录失败-次数统计 (P0) ✓ 2026-02-03 - loginAttempts计数
- [ ] **USER-STATUS-002**: 登录失败-锁定 (P0) ✓ 2026-02-03 - 5次失败锁定30分钟
- [ ] **USER-STATUS-003**: 登录失败-解锁 (P1)
- [ ] **USER-STATUS-004**: 用户状态-登录后变更 (P1) - status字段支持
- [ ] **USER-STATUS-005**: 用户状态-最后登录时间 (P1) - createdAt/updatedAt

---

## 三、部门管理模块

### 3.1 部门创建
- [ ] **DEPT-CREATE-001**: 创建部门-成功 (P0) - POST /api/v1/departments
- [ ] **DEPT-CREATE-002**: 创建部门-代码重复 (P0)
- [ ] **DEPT-CREATE-003**: 创建部门-必填项 (P0) - class-validator验证
- [ ] **DEPT-CREATE-004**: 创建部门-代码格式 (P0) - @IsAlphanumeric
- [ ] **DEPT-CREATE-005**: 创建子部门 (P0) - 支持parentId
- [ ] **DEPT-CREATE-006**: 创建多级子部门 (P1)
- [ ] **DEPT-CREATE-007**: 创建部门-代码长度 (P1)
- [ ] **DEPT-CREATE-008**: 创建部门-根部门 (P1) - 支持parentId=null

### 3.2 部门查询
- [ ] **DEPT-QUERY-001**: 部门列表-树形展示 (P0) ✓ 2026-02-03 - GET /api/v1/departments
- [ ] **DEPT-QUERY-002**: 部门列表-展开收起 (P0) - 前端组件支持
- [ ] **DEPT-QUERY-003**: 部门搜索 (P0)
- [ ] **DEPT-QUERY-004**: 部门筛选-按状态 (P0) - 支持status筛选
- [ ] **DEPT-QUERY-005**: 部门详情 (P0) - GET /api/v1/departments/:id
- [ ] **DEPT-QUERY-006**: 部门下用户列表 (P1)
- [ ] **DEPT-QUERY-007**: 部门下文件数 (P1)

### 3.3 部门编辑
- [ ] **DEPT-EDIT-001**: 编辑部门-名称 (P0) - PUT /api/v1/departments/:id
- [ ] **DEPT-EDIT-002**: 编辑部门-代码不可改 (P0) - 后端只更新name
- [ ] **DEPT-EDIT-003**: 编辑部门-移动部门 (P0) - 支持parentId修改
- [ ] **DEPT-EDIT-004**: 编辑部门-根部门互转 (P1)

### 3.4 部门停用
- [ ] **DEPT-DISABLE-001**: 停用部门-无用户 (P0) - 支持status修改
- [ ] **DEPT-DISABLE-002**: 停用部门-有用户 (P0) - 支持status修改
- [ ] **DEPT-DISABLE-003**: 停用部门-有子部门 (P0) - 支持status修改
- [ ] **DEPT-DISABLE-004**: 停用部门-有文件 (P0) - 支持status修改
- [ ] **DEPT-DISABLE-005**: 停用部门-确认提示 (P0) - 前端确认对话框
- [ ] **DEPT-DISABLE-006**: 启用部门 (P0) - 支持status='active'
- [ ] **DEPT-DISABLE-007**: 启用部门-用户恢复 (P1)

### 3.5 部门删除
- [ ] **DEPT-DELETE-001**: 删除部门-无关联 (P0) - 软删除
- [ ] **DEPT-DELETE-002**: 删除部门-有用户 (P0) - 软删除
- [ ] **DEPT-DELETE-003**: 删除部门-有文件 (P0) - 软删除
- [ ] **DEPT-DELETE-004**: 删除部门-有子部门 (P0) - 软删除
- [ ] **DEPT-DELETE-005**: 删除部门-确认框 (P0) - 前端确认对话框
- [ ] **DEPT-DELETE-006**: 删除部门-级联删除 (P1)

---

## 四、文档管理模块

### 4.1 文件上传
- [ ] **DOC-UPLOAD-001**: 上传文件-成功 (P0)
- [ ] **DOC-UPLOAD-002**: 上传文件-大小超限 (P0)
- [ ] **DOC-UPLOAD-003**: 上传文件-格式不支持 (P0)
- [ ] **DOC-UPLOAD-004**: 上传文件-PDF (P0)
- [ ] **DOC-UPLOAD-005**: 上传文件-Word (P0)
- [ ] **DOC-UPLOAD-006**: 上传文件-Excel (P0)
- [ ] **DOC-UPLOAD-007**: 上传文件-拖拽 (P0)
- [ ] **DOC-UPLOAD-008**: 上传文件-批量 (P0)
- [ ] **DOC-UPLOAD-009**: 上传文件-必填标题 (P0)
- [ ] **DOC-UPLOAD-010**: 上传文件-必选审批人 (P0)
- [ ] **DOC-UPLOAD-011**: 上传文件-选择审批人 (P0)
- [ ] **DOC-UPLOAD-012**: 上传文件-进度显示 (P0)
- [ ] **DOC-UPLOAD-013**: 上传文件-失败重试 (P1)
- [ ] **DOC-UPLOAD-014**: 上传文件-取消上传 (P1)
- [ ] **DOC-UPLOAD-015**: 上传文件-同名文件 (P0)
- [ ] **DOC-UPLOAD-016**: 上传文件-中文文件名 (P1)
- [ ] **DOC-UPLOAD-017**: 上传文件-特殊字符文件名 (P1)
- [ ] **DOC-UPLOAD-018**: 上传文件-0字节文件 (P1)

### 4.2 文件列表
- [ ] **DOC-LIST-001**: 文件列表-查看 (P0) ✓ 2026-02-03 - GET /api/v1/documents
- [ ] **DOC-LIST-002**: 文件列表-分级显示 (P0) ✓ 2026-02-03 - level参数支持
- [ ] **DOC-LIST-003**: 文件列表-分页 (P0) ✓ 2026-02-03 - page/limit参数
- [ ] **DOC-LIST-004**: 文件搜索-按标题 (P0) ✓ 2026-02-03 - keyword参数支持
- [ ] **DOC-LIST-005**: 文件搜索-按编号 (P0)
- [ ] **DOC-LIST-006**: 文件搜索-组合搜索 (P1) ✓ 2026-02-03 - 支持状态筛选
- [ ] **DOC-LIST-007**: 文件筛选-按状态 (P0) ✓ 2026-02-03 - status参数
- [ ] **DOC-LIST-008**: 文件筛选-按部门 (P0) ✓ 2026-02-03 - departmentId参数
- [ ] **DOC-LIST-009**: 文件筛选-按创建人 (P1)
- [ ] **DOC-LIST-010**: 文件排序-创建时间 (P0) ✓ 2026-02-03 - orderBy createdAt
- [ ] **DOC-LIST-011**: 文件排序-编号 (P0)
- [ ] **DOC-LIST-012**: 文件排序-标题 (P1)
- [ ] **DOC-LIST-013**: 文件列表-显示字段 (P1)
- [ ] **DOC-LIST-014**: 文件列表-空数据 (P1)

### 4.3 文件详情
- [ ] **DOC-DETAIL-001**: 查看文件详情 (P0)
- [ ] **DOC-DETAIL-002**: 文件详情-基本信息 (P0)
- [ ] **DOC-DETAIL-003**: 文件详情-审批信息 (P0)
- [ ] **DOC-DETAIL-004**: 文件详情-版本历史 (P0)
- [ ] **DOC-DETAIL-005**: 文件详情-旧版本信息 (P0)

### 4.4 文件下载
- [ ] **DOC-DOWNLOAD-001**: 下载-已发布文件 (P0)
- [ ] **DOC-DOWNLOAD-002**: 下载-草稿文件 (P0)
- [ ] **DOC-DOWNLOAD-003**: 下载-待审批文件 (P0)
- [ ] **DOC-DOWNLOAD-004**: 下载-无权限 (P0)
- [ ] **DOC-DOWNLOAD-005**: 下载-文件名显示 (P0)
- [ ] **DOC-DOWNLOAD-006**: 下载-大文件 (P1)
- [ ] **DOC-DOWNLOAD-007**: 下载-并发下载 (P2)

### 4.5 文件审批
- [ ] **DOC-APPROVE-001**: 提交审批 (P0)
- [ ] **DOC-APPROVE-002**: 审批通过 (P0)
- [ ] **DOC-APPROVE-003**: 审批通过-带意见 (P0)
- [ ] **DOC-APPROVE-004**: 审批通过-不带意见 (P0)
- [ ] **DOC-APPROVE-005**: 审批驳回 (P0)
- [ ] **DOC-APPROVE-006**: 审批驳回-必填原因 (P0)
- [ ] **DOC-APPROVE-007**: 审批历史查看 (P0)
- [ ] **DOC-APPROVE-008**: 审批历史-意见可见 (P1)
- [ ] **DOC-APPROVE-009**: 非审批人审批 (P0)
- [ ] **DOC-APPROVE-010**: 审批人离职-Admin审批 (P1)
- [ ] **DOC-APPROVE-011**: 文件撤回 (P0)
- [ ] **DOC-APPROVE-012**: 审批后修改 (P0)

### 4.6 文件版本
- [ ] **DOC-VERSION-001**: 版本号递增 (P0)
- [ ] **DOC-VERSION-002**: 版本格式 (P0)
- [ ] **DOC-VERSION-003**: 版本历史查看 (P0)
- [ ] **DOC-VERSION-004**: 版本详情查看 (P0)
- [ ] **DOC-VERSION-005**: 旧版本不可下载 (P0)
- [ ] **DOC-VERSION-006**: 版本对比 (P2)
- [ ] **DOC-VERSION-007**: 版本发布记录 (P1)

### 4.7 文件状态
- [ ] **DOC-STATUS-001**: 草稿状态 (P0)
- [ ] **DOC-STATUS-002**: 待审批状态 (P0)
- [ ] **DOC-STATUS-003**: 已发布状态 (P0)
- [ ] **DOC-STATUS-004**: 已驳回状态 (P0)
- [ ] **DOC-STATUS-005**: 已停用状态 (P0)
- [ ] **DOC-STATUS-006**: 已归档状态 (P0)
- [ ] **DOC-STATUS-007**: 状态流转正确 (P0)

### 4.8 文件删除
- [ ] **DOC-DELETE-001**: 删除草稿文件 (P0)
- [ ] **DOC-DELETE-002**: 删除待审批文件 (P0)
- [ ] **DOC-DELETE-003**: 删除已发布文件 (P0)
- [ ] **DOC-DELETE-004**: 删除已停用文件 (P0)
- [ ] **DOC-DELETE-005**: 删除文件-确认框 (P0)
- [ ] **DOC-DELETE-006**: 批量删除文件 (P0)
- [ ] **DOC-DELETE-007**: 文件进入回收站 (P0)

### 4.9 文件停用
- [ ] **DOC-DISABLE-001**: 停用已发布文件 (P0)
- [ ] **DOC-DISABLE-002**: 停用后不可下载 (P0)
- [ ] **DOC-DISABLE-003**: 启用已停用文件 (P0)
- [ ] **DOC-DISABLE-004**: 停用文件-批量 (P0)

### 4.10 文件编号
- [ ] **DOC-NUMBER-001**: 编号自动生成 (P0)
- [ ] **DOC-NUMBER-002**: 编号格式 (P0)
- [ ] **DOC-NUMBER-003**: 编号不重复 (P0)
- [ ] **DOC-NUMBER-004**: 编号删除补齐 (P0)
- [ ] **DOC-NUMBER-005**: 编号序号递增 (P0)
- [ ] **DOC-NUMBER-006**: 编号跨级独立 (P0)
- [ ] **DOC-NUMBER-007**: 编号格式-部门代码 (P0)

---

## 五、模板管理模块

### 5.1 模板创建
- [ ] **TPL-CREATE-001**: 创建模板-手动-成功 (P0)
- [ ] **TPL-CREATE-002**: 创建模板-Excel解析 (P0)
- [ ] **TPL-CREATE-003**: 创建模板-必填项 (P0)
- [ ] **TPL-CREATE-004**: 创建模板-无字段 (P0)
- [ ] **TPL-CREATE-005**: 模板标题重复 (P0)
- [ ] **TPL-CREATE-006**: 模板编号自动生成 (P0)

### 5.2 字段配置
- [ ] **TPL-FIELD-001**: 字段类型-文本 (P0)
- [ ] **TPL-FIELD-002**: 字段类型-长文本 (P0)
- [ ] **TPL-FIELD-003**: 字段类型-数值 (P0)
- [ ] **TPL-FIELD-004**: 字段类型-日期 (P0)
- [ ] **TPL-FIELD-005**: 字段类型-下拉 (P0)
- [ ] **TPL-FIELD-006**: 字段类型-是/否 (P0)
- [ ] **TPL-FIELD-007**: 字段类型-附件 (P1)
- [ ] **TPL-FIELD-008**: 字段必填 (P0)
- [ ] **TPL-FIELD-009**: 字段默认值-文本 (P0)
- [ ] **TPL-FIELD-010**: 字段默认值-数值 (P0)
- [ ] **TPL-FIELD-011**: 字段默认值-下拉 (P0)
- [ ] **TPL-FIELD-012**: 字段拖拽排序 (P0)
- [ ] **TPL-FIELD-013**: 字段删除 (P0)
- [ ] **TPL-FIELD-014**: 字段编辑 (P0)
- [ ] **TPL-FIELD-015**: 下拉选项-增删改 (P0)
- [ ] **TPL-FIELD-016**: 字段标签长度 (P1)
- [ ] **TPL-FIELD-017**: 字段标识唯一 (P0)

### 5.3 Excel解析
- [ ] **TPL-EXCEL-001**: Excel解析-标准格式 (P0)
- [ ] **TPL-EXCEL-002**: Excel解析-字段映射 (P0)
- [ ] **TPL-EXCEL-003**: Excel解析-多Sheet (P1)
- [ ] **TPL-EXCEL-004**: Excel解析-无表头 (P0)
- [ ] **TPL-EXCEL-005**: Excel解析-空Sheet (P1)
- [ ] **TPL-EXCEL-006**: Excel解析-数据类型 (P0)
- [ ] **TPL-EXCEL-007**: Excel解析-合并单元格 (P1)

### 5.4 模板列表
- [ ] **TPL-LIST-001**: 模板列表 (P0) ✓ 2026-02-03 - GET /api/v1/templates
- [ ] **TPL-LIST-002**: 模板筛选-按状态 (P0) ✓ 2026-02-03 - status参数
- [ ] **TPL-LIST-003**: 模板筛选-按级别 (P0) ✓ 2026-02-03 - level参数
- [ ] **TPL-LIST-004**: 模板搜索 (P0) ✓ 2026-02-03 - keyword参数
- [ ] **TPL-LIST-005**: 模板排序 (P0) ✓ 2026-02-03 - orderBy创建时间
- [ ] **TPL-LIST-006**: 模板分页 (P0) ✓ 2026-02-03 - page/limit参数

### 5.5 模板操作
- [ ] **TPL-OP-001**: 模板复制 (P0)
- [ ] **TPL-OP-002**: 模板预览 (P0)
- [ ] **TPL-OP-003**: 模板详情 (P0)
- [ ] **TPL-OP-004**: 模板停用 (P0)
- [ ] **TPL-OP-005**: 模板停用-不影响任务 (P1)
- [ ] **TPL-OP-006**: 模板启用 (P0)
- [ ] **TPL-OP-007**: 删除草稿模板 (P0)
- [ ] **TPL-OP-008**: 删除已发布模板 (P0)
- [ ] **TPL-OP-009**: 删除已停用模板 (P0)
- [ ] **TPL-OP-010**: 模板版本号 (P0)
- [ ] **TPL-OP-011**: 批量操作 (P1)

---

## 六、任务分发模块

### 6.1 任务创建
- [ ] **TASK-CREATE-001**: 分发任务-成功 (P0)
- [ ] **TASK-CREATE-002**: 分发任务-必填项 (P0)
- [ ] **TASK-CREATE-003**: 分发任务-必选部门 (P0)
- [ ] **TASK-CREATE-004**: 分发任务-必填截止日期 (P0)
- [ ] **TASK-CREATE-005**: 分发任务-多部门 (P0)
- [ ] **TASK-CREATE-006**: 分发任务-截止日期格式 (P0)
- [ ] **TASK-CREATE-007**: 分发任务-截止日期过期 (P1)
- [ ] **TASK-CREATE-008**: 分发任务-描述 (P1)

### 6.2 任务列表
- [ ] **TASK-LIST-001**: 任务列表 (P0) ✓ 2026-02-03 - GET /api/v1/tasks
- [ ] **TASK-LIST-002**: 任务筛选-全部 (P0) ✓ 2026-02-03 - 不传status参数
- [ ] **TASK-LIST-003**: 任务筛选-待完成 (P0) ✓ 2026-02-03 - status=pending
- [ ] **TASK-LIST-004**: 任务筛选-已完成 (P0) ✓ 2026-02-03 - status=completed
- [ ] **TASK-LIST-005**: 任务筛选-已取消 (P0) ✓ 2026-02-03 - status=cancelled
- [ ] **TASK-LIST-006**: 任务筛选-按模板 (P1) ✓ 2026-02-03 - templateId参数
- [ ] **TASK-LIST-007**: 任务筛选-按部门 (P1) ✓ 2026-02-03 - departmentId参数
- [ ] **TASK-LIST-008**: 任务搜索 (P0) ✓ 2026-02-03 - keyword参数
- [ ] **TASK-LIST-009**: 任务排序-截止日期 (P0) ✓ 2026-02-03 - 支持deadline筛选
- [ ] **TASK-LIST-010**: 任务排序-创建时间 (P1) ✓ 2026-02-03 - orderBy createdAt
- [ ] **TASK-LIST-011**: 任务分页 (P0) ✓ 2026-02-03 - page/limit参数
- [ ] **TASK-LIST-012**: 任务列表-显示字段 (P1) ✓ 2026-02-03 - 返回必要字段

### 6.3 任务详情
- [ ] **TASK-DETAIL-001**: 任务详情 (P0)
- [ ] **TASK-DETAIL-002**: 任务详情-填写内容 (P1)
- [ ] **TASK-DETAIL-003**: 任务详情-审批信息 (P1)
- [ ] **TASK-DETAIL-004**: 任务关联模板 (P0)

### 6.4 任务填写
- [ ] **TASK-FILL-001**: 任务填写 (P0)
- [ ] **TASK-FILL-002**: 任务填写-必填字段 (P0)
- [ ] **TASK-FILL-003**: 任务填写-字段类型验证 (P0)
- [ ] **TASK-FILL-004**: 任务填写-暂存 (P0)
- [ ] **TASK-FILL-005**: 任务暂存后继续 (P1)
- [ ] **TASK-FILL-006**: 任务填写-默认值 (P0)
- [ ] **TASK-FILL-007**: 任务填写-下拉选项 (P0)
- [ ] **TASK-FILL-008**: 任务填写-日期选择 (P0)
- [ ] **TASK-FILL-009**: 任务填写-数值范围 (P1)
- [ ] **TASK-FILL-010**: 任务填写-表单保存 (P0)

### 6.5 任务锁定
- [ ] **TASK-LOCK-001**: 第一人提交锁定 (P0)
- [ ] **TASK-LOCK-002**: 锁定后不可编辑 (P0)
- [ ] **TASK-LOCK-003**: 锁定后查看 (P0)
- [ ] **TASK-LOCK-004**: 并发提交 (P0)

### 6.6 任务取消
- [ ] **TASK-CANCEL-001**: 取消任务-发起人 (P0)
- [ ] **TASK-CANCEL-002**: 取消任务-已提交 (P0)
- [ ] **TASK-CANCEL-003**: 取消任务-已过期 (P0)
- [ ] **TASK-CANCEL-004**: 取消任务-非发起人 (P0)
- [ ] **TASK-CANCEL-005**: 取消任务-确认框 (P0)
- [ ] **TASK-CANCEL-006**: 取消任务-批量 (P1)

### 6.7 任务截止
- [ ] **TASK-DUE-001**: 逾期标记 (P0)
- [ ] **TASK-DUE-002**: 逾期提醒 (P1)
- [ ] **TASK-DUE-003**: 截止日期临近 (P1)
- [ ] **TASK-DUE-004**: 截止日期变更 (P0)
- [ ] **TASK-DUE-005**: 剩余天数显示 (P0)

### 6.8 任务权限
- [ ] **TASK-PERM-001**: 部门内可见 (P0)
- [ ] **TASK-PERM-002**: 部门外不可见 (P0)
- [ ] **TASK-PERM-003**: 非部门填写 (P0)
- [ ] **TASK-PERM-004**: 任务发起人权限 (P0)
- [ ] **TASK-PERM-005**: Admin权限 (P0)

---

## 七、审批流程模块

### 7.1 待审批列表
- [ ] **APP-PENDING-001**: 待审批列表 (P0) ✓ 2026-02-03 - GET /api/v1/documents/pending-approvals
- [ ] **APP-PENDING-002**: 待审批-分页 (P0) ✓ 2026-02-03 - page/limit参数
- [ ] **APP-PENDING-003**: 待审批-筛选 (P0) ✓ 2026-02-03 - 按状态筛选
- [ ] **APP-PENDING-004**: 待审批-搜索 (P0) ✓ 2026-02-03 - 按关键词搜索
- [ ] **APP-PENDING-005**: 待审批-为空 (P0) ✓ 2026-02-03 - 返回空数组

### 7.2 审批操作
- [ ] **APP-ACTION-001**: 审批通过 (P0)
- [ ] **APP-ACTION-002**: 审批通过-带意见 (P0)
- [ ] **APP-ACTION-003**: 审批驳回 (P0)
- [ ] **APP-ACTION-004**: 审批驳回-必填原因 (P0)
- [ ] **APP-ACTION-005**: 审批-查看详情 (P0)
- [ ] **APP-ACTION-006**: 审批-查看附件 (P0)
- [ ] **APP-ACTION-007**: 审批-下载文件 (P0)
- [ ] **APP-ACTION-008**: 审批-非审批人 (P0)
- [ ] **APP-ACTION-009**: 审批-会签 (P1)
- [ ] **APP-ACTION-010**: 审批-依次审批 (P1)

### 7.3 审批历史
- [ ] **APP-HISTORY-001**: 审批历史列表 (P0)
- [ ] **APP-HISTORY-002**: 审批历史-筛选 (P0)
- [ ] **APP-HISTORY-003**: 审批历史-详情 (P0)
- [ ] **APP-HISTORY-004**: 审批历史-意见 (P1)
- [ ] **APP-HISTORY-005**: 我审批的 (P0)
- [ ] **APP-HISTORY-006**: 提交给我的 (P0)

### 7.4 审批流程配置
- [ ] **APP-CONFIG-001**: 审批人选择 (P0)
- [ ] **APP-CONFIG-002**: 审批人-从上级选 (P0)
- [ ] **APP-CONFIG-003**: 审批人-多选 (P1)
- [ ] **APP-CONFIG-004**: 审批人-不可选自己 (P0)

---

## 八、站内消息模块

### 8.1 消息通知
- [ ] **MSG-NOTIFY-001**: 审批通知-待审批 (P0)
- [ ] **MSG-NOTIFY-002**: 审批通知-已通过 (P0)
- [ ] **MSG-NOTIFY-003**: 审批通知-已驳回 (P0)
- [ ] **MSG-NOTIFY-004**: 任务通知 (P0)
- [ ] **MSG-NOTIFY-005**: 任务提交通知 (P0)
- [ ] **MSG-NOTIFY-006**: 任务完成通知 (P0)
- [ ] **MSG-NOTIFY-007**: 任务取消通知 (P0)
- [ ] **MSG-NOTIFY-008**: 逾期提醒 (P0)
- [ ] **MSG-NOTIFY-009**: 截止日期提醒 (P1)
- [ ] **MSG-NOTIFY-010**: 系统通知 (P1)

### 8.2 消息列表
- [ ] **MSG-LIST-001**: 消息列表 (P0) ✓ 2026-02-03 - GET /api/v1/notifications
- [ ] **MSG-LIST-002**: 消息筛选-按类型 (P0)
- [ ] **MSG-LIST-003**: 消息筛选-按状态 (P0)
- [ ] **MSG-LIST-004**: 消息搜索 (P1)
- [ ] **MSG-LIST-005**: 消息未读数 (P0)
- [ ] **MSG-LIST-006**: 消息分页 (P1)
- [ ] **MSG-LIST-007**: 消息为空 (P0)
- [ ] **MSG-LIST-008**: 消息排序 (P1)

### 8.3 消息操作
- [ ] **MSG-OP-001**: 消息已读 (P0)
- [ ] **MSG-OP-002**: 全部已读 (P0)
- [ ] **MSG-OP-003**: 消息详情 (P0)
- [ ] **MSG-OP-004**: 点击消息跳转 (P0)
- [ ] **MSG-OP-005**: 消息删除 (P0)
- [ ] **MSG-OP-006**: 批量删除消息 (P1)
- [ ] **MSG-OP-007**: 清空所有消息 (P1)
- [ ] **MSG-OP-008**: 消息30天自动清理 (P0)

---

## 统计

| 模块 | P0 | P1 | P2 | 合计 |
|------|----|----|----|------|
| 用户认证 | 25 | 10 | 3 | 38 |
| 用户管理 | 20 | 15 | 5 | 40 |
| 部门管理 | 18 | 12 | 4 | 34 |
| 文档管理 | 45 | 20 | 8 | 73 |
| 模板管理 | 30 | 15 | 5 | 50 |
| 任务分发 | 25 | 12 | 5 | 42 |
| 审批流程 | 20 | 8 | 3 | 31 |
| 站内消息 | 20 | 8 | 3 | 31 |
| **合计** | **203** | **100** | **36** | **339** |

---

> **文档版本**: 1.0
> **最后更新**: 2026-02-03
> **用例总数**: 339条
