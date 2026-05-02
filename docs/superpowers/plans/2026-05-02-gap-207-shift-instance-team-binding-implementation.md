# GAP-207 ShiftInstance Team Schedule Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the production master-data model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make new `ShiftInstance` records carry the scheduled team and leader from `TeamShiftSchedule` only when the schedule is unambiguous, while requiring documented manual selection or override when multiple schedules match.

**Architecture:** Extend the existing `TeamShiftSchedule -> ShiftInstance` path rather than adding a new scheduling source. `TeamShiftSchedule` remains the schedule fact, but the service queries all schedules for `shift_type_id + work_date` and auto-binds only when exactly one row exists. `ShiftInstance` stores the chosen `team_id` FK and leader snapshot at open-shift time so downstream `ProductionRun -> ProductionBatch` can trace responsibility through the shift record.

**Tech Stack:** Prisma schema/migration, NestJS DTO/service tests, TypeScript API adapters, Vue 3 + Element Plus, Jest, Prisma validate.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `using-superpowers -> using-git-worktrees -> brainstorming -> grill-with-docs -> writing-plans` 为 GAP-207 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 `Team`、`ShiftType`、`TeamShiftSchedule` 是现有班组/班次排班事实源；本计划不新增平行班组主数据，不改变 `ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement` 主链。
- **PR #162 blocker 修正：** 当前 schema 只保证 `TeamShiftSchedule(team_id, shift_type_id, work_date)` 唯一，不保证 `shift_type_id + work_date` 唯一；执行 agent 不得使用 `findFirst` 进行自动绑定，必须使用 `findMany` 并覆盖多个匹配排班的回归测试。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得扩展到 GAP-204、GAP-206、MixingExecution.team_id、ProductionBatch 回填或租户隔离。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md、docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 如果有人要求根据开班人、班次名称或生产批次推断历史 `team_id`/`leader_id`，必须停止并回报；本计划明确不猜测历史责任归属。

## File Map

All commands assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502000100_shift_instance_team_binding/migration.sql`
- Modify: `server/src/modules/team-shift/dto/team-shift.dto.ts`
- Modify: `server/src/modules/team-shift/team-shift.service.ts`
- Modify: `server/src/modules/team-shift/team-shift.service.spec.ts`
- Modify: `server/src/modules/shift-instance/dto/create-shift-instance.dto.ts`
- Modify: `server/src/modules/shift-instance/shift-instance.service.ts`
- Modify: `server/src/modules/shift-instance/shift-instance.service.spec.ts`
- Modify: `client/src/api/shift-instance.ts`
- Modify: `client/src/views/shift/ShiftDashboard.vue`
- Do not modify: `server/src/modules/mixing/`
- Do not modify: `server/src/modules/batch-trace/`

## Task 1: Add backend regression tests for scheduled team binding

**Files:**
- Modify: `server/src/modules/shift-instance/shift-instance.service.spec.ts`

- [ ] **Step 1: Add team schedule mocks**

Extend `mockPrisma` so the top-level object contains these keys. Use `findMany`, not `findFirst`, because `TeamShiftSchedule` permits multiple teams for the same `shift_type_id + work_date`.

```ts
  const mockPrisma = {
    shiftType: {
      findFirst: jest.fn(),
    },
    teamShiftSchedule: {
      findMany: jest.fn(),
    },
    team: {
      findFirst: jest.fn(),
    },
    shiftInstance: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
```

- [ ] **Step 2: Add a default no-schedule mock in `beforeEach`**

After `service = module.get(ShiftInstanceService);`, add:

```ts
    mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([]);
```

- [ ] **Step 3: Add scheduled team test data inside `describe('create', ...)`**

Place this next to the existing `dayShiftType` constant:

```ts
    const scheduledTeam = {
      id: 'team-a',
      code: 'TEAM-A',
      name: 'A班',
      active: true,
    };

    const schedule = {
      id: 'schedule-1',
      team_id: 'team-a',
      shift_type_id: 'shift-day',
      work_date: new Date('2026-05-02'),
      leader_id: 'employee-leader-1',
      team: scheduledTeam,
    };

    const secondScheduledTeam = {
      id: 'team-b',
      code: 'TEAM-B',
      name: 'B班',
      active: true,
    };

    const secondSchedule = {
      id: 'schedule-2',
      team_id: 'team-b',
      shift_type_id: 'shift-day',
      work_date: new Date('2026-05-02'),
      leader_id: 'employee-leader-2',
      team: secondScheduledTeam,
    };
```

- [ ] **Step 4: Update the existing create expectation**

In `should create shift from shiftTypeId and persist the legacy name snapshot`, update the expected create call so it includes the new nullable binding fields and includes `team`:

```ts
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: {
          company_id: '1',
          shift_type_id: 'shift-day',
          shift_type: '白班',
          shift_date: new Date('2026-04-22'),
          team_id: undefined,
          leader_id: undefined,
          team_override_reason: undefined,
          opened_by: 'user1',
          notes: undefined,
        },
        include: { shift_type_ref: true, team: true },
      });
```

- [ ] **Step 5: Add a test for automatic team and leader binding**

Append this test to the same `describe('create', ...)` block:

```ts
    it('should attach scheduled team and leader when opening a shift', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule]);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'shift-1',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
        team_id: 'team-a',
        leader_id: 'employee-leader-1',
      });

      await service.create({ shiftTypeId: 'shift-day', shift_date: '2026-05-02' }, 'user1');

      expect(mockPrisma.teamShiftSchedule.findMany).toHaveBeenCalledWith({
        where: {
          shift_type_id: 'shift-day',
          work_date: new Date('2026-05-02'),
        },
        include: { team: true },
        orderBy: { team_id: 'asc' },
      });
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          team_id: 'team-a',
          leader_id: 'employee-leader-1',
          team_override_reason: undefined,
        }),
        include: { shift_type_ref: true, team: true },
      });
    });
```

- [ ] **Step 6: Add a test for missing schedule**

```ts
    it('should allow opening a shift without a schedule', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([]);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'shift-1',
        status: 'open',
        shift_type_id: 'shift-day',
        shift_type: '白班',
        team_id: null,
        leader_id: null,
      });

      await service.create({ shiftTypeId: 'shift-day', shift_date: '2026-05-02' }, 'user1');

      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          team_id: undefined,
          leader_id: undefined,
          team_override_reason: undefined,
        }),
        include: { shift_type_ref: true, team: true },
      });
    });
```

- [ ] **Step 7: Add a test for multiple schedules without explicit team**

```ts
    it('should reject ambiguous schedules when teamId is omitted', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule, secondSchedule]);

      await expect(
        service.create({ shiftTypeId: 'shift-day', shift_date: '2026-05-02' }, 'user1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.shiftInstance.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 8: Add a test for selecting one team from multiple schedules**

```ts
    it('should allow documented team selection when multiple schedules match', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule, secondSchedule]);
      mockPrisma.team.findFirst.mockResolvedValue(secondScheduledTeam);
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'shift-1',
        team_id: 'team-b',
        leader_id: 'employee-leader-2',
        team_override_reason: '同班次存在多个排班，现场指定B班负责开班',
      });

      await service.create(
        {
          shiftTypeId: 'shift-day',
          shift_date: '2026-05-02',
          teamId: 'team-b',
          teamOverrideReason: '同班次存在多个排班，现场指定B班负责开班',
        },
        'user1',
      );

      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          team_id: 'team-b',
          leader_id: 'employee-leader-2',
          team_override_reason: '同班次存在多个排班，现场指定B班负责开班',
        }),
        include: { shift_type_ref: true, team: true },
      });
    });
```

- [ ] **Step 9: Add a test for override reason enforcement**

```ts
    it('should require a reason when overriding scheduled team or leader', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule]);
      mockPrisma.team.findFirst.mockResolvedValue({
        id: 'team-b',
        code: 'TEAM-B',
        name: 'B班',
        active: true,
      });

      await expect(
        service.create(
          {
            shiftTypeId: 'shift-day',
            shift_date: '2026-05-02',
            teamId: 'team-b',
          },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.shiftInstance.create).not.toHaveBeenCalled();
    });
```

- [ ] **Step 10: Add a test for documented override**

```ts
    it('should allow documented team override', async () => {
      mockPrisma.shiftType.findFirst.mockResolvedValue(dayShiftType);
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.teamShiftSchedule.findMany.mockResolvedValue([schedule]);
      mockPrisma.team.findFirst.mockResolvedValue({
        id: 'team-b',
        code: 'TEAM-B',
        name: 'B班',
        active: true,
      });
      mockPrisma.shiftInstance.create.mockResolvedValue({
        id: 'shift-1',
        team_id: 'team-b',
        leader_id: 'employee-leader-2',
        team_override_reason: '临时调班',
      });

      await service.create(
        {
          shiftTypeId: 'shift-day',
          shift_date: '2026-05-02',
          teamId: 'team-b',
          leaderId: 'employee-leader-2',
          teamOverrideReason: '临时调班',
        },
        'user1',
      );

      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          team_id: 'team-b',
          leader_id: 'employee-leader-2',
          team_override_reason: '临时调班',
        }),
        include: { shift_type_ref: true, team: true },
      });
    });
```

- [ ] **Step 11: Run the focused test and verify it fails before implementation**

Run:

```bash
(cd server && npm test -- shift-instance.service.spec.ts --runInBand)
```

Expected: FAIL because `teamShiftSchedule.findMany`, `team_id`, `leader_id`, ambiguity handling, and override validation are not implemented yet.

## Task 2: Add TeamShiftSchedule leader support tests

**Files:**
- Modify: `server/src/modules/team-shift/team-shift.service.spec.ts`

- [ ] **Step 1: Update the schedule test DTO**

In the test that creates a schedule, use:

```ts
      const dto = {
        teamId: 'team-1',
        shiftTypeId: 'shift-1',
        workDate: '2026-05-02',
        leaderId: 'employee-leader-1',
      };
```

- [ ] **Step 2: Update the create expectation**

Expect `leader_id` to be persisted:

```ts
      expect(mockPrisma.teamShiftSchedule.create).toHaveBeenCalledWith({
        data: {
          team_id: 'team-1',
          shift_type_id: 'shift-1',
          work_date: new Date('2026-05-02'),
          leader_id: 'employee-leader-1',
        },
      });
```

- [ ] **Step 3: Run the focused team-shift test and verify it fails before implementation**

Run:

```bash
(cd server && npm test -- team-shift.service.spec.ts --runInBand)
```

Expected: FAIL because `leaderId` is not yet in the DTO/service data mapping.

## Task 3: Add schema fields and guarded migration

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502000100_shift_instance_team_binding/migration.sql`

- [ ] **Step 1: Add the reverse relation on `Team`**

In `model Team`, replace:

```prisma
  batches     ProductionBatch[]
  stocktakes  StagingAreaStocktake[]
```

with:

```prisma
  batches        ProductionBatch[]
  stocktakes     StagingAreaStocktake[]
  shiftInstances ShiftInstance[]
```

- [ ] **Step 2: Add schedule leader field**

In `model TeamShiftSchedule`, insert `leader_id` after `work_date`:

```prisma
  work_date     DateTime  @db.Date
  leader_id     String?
  team          Team      @relation(fields: [team_id], references: [id])
```

- [ ] **Step 3: Add ShiftInstance team fields**

In `model ShiftInstance`, insert these fields after `shift_type String`:

```prisma
  team_id              String?
  team                 Team?    @relation(fields: [team_id], references: [id], onDelete: SetNull)
  leader_id            String?
  team_override_reason String?
```

- [ ] **Step 4: Add ShiftInstance team index**

In `model ShiftInstance`, add the team index next to the existing shift indexes:

```prisma
  @@index([company_id, shift_date])
  @@index([shift_type_id])
  @@index([team_id])
  @@map("shift_instances")
```

- [ ] **Step 5: Create migration SQL**

Create `server/src/prisma/migrations/20260502000100_shift_instance_team_binding/migration.sql`:

```sql
-- Add scheduled team binding to shift instances.
-- Historical shift instances remain unbound because the responsible team cannot be inferred safely.

ALTER TABLE "team_shift_schedules"
  ADD COLUMN "leader_id" TEXT;

ALTER TABLE "shift_instances"
  ADD COLUMN "team_id" TEXT,
  ADD COLUMN "leader_id" TEXT,
  ADD COLUMN "team_override_reason" TEXT;

CREATE INDEX IF NOT EXISTS "shift_instances_team_id_idx"
  ON "shift_instances"("team_id");

ALTER TABLE "shift_instances"
  ADD CONSTRAINT "shift_instances_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 6: Validate Prisma schema**

Run:

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS with `The schema at src/prisma/schema.prisma is valid`.

## Task 4: Implement schedule leader DTO mapping

**Files:**
- Modify: `server/src/modules/team-shift/dto/team-shift.dto.ts`
- Modify: `server/src/modules/team-shift/team-shift.service.ts`

- [ ] **Step 1: Add `leaderId` to `CreateTeamScheduleDto`**

Update the DTO class to:

```ts
export class CreateTeamScheduleDto {
  @IsString() @IsNotEmpty() teamId!: string;
  @IsString() @IsNotEmpty() shiftTypeId!: string;
  @IsDateString() workDate!: string;

  @IsOptional()
  @IsString()
  leaderId?: string;
}
```

- [ ] **Step 2: Persist `leader_id` in `TeamShiftService.createSchedule()`**

Update the create call to:

```ts
    return this.prisma.teamShiftSchedule.create({
      data: {
        team_id: dto.teamId,
        shift_type_id: dto.shiftTypeId,
        work_date: new Date(dto.workDate),
        leader_id: dto.leaderId,
      },
    });
```

- [ ] **Step 3: Run team-shift tests**

Run:

```bash
(cd server && npm test -- team-shift.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 5: Implement ShiftInstance scheduled team binding

**Files:**
- Modify: `server/src/modules/shift-instance/dto/create-shift-instance.dto.ts`
- Modify: `server/src/modules/shift-instance/shift-instance.service.ts`

- [ ] **Step 1: Add override fields to `CreateShiftInstanceDto`**

Append these fields after `shift_date`:

```ts
  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  leaderId?: string;

  @IsOptional()
  @IsString()
  teamOverrideReason?: string;
```

- [ ] **Step 2: Add helper methods to `ShiftInstanceService`**

Add these private methods below `resolveShiftType()`:

```ts
  private async findSchedules(shiftTypeId: string, shiftDate: Date) {
    return this.prisma.teamShiftSchedule.findMany({
      where: {
        shift_type_id: shiftTypeId,
        work_date: shiftDate,
      },
      include: { team: true },
      orderBy: { team_id: 'asc' },
    });
  }

  private async assertTeamActive(teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, active: true },
    });

    if (!team) {
      throw new BadRequestException('班组不存在或已停用');
    }
  }

  private resolveTeamBinding(
    dto: CreateShiftInstanceDto,
    schedules: Array<{ team_id: string; leader_id?: string | null }>,
  ) {
    const hasAmbiguousSchedules = schedules.length > 1;

    if (hasAmbiguousSchedules && !dto.teamId) {
      throw new BadRequestException('同一日期和班次存在多个排班，请指定班组');
    }

    if (hasAmbiguousSchedules && !dto.teamOverrideReason) {
      throw new BadRequestException('同一日期和班次存在多个排班，指定班组时必须填写原因');
    }

    const selectedSchedule = dto.teamId
      ? schedules.find((schedule) => schedule.team_id === dto.teamId) ?? null
      : schedules[0] ?? null;
    const scheduledTeamId = selectedSchedule?.team_id;
    const scheduledLeaderId = selectedSchedule?.leader_id ?? undefined;
    const finalTeamId = dto.teamId ?? scheduledTeamId;
    const finalLeaderId = dto.leaderId ?? scheduledLeaderId;
    const overridesTeam =
      dto.teamId != null && (scheduledTeamId == null || dto.teamId !== scheduledTeamId);
    const overridesLeader = dto.leaderId != null && dto.leaderId !== scheduledLeaderId;

    if ((overridesTeam || overridesLeader) && !dto.teamOverrideReason) {
      throw new BadRequestException('覆盖排班班组或负责人时必须填写原因');
    }

    return {
      teamId: finalTeamId,
      leaderId: finalLeaderId,
      overrideReason:
        hasAmbiguousSchedules || overridesTeam || overridesLeader
          ? dto.teamOverrideReason
          : undefined,
    };
  }
```

- [ ] **Step 3: Update `create()` to resolve schedule before create**

Replace the body between `const shiftDate = new Date(dto.shift_date);` and `return this.prisma.shiftInstance.create({` with:

```ts
    const existing = await this.prisma.shiftInstance.findUnique({
      where: {
        company_id_shift_type_id_shift_date: {
          company_id: '1',
          shift_type_id: shiftType.id,
          shift_date: shiftDate,
        },
      },
    });
    if (existing) throw new ConflictException('该班次已开班');

    const schedules = await this.findSchedules(shiftType.id, shiftDate);
    const teamBinding = this.resolveTeamBinding(dto, schedules);

    if (teamBinding.teamId) {
      await this.assertTeamActive(teamBinding.teamId);
    }
```

- [ ] **Step 4: Persist team binding and include team**

Update the create call to:

```ts
    return this.prisma.shiftInstance.create({
      data: {
        company_id: '1',
        shift_type_id: shiftType.id,
        shift_type: shiftType.name,
        shift_date: shiftDate,
        team_id: teamBinding.teamId,
        leader_id: teamBinding.leaderId,
        team_override_reason: teamBinding.overrideReason,
        opened_by: userId,
        notes: dto.notes,
      },
      include: { shift_type_ref: true, team: true },
    });
```

- [ ] **Step 5: Include team in reads**

In both `findAll()` and `findOne()`, add `team: true` beside `shift_type_ref: true`:

```ts
      include: {
        shift_type_ref: true,
        team: true,
        production_runs: {
```

- [ ] **Step 6: Run shift-instance tests**

Run:

```bash
(cd server && npm test -- shift-instance.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 6: Update frontend API types and shift dashboard display

**Files:**
- Modify: `client/src/api/shift-instance.ts`
- Modify: `client/src/views/shift/ShiftDashboard.vue`

- [ ] **Step 1: Add team type to API adapter**

Add this interface after `ShiftTypeSummary`:

```ts
export interface TeamSummary {
  id: string;
  code: string;
  name: string;
  active: boolean;
}
```

- [ ] **Step 2: Extend `ShiftInstance` type**

Add these fields to `ShiftInstance`:

```ts
  team_id?: string | null;
  team?: TeamSummary | null;
  leader_id?: string | null;
  team_override_reason?: string | null;
```

- [ ] **Step 3: Extend create payload**

Update `CreateShiftInstancePayload` to:

```ts
export interface CreateShiftInstancePayload {
  shiftTypeId: string;
  shift_date: string;
  teamId?: string;
  leaderId?: string;
  teamOverrideReason?: string;
  notes?: string;
}
```

- [ ] **Step 4: Add a team label helper in `ShiftDashboard.vue`**

Add this function near `displayShiftType()`:

```ts
function displayTeam(shift: ShiftInstance): string {
  return shift.team?.name ? ` | ${shift.team.name}` : '';
}
```

- [ ] **Step 5: Render team in the shift card title**

Replace the title expression:

```vue
{{ displayShiftType(shift) }} | {{ formatDate(shift.shift_date) }}
```

with:

```vue
{{ displayShiftType(shift) }}{{ displayTeam(shift) }} | {{ formatDate(shift.shift_date) }}
```

- [ ] **Step 6: Run client type check or build**

Run:

```bash
npm run build:client
```

Expected: PASS. If unrelated existing client build failures occur, report the exact failing files and still run the backend focused tests from this plan.

## Task 7: Final verification and commit

**Files:**
- Verify all modified files listed above.

- [ ] **Step 1: Run backend focused tests**

Run:

```bash
(cd server && npm test -- shift-instance.service.spec.ts team-shift.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 2: Run Prisma validation**

Run:

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: PASS.

- [ ] **Step 3: Run repository whitespace check**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 4: Run GAP-207 E2E grep if available**

Run:

```bash
pnpm test:e2e -- --grep GAP-207
```

Expected: PASS if the suite exists. If the repo does not define `pnpm test:e2e` or there is no GAP-207 spec, record that and provide the focused Jest + Prisma validation results as equivalent verification.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git status --short
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260502000100_shift_instance_team_binding/migration.sql server/src/modules/team-shift/dto/team-shift.dto.ts server/src/modules/team-shift/team-shift.service.ts server/src/modules/team-shift/team-shift.service.spec.ts server/src/modules/shift-instance/dto/create-shift-instance.dto.ts server/src/modules/shift-instance/shift-instance.service.ts server/src/modules/shift-instance/shift-instance.service.spec.ts client/src/api/shift-instance.ts client/src/views/shift/ShiftDashboard.vue
git commit -m "feat: bind shift instances to scheduled teams"
```

Expected: commit succeeds and contains only GAP-207 implementation files.
