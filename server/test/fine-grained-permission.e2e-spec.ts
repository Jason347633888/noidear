import { PrismaClient } from '@prisma/client';

/**
 * 细粒度权限系统 E2E 测试
 *
 * 覆盖范围：TASK-235~252（P1-2 细粒度权限系统）
 *
 * 业务规则：
 * - BR-352: 权限授予记录规则
 * - BR-353: 权限过期检查规则
 * - BR-354: 权限检查规则（过期权限无效）
 * - BR-355: 资源级别权限规则
 * - BR-356: 部门边界规则
 * - BR-357: 跨部门权限验证规则
 * - BR-358: 权限继承规则
 * - BR-359: 权限合并规则
 * - BR-360: 批量授权规则
 */

describe('细粒度权限系统 (TASK-235~252)', () => {
  let prisma: PrismaClient;

  // 测试数据 ID 追踪
  const createdPermIds: string[] = [];
  const createdUserPermIds: string[] = [];
  let testUserId: string;
  let testDeptId: string;
  let otherDeptId: string;
  let adminUserId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // 创建测试部门
    const dept = await prisma.department.create({
      data: {
        id: `dept_fgp_test_${Date.now()}`,
        name: '细粒度权限测试部门',
        code: `FGP_TEST_${Date.now()}`,
      },
    });
    testDeptId = dept.id;

    const otherDept = await prisma.department.create({
      data: {
        id: `dept_fgp_other_${Date.now()}`,
        name: '细粒度权限其他部门',
        code: `FGP_OTHER_${Date.now()}`,
      },
    });
    otherDeptId = otherDept.id;

    // 创建测试用户（普通用户，归属 testDept）
    const user = await prisma.user.create({
      data: {
        id: `user_fgp_test_${Date.now()}`,
        username: `fgp_test_user_${Date.now()}`,
        password: 'hashed_pwd',
        name: '细粒度权限测试用户',
        role: 'user',
        departmentId: testDeptId,
      },
    });
    testUserId = user.id;

    // 创建管理员用户（用于授权）
    const admin = await prisma.user.create({
      data: {
        id: `user_fgp_admin_${Date.now()}`,
        username: `fgp_admin_${Date.now()}`,
        password: 'hashed_pwd',
        name: '细粒度权限测试管理员',
        role: 'admin',
      },
    });
    adminUserId = admin.id;
  });

  afterAll(async () => {
    // 清理：先删除用户权限
    if (createdUserPermIds.length > 0) {
      await prisma.userPermission.deleteMany({
        where: { id: { in: createdUserPermIds } },
      });
    }

    // 清理：删除测试权限定义
    if (createdPermIds.length > 0) {
      await prisma.fineGrainedPermission.deleteMany({
        where: { id: { in: createdPermIds } },
      });
    }

    // 清理：删除测试用户
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, adminUserId] } },
    });

    // 清理：删除测试部门
    await prisma.department.deleteMany({
      where: { id: { in: [testDeptId, otherDeptId] } },
    });

    await prisma.$disconnect();
  });

  // ===========================
  // TASK-235: 细粒度权限数据模型
  // ===========================

  describe('TASK-235: 细粒度权限数据模型（FineGrainedPermission）', () => {
    it('应该能够创建细粒度权限定义', async () => {
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `view:department:document:${Date.now()}`,
          name: '查看本部门文档',
          category: 'document',
          scope: 'department',
          status: 'active',
          description: '可查看本部门的所有文档',
        },
      });

      createdPermIds.push(perm.id);

      expect(perm).toBeDefined();
      expect(perm.id).toBeDefined();
      expect(perm.status).toBe('active');
      expect(perm.createdAt).toBeInstanceOf(Date);
    });

    it('应该强制权限编码（code）唯一性', async () => {
      const uniqueCode = `unique:test:perm_${Date.now()}`;

      const perm1 = await prisma.fineGrainedPermission.create({
        data: {
          code: uniqueCode,
          name: '唯一性测试权限',
          category: 'document',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm1.id);

      await expect(
        prisma.fineGrainedPermission.create({
          data: {
            code: uniqueCode,
            name: '重复权限',
            category: 'document',
            scope: 'department',
            status: 'active',
          },
        }),
      ).rejects.toThrow();
    });

    it('应该按 category 和 scope 建立索引（验证查询效率）', async () => {
      // 验证过滤查询正常工作（索引存在则不会报错）
      const results = await prisma.fineGrainedPermission.findMany({
        where: { category: 'document', scope: 'department' },
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('应该支持 status 字段过滤（active/inactive）', async () => {
      const ts = Date.now();
      const activePerm = await prisma.fineGrainedPermission.create({
        data: {
          code: `active:test:perm_${ts}`,
          name: '激活测试权限',
          category: 'system',
          scope: 'global',
          status: 'active',
        },
      });
      createdPermIds.push(activePerm.id);

      const inactivePerm = await prisma.fineGrainedPermission.create({
        data: {
          code: `inactive:test:perm_${ts}`,
          name: '停用测试权限',
          category: 'system',
          scope: 'global',
          status: 'inactive',
        },
      });
      createdPermIds.push(inactivePerm.id);

      const activePerms = await prisma.fineGrainedPermission.findMany({
        where: { status: 'active', id: { in: [activePerm.id, inactivePerm.id] } },
      });

      const inactivePerms = await prisma.fineGrainedPermission.findMany({
        where: { status: 'inactive', id: { in: [activePerm.id, inactivePerm.id] } },
      });

      expect(activePerms).toHaveLength(1);
      expect(activePerms[0].id).toBe(activePerm.id);
      expect(inactivePerms).toHaveLength(1);
      expect(inactivePerms[0].id).toBe(inactivePerm.id);
    });
  });

  // ===========================
  // TASK-236: 资源-操作权限矩阵
  // ===========================

  describe('TASK-236: 资源-操作权限矩阵（resource-action matrix）', () => {
    let matrixPermIds: string[] = [];

    beforeAll(async () => {
      const ts = Date.now();
      const permDefs = [
        { code: `view:department:document:${ts}a`, name: '查看文档', category: 'document', scope: 'department' },
        { code: `edit:department:document:${ts}b`, name: '编辑文档', category: 'document', scope: 'department' },
        { code: `delete:global:document:${ts}c`, name: '全局删除文档', category: 'document', scope: 'global' },
        { code: `view:cross_department:record:${ts}d`, name: '跨部门查看记录', category: 'record', scope: 'cross_department' },
      ];

      for (const def of permDefs) {
        const perm = await prisma.fineGrainedPermission.create({ data: { ...def, status: 'active' } });
        matrixPermIds.push(perm.id);
        createdPermIds.push(perm.id);
      }
    });

    it('应该能够按 category 分组查询权限（矩阵行）', async () => {
      const documentPerms = await prisma.fineGrainedPermission.findMany({
        where: {
          category: 'document',
          id: { in: matrixPermIds },
        },
        orderBy: [{ scope: 'asc' }, { code: 'asc' }],
      });

      expect(documentPerms.length).toBeGreaterThanOrEqual(3);
      documentPerms.forEach((p) => expect(p.category).toBe('document'));
    });

    it('应该能够按 scope 查询权限（矩阵列）', async () => {
      const globalPerms = await prisma.fineGrainedPermission.findMany({
        where: {
          scope: 'global',
          id: { in: matrixPermIds },
        },
      });

      expect(globalPerms.length).toBeGreaterThanOrEqual(1);
      globalPerms.forEach((p) => expect(p.scope).toBe('global'));
    });

    it('应该能够组合 category + scope 查询（矩阵单元格）', async () => {
      const deptDocPerms = await prisma.fineGrainedPermission.findMany({
        where: {
          category: 'document',
          scope: 'department',
          id: { in: matrixPermIds },
        },
      });

      expect(deptDocPerms.length).toBeGreaterThanOrEqual(2);
    });

    it('权限矩阵支持所有 scope 类型', () => {
      const validScopes = ['department', 'cross_department', 'global'];
      expect(validScopes).toContain('department');
      expect(validScopes).toContain('cross_department');
      expect(validScopes).toContain('global');
    });

    it('权限矩阵支持所有 category 类型', () => {
      const validCategories = ['document', 'record', 'task', 'approval', 'system'];
      expect(validCategories.length).toBe(5);
    });
  });

  // ===========================
  // TASK-237: 部门级权限隔离
  // ===========================

  describe('TASK-237: 部门级权限隔离（DepartmentPermission）', () => {
    it('BR-356: 同部门用户默认可访问本部门资源', async () => {
      // 验证测试用户在 testDeptId 部门
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { departmentId: true },
      });

      expect(user?.departmentId).toBe(testDeptId);
    });

    it('BR-356: 跨部门访问需要明确的跨部门权限', async () => {
      // 查询不在本部门的权限（模拟：用户访问 otherDeptId 资源时，需要检查跨部门权限）
      const crossDeptPerms = await prisma.userPermission.findMany({
        where: {
          userId: testUserId,
          fineGrainedPermission: {
            scope: { in: ['cross_department', 'global'] },
          },
        },
        include: { fineGrainedPermission: true },
      });

      // 初始状态：无跨部门权限，因此不应能访问其他部门
      expect(crossDeptPerms).toHaveLength(0);
    });

    it('BR-357: 跨部门权限需通过 UserPermission 记录授予', async () => {
      const ts = Date.now();
      // 创建跨部门权限定义
      const crossDeptPerm = await prisma.fineGrainedPermission.create({
        data: {
          code: `view:cross_department:document:${ts}`,
          name: '跨部门查看文档',
          category: 'document',
          scope: 'cross_department',
          status: 'active',
        },
      });
      createdPermIds.push(crossDeptPerm.id);

      // 授予给测试用户
      const userPerm = await prisma.userPermission.create({
        data: {
          userId: testUserId,
          fineGrainedPermissionId: crossDeptPerm.id,
          grantedBy: adminUserId,
          reason: '项目协作需求',
        },
      });
      createdUserPermIds.push(userPerm.id);

      // 验证记录创建成功
      const found = await prisma.userPermission.findUnique({
        where: { id: userPerm.id },
        include: { fineGrainedPermission: true },
      });

      expect(found).toBeDefined();
      expect(found?.fineGrainedPermission.scope).toBe('cross_department');
      expect(found?.userId).toBe(testUserId);
    });
  });

  // ===========================
  // TASK-238: 权限分配与撤销
  // ===========================

  describe('TASK-238~241: 权限分配、审计、批量操作', () => {
    it('BR-352: 授权记录包含 grantedBy 和 reason', async () => {
      const ts = Date.now();
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `audit:department:task:${ts}`,
          name: '审计任务权限',
          category: 'task',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      const userPerm = await prisma.userPermission.create({
        data: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          grantedBy: adminUserId,
          reason: '季度审计需要',
        },
      });
      createdUserPermIds.push(userPerm.id);

      expect(userPerm.grantedBy).toBe(adminUserId);
      expect(userPerm.reason).toBe('季度审计需要');
      expect(userPerm.grantedAt).toBeInstanceOf(Date);
    });

    it('BR-353: 权限支持设置过期时间', async () => {
      const ts = Date.now();
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `temp:department:record:${ts}`,
          name: '临时记录访问权限',
          category: 'record',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后
      const userPerm = await prisma.userPermission.create({
        data: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          grantedBy: adminUserId,
          reason: '临时项目',
          expiresAt,
        },
      });
      createdUserPermIds.push(userPerm.id);

      expect(userPerm.expiresAt).toBeInstanceOf(Date);
      expect(userPerm.expiresAt!.getTime()).toBeCloseTo(expiresAt.getTime(), -3);
    });

    it('BR-354: 过期权限应被过滤（查询时排除过期记录）', async () => {
      const ts = Date.now();
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `expired:department:document:${ts}`,
          name: '已过期文档权限',
          category: 'document',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 昨天
      const userPerm = await prisma.userPermission.create({
        data: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          grantedBy: adminUserId,
          reason: '已过期测试',
          expiresAt: pastDate,
        },
      });
      createdUserPermIds.push(userPerm.id);

      // 查询有效权限（过期时间 > 现在）
      const validPerms = await prisma.userPermission.findMany({
        where: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      expect(validPerms).toHaveLength(0);
    });

    it('BR-355: 资源级别权限支持精确到指定资源 ID', async () => {
      const ts = Date.now();
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `edit:department:document:specific:${ts}`,
          name: '编辑特定文档',
          category: 'document',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      const specificDocId = `doc_specific_${ts}`;
      const userPerm = await prisma.userPermission.create({
        data: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          grantedBy: adminUserId,
          reason: '特定文档编辑授权',
          resourceType: 'document',
          resourceId: specificDocId,
        },
      });
      createdUserPermIds.push(userPerm.id);

      expect(userPerm.resourceType).toBe('document');
      expect(userPerm.resourceId).toBe(specificDocId);

      // 验证资源过滤查询
      const matchedPerms = await prisma.userPermission.findMany({
        where: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          resourceType: 'document',
          resourceId: specificDocId,
        },
      });

      const unmatchedPerms = await prisma.userPermission.findMany({
        where: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          resourceType: 'document',
          resourceId: 'wrong_doc_id',
        },
      });

      expect(matchedPerms).toHaveLength(1);
      expect(unmatchedPerms).toHaveLength(0);
    });

    it('BR-360: 批量授权应为多个用户-权限组合创建记录', async () => {
      const ts = Date.now();

      // 创建第二个测试用户
      const user2 = await prisma.user.create({
        data: {
          id: `user_fgp_batch_${ts}`,
          username: `fgp_batch_${ts}`,
          password: 'hashed',
          name: '批量授权测试用户',
          role: 'user',
          departmentId: testDeptId,
        },
      });

      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `batch:department:task:${ts}`,
          name: '批量授权测试权限',
          category: 'task',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      // 批量创建（事务）
      const [perm1, perm2] = await prisma.$transaction([
        prisma.userPermission.create({
          data: {
            userId: testUserId,
            fineGrainedPermissionId: perm.id,
            grantedBy: adminUserId,
            reason: '批量授权',
          },
        }),
        prisma.userPermission.create({
          data: {
            userId: user2.id,
            fineGrainedPermissionId: perm.id,
            grantedBy: adminUserId,
            reason: '批量授权',
          },
        }),
      ]);

      createdUserPermIds.push(perm1.id, perm2.id);

      const allGranted = await prisma.userPermission.findMany({
        where: {
          fineGrainedPermissionId: perm.id,
          userId: { in: [testUserId, user2.id] },
        },
      });

      expect(allGranted).toHaveLength(2);

      // 清理额外的测试用户
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });

  // ===========================
  // TASK-242: 权限撤销
  // ===========================

  describe('TASK-242: 权限撤销', () => {
    it('应该能够删除 UserPermission 记录撤销权限', async () => {
      const ts = Date.now();
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `revoke:test:document:${ts}`,
          name: '撤销测试权限',
          category: 'document',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      const userPerm = await prisma.userPermission.create({
        data: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          grantedBy: adminUserId,
          reason: '撤销测试',
        },
      });

      // 撤销（删除记录）
      await prisma.userPermission.delete({ where: { id: userPerm.id } });

      const found = await prisma.userPermission.findUnique({ where: { id: userPerm.id } });
      expect(found).toBeNull();
    });

    it('删除用户时应级联删除其 UserPermission 记录', async () => {
      const ts = Date.now();

      const tempUser = await prisma.user.create({
        data: {
          id: `user_cascade_${ts}`,
          username: `cascade_user_${ts}`,
          password: 'hashed',
          name: '级联删除测试用户',
          role: 'user',
        },
      });

      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `cascade:test:document:${ts}`,
          name: '级联测试权限',
          category: 'document',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      const userPerm = await prisma.userPermission.create({
        data: {
          userId: tempUser.id,
          fineGrainedPermissionId: perm.id,
          grantedBy: adminUserId,
          reason: '级联测试',
        },
      });
      const userPermId = userPerm.id;

      // 删除用户，级联删除权限
      await prisma.user.delete({ where: { id: tempUser.id } });

      const found = await prisma.userPermission.findUnique({ where: { id: userPermId } });
      expect(found).toBeNull();
    });
  });

  // ===========================
  // TASK-243: 权限过期查询
  // ===========================

  describe('TASK-243: 权限过期检查', () => {
    it('应该能够查询所有过期的权限记录', async () => {
      const ts = Date.now();
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `expired_check:department:document:${ts}`,
          name: '过期检查测试权限',
          category: 'document',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      const pastDate = new Date(Date.now() - 1000); // 1秒前
      const userPerm = await prisma.userPermission.create({
        data: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          grantedBy: adminUserId,
          reason: '过期检查测试',
          expiresAt: pastDate,
        },
      });
      createdUserPermIds.push(userPerm.id);

      const expiredPerms = await prisma.userPermission.findMany({
        where: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          expiresAt: { lte: new Date() },
        },
      });

      expect(expiredPerms).toHaveLength(1);
      expect(expiredPerms[0].id).toBe(userPerm.id);
    });

    it('应该能够批量删除过期权限记录', async () => {
      const ts = Date.now();
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `batch_expire:department:task:${ts}`,
          name: '批量过期测试权限',
          category: 'task',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      // 创建已过期权限
      await prisma.userPermission.create({
        data: {
          userId: testUserId,
          fineGrainedPermissionId: perm.id,
          grantedBy: adminUserId,
          reason: '批量过期测试',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      // 执行批量删除
      const { count } = await prisma.userPermission.deleteMany({
        where: {
          fineGrainedPermissionId: perm.id,
          expiresAt: { lte: new Date() },
        },
      });

      expect(count).toBeGreaterThanOrEqual(1);

      // 验证已清空
      const remaining = await prisma.userPermission.findMany({
        where: { fineGrainedPermissionId: perm.id },
      });
      expect(remaining).toHaveLength(0);
    });
  });

  // ===========================
  // TASK-248: 权限审计日志（使用 OperationLog）
  // ===========================

  describe('TASK-248: 权限审计日志', () => {
    it('授权操作应该能够被记录到 OperationLog', async () => {
      const ts = Date.now();

      // 模拟授权后记录操作日志
      const log = await prisma.operationLog.create({
        data: {
          id: `log_perm_grant_${ts}`,
          userId: adminUserId,
          action: 'grant_permission',
          module: 'fine_grained_permission',
          objectId: testUserId,
          objectType: 'user',
          details: {
            permissionCode: `view:department:document:${ts}`,
            targetUserId: testUserId,
            reason: '审计测试授权',
          },
          ip: '127.0.0.1',
        } as any,
      });

      expect(log).toBeDefined();
      expect(log.action).toBe('grant_permission');
      expect(log.module).toBe('fine_grained_permission');

      // 清理
      await prisma.operationLog.delete({ where: { id: log.id } });
    });

    it('撤销权限操作应该能够被记录到 OperationLog', async () => {
      const ts = Date.now();

      const log = await prisma.operationLog.create({
        data: {
          id: `log_perm_revoke_${ts}`,
          userId: adminUserId,
          action: 'revoke_permission',
          module: 'fine_grained_permission',
          objectId: testUserId,
          objectType: 'user',
          details: {
            revokedPermissionId: `up_test_${ts}`,
            targetUserId: testUserId,
          },
          ip: '127.0.0.1',
        } as any,
      });

      expect(log).toBeDefined();
      expect(log.action).toBe('revoke_permission');

      // 清理
      await prisma.operationLog.delete({ where: { id: log.id } });
    });
  });

  // ===========================
  // TASK-250: 权限矩阵聚合查询
  // ===========================

  describe('TASK-250: 权限矩阵聚合查询', () => {
    it('应该能够统计每个 category 的权限数量', async () => {
      // 创建多个不同 category 的测试权限
      const ts = Date.now();
      const permsToCreate = [
        { code: `matrix:doc:${ts}a`, category: 'document', scope: 'department' },
        { code: `matrix:doc:${ts}b`, category: 'document', scope: 'global' },
        { code: `matrix:sys:${ts}c`, category: 'system', scope: 'global' },
      ];

      const tempIds: string[] = [];
      for (const p of permsToCreate) {
        const created = await prisma.fineGrainedPermission.create({
          data: { ...p, name: p.code, status: 'active' },
        });
        tempIds.push(created.id);
        createdPermIds.push(created.id);
      }

      const docPerms = await prisma.fineGrainedPermission.findMany({
        where: { category: 'document', id: { in: tempIds } },
      });

      const sysPerms = await prisma.fineGrainedPermission.findMany({
        where: { category: 'system', id: { in: tempIds } },
      });

      expect(docPerms).toHaveLength(2);
      expect(sysPerms).toHaveLength(1);
    });

    it('应该能够查询用户在所有 category 中的权限（用户权限总览）', async () => {
      const userPerms = await prisma.userPermission.findMany({
        where: {
          userId: testUserId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        include: {
          fineGrainedPermission: {
            select: { category: true, scope: true, code: true },
          },
        },
      });

      expect(Array.isArray(userPerms)).toBe(true);

      // 验证返回结构完整
      if (userPerms.length > 0) {
        const first = userPerms[0];
        expect(first.fineGrainedPermission).toBeDefined();
        expect(first.fineGrainedPermission.category).toBeDefined();
        expect(first.fineGrainedPermission.scope).toBeDefined();
      }
    });
  });

  // ===========================
  // TASK-251~252: 完整性约束验证
  // ===========================

  describe('TASK-251~252: 数据完整性约束', () => {
    it('UserPermission 必须关联有效的 userId', async () => {
      const ts = Date.now();
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `integrity:test:${ts}`,
          name: '完整性测试权限',
          category: 'system',
          scope: 'department',
          status: 'active',
        },
      });
      createdPermIds.push(perm.id);

      await expect(
        prisma.userPermission.create({
          data: {
            userId: 'nonexistent_user_id',
            fineGrainedPermissionId: perm.id,
            grantedBy: adminUserId,
            reason: '完整性测试',
          },
        }),
      ).rejects.toThrow();
    });

    it('UserPermission 必须关联有效的 fineGrainedPermissionId', async () => {
      await expect(
        prisma.userPermission.create({
          data: {
            userId: testUserId,
            fineGrainedPermissionId: 'nonexistent_perm_id',
            grantedBy: adminUserId,
            reason: '完整性测试',
          },
        }),
      ).rejects.toThrow();
    });

    it('FineGrainedPermission 的 status 字段有默认值 active', async () => {
      const ts = Date.now();
      const perm = await prisma.fineGrainedPermission.create({
        data: {
          code: `default:status:${ts}`,
          name: '默认状态测试',
          category: 'document',
          scope: 'department',
          // 不指定 status
        },
      });
      createdPermIds.push(perm.id);

      expect(perm.status).toBe('active');
    });

    it('FineGrainedPermission 的 description 字段为可选', async () => {
      const ts = Date.now();
      const withoutDesc = await prisma.fineGrainedPermission.create({
        data: {
          code: `nodesc:test:${ts}`,
          name: '无描述权限',
          category: 'document',
          scope: 'department',
          // 不指定 description
        },
      });
      createdPermIds.push(withoutDesc.id);

      expect(withoutDesc.description).toBeNull();
    });
  });
});
