# Quick Start: E2E Monitoring Tests

## 🚀 Fast Track Execution

### 1. Prerequisites Check (30 seconds)
```bash
# Check services are running
curl http://localhost:5173  # Frontend
curl http://localhost:3000/api/v1/health  # Backend

# Check environment variables
cat .env.e2e  # Should have E2E_ADMIN_USER and E2E_ADMIN_PASS
```

### 2. Run All Monitoring Tests (5-10 minutes)
```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client

npx playwright test e2e/monitoring.spec.ts e2e/audit.spec.ts e2e/alert.spec.ts e2e/backup.spec.ts e2e/health.spec.ts
```

### 3. View Results (1 minute)
```bash
npx playwright show-report
```

---

## 🎯 Individual Test Suites

### Monitoring Dashboard (9 tests, ~2 min)
```bash
npx playwright test e2e/monitoring.spec.ts
```

### Audit Logs (13 tests, ~3 min)
```bash
npx playwright test e2e/audit.spec.ts
```

### Alert Management (13 tests, ~3 min)
```bash
npx playwright test e2e/alert.spec.ts
```

### Backup Management (13 tests, ~3 min)
```bash
npx playwright test e2e/backup.spec.ts
```

### Health Check (15 tests, ~3 min)
```bash
npx playwright test e2e/health.spec.ts
```

---

## 🐛 Debug Mode

### Run with browser visible
```bash
npx playwright test e2e/monitoring.spec.ts --headed
```

### Run single test with debug
```bash
npx playwright test e2e/monitoring.spec.ts --grep "should load monitoring dashboard" --debug
```

---

## 📊 Expected Results

✅ **63 tests** should pass
- Monitoring Dashboard: 9 tests
- Audit Logs: 13 tests
- Alert Management: 13 tests
- Backup Management: 13 tests
- Health Check: 15 tests

⚠️ **Some tests may skip** if:
- No data available (empty tables)
- Features not yet implemented
- API endpoints not ready

---

## 📸 Screenshots Location

```bash
ls -lh e2e/test-results/*.png
```

All screenshots are saved to `e2e/test-results/` directory.

---

## 🔥 Troubleshooting

### Tests fail with "Target closed"
```bash
# Increase timeout in playwright.config.ts
use: {
  actionTimeout: 30000,  // Increase from 15000
}
```

### Tests fail with authentication error
```bash
# Verify credentials in .env.e2e
echo $E2E_ADMIN_USER
echo $E2E_ADMIN_PASS
```

### Tests fail with "element not found"
```bash
# Run in headed mode to see what's happening
npx playwright test e2e/monitoring.spec.ts --headed
```

### Frontend not running
```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run dev
```

### Backend not running
```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run start:prod
```

---

## 📝 Test Summary

| Test File | Tests | Time | Status |
|-----------|-------|------|--------|
| monitoring.spec.ts | 9 | ~2 min | ✅ |
| audit.spec.ts | 13 | ~3 min | ✅ |
| alert.spec.ts | 13 | ~3 min | ✅ |
| backup.spec.ts | 13 | ~3 min | ✅ |
| health.spec.ts | 15 | ~3 min | ✅ |
| **TOTAL** | **63** | **~14 min** | **✅** |

---

**Last Updated**: 2026-02-17
**Phase**: 4 (TASK-375)
**Status**: ✅ COMPLETE
