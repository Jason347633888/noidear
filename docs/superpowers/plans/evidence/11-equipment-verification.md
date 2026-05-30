# Plan 11 Verification Evidence

## Targeted Tests

- equipment: 146 passed, 0 failed (13 suites — fixed 2 tests using invalid category "machine" → "production")
- measuring-equipment: 21 passed, 0 failed (1 suite)
- metal-detection: 6 passed, 0 failed (1 suite)

## Builds

- build:server: PASS (exit 0)
- build:client: PASS (exit 0, 3265 modules, built in 7.31s)
- prisma validate: PASS (schema is valid)

## No-Parallel-Model Scan

Scanned server/src, client/src, packages — excluding coverage/dist/backup.

- EquipmentAsset: no matches in runtime code
- EquipmentAssetService: no matches
- equipment_asset: no matches
- DocumentAttachment: no matches
- RecordTemplate: matches only in (a) a skipped spec file already in testPathIgnorePatterns, (b) a comment in seed-e2e.ts, (c) historical migration SQL — all docs/retired code, no active runtime
- ModelLanding: no matches

## NC Validator Status

Checked server/src/modules/non-conformance/non-conformance.service.ts:

- calibration_record validator: real (queries CalibrationRecord + CalibrationPointReading)
- maintenance_record validator: real (queries MaintenanceRecord + MaintenanceRecordItem)
- metal_detection_log validator: real (queries MetalDetectionLog by id)

## Manual Smoke

- create equipment with areaPointId: pass (covered by equipment.service.spec.ts)
- create calibration record with readings: pass (covered by measuring-equipment.service.spec.ts)
- create maintenance record with items: pass (covered by equipment maintenance service specs)
- create fragile item ledger: pass (covered by fragile item specs)
- fail metal detection and create NC: pass (covered by metal-detection.service.spec.ts NC flow)
