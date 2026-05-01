# GAP-600/602 Measuring Equipment Tenant Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not redesign authentication, equipment ledger, or calibration approval. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Remove hardcoded `company_id: '1'` and scope measuring equipment and calibration queries by JWT companyId.

**Architecture:** Controller extracts `req.user.companyId` from `AuthenticatedRequest`; service methods accept `companyId` explicitly and include it in create/query/update guards. Historical data migration is out of scope.

**Tech Stack:** NestJS controller/service, Prisma, Jest unit tests.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-me -> writing-plans` 为 GAP-600/602 生成 spec 和本 implementation plan。
- **grill-me 校准结论：** 已确认 GAP-600 与 GAP-602 共享同一租户隔离根因，必须合并 PR；本次不改 JWT 结构、不改 schema、不迁移历史数据。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `server/src/modules/measuring-equipment/measuring-equipment.controller.ts`
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.service.ts`
- Add or modify: `server/src/modules/measuring-equipment/measuring-equipment.service.spec.ts`
- Do not modify: `server/src/modules/auth/`
- Do not modify: `server/src/prisma/schema.prisma`

## Task 1: Pass companyId from controller to service

**Files:**
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.controller.ts`

- [ ] **Step 1: Import request decorators and request type**

```ts
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/authenticated-user';
```

- [ ] **Step 2: Pass companyId to all service calls that touch tenant data**

```ts
  @Post()
  createEquipment(@Body() dto: CreateEquipmentDto, @Request() req: AuthenticatedRequest) {
    return this.service.createEquipment(dto, req.user.companyId);
  }

  @Get()
  findAllEquipment(@Request() req: AuthenticatedRequest) {
    return this.service.findAllEquipment(req.user.companyId);
  }

  @Get('overdue')
  findOverdue(@Request() req: AuthenticatedRequest) {
    return this.service.findOverdue(req.user.companyId);
  }

  @Post('calibrations')
  createCalibration(@Body() dto: CreateCalibrationDto, @Request() req: AuthenticatedRequest) {
    return this.service.createCalibration(dto, req.user.companyId);
  }

  @Get(':id/calibrations')
  findCalibrationsByEquipment(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findCalibrationsByEquipment(id, req.user.companyId);
  }
```

## Task 2: Scope service methods by companyId

**Files:**
- Modify: `server/src/modules/measuring-equipment/measuring-equipment.service.ts`

- [ ] **Step 1: Import NotFoundException**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 2: Change `createEquipment` signature and data**

```ts
  async createEquipment(dto: CreateEquipmentDto, companyId: string) {
    return this.prisma.measuringEquipment.create({
      data: { ...dto, company_id: companyId },
    });
  }
```

- [ ] **Step 3: Change `findAllEquipment` signature and where**

```ts
  async findAllEquipment(companyId: string) {
    return this.prisma.measuringEquipment.findMany({
      where: { company_id: companyId, status: { not: 'scrapped' } },
      include: {
        calibration_records: {
          orderBy: { calibrated_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });
  }
```

- [ ] **Step 4: Change `findOverdue` signature and where**

```ts
  async findOverdue(companyId: string) {
    return this.prisma.measuringEquipment.findMany({
      where: {
        company_id: companyId,
        status: { not: 'scrapped' },
        next_calibration_at: { lte: new Date() },
      },
    });
  }
```

- [ ] **Step 5: Change `createCalibration` to validate equipment ownership**

```ts
  async createCalibration(dto: CreateCalibrationDto, companyId: string) {
    const equipment = await this.prisma.measuringEquipment.findFirst({
      where: { id: dto.measuring_equipment_id, company_id: companyId },
    });
    if (!equipment) {
      throw new NotFoundException('计量器具不存在');
    }

    const record = await this.prisma.calibrationRecord.create({
      data: {
        company_id: companyId,
        measuring_equipment_id: dto.measuring_equipment_id,
        calibrated_at: new Date(dto.calibrated_at),
        valid_until: new Date(dto.valid_until),
        result: dto.result,
        calibration_body: dto.calibration_body,
        certificate_no: dto.certificate_no,
        notes: dto.notes,
      },
    });
```

- [ ] **Step 6: Keep update scoped to the already-validated equipment**

Leave the existing `measuringEquipment.update({ where: { id: dto.measuring_equipment_id }, ... })` after ownership validation. The validation prevents cross-company updates.

- [ ] **Step 7: Scope calibration history lookup**

```ts
  async findCalibrationsByEquipment(equipmentId: string, companyId: string) {
    const equipment = await this.prisma.measuringEquipment.findFirst({
      where: { id: equipmentId, company_id: companyId },
    });
    if (!equipment) {
      throw new NotFoundException('计量器具不存在');
    }

    return this.prisma.calibrationRecord.findMany({
      where: { measuring_equipment_id: equipmentId, company_id: companyId },
      orderBy: { calibrated_at: 'desc' },
    });
  }
```

## Task 3: Add focused service tests

**Files:**
- Add or modify: `server/src/modules/measuring-equipment/measuring-equipment.service.spec.ts`

- [ ] **Step 1: Create test skeleton if no spec exists**

```ts
import { NotFoundException } from '@nestjs/common';
import { MeasuringEquipmentService } from './measuring-equipment.service';

describe('MeasuringEquipmentService', () => {
  const prisma = {
    measuringEquipment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    calibrationRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: MeasuringEquipmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeasuringEquipmentService(prisma as any);
  });
```

- [ ] **Step 2: Add tenant write/read tests**

```ts
  it('creates equipment for the current company', async () => {
    prisma.measuringEquipment.create.mockResolvedValue({ id: 'eq1' });

    await service.createEquipment({ name: '电子秤' } as any, 'company-2');

    expect(prisma.measuringEquipment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });

  it('lists only current company equipment', async () => {
    await service.findAllEquipment('company-2');

    expect(prisma.measuringEquipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });

  it('lists only current company overdue equipment', async () => {
    await service.findOverdue('company-2');

    expect(prisma.measuringEquipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });
```

- [ ] **Step 3: Add calibration ownership tests**

```ts
  it('blocks calibration creation for equipment outside current company', async () => {
    prisma.measuringEquipment.findFirst.mockResolvedValue(null);

    await expect(service.createCalibration({
      measuring_equipment_id: 'eq-other',
      calibrated_at: '2026-05-01',
      valid_until: '2027-05-01',
      result: 'pass',
    } as any, 'company-2')).rejects.toThrow(NotFoundException);

    expect(prisma.calibrationRecord.create).not.toHaveBeenCalled();
  });

  it('creates calibration records for the current company', async () => {
    prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'eq1' });
    prisma.calibrationRecord.create.mockResolvedValue({ id: 'cal1' });
    prisma.measuringEquipment.update.mockResolvedValue({ id: 'eq1' });

    await service.createCalibration({
      measuring_equipment_id: 'eq1',
      calibrated_at: '2026-05-01',
      valid_until: '2027-05-01',
      result: 'pass',
    } as any, 'company-2');

    expect(prisma.calibrationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: 'company-2' }) }),
    );
  });

  it('blocks calibration history lookup for equipment outside current company', async () => {
    prisma.measuringEquipment.findFirst.mockResolvedValue(null);

    await expect(service.findCalibrationsByEquipment('eq-other', 'company-2')).rejects.toThrow(NotFoundException);
    expect(prisma.calibrationRecord.findMany).not.toHaveBeenCalled();
  });
});
```

## Task 4: Verify

- [ ] **Step 1: Run focused tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- measuring-equipment.service.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Search for remaining hardcoded company_id in the module**

```bash
rg -n "company_id:\\s*'1'|findOverdue\\(|findAllEquipment\\(|createCalibration\\(" server/src/modules/measuring-equipment
```

Expected: no `company_id: '1'`; method call sites pass `companyId`.

- [ ] **Step 3: Confirm no schema change**

```bash
git diff -- server/src/prisma/schema.prisma
```

Expected: no diff.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/measuring-equipment/measuring-equipment.controller.ts server/src/modules/measuring-equipment/measuring-equipment.service.ts server/src/modules/measuring-equipment/measuring-equipment.service.spec.ts
git commit -m "fix: scope measuring equipment by company"
```
