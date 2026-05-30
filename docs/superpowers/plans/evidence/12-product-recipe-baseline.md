# Phase 12 — Product & Recipe Baseline Audit

**Date:** 2026-05-30
**Git HEAD:** be11fc209d284c2b2c513c9da91d02d72a30e481
**Branch:** worktree-feat+v1-full-closure

## 1. Prisma Generate

```
npm run prisma:generate -w server
```

Result: ✅ Generated Prisma Client (v5.22.0) — no errors.

## 2. Prisma Validate

```
cd server && npx prisma validate --schema src/prisma/schema.prisma
```

Result: ✅ The schema at `src/prisma/schema.prisma` is valid.

## 3. Forbidden Model Scan (schema.prisma)

```
rg "model (ProductProfile|ProductAllergenProfile|ProductLabelProfile|MaterialAllergenProfile|ProductSpecification|ProductRiskZone|ProductValidationRecord)\b" server/src/prisma/schema.prisma
```

Result: **No matches** (exit code 1). All forbidden Prisma models are absent and must remain absent throughout Phase 12.

## 4. Alias / Legacy Name Scan (source files)

```
rg "RecordTemplate|ModelLanding|ProductDevelopmentForm|RecipeTemplate"
  server/ client/ packages/
  (excluding: coverage/, dist/, node_modules/, *.json, *.sql, *.html)
```

### Matches found

| File | Nature | Assessment |
|------|--------|------------|
| `server/src/prisma/seed-e2e.ts` | Comment: `DeviationReport 不再关联 Record/RecordTemplate` | Historical comment explaining retirement — safe, no runtime path |
| `server/src/modules/record-template/template-alias.controller.spec.ts` | Imports `RecordTemplateService`, `CreateRecordTemplateDto`, `UpdateRecordTemplateDto` in test | Spec file only; the module itself is retired (directory contains only this spec). No live runtime code. |

### Verdict

- `ProductDevelopmentForm` — **absent** ✅
- `RecipeTemplate` — **absent** ✅
- `ModelLanding` — **absent** ✅ (only in archived coverage HTML)
- `RecordTemplate` — **present only in**: retired spec file + comment. No runtime Prisma model, no active module, no live route. Retirement confirmed by migration `20260524090000_retire_dynamic_form_platform`.

## 5. Summary

All constraints are satisfied at baseline:

1. Forbidden Prisma models (ProductProfile, ProductAllergenProfile, ProductLabelProfile, ProductSpecification, etc.) — **absent**.
2. Forbidden runtime paths (ProductDevelopmentForm, RecipeTemplate, ModelLanding) — **absent**.
3. RecordTemplate references are limited to a retired spec file and a historical comment — **no active runtime path**.
4. Prisma schema and client generation both pass cleanly.

Phase 12 implementation may proceed.
