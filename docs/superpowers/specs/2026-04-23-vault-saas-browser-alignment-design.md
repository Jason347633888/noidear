# Vault, SaaS Construct, and Browser Usability Alignment Design

## Context

The current source of truth is `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`. It currently contains 283 record forms. `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思` is the product construct and field mapping layer derived from that source, and `/Users/jiashenglin/Desktop/好玩的项目/noidear` is the implementation repository.

The previous audit conclusion remains unresolved: the vault and SaaS construct are not fully aligned. The known gap is 31 missing mappings and 3 form code mismatches. The project also has a separate usability risk: during browser testing, some pages do not respond to clicks or fail after clicking.

This design covers both issues, but separates them into two phases so document truth and runtime behavior do not get mixed.

## Goals

1. Align `SaaS产品构思` with the latest `04-记录表单` facts.
2. Synchronize affected `noidear` documentation with the same 283-form source-of-truth language.
3. Keep the work manual and reviewable; do not add a persistent audit script to the main project.
4. Do not add a `.codex/` directory.
5. After document alignment, run browser usability testing as a second phase and turn click failures into evidence-backed fix tasks.

## Non-Goals

1. Do not change the project framework, directory structure, or runtime architecture.
2. Do not add a reusable audit script to `noidear`.
3. Do not rewrite all 283 forms from scratch.
4. Do not mix browser bug fixes into the document alignment phase.
5. Do not treat old `SaaS产品构思` entries as truth when they conflict with `04-记录表单`.

## Phase 1: Manual Full-Chain Document Alignment

Phase 1 uses a checklist-driven manual workflow. The current known difference set is the starting point: 31 missing mappings and 3 code mismatches. Each item must be confirmed against the actual vault form before editing the SaaS construct.

### Inputs

- Source of truth: `/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单`
- Product construct: `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思`
- Main project docs: `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs` and `/Users/jiashenglin/Desktop/好玩的项目/noidear/README.md`
- Existing audit report: `/Users/jiashenglin/Desktop/好玩的项目/noidear-form-validation/docs/superpowers/reports/form-validation-audit.md`

### Work Items

1. Confirm the 31 missing mappings from the source vault files.
2. Confirm the 3 form code mismatches from the source vault files.
3. Update the matching department files under `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表*.md`.
4. Update `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/03-字段映射表.md` so department counts and completion claims match the corrected detail files.
5. Update these SaaS construct overview files where the corrected mappings change totals, semantics, or gaps:
   - `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/00-产品总览.md`
   - `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/01-数据模型.md`
   - `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/02-功能设想.md`
   - `/Users/jiashenglin/Desktop/mybrain/SaaS产品构思/04-数据模型缺口汇总.md`
6. Update `noidear` documentation that still references old counts, old form codes, old source language, or old mapping status.
7. Write an execution record in `noidear` documenting what was aligned and what remains blocked.

### Acceptance Criteria

- The 31 missing mappings are present in the correct department mapping files.
- The 3 code mismatches are corrected to the current `04-记录表单` codes.
- `SaaS产品构思` no longer claims complete coverage in places where the detail files contradict that claim.
- SaaS construct overview, data model, feature concept, gap summary, and `noidear` docs use the same 283-form source-of-truth language.
- No `.codex/` directory is added.
- No reusable audit script is added to `noidear`.
- Any item that cannot be confidently mapped from the vault is explicitly recorded as blocked with the source file and reason.

## Phase 2: Browser Usability Smoke Testing and Fix Intake

Phase 2 starts only after Phase 1 alignment is complete. Its purpose is to turn broad observations like "clicking does nothing" and "clicking throws errors" into reproducible, prioritized engineering tasks.

### Scope

The smoke test should cover:

- Login and post-login landing behavior.
- Main sidebar or top-level navigation.
- Product R&D workflow pages.
- Dynamic form filling and submission.
- Template designer entry, field editing, and save path.
- Document management pages.
- Permission-related pages or entry points where applicable.
- Mobile entry or mobile build/type-check verification if browser access is not practical.

### Evidence Model

Each issue must record:

- Page path or route.
- User action.
- Expected result.
- Actual result.
- Browser console error, if present.
- Network/API error, if present.
- Initial classification: frontend exception, API failure, route/permission problem, data absence, backend exception, or unclear.
- Priority: blocking core flow, affecting core feature, normal interaction issue, or display issue.

### Fix Boundary

Browser issues must be fixed in separate batches after intake. If a fix touches more than 3 files, it must be split. If an observed failure is a bug, write or update a focused test before changing implementation. API changes must keep try-catch error handling. Frontend fixes must stay within Vue 3 and Element Plus.

### Acceptance Criteria

- Main navigation clicks respond.
- Core pages do not crash on first render.
- Product R&D, dynamic form, and template designer flows can be entered and exercised through their primary actions.
- Known click failures have evidence-backed issue records instead of vague descriptions.
- High-priority failures are fixed and verified by browser retest plus relevant build or test commands.

## Risks and Mitigations

- Risk: Manual mapping can introduce silent mistakes.
  Mitigation: every changed mapping item must cite or be traceable to the source vault form.

- Risk: Documentation and implementation drift again.
  Mitigation: record the source snapshot date and keep an execution record of changed files and unresolved items.

- Risk: Browser bugs expand the scope too much.
  Mitigation: Phase 2 first records and classifies issues, then fixes only prioritized batches.

- Risk: Existing dirty worktree changes get mixed into this task.
  Mitigation: only stage and commit files intentionally changed for each phase.

## Validation

Phase 1 validation is document-based:

- Recheck the 31 missing mappings against the updated SaaS construct files.
- Recheck the 3 code mismatches against the source vault files.
- Search updated docs for stale source-of-truth statements, old counts, and old codes.

Phase 2 validation is behavior-based:

- Run the project in a browser.
- Capture each failing click or thrown error with route, console, and network evidence.
- After fixes, rerun the same browser steps and the relevant project build or test commands.

## Implementation Sequence

1. Create a detailed implementation plan for Phase 1.
2. Execute Phase 1 in small department-based batches.
3. Review the execution record and confirm document alignment.
4. Create a separate implementation plan for Phase 2 browser smoke testing.
5. Run smoke testing, classify failures, and fix high-priority batches.

