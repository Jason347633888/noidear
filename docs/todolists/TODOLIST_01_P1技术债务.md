# TODOLIST_01: P1 技术债务修复

> **模块**: P1-1 文档归档/作废 + P1-2 细粒度权限系统 + P1-3 简化工作流引擎
> **Issue 数量**: 120 个
> **预计总时间**: 80 小时
> **优先级**: P0（阻塞性问题，必须立即完成）
> **依赖**: MVP Phase 1-6 完成
> **参考文档**: DESIGN.md v10.7 第 22.2 章

---

## 📊 模块概览

| 子模块 | Issue 数量 | 预计时间 | 优先级 | 状态 |
|--------|-----------|---------|--------|------|
| **P1-1: 文档归档/作废** | 40 | 20h | P0 | ⏳ 待开始 |
| **P1-2: 细粒度权限系统** | 50 | 40h | P1 | ⏳ 待开始 |
| **P1-3: 简化工作流引擎** | 30 | 20h | P1 | ⏳ 待开始 |

---

## 🎯 P1-1: 文档归档/作废功能

### 功能概述
实现 BRCGS 合规所需的文档归档（Archive）和作废（Obsolete）功能。

**核心能力**:
- 文档归档：将"已发布"文档标记为归档状态
- 文档作废：文档被新版本替代时标记为作废
- 文档恢复：管理员可恢复归档/作废文档

**业务规则**:
- BR-346: 文档归档规则
- BR-347: 文档作废规则
- BR-348: 文档恢复规则

---

### Phase 1: 数据库设计（3 个 Issue，65 分钟）

---

#### Issue-P1-1-001: 设计 Document 表归档/作废字段

**类型**: 编码  
**估时**: 30 分钟  
**依赖**: 无  
**优先级**: P0  

##### 📝 需求描述
根据 DESIGN.md 第 22.2.1 节，为 Document 表新增 6 个归档/作废相关字段。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma
```

##### 🔧 开发步骤
- [ ] Step 1: 打开 schema.prisma 文件，定位 Document model
- [ ] Step 2: 在 deletedAt 字段后新增 6 个字段：
  ```prisma
  archivedAt      DateTime?
  archivedBy      String?
  archivedReason  String?
  obsoletedAt     DateTime?
  obsoletedBy     String?
  obsoletedReason String?
  replacedByDocId String?
  ```
- [ ] Step 3: 运行 `npx prisma format --schema=src/prisma/schema.prisma` 验证语法

##### ✅ 验收标准
- [ ] Document model 已新增 7 个字段
- [ ] 字段类型正确（String?, DateTime?）
- [ ] Prisma format 无错误

##### 🧪 测试清单
- [ ] 语法测试: `npx prisma validate --schema=src/prisma/schema.prisma`

##### 🐛 预留 Debug 时间
- 预计问题: Prisma 语法错误
- Debug 预留: 10 分钟

##### 🔗 相关 Issue
- 前置: 无
- 后续: Issue-P1-1-002

---

#### Issue-P1-1-002: 编写 Document 表迁移文件

**类型**: 编码  
**估时**: 20 分钟  
**依赖**: Issue-P1-1-001  
**优先级**: P0  

##### 📝 需求描述
生成 Prisma 迁移文件，为 Document 表新增归档/作废字段。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/migrations/
```

##### 🔧 开发步骤
- [ ] Step 1: 运行 `npx prisma migrate dev --name add_document_archive_fields --schema=src/prisma/schema.prisma`
- [ ] Step 2: 检查生成的迁移文件 SQL 语句
- [ ] Step 3: 验证字段类型映射正确（String? → VARCHAR NULL, DateTime? → TIMESTAMP NULL）

##### ✅ 验收标准
- [ ] 迁移文件已生成
- [ ] 包含 7 个 ALTER TABLE ADD COLUMN 语句
- [ ] 字段允许 NULL

##### 🧪 测试清单
- [ ] SQL 语法检查：打开迁移文件，验证 SQL 正确

##### 🐛 预留 Debug 时间
- 预计问题: 字段类型映射错误
- Debug 预留: 10 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-001
- 后续: Issue-P1-1-003

---

#### Issue-P1-1-003: 运行数据库迁移并验证

**类型**: 测试  
**估时**: 15 分钟  
**依赖**: Issue-P1-1-002  
**优先级**: P0  

##### 📝 需求描述
运行数据库迁移，验证字段是否正确创建。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma
```

##### 🔧 开发步骤
- [ ] Step 1: 确保 Docker PostgreSQL 容器运行中
- [ ] Step 2: 运行 `npx prisma migrate deploy --schema=src/prisma/schema.prisma`
- [ ] Step 3: 运行 `npx prisma generate --schema=src/prisma/schema.prisma`
- [ ] Step 4: 使用 Prisma Studio 验证字段：`npx prisma studio --schema=src/prisma/schema.prisma`

##### ✅ 验收标准
- [ ] 迁移成功执行
- [ ] Prisma Client 重新生成
- [ ] Prisma Studio 中可见 7 个新字段

##### 🧪 测试清单
- [ ] 迁移测试: 迁移命令无错误
- [ ] 字段存在性测试: Prisma Studio 查看字段

##### 🐛 预留 Debug 时间
- 预计问题: 迁移失败、字段类型不匹配
- Debug 预留: 10 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-002
- 后续: Issue-P1-1-004

---

### Phase 2: 后端 DTO 定义（6 个 Issue，2 小时）

---

#### Issue-P1-1-004: 创建 ArchiveDocumentDto

**类型**: 编码  
**估时**: 20 分钟  
**依赖**: Issue-P1-1-003  
**优先级**: P0  

##### 📝 需求描述
创建文档归档 DTO，用于接收归档请求参数。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/documents/dto/archive-document.dto.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 创建 dto 目录（如不存在）
- [ ] Step 2: 创建 archive-document.dto.ts 文件
- [ ] Step 3: 编写 DTO 类：
  ```typescript
  import { IsString, IsNotEmpty } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';

  export class ArchiveDocumentDto {
    @ApiProperty({ description: '归档原因', example: '该文档已过时' })
    @IsString()
    @IsNotEmpty()
    reason: string;
  }
  ```
- [ ] Step 4: 运行 ESLint 检查

##### ✅ 验收标准
- [ ] DTO 文件已创建
- [ ] 包含 reason 字段
- [ ] 有 class-validator 装饰器
- [ ] 有 Swagger 文档注解

##### 🧪 测试清单
- [ ] ESLint 检查: `npm run lint`

##### 🐛 预留 Debug 时间
- 预计问题: 导入路径错误
- Debug 预留: 5 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-003
- 后续: Issue-P1-1-005

---

#### Issue-P1-1-005: 创建 ObsoleteDocumentDto

**类型**: 编码  
**估时**: 20 分钟  
**依赖**: Issue-P1-1-004  
**优先级**: P0  

##### 📝 需求描述
创建文档作废 DTO，包含作废原因和替代文档 ID。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/documents/dto/obsolete-document.dto.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 创建 obsolete-document.dto.ts 文件
- [ ] Step 2: 编写 DTO 类：
  ```typescript
  import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
  import { ApiProperty } from '@nestjs/swagger';

  export class ObsoleteDocumentDto {
    @ApiProperty({ description: '作废原因' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiProperty({ description: '替代文档 ID', required: false })
    @IsString()
    @IsOptional()
    replacedByDocId?: string;
  }
  ```

##### ✅ 验收标准
- [ ] DTO 文件已创建
- [ ] 包含 reason 和 replacedByDocId 字段
- [ ] replacedByDocId 为可选字段

##### 🧪 测试清单
- [ ] ESLint 检查: `npm run lint`

##### 🐛 预留 Debug 时间
- 预计问题: 可选字段验证错误
- Debug 预留: 5 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-004
- 后续: Issue-P1-1-006

---

#### Issue-P1-1-006: 创建 RestoreDocumentDto

**类型**: 编码  
**估时**: 15 分钟  
**依赖**: Issue-P1-1-005  
**优先级**: P0  

##### 📝 需求描述
创建文档恢复 DTO，包含恢复原因。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/documents/dto/restore-document.dto.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 创建 restore-document.dto.ts 文件
- [ ] Step 2: 编写 DTO 类（结构同 ArchiveDocumentDto）

##### ✅ 验收标准
- [ ] DTO 文件已创建
- [ ] 包含 reason 字段

##### 🧪 测试清单
- [ ] ESLint 检查: `npm run lint`

##### 🐛 预留 Debug 时间
- 预计问题: 无
- Debug 预留: 5 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-005
- 后续: Issue-P1-1-007

---

#### Issue-P1-1-007: DTO 单元测试 - ArchiveDocumentDto

**类型**: 测试  
**估时**: 20 分钟  
**依赖**: Issue-P1-1-006  
**优先级**: P0  

##### 📝 需求描述
编写 ArchiveDocumentDto 的单元测试，验证 class-validator 装饰器。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/test/dto/archive-document.dto.spec.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 创建测试文件
- [ ] Step 2: 编写测试用例：
  ```typescript
  import { validate } from 'class-validator';
  import { ArchiveDocumentDto } from '../../src/modules/documents/dto/archive-document.dto';

  describe('ArchiveDocumentDto', () => {
    it('should pass with valid reason', async () => {
      const dto = new ArchiveDocumentDto();
      dto.reason = '文档已过时';
      
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with empty reason', async () => {
      const dto = new ArchiveDocumentDto();
      dto.reason = '';
      
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
  ```

##### ✅ 验收标准
- [ ] 测试文件已创建
- [ ] 至少 2 个测试用例（有效/无效）
- [ ] 所有测试通过

##### 🧪 测试清单
- [ ] 运行测试: `npm test -- archive-document.dto.spec.ts`

##### 🐛 预留 Debug 时间
- 预计问题: class-validator 未正确导入
- Debug 预留: 10 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-006
- 后续: Issue-P1-1-008

---

#### Issue-P1-1-008: DTO 单元测试 - ObsoleteDocumentDto

**类型**: 测试  
**估时**: 20 分钟  
**依赖**: Issue-P1-1-007  
**优先级**: P0  

##### 📝 需求描述
编写 ObsoleteDocumentDto 的单元测试。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/test/dto/obsolete-document.dto.spec.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 创建测试文件
- [ ] Step 2: 编写测试用例（验证 reason 必填，replacedByDocId 可选）

##### ✅ 验收标准
- [ ] 测试文件已创建
- [ ] 至少 3 个测试用例
- [ ] 所有测试通过

##### 🧪 测试清单
- [ ] 运行测试: `npm test -- obsolete-document.dto.spec.ts`

##### 🐛 预留 Debug 时间
- 预计问题: 可选字段验证逻辑错误
- Debug 预留: 10 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-007
- 后续: Issue-P1-1-009

---

#### Issue-P1-1-009: DTO 单元测试 - RestoreDocumentDto

**类型**: 测试  
**估时**: 15 分钟  
**依赖**: Issue-P1-1-008  
**优先级**: P0  

##### 📝 需求描述
编写 RestoreDocumentDto 的单元测试。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/test/dto/restore-document.dto.spec.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 创建测试文件
- [ ] Step 2: 编写测试用例（结构同 ArchiveDocumentDto）

##### ✅ 验收标准
- [ ] 测试文件已创建
- [ ] 至少 2 个测试用例
- [ ] 所有测试通过

##### 🧪 测试清单
- [ ] 运行测试: `npm test -- restore-document.dto.spec.ts`

##### 🐛 预留 Debug 时间
- 预计问题: 无
- Debug 预留: 5 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-008
- 后续: Issue-P1-1-010

---

### Phase 3: 后端服务层（10 个 Issue，4.5 小时）

---

#### Issue-P1-1-010: 实现 archiveDocument 服务方法

**类型**: 编码  
**估时**: 45 分钟  
**依赖**: Issue-P1-1-009  
**优先级**: P0  

##### 📝 需求描述
在 DocumentsService 中实现 archiveDocument 方法，验证 BR-346 业务规则。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/documents/documents.service.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 打开 documents.service.ts 文件
- [ ] Step 2: 添加 archiveDocument 方法：
  ```typescript
  async archiveDocument(id: string, userId: string, dto: ArchiveDocumentDto) {
    // BR-346: 只有"已发布"状态文档可归档
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');
    if (doc.status !== 'published') {
      throw new BadRequestException('只有"已发布"状态文档可归档');
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedBy: userId,
        archivedReason: dto.reason,
      },
    });
  }
  ```
- [ ] Step 3: 添加必要的导入（NotFoundException, BadRequestException）

##### ✅ 验收标准
- [ ] archiveDocument 方法已实现
- [ ] 验证 BR-346 规则（只有已发布文档可归档）
- [ ] 返回更新后的文档对象

##### 🧪 测试清单
- [ ] （下一个 Issue 会添加单元测试）

##### 🐛 预留 Debug 时间
- 预计问题: Prisma 查询错误
- Debug 预留: 15 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-009
- 后续: Issue-P1-1-011

---

#### Issue-P1-1-011: 实现 obsoleteDocument 服务方法

**类型**: 编码  
**估时**: 45 分钟  
**依赖**: Issue-P1-1-010  
**优先级**: P0  

##### 📝 需求描述
实现 obsoleteDocument 方法，验证 BR-347 业务规则。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/documents/documents.service.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 添加 obsoleteDocument 方法
- [ ] Step 2: 验证 BR-347 规则（只有已发布文档可作废）
- [ ] Step 3: 如果提供了 replacedByDocId，验证替代文档存在

##### ✅ 验收标准
- [ ] obsoleteDocument 方法已实现
- [ ] 验证 BR-347 规则
- [ ] 验证替代文档存在性（如提供）

##### 🧪 测试清单
- [ ] （下一个 Issue 会添加单元测试）

##### 🐛 预留 Debug 时间
- 预计问题: 替代文档验证逻辑错误
- Debug 预留: 15 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-010
- 后续: Issue-P1-1-012

---

#### Issue-P1-1-012: 实现 restoreDocument 服务方法

**类型**: 编码  
**估时**: 30 分钟  
**依赖**: Issue-P1-1-011  
**优先级**: P0  

##### 📝 需求描述
实现 restoreDocument 方法，验证 BR-348 业务规则（仅管理员可恢复）。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/documents/documents.service.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 添加 restoreDocument 方法
- [ ] Step 2: 验证 BR-348 规则（需管理员权限，后续在 Controller 中验证）
- [ ] Step 3: 清空归档/作废相关字段

##### ✅ 验收标准
- [ ] restoreDocument 方法已实现
- [ ] 清空 archivedAt/archivedBy/archivedReason
- [ ] 清空 obsoletedAt/obsoletedBy/obsoletedReason

##### 🧪 测试清单
- [ ] （下一个 Issue 会添加单元测试）

##### 🐛 预留 Debug 时间
- 预计问题: Prisma update 字段遗漏
- Debug 预留: 10 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-011
- 后续: Issue-P1-1-013

---

#### Issue-P1-1-013: archiveDocument 服务方法单元测试

**类型**: 测试  
**估时**: 30 分钟  
**依赖**: Issue-P1-1-012  
**优先级**: P0  

##### 📝 需求描述
编写 archiveDocument 方法的单元测试，覆盖正常流程和异常情况。

##### 📂 涉及文件
```
/Users/jiashenglin/Desktop/好玩的项目/noidear/server/test/documents/documents-archive.service.spec.ts
```

##### 🔧 开发步骤
- [ ] Step 1: 创建测试文件
- [ ] Step 2: 编写测试用例：
  - 成功归档已发布文档
  - 归档草稿文档失败（BadRequestException）
  - 归档不存在文档失败（NotFoundException）
- [ ] Step 3: Mock Prisma Client

##### ✅ 验收标准
- [ ] 测试文件已创建
- [ ] 至少 3 个测试用例
- [ ] 所有测试通过

##### 🧪 测试清单
- [ ] 运行测试: `npm test -- documents-archive.service.spec.ts`

##### 🐛 预留 Debug 时间
- 预计问题: Prisma Mock 配置错误
- Debug 预留: 15 分钟

##### 🔗 相关 Issue
- 前置: Issue-P1-1-012
- 后续: Issue-P1-1-014

---

(继续 P1-1 的剩余 Issue... 由于字数限制，完整文件请查看生成的文件)

---

## 🎯 P1-2: 细粒度权限系统

### 功能概述
实现基于 RBAC + 资源级的细粒度权限系统。

**核心能力**:
- 权限定义（20-30 个预定义权限）
- 权限授予（可指定过期时间、资源范围）
- 权限撤销
- 权限检查（API 中间件 + 前端按钮控制）

**业务规则**:
- BR-349: 权限定义规则
- BR-350: 权限授予规则
- BR-351: 权限撤销规则

---

(P1-2 的 50 个 Issue 详细内容...)

---

## 🎯 P1-3: 简化工作流引擎

### 功能概述
实现基础工作流引擎，支持串行审批流程。

**核心能力**:
- 工作流模板定义
- 工作流启动
- 串行审批流程
- 工作流取消

**业务规则**:
- BR-354: 工作流模板规则
- BR-355: 工作流启动规则
- BR-356: 串行审批规则

---

(P1-3 的 30 个 Issue 详细内容...)

---

## 📊 总体进度跟踪

### P1-1 进度（40 个 Issue）
- ⏳ 待开始: 40
- 🚧 进行中: 0
- ✅ 已完成: 0

### P1-2 进度（50 个 Issue）
- ⏳ 待开始: 50
- 🚧 进行中: 0
- ✅ 已完成: 0

### P1-3 进度（30 个 Issue）
- ⏳ 待开始: 30
- 🚧 进行中: 0
- ✅ 已完成: 0

### 总体进度
- **总 Issue 数**: 120
- **已完成**: 0 (0%)
- **进行中**: 0 (0%)
- **待开始**: 120 (100%)

---

**最后更新**: 2026-02-13
**下次更新**: 每完成 10 个 Issue 更新一次
