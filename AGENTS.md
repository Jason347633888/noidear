# Agent Guide - 文档管理系统

> **Goal**: Get productive quickly without breaking things. Read this first, then `.claude/rules/` if needed.

## Architecture

**Monorepo structure:**
- `client/` - Vue 3 + Vite + Element Plus frontend (port 5173 dev, 80 prod)
- `server/` - NestJS + Prisma backend (port 3000)
- `packages/types/` - Shared TypeScript types
- `mobile/`, `miniprogram/` - Mobile apps
- Infrastructure: PostgreSQL 15, Redis 7, MinIO (all via Docker)

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d postgres redis minio

# 2. Backend setup
cd server
npm install
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma db push --schema=src/prisma/schema.prisma
npm run start:dev

# 3. Frontend setup (new terminal)
cd client
npm install
npm run dev

# Access: http://localhost:5173 (admin / ChangeMe123!)
```

## Critical Rules

**Never:**
- Switch frameworks (Vue 3 → React, NestJS → Express)
- Modify directory structure
- Hardcode secrets (use `.env`)
- Force push Git
- Run PostgreSQL/Redis/MinIO locally (use Docker only)

**Always:**
- Use Element Plus for UI
- Use Prisma ORM (complex queries: `$queryRaw`)
- Wrap APIs in try-catch
- Write Chinese commit messages
- Validate builds after changes: `npm run build` (both)
- Regenerate Prisma client after schema changes

## Coding Standards

```typescript
// Good Taste principles
- Eliminate edge cases over adding checks
- Functions < 50 lines (< 100 for complex logic)
- Nesting < 3 levels
- Never break backward compatibility

// Vue Router - common mistake
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()     // Read-only, no afterEach
const router = useRouter()   // Has afterEach, push, etc.

// Module imports - check source first
import request from '@/api/request'      // Default export
import { request } from '@/api/request'  // Named export
```

## Common Gotchas

**Frontend changes not reflecting?**
```bash
rm -rf node_modules/.vite  # Clear Vite cache
npx vite build              # Verify build passes
# Ctrl+Shift+R in browser to hard reload
```

**Prisma schema changes?**
```bash
cd server
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma db push --schema=src/prisma/schema.prisma
```

**Worktree environment?**
```bash
cd .worktrees/feature-name/server
npx prisma generate --schema=../server/src/prisma/schema.prisma
```

**API endpoint not working?**
- Restart backend to register new routes
- Prefer existing endpoints with extra data over new single-purpose endpoints

## Commands Reference

**Backend (`cd server`):**
```bash
npm run start:dev      # Dev with watch
npm run build          # Production build
npm test               # Jest tests
npm run test:cov       # Coverage
npm run lint           # ESLint fix
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

**Frontend (`cd client`):**
```bash
npm run dev            # Dev server
npm run build          # Production build
npm run build:check    # Type check + build
npm test               # Vitest
npm run test:coverage  # Coverage
npm run test:e2e       # Playwright
npm run lint           # ESLint fix
```

**Docker:**
```bash
docker compose up -d              # Start all
docker compose up -d postgres redis minio  # Core only
docker compose logs -f server     # Tail logs
```

## Pre-commit Checklist

Before implementing anything:

```
□ Function exists in docs/DESIGN.md?
□ Using Vue 3 + NestJS (not switching frameworks)?
□ UI uses Element Plus components?
□ API has try-catch error handling?
□ No hardcoded secrets?
□ Input validation present?
□ < 50 lines per function?
□ Nesting < 3 levels deep?
□ ESLint passes?
□ Build passes (both client and server)?
```

## Library Policy

**Allowed without approval:**
- Vite plugins (`vite-plugin-*`, `@vitejs/*`)
- Type definitions (`@types/*`)
- Utilities: `dayjs`, `nanoid`, `zod`, `date-fns`
- NestJS official packages

**Needs evaluation:**
- UI libraries beyond Element Plus
- Libraries > 100KB
- Visualization libraries (D3.js, etc.)

## Documentation

| File | Purpose |
|------|---------|
| `.claude/rules/constraints.mdc` | Core constraints (27 chapters) |
| `.claude/rules/tech-stack.mdc` | Stack versions & library policy |
| `docs/DESIGN.md` | Full requirements (v10.7, 113 rules) |
| `docs/PROJECT_STRUCTURE.md` | File navigation |
| `README.md` | Setup & usage |

## Project Status

- **Completion**: 85.6% (154/180 tasks, 22 modules)
- **Business Rules**: 113 implemented
- **Test Coverage**: Backend ~85%, Frontend ~45%
- **Known Debt**: `RoleFineGrainedPermission` table, `RecordTemplate.workflowConfig` field

---

**Version**: 6.0 | **Updated**: 2026-02-22
