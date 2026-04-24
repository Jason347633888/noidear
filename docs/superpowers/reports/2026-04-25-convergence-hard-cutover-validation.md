# Convergence Hard Cutover Validation

**Date:** 2026-04-25
**Status:** PASS

## Primary Surface

- **route:** `/traceability` → `TraceabilityQuery` (client/src/router/index.ts:356-360)
- **page:** `client/src/views/traceability/TraceabilityQuery.vue` and 5 sub-components
- **adapter:** `client/src/api/traceability.ts` (sole primary adapter)
- **shared types:** `packages/types/traceability.ts` (22 exported types)
- **server endpoints:** `server/src/modules/traceability/` (POST /traceability/query, /balance, /actions, /export, /snapshots, /snapshots/:id)

## Legacy Surface Findings

- **batch-trace:** Routes `/batch-trace/query` (name: `TraceabilityLegacyRedirect`) and `/batch-trace/report` (name: `TraceReportLegacyRedirect`) both redirect to `/traceability`. `TraceQuery.vue` and `TraceReport.vue` replaced with bridge redirect pages. `/batch-trace/trace/*` endpoints return `meta.deprecated: true`.
- **warehouse trace:** Route `/warehouse/traceability` (name: `WarehouseTraceabilityLegacyRedirect`) redirects to `/traceability`. `Traceability.vue` replaced with bridge page. `/warehouse/traceability/*` endpoints return `meta.deprecated: true`.
- **export/snapshot duplicates:** None found outside traceability module.
- **type drift:** `client/src/types/traceability.ts` is pure re-export from `@noidear/types`. No drift detected.
- **menu state:** Layout.vue contains no legacy `batch-trace/query`, `batch-trace/report`, or `warehouse/traceability` menu items.

## Validation Evidence

### route evidence
```
client/src/router/index.ts:296:        name: 'TraceabilityLegacyRedirect',
client/src/router/index.ts:297:        redirect: '/traceability',
client/src/router/index.ts:303:        redirect: '/traceability',
client/src/router/index.ts:350:        name: 'WarehouseTraceabilityLegacyRedirect',
client/src/router/index.ts:351:        redirect: '/traceability',
client/src/router/index.ts:356:        path: 'traceability',
```
All three legacy routes redirect to `/traceability`. The authoritative route `TraceabilityQuery` is registered at `path: 'traceability'` with `requiresAuth: true`.

### adapter evidence
- `traceApi` (forward/backward/getTrace/exportTrace) removed from `client/src/api/batch.ts`
- `traceabilityApi.trace()` removed from `client/src/api/warehouse.ts`
- Zero rg hits for `sourceQueryHash|canInitiateAction|result\.risks\b|/batch-trace/query|/warehouse/traceability` in `client/src` (excluding spec files)

### grep evidence — legacy vocabulary in active client code
```
(no output — zero matches)
```
No legacy vocabulary found in active client source. Clean.

### grep evidence — legacy vocabulary in active server code (excluding known internal usages)
```
(no output — zero matches)
```
No extraneous `sourceQueryHash` or `canInitiateAction` outside the known internal services. Clean.

### menu evidence
```
Layout.vue: no legacy menu items found
```
No `batch-trace/query`, `batch-trace/report`, or `warehouse/traceability` entries in Layout.vue.

### test evidence
- 17 client tests pass, 20 server tests pass (as of previous convergence plan execution)
- Contract shape tests (`traceability-contract.spec.ts`, `traceability-convergence.spec.ts`) passing

### doc evidence
- `docs/superpowers/specs/2026-04-25-contract-cleanup-and-system-convergence-design.md` exists as convergence authority
- `docs/superpowers/reports/2026-04-25-contract-cleanup-convergence-register.md` records all object-by-object decisions

## Known Exceptions (Not Bugs)

| Object | Vocabulary | Reason |
| --- | --- | --- |
| `traceability-query.service.ts` | `canInitiateAction` | Local specialist service interface — not exposed to client, kept for unit test coverage |
| `traceability-export.service.ts` | `sourceQueryHash` | Prisma column mapping — API uses `sourceQueryRef`, DB column is `sourceQueryHash` |
| `schema.prisma` | `sourceQueryHash` | DB column name — intentionally distinct from API field name |

## Summary

All three convergence checkpoints pass:

1. **Routes:** Legacy paths redirect correctly; authoritative route is registered with `requiresAuth: true`.
2. **Client vocabulary:** Zero legacy adapter calls, zero legacy field names in active client code.
3. **Server vocabulary:** Zero legacy terms outside intentional internal usages (known exceptions documented above).

Hard cutover is confirmed complete. The traceability system has a single authoritative surface on all layers.

## Final Gate Status

**Date:** 2026-04-25
**Overall Status:** ✅ PASS

### Gate Checks

| Check | Status | Evidence |
| --- | --- | --- |
| Single primary route | ✅ PASS | /traceability → TraceabilityQuery |
| Legacy routes are redirects only | ✅ PASS | 3 redirect routes confirmed |
| Single primary menu entry | ✅ PASS | Layout.vue verified |
| Primary adapter authority | ✅ PASS | traceabilityApi in client/src/api/traceability.ts |
| Legacy adapters stripped of trace methods | ✅ PASS | traceApi removed, traceabilityApi.trace() removed |
| Type authority | ✅ PASS | packages/types/traceability.ts, client re-export |
| Legacy pages are bridges | ✅ PASS | TraceQuery.vue, TraceReport.vue, Traceability.vue |
| Server primary module | ✅ PASS | server/src/modules/traceability/ |
| Legacy server endpoints deprecated | ✅ PASS | meta.deprecated=true on 4 endpoints |
| No active legacy vocabulary in client | ✅ PASS | grep confirms zero active matches |
| Delete candidate register | ✅ PASS | docs/superpowers/reports/2026-04-25-convergence-delete-candidate-register.md |
