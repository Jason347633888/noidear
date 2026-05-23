# noidear-chat Conversational CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `noidear-chat`, an Agent-native CLI that exposes noidear through safe profiles, schema discovery, API commands, raw API calls, audited writes, shortcuts, structured output, and no legacy MCP dependency.

**Architecture:** The CLI is a new npm workspace under `tools/noidear-chat`. Runtime calls go through noidear REST API with JWT; write operations are guarded by risk metadata, confirmation rules, idempotency keys, local checkpoints, and a new server-side `AgentCliAction` audit module. The command surface has three layers: shortcuts, generated API commands, and raw API.

**Tech Stack:** Node 20, TypeScript, commander, Vitest, NestJS, Prisma, existing noidear REST API and Swagger/OpenAPI.

---

## Execution Rules

- Execute from an isolated worktree created from latest `origin/master`; do not implement this plan directly in the main checkout.
- Read `AGENTS.md`, `docs/AGENT_GUIDE.md`, and `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` before implementation.
- Before editing any function, class, method, or Prisma-related server symbol, run GitNexus impact analysis and stop to warn the user if risk is HIGH or CRITICAL.
- Do not restore `tools/noidear-mcp`, `build:mcp`, old MCP env vars, old MCP commands, or the removed `AgentAction` / `agent_actions` model.
- Use TDD for behavior changes: write the focused failing test, run it to confirm failure, implement, run it again, then broaden verification.

## File Map

- Create `tools/noidear-chat/package.json`: CLI workspace metadata, scripts, bin entry, direct dependencies.
- Create `tools/noidear-chat/tsconfig.json`: TypeScript build config.
- Create `tools/noidear-chat/vitest.config.ts`: CLI unit test config.
- Create `tools/noidear-chat/src/main.ts`: CLI entrypoint and command registration.
- Create `tools/noidear-chat/src/cmd/*.ts`: command modules for auth, profile, operations, schema, generated service commands, raw API, shortcuts, update.
- Create `tools/noidear-chat/src/internal/*.ts`: reusable config, profile, auth, input, HTTP, output, errors, notices, registry, schema, risk, audit utilities.
- Create `tools/noidear-chat/src/shortcuts/*.ts`: shortcut runner and checkpoint handling.
- Create `tools/noidear-chat/src/shortcuts/domains/*.ts`: first supported business shortcuts.
- Create `tools/noidear-chat/src/generated/operation-registry.json`: checked-in generated registry fixture.
- Create `tools/noidear-chat/src/skills/**/SKILL.md`: Agent skill docs shipped with CLI.
- Create `tools/noidear-chat/test/**`: unit, fixture, dry-run E2E, and live E2E tests.
- Modify `package.json` and `package-lock.json`: add workspace and scripts.
- Modify `server/src/prisma/schema.prisma`: add `AgentCliAction`.
- Create `server/src/prisma/migrations/20260522110000_add_agent_cli_actions/migration.sql`: create `agent_cli_actions`.
- Create `server/src/modules/agent-cli-action/**`: server audit controller, service, DTOs, module, tests.
- Modify `server/src/app.module.ts`: import and register `AgentCliActionModule`.
- Modify `docs/AGENT_GUIDE.md`, `README.md`, and `llms.txt`: add the new CLI entry only after it exists.

---

### Task 1: Workspace Skeleton And CLI Entrypoint

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tools/noidear-chat/package.json`
- Create: `tools/noidear-chat/tsconfig.json`
- Create: `tools/noidear-chat/vitest.config.ts`
- Create: `tools/noidear-chat/src/main.ts`
- Create: `tools/noidear-chat/test/main.test.ts`

- [ ] **Step 1: Add the failing CLI help test**

```ts
// tools/noidear-chat/test/main.test.ts
import { describe, expect, it } from 'vitest';
import { createProgram } from '../src/main';

describe('noidear-chat CLI', () => {
  it('registers the top-level Agent-native commands', () => {
    const program = createProgram();
    const commands = program.commands.map((command) => command.name()).sort();

    expect(commands).toEqual([
      'api',
      'auth',
      'operations',
      'profile',
      'schema',
      'update',
    ]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
npm run test -w noidear-chat -- main.test.ts
```

Expected: failure because workspace and `createProgram` do not exist.

- [ ] **Step 3: Add workspace scripts**

Modify root `package.json`:

```json
{
  "workspaces": [
    "client",
    "server",
    "packages/types",
    "tools/noidear-chat"
  ],
  "scripts": {
    "build:chat": "npm run build -w noidear-chat",
    "test:chat": "npm run test -w noidear-chat",
    "verify:full": "npm run lint:api-prefix && npm run typecheck:types && npm run build:server && npm run build:client && npm run build:chat && npm run test:chat"
  }
}
```

Keep all existing scripts not shown here unchanged.

- [ ] **Step 4: Create the CLI package**

```json
{
  "name": "noidear-chat",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "noidear-chat": "dist/main.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "start": "tsx src/main.ts"
  },
  "dependencies": {
    "commander": "^14.0.2"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "tsx": "^4.22.0",
    "typescript": "^5.3.0",
    "vitest": "^4.0.18"
  }
}
```

- [ ] **Step 5: Add TypeScript and Vitest config**

```json
// tools/noidear-chat/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "test"]
}
```

```ts
// tools/noidear-chat/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: Add the minimal entrypoint**

```ts
// tools/noidear-chat/src/main.ts
import { Command } from 'commander';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('noidear-chat')
    .description('Agent-native CLI for noidear')
    .version('0.1.0')
    .option('--profile <name>', 'profile name')
    .option('--format <format>', 'json, table, pretty, ndjson, csv', 'json')
    .option('--dry-run', 'preview requests without sending business calls')
    .option('--yes', 'confirm risky operation after user approval')
    .option('--reason <text>', 'reason for audited write operation')
    .option('--session-id <id>', 'agent session id')
    .option('--idempotency-key <key>', 'idempotency key for write operation')
    .option('--strict', 'reject unsafe missing metadata');

  program.command('profile').description('manage noidear profiles');
  program.command('auth').description('login, status, check, and logout');
  program.command('operations').description('list operation registry entries');
  program.command('schema').argument('<operation>').description('show operation schema');
  program.command('api').argument('<method>').argument('<path>').description('call raw noidear API');
  program.command('update').description('update registry and skills');

  return program;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createProgram().parseAsync(process.argv);
}
```

- [ ] **Step 7: Install and update lockfile**

Run:

```bash
npm install
```

Expected: `package-lock.json` contains `tools/noidear-chat` and no `tools/noidear-mcp`.

- [ ] **Step 8: Verify**

Run:

```bash
npm run test -w noidear-chat -- main.test.ts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tools/noidear-chat
git commit -m "feat: add noidear-chat workspace skeleton"
```

---

### Task 2: Output, Errors, Input, And Notices Contract

**Files:**
- Create: `tools/noidear-chat/src/internal/errors.ts`
- Create: `tools/noidear-chat/src/internal/output.ts`
- Create: `tools/noidear-chat/src/internal/input.ts`
- Create: `tools/noidear-chat/src/internal/notices.ts`
- Create: `tools/noidear-chat/test/output.test.ts`
- Create: `tools/noidear-chat/test/input.test.ts`

- [ ] **Step 1: Add failing tests for stdout/stderr envelope and exit codes**

```ts
// tools/noidear-chat/test/output.test.ts
import { describe, expect, it } from 'vitest';
import { CliError, ExitCode } from '../src/internal/errors';
import { errorEnvelope, successEnvelope } from '../src/internal/output';

describe('output contract', () => {
  it('renders successful JSON envelopes with optional notices', () => {
    expect(successEnvelope({
      operationId: 'auth.status',
      data: { authenticated: true },
      notice: { update: null, skills: null, registry: null },
    })).toEqual({
      ok: true,
      operationId: 'auth.status',
      data: { authenticated: true },
      _notice: { update: null, skills: null, registry: null },
    });
  });

  it('renders structured errors for Agent parsing', () => {
    const error = new CliError({
      type: 'confirmation_required',
      message: 'destructive action requires confirmation',
      hint: 'append --yes after explicit user approval',
      exitCode: ExitCode.ConfirmationRequired,
    });

    expect(errorEnvelope(error)).toMatchObject({
      ok: false,
      error: {
        type: 'confirmation_required',
        message: 'destructive action requires confirmation',
        hint: 'append --yes after explicit user approval',
      },
    });
    expect(error.exitCode).toBe(10);
  });
});
```

- [ ] **Step 2: Add failing tests for JSON, file, and stdin input**

```ts
// tools/noidear-chat/test/input.test.ts
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readJsonInput } from '../src/internal/input';

describe('readJsonInput', () => {
  it('parses inline JSON', async () => {
    await expect(readJsonInput('{"a":1}', 'data')).resolves.toEqual({ a: 1 });
  });

  it('parses @file JSON after path validation', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'noidear-chat-'));
    const file = join(dir, 'payload.json');
    await writeFile(file, '{"b":2}');

    await expect(readJsonInput(`@${file}`, 'data')).resolves.toEqual({ b: 2 });
  });

  it('rejects directory input', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'noidear-chat-'));
    await expect(readJsonInput(`@${dir}`, 'data')).rejects.toMatchObject({
      type: 'usage_error',
    });
  });
});
```

- [ ] **Step 3: Implement exit code and error types**

```ts
// tools/noidear-chat/src/internal/errors.ts
export enum ExitCode {
  Success = 0,
  Unknown = 1,
  Usage = 2,
  Auth = 3,
  Permission = 4,
  Validation = 5,
  Network = 6,
  Server = 7,
  Conflict = 8,
  ConfirmationRequired = 10,
}

export class CliError extends Error {
  readonly type: string;
  readonly hint?: string;
  readonly exitCode: ExitCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(params: {
    type: string;
    message: string;
    hint?: string;
    exitCode?: ExitCode;
    status?: number;
    details?: unknown;
  }) {
    super(params.message);
    this.type = params.type;
    this.hint = params.hint;
    this.exitCode = params.exitCode ?? ExitCode.Unknown;
    this.status = params.status;
    this.details = params.details;
  }
}
```

- [ ] **Step 4: Implement envelopes and notices**

```ts
// tools/noidear-chat/src/internal/notices.ts
export interface NoticeEnvelope {
  update: null | { message: string; command: string };
  skills: null | { message: string; command: string };
  registry: null | { message: string; command: string };
}

export function emptyNotice(): NoticeEnvelope {
  return { update: null, skills: null, registry: null };
}
```

```ts
// tools/noidear-chat/src/internal/output.ts
import { CliError } from './errors';
import { NoticeEnvelope } from './notices';

export function successEnvelope(params: {
  operationId?: string;
  method?: string;
  path?: string;
  status?: number;
  data: unknown;
  audit?: unknown;
  notice?: NoticeEnvelope;
}) {
  return {
    ok: true,
    ...(params.operationId ? { operationId: params.operationId } : {}),
    ...(params.method ? { method: params.method } : {}),
    ...(params.path ? { path: params.path } : {}),
    ...(params.status ? { status: params.status } : {}),
    data: params.data,
    ...(params.audit ? { audit: params.audit } : {}),
    ...(params.notice ? { _notice: params.notice } : {}),
  };
}

export function errorEnvelope(error: CliError, context: Record<string, unknown> = {}) {
  return {
    ok: false,
    ...context,
    ...(error.status ? { status: error.status } : {}),
    error: {
      type: error.type,
      message: error.message,
      ...(error.hint ? { hint: error.hint } : {}),
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
}
```

- [ ] **Step 5: Implement safe JSON input**

```ts
// tools/noidear-chat/src/internal/input.ts
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliError, ExitCode } from './errors';

export async function readJsonInput(value: string | undefined, fieldName: string): Promise<unknown> {
  if (!value) return undefined;

  const raw = value.startsWith('@')
    ? await readFileInput(value.slice(1), fieldName)
    : value;

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new CliError({
      type: 'usage_error',
      message: `${fieldName} must be valid JSON`,
      hint: `Run schema first, then pass --${fieldName} as JSON, @file, or -`,
      exitCode: ExitCode.Usage,
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function readFileInput(path: string, fieldName: string): Promise<string> {
  const absolute = resolve(path);
  const info = await stat(absolute).catch(() => null);
  if (!info || !info.isFile()) {
    throw new CliError({
      type: 'usage_error',
      message: `${fieldName} file is not readable`,
      hint: `Pass --${fieldName} @/absolute/path/to/payload.json`,
      exitCode: ExitCode.Usage,
    });
  }
  return readFile(absolute, 'utf8');
}
```

- [ ] **Step 6: Verify**

Run:

```bash
npm run test -w noidear-chat -- output.test.ts input.test.ts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add tools/noidear-chat
git commit -m "feat: add noidear-chat output and input contracts"
```

---

### Task 3: Profile And Auth Commands

**Files:**
- Create: `tools/noidear-chat/src/internal/config.ts`
- Create: `tools/noidear-chat/src/internal/profile.ts`
- Create: `tools/noidear-chat/src/internal/auth.ts`
- Create: `tools/noidear-chat/src/cmd/profile.ts`
- Create: `tools/noidear-chat/src/cmd/auth.ts`
- Modify: `tools/noidear-chat/src/main.ts`
- Create: `tools/noidear-chat/test/profile-auth.test.ts`

- [ ] **Step 1: Add failing profile/auth tests**

```ts
// tools/noidear-chat/test/profile-auth.test.ts
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProfileStore } from '../src/internal/profile';

describe('profile store', () => {
  it('saves current profile with no password field', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'noidear-chat-config-'));
    const store = createProfileStore(dir);

    await store.save({
      name: 'local',
      server: 'http://localhost:3000',
      apiPrefix: '/api/v1',
      token: 'jwt',
      user: { id: 'u1', username: 'admin', companyId: 'c1' },
      defaultFormat: 'json',
    });
    await store.use('local');

    await expect(store.current()).resolves.toMatchObject({
      name: 'local',
      server: 'http://localhost:3000',
      user: { companyId: 'c1' },
    });
    await expect(JSON.stringify(await store.current())).resolves.not.toContain('password');
  });
});
```

- [ ] **Step 2: Implement profile storage with file permissions**

Implement `createProfileStore(configDir)` with:

```ts
export interface NoidearProfile {
  name: string;
  server: string;
  apiPrefix: '/api/v1';
  token?: string;
  tokenExpiresAt?: string;
  user?: {
    id: string;
    username: string;
    companyId: string;
  };
  defaultFormat: 'json' | 'table' | 'pretty' | 'ndjson' | 'csv';
}
```

Storage rules:

- directory mode `0700`;
- profile JSON mode `0600`;
- `config.json` stores only `{ "currentProfile": "local" }`;
- env overrides: `NOIDEAR_CHAT_SERVER`, `NOIDEAR_CHAT_TOKEN`, `NOIDEAR_CHAT_PROFILE`.

- [ ] **Step 3: Implement login/status/check/logout**

`auth login` behavior:

- Prompt for server, username, and password when missing from flags.
- Call `POST /api/v1/auth/login`.
- Save `token` and `user`.
- Immediately call `GET /api/v1/auth/profile` to verify `companyId`.

`auth status` behavior:

- Call `/api/v1/auth/profile`.
- Output `{ authenticated, profile, user }`.

`auth check --operation <id>` behavior:

- Validate token via `/api/v1/auth/profile`.
- Load registry entry for the operation.
- Output operation risk and permission hints; backend remains the final permission authority.

- [ ] **Step 4: Register commands in `main.ts`**

Replace placeholder command registration with imports:

```ts
import { registerAuthCommands } from './cmd/auth.js';
import { registerProfileCommands } from './cmd/profile.js';

// inside createProgram()
registerProfileCommands(program);
registerAuthCommands(program);
```

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -w noidear-chat -- profile-auth.test.ts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add tools/noidear-chat
git commit -m "feat: add noidear-chat profiles and auth"
```

---

### Task 4: HTTP Client And noidear Response Handling

**Files:**
- Create: `tools/noidear-chat/src/internal/client.ts`
- Create: `tools/noidear-chat/test/client.test.ts`

- [ ] **Step 1: Add failing HTTP client tests**

```ts
// tools/noidear-chat/test/client.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createNoidearClient, normalizeApiPath } from '../src/internal/client';

describe('normalizeApiPath', () => {
  it('normalizes paths to /api/v1', () => {
    expect(normalizeApiPath('/environment-records')).toBe('/api/v1/environment-records');
    expect(normalizeApiPath('/api/v1/environment-records')).toBe('/api/v1/environment-records');
  });
});

describe('createNoidearClient', () => {
  it('unwraps noidear success envelopes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ code: 0, message: 'ok', data: { value: 1 } }),
    });

    const client = createNoidearClient({
      server: 'http://localhost:3000',
      token: 'jwt',
      fetchImpl: fetchMock,
    });

    await expect(client.request({ method: 'GET', path: '/environment-records' })).resolves.toEqual({
      status: 200,
      data: { value: 1 },
    });
  });
});
```

- [ ] **Step 2: Implement path normalization and fetch wrapper**

Implement:

```ts
export function normalizeApiPath(path: string): string;
export function createNoidearClient(params: {
  server: string;
  token?: string;
  fetchImpl?: typeof fetch;
}): {
  request(input: {
    method: string;
    path: string;
    params?: unknown;
    data?: unknown;
    idempotencyKey?: string;
  }): Promise<{ status: number; data: unknown; raw: unknown }>;
};
```

Rules:

- attach `Authorization: Bearer <token>` when token exists;
- attach `Idempotency-Key` when provided;
- unwrap success `{ code, message, data }`;
- map 401 to `ExitCode.Auth`;
- map 403 to `ExitCode.Permission`;
- map 5xx to `ExitCode.Server`;
- map network errors to `ExitCode.Network`.

- [ ] **Step 3: Verify**

Run:

```bash
npm run test -w noidear-chat -- client.test.ts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add tools/noidear-chat
git commit -m "feat: add noidear-chat API client"
```

---

### Task 5: Operation Registry, Schema, And Service Commands

**Files:**
- Create: `tools/noidear-chat/src/internal/openapi.ts`
- Create: `tools/noidear-chat/src/internal/operation-registry.ts`
- Create: `tools/noidear-chat/src/internal/schema-renderer.ts`
- Create: `tools/noidear-chat/src/cmd/operations.ts`
- Create: `tools/noidear-chat/src/cmd/schema.ts`
- Create: `tools/noidear-chat/src/cmd/service-commands.ts`
- Modify: `tools/noidear-chat/src/main.ts`
- Create: `tools/noidear-chat/src/generated/operation-registry.json`
- Create: `tools/noidear-chat/test/fixtures/openapi.noidear.json`
- Create: `tools/noidear-chat/test/registry-schema.test.ts`

- [ ] **Step 1: Add failing registry/schema tests**

```ts
// tools/noidear-chat/test/registry-schema.test.ts
import { describe, expect, it } from 'vitest';
import fixture from './fixtures/openapi.noidear.json';
import { buildOperationRegistry } from '../src/internal/operation-registry';
import { renderSchemaJson } from '../src/internal/schema-renderer';

describe('operation registry', () => {
  it('builds stable operation entries with risk overrides', () => {
    const registry = buildOperationRegistry(fixture, {
      'POST /api/v1/environment-records': {
        id: 'environment-records.create',
        command: ['environment-records', 'create'],
        risk: 'write',
        permissions: ['environment-record:create'],
        idempotency: 'client-key-required',
      },
    });

    expect(registry['environment-records.create']).toMatchObject({
      method: 'POST',
      path: '/api/v1/environment-records',
      risk: 'write',
      permissions: ['environment-record:create'],
    });
  });

  it('renders schema with response envelope metadata', () => {
    const registry = buildOperationRegistry(fixture, {});
    const schema = renderSchemaJson(registry['environment-records.create']);

    expect(schema.response).toMatchObject({
      wrappedByNoidear: true,
      successEnvelope: '{ code, message, data }',
      errorEnvelope: '{ code, message, details, path, timestamp }',
    });
  });
});
```

- [ ] **Step 2: Add the fixture**

`tools/noidear-chat/test/fixtures/openapi.noidear.json` contains the minimum OpenAPI paths for:

- `POST /api/v1/environment-records`
- `GET /api/v1/environment-records`
- `POST /api/v1/incoming-inspections`
- `GET /api/v1/traceability/backward`
- `POST /api/v1/product-recalls`
- `POST /api/v1/documents/:id/submit-approval`

Use DTO property names from current Swagger output when implementing; do not invent fields that conflict with server DTOs.

- [ ] **Step 3: Implement registry contracts**

```ts
export type OperationRisk = 'read' | 'write' | 'transition' | 'destructive';

export interface OperationRegistryEntry {
  id: string;
  command: string[];
  method: string;
  path: string;
  module: string;
  summary: string;
  risk: OperationRisk;
  bodySchemaRef: string | null;
  querySchemaRef: string | null;
  responseSchemaRef: string | null;
  requiresAuth: boolean;
  requiresConfirmation: boolean;
  permissions: string[];
  pagination: null | { pageParam: string; sizeParam: string };
  upload: boolean;
  idempotency: 'none' | 'client-key-required' | 'server-generated';
  audit: 'none' | 'required';
}
```

`buildOperationRegistry(openapi, overrides)` must:

- normalize paths to `/api/v1/...`;
- prefer override IDs;
- fall back to stable `method + path` IDs;
- attach default `read` risk to GET;
- require overrides for write risks in strict mode.

- [ ] **Step 4: Implement `operations` and `schema` commands**

Expected commands:

```bash
noidear-chat operations --module environment-records --risk write
noidear-chat schema environment-records.create --format json
```

`schema` output must include request schema, response envelope, risk, confirmation, permissions, idempotency, and audit requirements.

- [ ] **Step 5: Implement generated API Commands registration**

`registerServiceCommands(program, registry)` must create:

```bash
noidear-chat environment-records create --data @record.json
noidear-chat traceability backward --params '{"productionBatchId":"pb-1"}'
```

Each generated command must call the shared execution pipeline from Task 8 after that task exists. In this task, wire it to a stub that returns a structured `not_implemented` error so command registration is testable.

- [ ] **Step 6: Verify**

Run:

```bash
npm run test -w noidear-chat -- registry-schema.test.ts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add tools/noidear-chat
git commit -m "feat: add operation registry and schema commands"
```

---

### Task 6: Raw API Execution Pipeline

**Files:**
- Create: `tools/noidear-chat/src/internal/risk.ts`
- Create: `tools/noidear-chat/src/internal/audit.ts`
- Create: `tools/noidear-chat/src/cmd/api.ts`
- Modify: `tools/noidear-chat/src/cmd/service-commands.ts`
- Modify: `tools/noidear-chat/src/main.ts`
- Create: `tools/noidear-chat/test/api-execution.test.ts`

- [ ] **Step 1: Add failing execution tests**

```ts
// tools/noidear-chat/test/api-execution.test.ts
import { describe, expect, it } from 'vitest';
import { requireConfirmation } from '../src/internal/risk';

describe('risk confirmation', () => {
  it('requires --yes for transition and destructive operations', () => {
    expect(requireConfirmation({ risk: 'transition', yes: false })).toMatchObject({
      type: 'confirmation_required',
      exitCode: 10,
    });
    expect(requireConfirmation({ risk: 'write', yes: false })).toBeNull();
  });
});
```

- [ ] **Step 2: Implement risk gate**

```ts
// tools/noidear-chat/src/internal/risk.ts
import { CliError, ExitCode } from './errors';
import { OperationRisk } from './operation-registry';

export function requireConfirmation(params: { risk: OperationRisk; yes: boolean }): CliError | null {
  if ((params.risk === 'transition' || params.risk === 'destructive') && !params.yes) {
    return new CliError({
      type: 'confirmation_required',
      message: `${params.risk} operation requires confirmation`,
      hint: 'show the dry-run output to the user, then append --yes after explicit approval',
      exitCode: ExitCode.ConfirmationRequired,
    });
  }
  return null;
}
```

- [ ] **Step 3: Implement raw API command behavior**

`noidear-chat api <METHOD> <path>` must:

1. load profile and token;
2. normalize path;
3. match registry entry by method/path;
4. read `--params` and `--data`;
5. output dry-run preview when `--dry-run` is set;
6. apply confirmation gate;
7. create idempotency key for audited writes when missing;
8. call server audit start for write/transition/destructive operations after Task 7;
9. execute HTTP request;
10. finish server audit;
11. output success envelope to stdout.

- [ ] **Step 4: Wire API Commands to the same pipeline**

Generated service commands must resolve operationId first, then call the same executor as Raw API. Do not duplicate risk, audit, response unwrap, or dry-run logic.

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -w noidear-chat -- api-execution.test.ts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add tools/noidear-chat
git commit -m "feat: add noidear-chat API execution pipeline"
```

---

### Task 7: Server Agent CLI Audit Module

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260522110000_add_agent_cli_actions/migration.sql`
- Create: `server/src/modules/agent-cli-action/agent-cli-action.module.ts`
- Create: `server/src/modules/agent-cli-action/agent-cli-action.controller.ts`
- Create: `server/src/modules/agent-cli-action/agent-cli-action.service.ts`
- Create: `server/src/modules/agent-cli-action/dto/create-agent-cli-action.dto.ts`
- Create: `server/src/modules/agent-cli-action/dto/finish-agent-cli-action.dto.ts`
- Create: `server/src/modules/agent-cli-action/dto/query-agent-cli-action.dto.ts`
- Create: `server/src/modules/agent-cli-action/agent-cli-action.service.spec.ts`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: Run GitNexus impact before server edits**

Run impact analysis for:

```text
AppModule
PrismaService
```

Report direct callers, affected processes, and risk level to the user before editing. If risk is HIGH or CRITICAL, stop and ask before continuing.

- [ ] **Step 2: Add failing service test**

```ts
// server/src/modules/agent-cli-action/agent-cli-action.service.spec.ts
import { AgentCliActionService } from './agent-cli-action.service';

describe('AgentCliActionService', () => {
  it('creates started audit records with user and company context', async () => {
    const prisma = {
      agentCliAction: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1', status: 'started' }),
      },
    } as any;
    const service = new AgentCliActionService(prisma);

    await expect(service.start({
      userId: 'user-1',
      companyId: 'company-1',
      operationId: 'environment-records.create',
      method: 'POST',
      path: '/api/v1/environment-records',
      requestHash: 'sha256:abc',
      risk: 'write',
      reason: '日常环境监测补录',
      sessionId: 'session-1',
      idempotencyKey: 'idem-1',
    })).resolves.toMatchObject({ id: 'audit-1', status: 'started' });

    expect(prisma.agentCliAction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-1',
        companyId: 'company-1',
        status: 'started',
      }),
    }));
  });
});
```

- [ ] **Step 3: Add Prisma model**

Add to `server/src/prisma/schema.prisma`:

```prisma
model AgentCliAction {
  id             String   @id @default(cuid())
  userId         String
  companyId      String
  sessionId      String?
  operationId    String
  method         String
  path           String
  requestHash    String
  risk           String
  reason         String?
  idempotencyKey String?
  status         String
  httpStatus     Int?
  result         Json?
  errorCode      String?
  durationMs     Int?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([companyId, createdAt])
  @@index([userId, createdAt])
  @@index([operationId, createdAt])
  @@unique([companyId, idempotencyKey])
  @@map("agent_cli_actions")
}
```

Add `agentCliActions AgentCliAction[]` to the existing `User` model.

- [ ] **Step 4: Add migration**

Create migration SQL:

```sql
CREATE TABLE "agent_cli_actions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "sessionId" TEXT,
  "operationId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "risk" TEXT NOT NULL,
  "reason" TEXT,
  "idempotencyKey" TEXT,
  "status" TEXT NOT NULL,
  "httpStatus" INTEGER,
  "result" JSONB,
  "errorCode" TEXT,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_cli_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_cli_actions_companyId_createdAt_idx" ON "agent_cli_actions"("companyId", "createdAt");
CREATE INDEX "agent_cli_actions_userId_createdAt_idx" ON "agent_cli_actions"("userId", "createdAt");
CREATE INDEX "agent_cli_actions_operationId_createdAt_idx" ON "agent_cli_actions"("operationId", "createdAt");
CREATE UNIQUE INDEX "agent_cli_actions_companyId_idempotencyKey_key" ON "agent_cli_actions"("companyId", "idempotencyKey");

ALTER TABLE "agent_cli_actions"
  ADD CONSTRAINT "agent_cli_actions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 5: Implement DTOs, service, controller, and module**

Routes:

```text
POST /api/v1/agent-cli-actions
PATCH /api/v1/agent-cli-actions/:id/finish
GET /api/v1/agent-cli-actions
```

Controller rules:

- all routes use `JwtAuthGuard`;
- create and finish use `req.user.id` and `req.user.companyId`;
- list filters by `companyId`;
- request body cannot set another user or company.

Service methods:

```ts
start(input: StartAgentCliActionInput): Promise<AgentCliAction>
finish(id: string, input: FinishAgentCliActionInput): Promise<AgentCliAction>
findAll(input: QueryAgentCliActionInput): Promise<{ list: AgentCliAction[]; total: number; page: number; limit: number }>
```

- [ ] **Step 6: Register the module**

Modify `server/src/app.module.ts`:

```ts
import { AgentCliActionModule } from './modules/agent-cli-action/agent-cli-action.module';

// imports: [
AgentCliActionModule,
// ]
```

- [ ] **Step 7: Verify**

Run:

```bash
npm run prisma:generate
npm run test -w server -- agent-cli-action.service.spec.ts --runInBand
npm run build:server
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations server/src/modules/agent-cli-action server/src/app.module.ts
git commit -m "feat: add agent CLI action audit"
```

---

### Task 8: CLI Audit Wiring And Confirmation Gate

**Files:**
- Modify: `tools/noidear-chat/src/internal/audit.ts`
- Modify: `tools/noidear-chat/src/internal/risk.ts`
- Modify: `tools/noidear-chat/src/cmd/api.ts`
- Modify: `tools/noidear-chat/src/cmd/service-commands.ts`
- Create: `tools/noidear-chat/test/audit-confirmation.test.ts`

- [ ] **Step 1: Add failing audit wiring tests**

```ts
// tools/noidear-chat/test/audit-confirmation.test.ts
import { describe, expect, it, vi } from 'vitest';
import { executeAuditedOperation } from '../src/internal/audit';

describe('executeAuditedOperation', () => {
  it('starts and finishes server audit around write operations', async () => {
    const client = {
      request: vi.fn()
        .mockResolvedValueOnce({ status: 201, data: { id: 'audit-1' } })
        .mockResolvedValueOnce({ status: 201, data: { id: 'record-1' } })
        .mockResolvedValueOnce({ status: 200, data: { id: 'audit-1', status: 'succeeded' } }),
    };

    await expect(executeAuditedOperation({
      client: client as any,
      operation: {
        id: 'environment-records.create',
        method: 'POST',
        path: '/api/v1/environment-records',
        risk: 'write',
        audit: 'required',
      } as any,
      data: { location_id: 'area-1' },
      reason: '日常环境监测补录',
      sessionId: 'session-1',
      idempotencyKey: 'idem-1',
    })).resolves.toMatchObject({ status: 201, data: { id: 'record-1' } });

    expect(client.request).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Implement audit start/finish**

`executeAuditedOperation` must:

- hash request body as `sha256:<hex>`;
- call `POST /api/v1/agent-cli-actions` before write/transition/destructive operation;
- call business operation with idempotency key;
- call `PATCH /api/v1/agent-cli-actions/:id/finish` with success or failure;
- refuse transition/destructive execution when audit start fails;
- return structured failure if audit finish fails after business success, including business result and audit error.

- [ ] **Step 3: Implement confirmation-required stderr contract**

For transition/destructive without `--yes`, return exit code 10 and stderr JSON:

```json
{
  "ok": false,
  "operationId": "product-recalls.submit",
  "error": {
    "type": "confirmation_required",
    "message": "transition operation requires confirmation",
    "hint": "show dry-run output to the user, then append --yes after explicit approval",
    "risk": {
      "level": "transition",
      "action": "product-recalls.submit"
    }
  }
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run test -w noidear-chat -- audit-confirmation.test.ts api-execution.test.ts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add tools/noidear-chat
git commit -m "feat: wire noidear-chat audited writes"
```

---

### Task 9: Shortcut Runner And Checkpoints

**Files:**
- Create: `tools/noidear-chat/src/shortcuts/checkpoint.ts`
- Create: `tools/noidear-chat/src/shortcuts/runner.ts`
- Create: `tools/noidear-chat/src/cmd/shortcuts.ts`
- Modify: `tools/noidear-chat/src/main.ts`
- Create: `tools/noidear-chat/test/shortcut-runner.test.ts`

- [ ] **Step 1: Add failing checkpoint tests**

```ts
// tools/noidear-chat/test/shortcut-runner.test.ts
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCheckpointStore } from '../src/shortcuts/checkpoint';

describe('checkpoint store', () => {
  it('persists explicit shortcut run state by run id', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'noidear-chat-runs-'));
    const store = createCheckpointStore(dir);

    await store.save({
      runId: 'run-1',
      shortcut: '+incoming-inspection',
      server: 'http://localhost:3000',
      userId: 'user-1',
      companyId: 'company-1',
      sessionId: 'session-1',
      idempotencyKey: 'idem-1',
      steps: [{ name: 'create-inspection', status: 'pending' }],
    });

    await expect(store.load('run-1')).resolves.toMatchObject({
      runId: 'run-1',
      shortcut: '+incoming-inspection',
      steps: [{ name: 'create-inspection', status: 'pending' }],
    });
  });
});
```

- [ ] **Step 2: Implement checkpoint schema**

```ts
export interface ShortcutRun {
  runId: string;
  shortcut: string;
  server: string;
  userId: string;
  companyId: string;
  sessionId?: string;
  idempotencyKey: string;
  steps: Array<{
    name: string;
    status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
    operationId?: string;
    outputId?: string;
    error?: unknown;
  }>;
}
```

Rules:

- file path is `~/.noidear-chat/runs/<runId>.json`;
- same run id uses an exclusive lock;
- `--resume <runId>` is required to continue a failed run;
- no implicit reuse of the latest failed run.

- [ ] **Step 3: Implement shortcut runner**

The runner takes:

```ts
runShortcut({
  name,
  steps,
  profile,
  sessionId,
  dryRun,
  yes,
  resumeRunId,
})
```

It must:

- write checkpoint before each step;
- skip succeeded steps on resume;
- stop on first failed step;
- preserve output IDs for later steps;
- use the same audit and risk pipeline as API Commands.

- [ ] **Step 4: Register shortcut command namespace**

`main.ts` must route commands whose first arg starts with `+` into `registerShortcutCommands`.

Supported names:

```text
+environment-record
+incoming-inspection
+batch-recall
+document-approval
```

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -w noidear-chat -- shortcut-runner.test.ts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add tools/noidear-chat
git commit -m "feat: add noidear-chat shortcut runner"
```

---

### Task 10: Frontend-Derived Shortcut Registry And Domain Shortcuts

**Files:**
- Read: `docs/superpowers/specs/2026-05-22-conversational-cli-design.md` (Shortcuts 章节含覆盖矩阵、候选清单、推导规则)
- Create: `tools/noidear-chat/src/shortcuts/frontend-derived-shortcut-registry.json`
- Create: `tools/noidear-chat/src/shortcuts/registry.ts`
- Create: `tools/noidear-chat/src/shortcuts/frontend-inference.ts`
- Create: `tools/noidear-chat/src/shortcuts/source-evidence.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/work-execution.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/document-control.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/production-execution.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/product-rd.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/quality-compliance.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/equipment-site.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/traceability-batch.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/warehouse.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/training.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/analytics.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/admin-governance.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/environment-record.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/incoming-inspection.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/batch-recall.ts`
- Create: `tools/noidear-chat/src/shortcuts/domains/document-approval.ts`
- Create: `tools/noidear-chat/test/shortcuts/shortcut-registry.test.ts`
- Create: `tools/noidear-chat/test/shortcuts/*.test.ts`

- [ ] **Step 1: Add frontend-derived registry coverage test**

```ts
// tools/noidear-chat/test/shortcuts/shortcut-registry.test.ts
import { describe, expect, it } from 'vitest';
import { loadShortcutRegistry } from '../../src/shortcuts/registry';

describe('shortcut registry', () => {
  it('covers every menu domain in the CLI coverage matrix', () => {
    const registry = loadShortcutRegistry();
    const domains = new Set(registry.map((entry) => entry.domain));

    expect(domains).toEqual(new Set([
      'work-execution',
      'document-control',
      'production-execution',
      'product-rd',
      'quality-compliance',
      'equipment-site',
      'traceability-batch',
      'warehouse',
      'training',
      'analytics',
      'admin-governance',
    ]));
  });

  it('stores the safety metadata every shortcut needs', () => {
    const registry = loadShortcutRegistry();

    for (const entry of registry) {
      expect(entry.name).toMatch(/^\\+/);
      expect(entry.operationIds.length).toBeGreaterThan(0);
      expect(['read', 'write', 'transition', 'destructive']).toContain(entry.risk);
      expect(entry.checkpointSteps.length).toBeGreaterThan(0);
      expect(entry.skillName).toMatch(/^noidear-/);
      expect(entry.sourceEvidence.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low', 'needs-review']).toContain(entry.confidence);
    }
  });
});
```

- [ ] **Step 2: Create `frontend-derived-shortcut-registry.json` from frontend evidence**

Each entry must include:

```json
{
  "name": "+environment-record",
  "domain": "equipment-site",
  "description": "创建环境温湿度/压差记录",
  "triggerExamples": ["帮我给 area-1 补一条环境温湿度记录"],
  "startObject": "WorkshopArea",
  "operationIds": ["environment-records.create"],
  "risk": "write",
  "requiresConfirmation": false,
  "idempotency": "client-key-required",
  "checkpointSteps": ["create-environment-record"],
  "dryRunFixture": "environment-record.ok.json",
  "liveE2EFixture": "environment-record.live.json",
  "skillName": "noidear-quality-records",
  "sourceEvidence": [
    {
      "kind": "view",
      "file": "client/src/views/environment-record/EnvironmentRecordList.vue",
      "symbols": ["openCreateDialog", "handleCreate"]
    },
    {
      "kind": "api",
      "file": "client/src/api/environment-record.ts",
      "routes": ["GET /environment-records", "POST /environment-records"]
    },
    {
      "kind": "controller",
      "file": "server/src/modules/environment-record/environment-record.controller.ts",
      "routes": ["GET /environment-records", "POST /environment-records"]
    }
  ],
  "confidence": "high",
  "reviewNotes": []
}
```

The registry must include every shortcut candidate inferred from:

- `client/src/navigation/menu.ts`
- `client/src/router/index.ts`
- `client/src/api/*.ts`
- `client/src/views/**/*.vue`
- `server/src/modules/**/*controller.ts`

Do not wait for manual user input to generate the registry. If a field cannot be inferred, set it to `needs-review` and record the source files that caused the uncertainty.

- [ ] **Step 3: Implement frontend inference helpers**

`frontend-inference.ts` must extract:

- menu groups and menu paths;
- router path to view component mapping;
- view files with action handlers such as `handleCreate`, `handleSubmit`, `handleApprove`, `handleReject`, `handleComplete`, `handleCancel`, `handleArchive`, `handlePublish`, `handleDelete`, `handleExport`, `handleUpload`;
- imports from `client/src/api/*`;
- direct `request.*` calls inside view files;
- API adapter request calls and method/path pairs.

`source-evidence.ts` must normalize evidence records so each shortcut can be reviewed without reading the whole codebase.

- [ ] **Step 4: Add dry-run tests for every implemented shortcut**

Each shortcut test must assert:

- command name;
- operationId sequence;
- method and URL;
- body or params;
- risk;
- confirmation requirement;
- no business HTTP request during `--dry-run`.

Example:

```ts
// tools/noidear-chat/test/shortcuts/environment-record.test.ts
import { describe, expect, it } from 'vitest';
import { buildEnvironmentRecordShortcut } from '../../src/shortcuts/domains/environment-record';

describe('+environment-record', () => {
  it('builds a dry-run request for EnvironmentRecord creation', async () => {
    const shortcut = buildEnvironmentRecordShortcut();
    const preview = await shortcut.dryRun({
      locationId: 'area-1',
      recordType: 'temperature_humidity',
      temperature: 23,
      humidity: 65,
      isWithinSpec: true,
      productionBatchId: 'pb-1',
    });

    expect(preview).toMatchObject({
      operationId: 'environment-records.create',
      request: {
        method: 'POST',
        path: '/api/v1/environment-records',
        body: {
          location_id: 'area-1',
          record_type: 'temperature_humidity',
          production_batch_id: 'pb-1',
        },
      },
      risk: { level: 'write', requiresConfirmation: false },
    });
  });
});
```

- [ ] **Step 5: Implement low-ambiguity one-step record shortcuts**

Implement shortcuts whose business flow is one create/list API and whose DTO can be validated by schema:

```text
+environment-record
+process-record
+metal-detection
+cleaning-record
+visitor-register
+waste-record
+supplier-evaluation
+emergency-drill
+violation-record
+medication-record
+fragile-item-inspection
+line-change-check
+food-safety-culture-record
+packaging-material-usage
```

Each shortcut must map natural flag names to current DTO fields through schema metadata and refuse unknown fields in `--strict`.

- [ ] **Step 6: Implement `+environment-record` explicit mapping**

Maps flags to current DTO fields:

```text
--location-id -> location_id
--record-type -> record_type
--temperature -> temperature
--humidity -> humidity
--pressure-diff -> pressure_diff
--is-within-spec -> is_within_spec
--abnormal-action -> abnormal_action
--production-batch-id -> production_batch_id
```

Required operation: `environment-records.create`.

- [ ] **Step 7: Implement traceability and batch shortcuts**

Required behavior:

- `+incoming-inspection` accepts `--material-batch-id`, does not accept free-text material lot, creates incoming inspection, and records inspection ID in checkpoint.
- `+traceability-query` calls the current traceability query/export/snapshot APIs and never builds a second trace chain inside CLI.
- `+production-batch-create` creates and confirms production batches through existing batch-trace APIs.
- `+batch-material-usage` maintains `BatchMaterialUsage` and refuses copied batch text as a substitute for IDs.
- `+material-balance-check` calls current material balance APIs.

- [ ] **Step 8: Implement quality and compliance workflow shortcuts**

Required behavior:

- `+ccp-record` creates CCP records and queries missing records by batch.
- `+nonconformance-capa` creates nonconformance, disposes it, and can create or link CAPA when the user confirms.
- `+capa-closeout` creates corrective actions, adds verification, and closes.
- `+customer-complaint-trace` creates complaint, runs traceability, and resolves complaint.
- `+product-recall` runs traceability, creates recall, and gates submit/notify behind `--yes`.
- `+change-event-closeout` creates change event, fills linked form tasks, adds verification, and updates status.

- [ ] **Step 9: Implement document, approval, warehouse, training, and admin workflow shortcuts**

Required behavior:

- document shortcuts use `Document`, `DocumentVersion`, `BusinessDocumentLink`, `ApprovalInstance`, and `ApprovalTask` terminology.
- warehouse shortcuts respect `MaterialBatch` creation through inbound flow and current FIFO/lock rules.
- training shortcuts cover plan submit, project run, question import, exam submit, and archive download.
- admin shortcuts cover user provisioning, role-permission sync, permission grants, notification reads, search indexing, and audit search/export.
- destructive or transition operations still get inferred from frontend action names, but inference does not block generation. Missing details become `reviewNotes`.

- [ ] **Step 10: Generate final review report for the user**

Generate:

```text
tools/noidear-chat/src/shortcuts/frontend-derived-shortcut-registry.json
tools/noidear-chat/reports/frontend-derived-shortcut-review.md
```

The review report groups entries by:

- `confidence: high`
- `confidence: medium`
- `confidence: low`
- `confidence: needs-review`

The user only reviews this report after the full draft exists.

- [ ] **Step 11: Verify**

Run:

```bash
npm run test -w noidear-chat -- shortcuts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 12: Commit**

```bash
git add tools/noidear-chat
git commit -m "feat: add frontend-derived noidear-chat shortcut registry"
```

---

### Task 11: Skills, Update Command, And Documentation

**Files:**
- Create: `tools/noidear-chat/src/skills/noidear-shared/SKILL.md`
- Create: `tools/noidear-chat/src/skills/noidear-quality-records/SKILL.md`
- Create: `tools/noidear-chat/src/skills/noidear-warehouse/SKILL.md`
- Create: `tools/noidear-chat/src/skills/noidear-traceability/SKILL.md`
- Create: `tools/noidear-chat/src/skills/noidear-document-control/SKILL.md`
- Modify: `tools/noidear-chat/src/cmd/update.ts`
- Modify: `README.md`
- Modify: `docs/AGENT_GUIDE.md`
- Modify: `llms.txt`
- Create: `tools/noidear-chat/test/skills-update.test.ts`

- [ ] **Step 1: Add failing notice/update tests**

```ts
// tools/noidear-chat/test/skills-update.test.ts
import { describe, expect, it } from 'vitest';
import { buildRegistryNotice, buildSkillsNotice } from '../src/internal/notices';

describe('maintenance notices', () => {
  it('returns skills and registry drift notices as data', () => {
    expect(buildSkillsNotice({ current: '0.1.0', installed: '0.0.9' })).toMatchObject({
      message: expect.stringContaining('out of sync'),
      command: 'noidear-chat update --skills',
    });
    expect(buildRegistryNotice({ current: '2026-05-22', server: '2026-05-23' })).toMatchObject({
      command: 'noidear-chat update --from-file openapi.json',
    });
  });
});
```

- [ ] **Step 2: Write `noidear-shared` skill**

Must include:

- `profile add`, `auth login`, `auth status`;
- “调用 API 前先 schema”;
- stdout/stderr contract;
- exit code table;
- exit code `10` confirmation workflow;
- `_notice` handling;
- high-risk commands use `--dry-run` before live execution;
- never use old MCP.

- [ ] **Step 3: Write domain skills**

Domain skill requirements:

- quality records: `+environment-record` and validation around record DTO fields;
- warehouse: `MaterialBatch`, inbound/batch boundaries, no free-text lot facts;
- traceability: `MaterialBatch` -> `BatchMaterialUsage` -> `ProductionBatch`, no CLI-built second trace chain;
- document control: `ApprovalInstance` / `ApprovalTask`, no old approval compatibility;
- every skill lists preferred shortcuts, API Commands, and raw API fallback rules.

- [ ] **Step 4: Implement `update`**

`noidear-chat update` supports:

```bash
noidear-chat update --from-server
noidear-chat update --from-file openapi.json
noidear-chat update --skills
```

Rules:

- `--from-server` reads `/api/docs-json`;
- `--from-file` reads a local OpenAPI export;
- `--skills` syncs checked-in skills into the configured skills install directory when that directory is explicitly provided by `NOIDEAR_CHAT_SKILLS_DIR`;
- no silent writes outside configured directories.

- [ ] **Step 5: Update docs**

README, AGENT guide, and llms index must say:

- `tools/noidear-chat` is the Agent-native CLI workspace;
- old `tools/noidear-mcp` is retired and must not be restored;
- common commands include `npm run build:chat` and `npm run test:chat`;
- `verify:full` includes chat once implemented.

- [ ] **Step 6: Verify**

Run:

```bash
npm run test -w noidear-chat -- skills-update.test.ts
npm run build -w noidear-chat
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add tools/noidear-chat README.md docs/AGENT_GUIDE.md llms.txt
git commit -m "feat: add noidear-chat skills and update flow"
```

---

### Task 12: E2E, Verification, And Change Detection

**Files:**
- Create: `tools/noidear-chat/test/e2e/dryrun/environment-record.e2e.test.ts`
- Create: `tools/noidear-chat/test/e2e/dryrun/incoming-inspection.e2e.test.ts`
- Create: `tools/noidear-chat/test/e2e/dryrun/batch-recall.e2e.test.ts`
- Create: `tools/noidear-chat/test/e2e/dryrun/document-approval.e2e.test.ts`
- Create: `tools/noidear-chat/test/e2e/live/environment-record.live.test.ts`
- Create: `tools/noidear-chat/test/e2e/live/incoming-inspection.live.test.ts`
- Create: `tools/noidear-chat/test/e2e/live/batch-recall.live.test.ts`
- Create: `tools/noidear-chat/test/e2e/live/document-approval.live.test.ts`

- [ ] **Step 1: Add dry-run E2E**

Each dry-run E2E must:

- run the built CLI with `--dry-run`;
- pass only fixture IDs;
- assert no real business endpoint is called;
- assert stdout JSON has `dryRun: true`, method, URL, body/params, risk, and audit preview.

Example command:

```bash
npm run start -w noidear-chat -- +environment-record --dry-run --location-id area-1 --record-type temperature_humidity --temperature 23 --humidity 65 --is-within-spec true --production-batch-id pb-1
```

- [ ] **Step 2: Add live E2E**

Each live E2E must:

- skip when `NOIDEAR_CHAT_LIVE_E2E=1` is not set;
- use `NOIDEAR_CHAT_SERVER` and `NOIDEAR_CHAT_TOKEN`;
- create or reference controlled test fixtures;
- clean up created data when the current API supports cleanup;
- otherwise assert idempotent repeated execution with the same idempotency key.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run typecheck:types
npm run build:server
npm run build:client
npm run build:chat
npm run test:chat
npm run verify:full
```

Expected: all commands exit 0.

- [ ] **Step 4: Run GitNexus change detection before final commit**

Run:

```text
gitnexus_detect_changes(scope: "all", repo: "noidear")
```

Expected: changed symbols and processes match this plan: noidear-chat CLI, Agent CLI audit module, app module registration, Prisma audit model, docs.

- [ ] **Step 5: Commit final verification artifacts**

```bash
git add tools/noidear-chat server/src README.md docs/AGENT_GUIDE.md llms.txt package.json package-lock.json
git commit -m "test: verify noidear-chat end-to-end"
```

---

## Self-Review Checklist

- [ ] The design spec requirement “no old MCP” maps to every task and no task recreates `tools/noidear-mcp`.
- [ ] The three-layer command system maps to Tasks 5, 6, 9, and 10.
- [ ] `profile`, `auth status`, and `auth check` map to Task 3.
- [ ] stdout/stderr, structured errors, `_notice`, and exit code `10` map to Tasks 2, 8, and 11.
- [ ] Server-side audit maps to Task 7 and CLI audit wiring maps to Task 8.
- [ ] Shortcut dry-run, checkpoint, resume, and E2E map to Tasks 9, 10, and 12.
- [ ] Food-safety traceability boundaries map to Tasks 10 and 11.
- [ ] Final verification includes repository builds, CLI tests, and GitNexus change detection.
