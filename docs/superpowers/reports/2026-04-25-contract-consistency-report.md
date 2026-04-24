# Contract Consistency Report

**Date:** 2026-04-25

## Shared Type Authority

- **Source:** `packages/types/traceability.ts` — 22 exported types/interfaces
- **Key types:** TraceQueryRequest, TraceQueryResult, TraceNode, TraceEdge, TraceRisk, TracePermissionContext
- **Status:** PASS — single source confirmed

## Client Adapter Alignment

- **Primary adapter:** `client/src/api/traceability.ts`
- **Re-export:** `client/src/types/traceability.ts` → pure re-export from `@noidear/types`
- **Removed:** `traceApi` from batch.ts, `traceabilityApi.trace()` from warehouse.ts
- **Status:** PASS — no drift detected

## Server DTO Alignment

- `CreateTraceabilityActionDto`: uses `sourceQueryRef`, `sourceNodeIds`, `sourceRiskIds` with `@IsArray()` ✅
- `CreateTraceabilityExportDto`: uses `sourceQueryRef`, `includeEvidence`, `includeMaskedData` ✅
- `CreateTraceabilitySnapshotDto`: uses `sourceQueryRef`, `snapshotType`, `retentionPolicy` ✅
- **Status:** PASS — all DTOs aligned to frozen contract

## Response Shape Alignment

- `result.risk.items` (not `result.risks`) ✅
- `result.permission.canInitiateLinkage` (not `canInitiateAction`) ✅
- `result.ledger.rows` (not direct array) ✅
- `node.nodeId`, `node.nodeType` (not `id`, `type`) ✅
- `edge.edgeId`, `edge.sourceNodeId`, `edge.targetNodeId`, `edge.relationType` ✅
- **Status:** PASS — components verified in Task 3 of previous convergence plan

## Test Fixture Alignment

- `traceability-contract.spec.ts`: 9 tests, all PASS
- `traceability-convergence.spec.ts`: 4 tests, all PASS
- `traceability-contract.mapper.spec.ts`: 4 tests, all PASS
- **Status:** PASS

## Permission Enforcement Evidence

- `canViewSummary`, `canViewDetail`, `canViewEvidence` — view gates
- `canInitiateLinkage` — linkage action gate
- `canExportSimple`, `canExportFullPackage` — export gates
- `canExecuteHighRiskAction` — recall assessment gate
- **Status:** PASS — all permission fields in TracePermissionContext aligned
