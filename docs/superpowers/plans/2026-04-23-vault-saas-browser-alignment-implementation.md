# Vault SaaS Browser Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manually align the latest 283 vault record forms with `SaaS产品构思`, synchronize affected `noidear` docs, then run browser smoke testing to turn click failures into evidence-backed fix tasks.

**Architecture:** Treat `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单` as the only source of truth. Update `SaaS产品构思` department mapping files first, then roll the corrected facts upward into overview/data-model/docs, and only after that run browser usability intake and prioritized fixes. Do not add a `.codex/` directory and do not add a new persistent audit script to `noidear`.

**Tech Stack:** Markdown, Obsidian-style vault docs, existing `noidear` Vue 3 + Element Plus frontend, NestJS backend, Git, shell verification commands, browser manual smoke testing.

---

## Critical Execution Rules

- Work from `/Users/jiashenglin/Desktop/好玩的项目/noidear` on `master`.
- Preserve unrelated user changes. Before editing, run `git status --short --branch`.
- Do not create `.codex/`.
- Do not add a new audit script. Existing repository files may be read for context, but this plan's acceptance criteria are manual document alignment and browser evidence.
- Do not restructure `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思`.
- Do not rewrite all 283 forms. Only fix the known 31 missing mappings, 3 code mismatches, and directly affected summary/docs language.
- Keep commits small and Chinese.
- For browser fixes in Phase 2, if a fix touches more than 3 files, split it into smaller tasks before editing.

## File Structure

### SaaS Construct Files To Modify

- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部2.md`
  - Add/fix manufacturing mappings for `GRSS-ZZ-JL-03`, `GRSS-ZZ-JL-37`, and `GRSS-ZZ-JL-69`.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部3.md`
  - Fix or relocate manufacturing cleaning mapping rows if `日常清洁记录表（鸡蛋房）` belongs in the cleaning batch.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部4.md`
  - Fix manufacturing list/table rows if the existing cleaning or equipment grouping currently holds the mismatched `日常清洁记录表（鸡蛋房）` entry.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-品质部4.md`
  - Add mappings for `GRSS-PZ-JL-71`, `GRSS-PZ-JL-72`, and `GRSS-PZ-JL-74`.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-营销部.md`
  - Add mappings for `GRSS-YX-JL-02` through `GRSS-YX-JL-05`.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-行政人事部2.md`
  - Add mappings for `GRSS-XZ-JL-33` and `GRSS-XZ-JL-40`.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-质检组.md`
  - Add mappings for all `GRSS-ZJ-JL-01` through `GRSS-ZJ-JL-21`.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表.md`
  - Update department counts, completion claims, and links after detail files are corrected.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/00-产品总览.md`
  - Update source-of-truth and coverage language.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/01-数据模型.md`
  - Update data model gaps and entities affected by recall, traceability drill, legal regulation list, organization chart, and QC inspection records.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/02-功能设想.md`
  - Update functional modules affected by recall, traceability, food safety objectives, HR compliance, and QC records.
- `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/04-数据模型缺口汇总.md`
  - Update unresolved gaps introduced by the newly mapped forms.

### noidear Files To Modify

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`
  - New execution record for Phase 1 alignment and Phase 2 browser intake.
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/DESIGN.md`
  - Update stale source-form count or field-mapping statements.
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/REQUIREMENTS.md`
  - Update stale source-form count or field-mapping statements.
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/BUSINESS_RULES.md`
  - Update stale source-form count or field-mapping statements.
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`
  - Update stale source-form count or field-mapping statements.
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/README.md`
  - Update stale source-form count or field-mapping statements.

### Browser Intake Files To Create During Phase 2

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md`
  - Browser route/action/error evidence log.
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/plans/2026-04-23-browser-high-priority-fixes.md`
  - Follow-up implementation plan for high-priority browser failures after intake.

---

## Known Difference Set

### Missing In SaaS Mapping

1. `制造部 / 工艺、配料变更、复称、评估、验证记录 / GRSS-ZZ-JL-03`
2. `品质部 / 追溯演练记录（反追）2025年 / GRSS-PZ-JL-71`
3. `品质部 / 追溯演练记录（正追）2025年 / GRSS-PZ-JL-72`
4. `品质部 / 食品安全目标及考核表 / GRSS-PZ-JL-74`
5. `营销部 / 产品召回申请单 / GRSS-YX-JL-02`
6. `营销部 / 产品召回计划 / GRSS-YX-JL-03`
7. `营销部 / 产品召回通知单 / GRSS-YX-JL-04`
8. `营销部 / 召回演练记录与报告 / GRSS-YX-JL-05`
9. `行政人事部 / 法律法规清单 / GRSS-XZ-JL-33`
10. `行政人事部 / 组织架构图 / GRSS-XZ-JL-40`
11. `质检组 / 下料单个重量记录表-质检 / GRSS-ZJ-JL-01`
12. `质检组 / 中后段车间成品首检记录表-质检 / GRSS-ZJ-JL-02`
13. `质检组 / 产品中心温度记录表-质检 / GRSS-ZJ-JL-03`
14. `质检组 / 产品品评记录-质检 / GRSS-ZJ-JL-04`
15. `质检组 / 产品质量抽查表-质检 / GRSS-ZJ-JL-05`
16. `质检组 / 仓库成品抽检记录表-质检 / GRSS-ZJ-JL-06`
17. `质检组 / 后段成品抽检记录表-质检 / GRSS-ZJ-JL-07`
18. `质检组 / 后段车间净含量检验记录表-质检 / GRSS-ZJ-JL-08`
19. `质检组 / 员工每日健康卫生检查记录-质检 / GRSS-ZJ-JL-09`
20. `质检组 / 巡检过程异常记录表-质检 / GRSS-ZJ-JL-10`
21. `质检组 / 机头浆料比重、料温、纸托跟进表-质检 / GRSS-ZJ-JL-11`
22. `质检组 / 每日卫生检查记录表-质检 / GRSS-ZJ-JL-12`
23. `质检组 / 氮气机、干燥机、除水过滤跟进表-质检 / GRSS-ZJ-JL-13`
24. `质检组 / 氮气记录表-质检 / GRSS-ZJ-JL-14`
25. `质检组 / 洁净车间正负压跟进表-质检 / GRSS-ZJ-JL-15`
26. `质检组 / 温湿度记录表-质检 / GRSS-ZJ-JL-16`
27. `质检组 / 烤炉过程巡检表-质检 / GRSS-ZJ-JL-17`
28. `质检组 / 车间内包膜间消毒检查表-质检 / GRSS-ZJ-JL-18`
29. `质检组 / 车间环境监控检验记录-质检 / GRSS-ZJ-JL-19`
30. `质检组 / 酒精房抽检记录表-质检 / GRSS-ZJ-JL-20`
31. `质检组 / 鸡蛋房消毒池抽检记录-质检 / GRSS-ZJ-JL-21`

### Code Mismatches

1. `制造部 / 日常清洁记录表（鸡蛋房）`: vault=`GRSS-ZZ-JL-34`, SaaS=`GRSS-ZZ-JL-01`
2. `制造部 / 果酱房果酱投料打料过程记录表（香蕉味）`: vault=`GRSS-ZZ-JL-37`, SaaS=`GRSS-ZZ-JL-46`
3. `制造部 / 配料记录表（果酱房）`: vault=`GRSS-ZZ-JL-69`, SaaS=`GRSS-ZZ-JL-28`

---

### Task 1: Create Phase 1 Execution Record

**Files:**
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: Confirm clean repo state**

Run:

```bash
git status --short --branch
```

Expected: branch is `master`; no unrelated unstaged edits before starting.

- [ ] **Step 2: Create execution record**

Create `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md` with this content:

```markdown
# Vault SaaS Browser Alignment Execution Record

## Source Snapshot

- Source vault: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`
- SaaS construct: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思`
- noidear project: `/Users/jiashenglin/Desktop/好玩的项目/noidear`
- Date: 2026-04-23
- Vault forms: 283
- Known missing mappings at start: 31
- Known code mismatches at start: 3

## Phase 1 Checklist

| Item | Department | Form | Code | Source File | Target File | Status | Notes |
|---|---|---|---|---|---|---|---|

## Code Mismatch Fixes

| Form | Vault Code | Previous SaaS Code | Target File | Status | Notes |
|---|---|---|---|---|---|

## SaaS Overview Updates

| File | Status | Notes |
|---|---|---|

## noidear Doc Updates

| File | Status | Notes |
|---|---|---|

## Phase 1 Final Result

- Missing mappings remaining:
- Code mismatches remaining:
- Blocked items:

## Phase 2 Browser Intake

The browser intake is tracked in `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md`.
```

- [ ] **Step 3: Commit execution record**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git commit -m "docs: 新增vault与SaaS对齐执行记录"
```

Expected: commit succeeds with one new Markdown file.

---

### Task 2: Confirm Source Files For 31 Missing Mappings And 3 Mismatches

**Files:**
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/**/*.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: List source files for known difference set**

Run:

```bash
find "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单" -name "*.md" -print | rg "工艺、配料变更|追溯演练记录|食品安全目标|产品召回|召回演练|法律法规清单|组织架构图|质检|日常清洁记录表（鸡蛋房）|果酱房果酱投料打料过程记录表（香蕉味）|配料记录表（果酱房）"
```

Expected: output includes 35 source file paths: 31 missing mapping files, 3 mismatch source files, and the extra `行政人事部/质检大抽检检查记录表.md` false positive from the `质检` pattern.

- [ ] **Step 2: Verify each source file code**

For every source file in the known difference set, run:

```bash
rg -n "编号:|GRSS-[A-Z]+-JL-[0-9]+" "/absolute/source/file.md"
```

Expected: each file contains the expected code from the Known Difference Set table. For mismatch files, the vault code must be:

```text
日常清洁记录表（鸡蛋房） -> GRSS-ZZ-JL-34
果酱房果酱投料打料过程记录表（香蕉味） -> GRSS-ZZ-JL-37
配料记录表（果酱房） -> GRSS-ZZ-JL-69
```

- [ ] **Step 3: Update execution record with source paths**

Edit `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md` and add one table row per known difference item. Use `Status` = `confirmed-source`.

- [ ] **Step 4: Commit source confirmation**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git commit -m "docs: 确认vault差异源文件"
```

Expected: commit succeeds with only the execution record changed.

---

### Task 3: Fix Manufacturing Mappings And Code Mismatches

**Files:**
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/制造部/工艺、配料变更、复称、评估、验证记录.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/制造部/日常清洁记录表（鸡蛋房）.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/制造部/果酱房果酱投料打料过程记录表（香蕉味）.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/制造部/配料记录表（果酱房）.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部2.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部3.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部4.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: Locate current SaaS manufacturing rows**

Run:

```bash
rg -n "GRSS-ZZ-JL-03|GRSS-ZZ-JL-34|GRSS-ZZ-JL-37|GRSS-ZZ-JL-69|GRSS-ZZ-JL-01|GRSS-ZZ-JL-46|GRSS-ZZ-JL-28|日常清洁记录表（鸡蛋房）|果酱房果酱投料打料过程记录表（香蕉味）|配料记录表（果酱房）|工艺.*配料变更" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思"/03-字段映射表-制造部*.md
```

Expected: output shows where the existing rows live and which old codes must be changed.

- [ ] **Step 2: Extract source field tables**

Run:

```bash
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/制造部/工艺、配料变更、复称、评估、验证记录.md"
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/制造部/日常清洁记录表（鸡蛋房）.md"
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/制造部/果酱房果酱投料打料过程记录表（香蕉味）.md"
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/制造部/配料记录表（果酱房）.md"
```

Expected: each source file shows its title, code, and field table or structured field descriptions.

- [ ] **Step 3: Update manufacturing mappings**

Use the existing field mapping table format in the target file. Add or correct rows so that:

```text
工艺、配料变更、复称、评估、验证记录 uses GRSS-ZZ-JL-03.
日常清洁记录表（鸡蛋房） uses GRSS-ZZ-JL-34.
果酱房果酱投料打料过程记录表（香蕉味） uses GRSS-ZZ-JL-37.
配料记录表（果酱房） uses GRSS-ZZ-JL-69.
No row for these four forms keeps the old mismatched codes GRSS-ZZ-JL-01, GRSS-ZZ-JL-46, or GRSS-ZZ-JL-28.
```

Map fields using the closest existing entities already used in manufacturing mapping files:

```text
Product -> product_name / specification
ProductionBatch -> batch_id / production_date / shift_group / shift_type / remarks
IngredientUsage -> material_name / planned_quantity / actual_quantity / operator_id / checker_id
ChangeEvent -> change_date / change_type / description / approver_id
CleaningRecord -> cleaning_date / target_area / cleaning_time / disinfectant_concentration / method / result
Equipment -> equipment_id / equipment_name
Employee -> employee_id
未覆盖 -> — for fields that need new entity work
```

- [ ] **Step 4: Verify manufacturing old codes are gone for mismatched forms**

Run:

```bash
rg -n "日常清洁记录表（鸡蛋房）.*GRSS-ZZ-JL-01|果酱房果酱投料打料过程记录表（香蕉味）.*GRSS-ZZ-JL-46|配料记录表（果酱房）.*GRSS-ZZ-JL-28|GRSS-ZZ-JL-01.*日常清洁记录表（鸡蛋房）|GRSS-ZZ-JL-46.*果酱房果酱投料打料过程记录表（香蕉味）|GRSS-ZZ-JL-28.*配料记录表（果酱房）" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思"/03-字段映射表-制造部*.md
```

Expected: no output.

- [ ] **Step 5: Verify manufacturing corrected codes exist**

Run:

```bash
rg -n "GRSS-ZZ-JL-03.*工艺|GRSS-ZZ-JL-34.*日常清洁记录表（鸡蛋房）|GRSS-ZZ-JL-37.*果酱房果酱投料打料过程记录表（香蕉味）|GRSS-ZZ-JL-69.*配料记录表（果酱房）" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思"/03-字段映射表-制造部*.md
```

Expected: output includes all four corrected form/code pairs.

- [ ] **Step 6: Update execution record**

Set the manufacturing rows to `aligned` in `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`, with notes naming the modified SaaS files.

- [ ] **Step 7: Commit manufacturing alignment**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git status --short
git commit -m "docs: 对齐制造部表单映射编号"
```

Also commit the modified `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-制造部*.md` files if the vault directory is under Git; if it is not under Git, record the changed absolute paths in the execution record.

Expected: noidear commit succeeds; SaaS construct file changes are saved on disk.

---

### Task 4: Add Quality Department Mappings

**Files:**
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/品质部/追溯演练/追溯演练记录（反追）2025年.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/品质部/追溯演练/追溯演练记录（正追）2025年.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/品质部/食品安全目标及考核表.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-品质部4.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: Locate existing quality references**

Run:

```bash
rg -n "GRSS-PZ-JL-71|GRSS-PZ-JL-72|GRSS-PZ-JL-74|追溯演练|食品安全目标" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思"/03-字段映射表-品质部*.md "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/01-数据模型.md" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/02-功能设想.md"
```

Expected: missing form codes are absent from mapping detail files or appear only in non-mapping prose.

- [ ] **Step 2: Extract source fields**

Run:

```bash
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/品质部/追溯演练/追溯演练记录（反追）2025年.md"
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/品质部/追溯演练/追溯演练记录（正追）2025年.md"
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/品质部/食品安全目标及考核表.md"
```

Expected: source files show traceability drill and food safety objective fields.

- [ ] **Step 3: Add quality mapping rows**

Append rows to `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-品质部4.md` using existing table format. Use these entity mapping defaults:

```text
TraceabilityDrill -> drill_date / drill_type / product_name / batch_code / start_time / end_time / conclusion / corrective_action
ProductionBatch -> batch_id / production_date / product_name
InventoryMovement -> movementCode / movementDate / quantity / locationName
Employee -> employee_id / createdBy / reviewedBy
FoodSafetyObjective -> objective_name / target_value / actual_value / assessment_period / result / corrective_action
CorrectiveAction -> correctiveAction / owner_id / due_date / verification_result
Document -> formType / department / reportDate
未覆盖 -> — for fields without a stable entity in `01-数据模型.md`
```

- [ ] **Step 4: Verify quality mappings exist**

Run:

```bash
rg -n "GRSS-PZ-JL-71|GRSS-PZ-JL-72|GRSS-PZ-JL-74" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-品质部4.md"
```

Expected: output includes all three codes with mapping rows.

- [ ] **Step 5: Update execution record and commit**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git commit -m "docs: 记录品质部映射对齐"
```

Expected: noidear execution record commit succeeds; SaaS construct file changes are saved on disk.

---

### Task 5: Add Marketing Recall Mappings

**Files:**
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/营销部/召回演练/产品召回申请单.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/营销部/召回演练/产品召回计划.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/营销部/召回演练/产品召回通知单.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/营销部/召回演练/召回演练记录与报告.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-营销部.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: Extract recall source fields**

Run:

```bash
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/营销部/召回演练/产品召回申请单.md"
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/营销部/召回演练/产品召回计划.md"
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/营销部/召回演练/产品召回通知单.md"
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/营销部/召回演练/召回演练记录与报告.md"
```

Expected: source files show recall request, recall plan, recall notice, and exercise report fields.

- [ ] **Step 2: Add recall mapping rows**

Append rows to `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-营销部.md`. Use these mapping defaults:

```text
ProductRecall -> recallCode / recallDate / recallReason / recallScope / affectedBatchCode / affectedQuantity / recallLevel / recallStatus / conclusion
Product -> productCode / productName / specification
ProductionBatch -> batchCode / production_date
InventoryMovement -> movementCode / movementDate / quantity / customerName / locationName
Complaint -> complaintType / complaintDate / complaintSummary
CorrectiveAction -> correctiveAction / owner_id / due_date / verification_result
Employee -> createdBy / reviewedBy / employee_id
Document -> formType / department / reportDate / approvalStatus
未覆盖 -> — for customer contact or external receiver fields without a stable entity
```

- [ ] **Step 3: Verify marketing mappings exist**

Run:

```bash
rg -n "GRSS-YX-JL-02|GRSS-YX-JL-03|GRSS-YX-JL-04|GRSS-YX-JL-05" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-营销部.md"
```

Expected: output includes all four recall codes with mapping rows.

- [ ] **Step 4: Update execution record and commit**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git commit -m "docs: 记录营销部召回映射对齐"
```

Expected: noidear execution record commit succeeds; SaaS construct file changes are saved on disk.

---

### Task 6: Add HR Compliance Mappings

**Files:**
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/行政人事部/法律法规清单.md`
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/行政人事部/组织架构图.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-行政人事部2.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: Extract HR source fields**

Run:

```bash
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/行政人事部/法律法规清单.md"
sed -n '1,220p' "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/行政人事部/组织架构图.md"
```

Expected: source files show code, title, and field structures.

- [ ] **Step 2: Add HR mapping rows**

Append rows to `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-行政人事部2.md`. Use these mapping defaults:

```text
Regulation -> regulation_name / regulation_code / issuing_authority / effective_date / revision_date / applicability / owner_department
Department -> departmentCode / departmentName / parentDepartmentId / managerId
Employee -> employee_id / name / role / departmentId
Document -> formType / department / approvalStatus / createdBy / reviewedBy
未覆盖 -> — for diagram-only layout coordinates or visual-only reporting lines
```

- [ ] **Step 3: Verify HR mappings exist**

Run:

```bash
rg -n "GRSS-XZ-JL-33|GRSS-XZ-JL-40" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-行政人事部2.md"
```

Expected: output includes both HR codes with mapping rows.

- [ ] **Step 4: Update execution record and commit**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git commit -m "docs: 记录行政人事部映射对齐"
```

Expected: noidear execution record commit succeeds; SaaS construct file changes are saved on disk.

---

### Task 7: Add QC Group Mappings

**Files:**
- Read: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/质检组/*.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-质检组.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: List all QC source files**

Run:

```bash
find "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/质检组" -maxdepth 1 -name "*.md" -print | sort
```

Expected: output includes the 21 `GRSS-ZJ-JL-01` through `GRSS-ZJ-JL-21` source forms.

- [ ] **Step 2: Extract QC codes and titles**

Run:

```bash
for file in "/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单/质检组"/*.md; do
  printf "\n--- %s ---\n" "$file"
  rg -n "title:|编号:|GRSS-ZJ-JL-[0-9]+" "$file"
done
```

Expected: every QC source file prints one code and one title.

- [ ] **Step 3: Add QC mapping rows**

Update `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-质检组.md` with sections for all 21 QC forms. Use these entity mapping defaults:

```text
InspectionRecord -> inspectionDate / inspectionTime / inspectionItem / inspectionValue / result / remark
QualityCheck -> checkDate / checkType / productName / batchCode / result / nonconformanceDescription
ProductionBatch -> batchCode / productName / production_date / shift_group / shift_type
Equipment -> equipment_id / equipment_name
Location -> locationName
Employee -> employee_id / inspector_id / reviewer_id
TemperatureHumidityRecord -> recordDate / recordTime / temperature / humidity / locationName / result
CleaningRecord -> cleaning_date / target_area / result / operator_id / checker_id
NonConformance -> description / severity / correctiveAction / discoveredAt
Document -> formType / department / createdBy / reviewedBy
未覆盖 -> — for source fields that need new dedicated QC entities
```

For each QC source form, include at least:

```text
表单元数据 row
日期/时间 row when present
产品/批次 row when present
地点/设备 row when present
检验项目/数值/结果 row when present
操作人/检验人/复核人 row when present
备注/异常 row when present
```

- [ ] **Step 4: Verify all QC codes exist**

Run:

```bash
for code in GRSS-ZJ-JL-{01..21}; do
  rg -q "$code" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表-质检组.md" || echo "missing $code"
done
```

Expected: no output.

- [ ] **Step 5: Update execution record and commit**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git commit -m "docs: 记录质检组映射对齐"
```

Expected: noidear execution record commit succeeds; SaaS construct file changes are saved on disk.

---

### Task 8: Synchronize SaaS Construct Overview And Gap Files

**Files:**
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/00-产品总览.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/01-数据模型.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/02-功能设想.md`
- Modify: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/04-数据模型缺口汇总.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: Search stale claims in SaaS construct**

Run:

```bash
rg -n "263|260|缺失映射|编号不一致|全部完成|未覆盖|GRSS-ZZ-JL-01|GRSS-ZZ-JL-46|GRSS-ZZ-JL-28" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思"
```

Expected: output identifies old counts, old mismatch codes, and summary claims that need review.

- [ ] **Step 2: Update mapping index**

Edit `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表.md` so:

```text
Current snapshot remains 283 forms.
Department counts match corrected detail files.
质检组 remains 21 forms and is no longer missing from detail mapping.
营销部 includes recall forms GRSS-YX-JL-02 through GRSS-YX-JL-05.
品质部 includes GRSS-PZ-JL-71, GRSS-PZ-JL-72, and GRSS-PZ-JL-74.
Completion language says "已按 2026-04-23 手工对齐差异清单" after all known gaps are closed.
```

- [ ] **Step 3: Update data model and function concept language**

Edit the overview/gap files so they mention the new or corrected coverage:

```text
Traceability drill records: 正追 / 反追 coverage.
Food safety objective assessment coverage.
Product recall request/plan/notice/exercise coverage.
Legal regulation list coverage.
Organization chart coverage.
QC group inspection coverage.
Manufacturing code corrections for chicken-egg-room cleaning, banana jam process, and jam-room batching.
```

- [ ] **Step 4: Verify stale mismatch codes are gone from SaaS construct for corrected forms**

Run:

```bash
rg -n "日常清洁记录表（鸡蛋房）.*GRSS-ZZ-JL-01|果酱房果酱投料打料过程记录表（香蕉味）.*GRSS-ZZ-JL-46|配料记录表（果酱房）.*GRSS-ZZ-JL-28|GRSS-ZZ-JL-01.*日常清洁记录表（鸡蛋房）|GRSS-ZZ-JL-46.*果酱房果酱投料打料过程记录表（香蕉味）|GRSS-ZZ-JL-28.*配料记录表（果酱房）" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思"
```

Expected: no output.

- [ ] **Step 5: Verify all missing mapping codes now exist in SaaS construct**

Run:

```bash
for code in GRSS-ZZ-JL-03 GRSS-PZ-JL-71 GRSS-PZ-JL-72 GRSS-PZ-JL-74 GRSS-YX-JL-02 GRSS-YX-JL-03 GRSS-YX-JL-04 GRSS-YX-JL-05 GRSS-XZ-JL-33 GRSS-XZ-JL-40 GRSS-ZJ-JL-{01..21}; do
  rg -q "$code" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思" || echo "missing $code"
done
```

Expected: no output.

- [ ] **Step 6: Update execution record and commit**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git commit -m "docs: 记录SaaS构思总览对齐"
```

Expected: noidear execution record commit succeeds; SaaS construct file changes are saved on disk.

---

### Task 9: Synchronize noidear Documentation

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/DESIGN.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/REQUIREMENTS.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/BUSINESS_RULES.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/AGENT_GUIDE.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/README.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: Search noidear stale source-form language**

Run:

```bash
rg -n "260|263|283|04-记录表单|SaaS产品构思|字段映射|GRSS-ZZ-JL-01|GRSS-ZZ-JL-46|GRSS-ZZ-JL-28|GRSS-ZZ-JL-34|GRSS-ZZ-JL-37|GRSS-ZZ-JL-69|质检组" README.md docs -S
```

Expected: output identifies docs that mention stale or affected source-form facts.

- [ ] **Step 2: Update docs with source-of-truth language**

Where applicable, use this wording:

```markdown
当前四级记录表单口径以 `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单` 为唯一事实源；截至 2026-04-23，源表单为 283 张。`SaaS产品构思` 是字段映射和产品语义参考层，项目实现以 `noidear` 为落地点。
```

- [ ] **Step 3: Update old form-count claims**

Replace stale `260` or `263` source-form claims with `283` only when the surrounding sentence is about the current vault source-form count. Do not change unrelated business rule IDs such as `BR-283`.

- [ ] **Step 4: Update execution record and commit**

Run:

```bash
git add README.md docs/DESIGN.md docs/REQUIREMENTS.md docs/BUSINESS_RULES.md docs/AGENT_GUIDE.md docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git commit -m "docs: 同步源表单最新口径"
```

Expected: commit succeeds with only documentation changes.

---

### Task 10: Final Phase 1 Manual Validation

**Files:**
- Read: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/**/*.md`
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/**/*.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md`

- [ ] **Step 1: Verify missing mapping codes**

Run:

```bash
for code in GRSS-ZZ-JL-03 GRSS-PZ-JL-71 GRSS-PZ-JL-72 GRSS-PZ-JL-74 GRSS-YX-JL-02 GRSS-YX-JL-03 GRSS-YX-JL-04 GRSS-YX-JL-05 GRSS-XZ-JL-33 GRSS-XZ-JL-40 GRSS-ZJ-JL-{01..21}; do
  rg -q "$code" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思" || echo "missing $code"
done
```

Expected: no output.

- [ ] **Step 2: Verify mismatch pairs**

Run:

```bash
rg -n "GRSS-ZZ-JL-34.*日常清洁记录表（鸡蛋房）|GRSS-ZZ-JL-37.*果酱房果酱投料打料过程记录表（香蕉味）|GRSS-ZZ-JL-69.*配料记录表（果酱房）" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思"
```

Expected: output includes all three corrected pairs.

- [ ] **Step 3: Verify old mismatch pairs are absent**

Run:

```bash
rg -n "日常清洁记录表（鸡蛋房）.*GRSS-ZZ-JL-01|果酱房果酱投料打料过程记录表（香蕉味）.*GRSS-ZZ-JL-46|配料记录表（果酱房）.*GRSS-ZZ-JL-28|GRSS-ZZ-JL-01.*日常清洁记录表（鸡蛋房）|GRSS-ZZ-JL-46.*果酱房果酱投料打料过程记录表（香蕉味）|GRSS-ZZ-JL-28.*配料记录表（果酱房）" "/Users/jiashenglin/Desktop/mybrain/SaaS产品构思"
```

Expected: no output.

- [ ] **Step 4: Verify no stale current source-form counts remain in noidear docs**

Run:

```bash
rg -n "260 份|263 份|260 张|263 张|Source of Truth.*263|Source of Truth.*260" README.md docs -S
```

Expected: no output for current source-form count claims. Historical plan files may remain unchanged only if they clearly describe older plans instead of current facts.

- [ ] **Step 5: Complete execution record**

Set:

```text
Missing mappings remaining: 0
Code mismatches remaining: 0
Blocked items: 0
```

If any item is blocked, set the actual number and list source file, target file, and reason.

- [ ] **Step 6: Commit final Phase 1 validation**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-vault-saas-browser-alignment-execution.md
git commit -m "docs: 完成vault与SaaS对齐验收记录"
```

Expected: commit succeeds.

---

### Task 11: Create Browser Smoke Test Record

**Files:**
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md`

- [ ] **Step 1: Create browser smoke test template**

Create `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md` with:

```markdown
# Browser Smoke Test Record

## Environment

- Project: `/Users/jiashenglin/Desktop/好玩的项目/noidear`
- Date: 2026-04-23
- Browser:
- Frontend URL:
- Backend URL:
- Test account:

## Route Checklist

| Priority | Area | Route | Action | Expected | Actual | Console Error | Network Error | Classification | Status |
|---|---|---|---|---|---|---|---|---|---|
| P0 | Login | `/login` | Submit valid credentials | Enters app shell | | | | | pending |
| P0 | Navigation | main app shell | Click each main sidebar item | Route changes and page renders | | | | | pending |
| P0 | Product R&D | product R&D entry route | Enter Step1 and continue through visible steps | Main workflow can be entered | | | | | pending |
| P0 | Dynamic Form | dynamic form entry route | Open a template and submit a minimal valid record | Form validates or submits with clear errors | | | | | pending |
| P0 | Template Designer | template designer route | Add field, edit field, save | Save succeeds or shows actionable validation | | | | | pending |
| P1 | Document Management | document list route | Open list, detail, upload/preview entry | Page responds without first-render crash | | | | | pending |
| P1 | Permissions | permission entry route | Open role/permission pages | Page responds or shows authorized denial | | | | | pending |
| P1 | Mobile | mobile build/type-check | Run mobile verification | Build/type-check passes or failure recorded | | | | | pending |

## Findings

| ID | Priority | Route | Action | Evidence | Root Cause Guess | Fix Plan |
|---|---|---|---|---|---|---|

## Summary

- P0 blocking issues:
- P1 core issues:
- P2 normal issues:
- Display-only issues:
```

- [ ] **Step 2: Commit browser smoke test template**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-browser-smoke-test.md
git commit -m "docs: 新增浏览器冒烟测试记录"
```

Expected: commit succeeds with one new Markdown file.

---

### Task 12: Start Services For Browser Intake

**Files:**
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docker-compose.yml`
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/README.md`
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md`

- [ ] **Step 1: Check Docker status**

Run:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected: either no noidear containers are running, or running containers are visible.

- [ ] **Step 2: Start required services**

Run from `/Users/jiashenglin/Desktop/好玩的项目/noidear`:

```bash
docker compose up -d
```

Expected: PostgreSQL, Redis, MinIO, server/client services start according to the repository compose file.

- [ ] **Step 3: Confirm ports**

Run:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | rg "noidear|postgres|redis|minio|server|client"
```

Expected: service containers show `Up`.

- [ ] **Step 4: Record browser URLs**

Update the Environment section in `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md` with actual frontend/backend URLs from README or Docker port output.

- [ ] **Step 5: Commit environment record**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-browser-smoke-test.md
git commit -m "docs: 记录浏览器测试环境"
```

Expected: commit succeeds.

---

### Task 13: Run Browser Smoke Intake

**Files:**
- Modify: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md`

- [ ] **Step 1: Open frontend in browser**

Open the frontend URL recorded in Task 12.

Expected: browser loads either login page or app shell.

- [ ] **Step 2: Test login**

Use the configured test/admin account from README, seed data, or the current database. Record:

```text
route
username used
whether login succeeds
console errors
network errors
```

- [ ] **Step 3: Test main navigation**

Click each main sidebar or top-level navigation item once. For each click, record:

```text
route before click
clicked label
route after click
whether page renders
console error text
failed network request URL and status
```

- [ ] **Step 4: Test core workflows**

Exercise these areas:

```text
Product R&D workflow entry and visible Step1-8 navigation
Dynamic form open/fill/submit path
Template designer open/add field/edit field/save path
Document management list/detail/upload or preview entry
Permission-related entry point
Mobile build/type-check if mobile browser path is not available
```

- [ ] **Step 5: Classify findings**

Use these exact categories:

```text
frontend exception
API failure
route/permission problem
data absence
backend exception
unclear
```

Use these exact priorities:

```text
P0 blocking core flow
P1 affecting core feature
P2 normal interaction issue
P3 display issue
```

- [ ] **Step 6: Commit browser intake**

Run:

```bash
git add docs/superpowers/reports/2026-04-23-browser-smoke-test.md
git commit -m "docs: 记录浏览器冒烟测试结果"
```

Expected: commit succeeds with evidence-backed findings.

---

### Task 14: Write High-Priority Browser Fix Plan

**Files:**
- Read: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md`
- Create: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/plans/2026-04-23-browser-high-priority-fixes.md`

- [ ] **Step 1: Extract P0/P1 findings**

Run:

```bash
rg -n "P0|P1|frontend exception|API failure|route/permission problem|backend exception" docs/superpowers/reports/2026-04-23-browser-smoke-test.md
```

Expected: output lists the high-priority findings and their evidence rows.

- [ ] **Step 2: Create browser fix plan**

Create `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/plans/2026-04-23-browser-high-priority-fixes.md` with:

```markdown
# Browser High Priority Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix P0/P1 browser smoke-test failures recorded in `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/superpowers/reports/2026-04-23-browser-smoke-test.md`.

**Architecture:** Fix one failure cluster per task. Write or update a focused test before changing implementation when a failure is a code bug. Keep Vue 3 + Element Plus on the frontend and NestJS + Prisma on the backend.

**Tech Stack:** Vue 3, Element Plus, Vite/Vitest, NestJS, Jest, Docker Compose, browser manual retest.

---

## Findings To Fix

| Task | Finding ID | Priority | Files To Inspect | Test To Add Or Update | Verification |
|---|---|---|---|---|---|

## Execution Rules

- If a fix touches more than 3 files, split it into a smaller task before editing.
- API changes must keep try-catch error handling.
- Frontend changes must keep Element Plus components.
- After each fix, rerun the exact browser action from the smoke test record.
```

Then fill the `Findings To Fix` table with actual P0/P1 findings from the smoke-test record. For each row, specify exact files after inspecting stack traces, route names, or failed network URLs.

- [ ] **Step 3: Commit browser fix plan**

Run:

```bash
git add docs/superpowers/plans/2026-04-23-browser-high-priority-fixes.md
git commit -m "docs: 制定浏览器高优先级修复计划"
```

Expected: commit succeeds.

---

### Task 15: Push Completed Planning And Records

**Files:**
- Read: Git state

- [ ] **Step 1: Confirm clean committed state**

Run:

```bash
git status --short --branch
```

Expected: branch is `master`; no unstaged or untracked files remain after intentional commits.

- [ ] **Step 2: Push master**

Run:

```bash
git push origin master
```

Expected: push succeeds without force.

- [ ] **Step 3: Confirm local and remote match**

Run:

```bash
git rev-parse --short HEAD
git rev-parse --short origin/master
```

Expected: both hashes are identical.

---

## Self-Review

### Spec Coverage

- Align `SaaS产品构思` with latest `04-记录表单`: covered by Tasks 2-8 and Task 10.
- Synchronize affected `noidear` documentation: covered by Tasks 1, 9, and 10.
- Manual and reviewable work without adding a persistent audit script: covered by Critical Execution Rules and manual verification commands.
- Do not add `.codex/`: covered by Critical Execution Rules.
- Browser usability as second phase: covered by Tasks 11-14.
- Evidence model for browser failures: covered by Tasks 11 and 13.
- High-priority fix planning after intake: covered by Task 14.

### Placeholder Scan

This plan intentionally contains no `TBD`, no empty TODOs, and no undefined implementation function names. Browser fix rows are filled only after actual browser evidence exists, and Task 14 specifies the exact source report and table fields to populate.

### Type And Name Consistency

The plan consistently uses:

- `2026-04-23-vault-saas-browser-alignment-execution.md` for Phase 1 execution tracking.
- `2026-04-23-browser-smoke-test.md` for browser evidence.
- `2026-04-23-browser-high-priority-fixes.md` for follow-up browser fixes.
- `04-记录表单` as source of truth.
- `SaaS产品构思` as mapping/product construct layer.
- `noidear` as implementation/documentation repository.

