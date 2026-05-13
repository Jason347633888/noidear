# API Contract Gap Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the API contract gap by making the system-map check trustworthy, deleting decided dead product surfaces, converging approval to unified approval, slimming document control, and fixing the remaining real routes.

**Architecture:** Treat the system map as the contract gate: first make it distinguish real gaps from deleted scopes, then delete obsolete surfaces and schema, then repair retained capabilities. Approval decisions converge on `ApprovalDefinition` / `ApprovalInstance` / `ApprovalTask` / `ApprovalAction`; business modules only submit approval requests and receive unified approval callbacks. Document control keeps file lifecycle, reference health, record-form landing, and internal default numbering while removing governance dashboards and user-maintained numbering rules.

**Tech Stack:** NestJS, Prisma, Vue 3, Vite, Element Plus, Vitest, Jest, Playwright, Python system-map script, GitNexus.

---

## Execution Rules

- Do implementation in an isolated worktree, not the root checkout.
- Keep commits small: one task or one coherent phase per commit.
- Do not preserve historical data compatibility; there is no historical business data.
- Still generate Prisma migration files for schema deletion.
- Do not delete unrelated dirty files from the root checkout.
- Use `rg` for every reference scan.

Worktree setup:

```bash
git fetch origin master
git worktree add /Users/jiashenglin/Desktop/project/noidear-api-contract-cleanup -b codex/api-contract-cleanup origin/master
cd /Users/jiashenglin/Desktop/project/noidear-api-contract-cleanup
git branch --show-current
```

Expected branch output:

```text
codex/api-contract-cleanup
```

## File Structure

### Contract Tooling

- Create `tools/generate-system-map.py`: recursive API scan, direct request scan, route parser, deleted-scope categories, counters, and HTML output.
- Create `tools/system-map-deleted-scopes.json`: explicit deleted modules, paths, frontend dirs, backend dirs, Prisma models, seed markers.
- Create `tools/__tests__/fixtures/system-map/` only if the repo already has a tools test harness; otherwise validate by running the real script and checking counters in stdout/HTML.

### Frontend Deletions

- Modify `client/src/router/index.ts`: remove deleted routes.
- Modify `client/src/navigation/menu.ts`: remove deleted menu entries.
- Delete `client/src/api/workflow.ts`, `client/src/api/sso.ts`, `client/src/api/change-approval.ts`, `client/src/api/asset-loan-record.ts`, `client/src/api/management-review.ts`, `client/src/api/monitoring.ts`, `client/src/api/document-issuance.ts`, and `client/src/api/internal-audit/**`.
- Delete deleted views under `client/src/views/workflow/`, `client/src/views/login/SsoLogin.vue`, `client/src/views/asset-loan-record/`, `client/src/views/internal-audit/`, `client/src/views/management-review/`, `client/src/views/monitoring/`, `client/src/views/health/HealthPage.vue`, `client/src/views/dashboard/ManagementDashboard.vue`, and document-control slimmed views listed below.
- Delete `client/src/components/monitoring/**`, `client/src/components/document/EvidenceChainGraph.vue`, `client/src/components/document/ReferenceBlock.vue`, `client/src/components/process/DeptSignoffPanel.vue`, `client/src/components/fields/ApprovalStepField.vue`, and `client/src/components/template/ExcelUpload.vue`.

### Backend Deletions

- Modify `server/src/app.module.ts`: remove deleted modules from imports and `imports`.
- Delete backend modules: `approval`, `workflow`, `change-approval`, `asset-loan-record`, `internal-audit`, `management-review`, `document-issuance`, and user-facing `monitoring` if no internal non-UI dependency remains.
- Modify `server/src/modules/auth/auth.module.ts`: remove SSO controller/service wiring.
- Delete `server/src/modules/auth/sso.controller.ts` and `server/src/modules/auth/sso.service.ts`.
- Modify `server/src/modules/document/document.module.ts`, `document.controller.ts`, `document.service.ts`, `file-preview.service.ts`, and related services to remove document-control governance surfaces while keeping reference health and lifecycle.
- Modify `server/src/modules/process/**` to remove `ProcessStepApproval` and keep unified approval callbacks.
- Modify `server/src/modules/export/**` and `server/src/modules/statistics/**` to remove document export, old approval export, management dashboard, and document statistics surfaces required by the spec.

### Prisma and Seeds

- Modify `server/src/prisma/schema.prisma`: remove deleted business models and add internal `DocumentNumberCounter` for default numbering sequence.
- Create `server/src/prisma/migrations/<timestamp>_api_contract_cleanup/migration.sql`.
- Modify `server/src/prisma/seed.ts`, `server/src/prisma/seed-e2e.ts`, `server/src/prisma/seed-demo.ts`, `server/src/prisma/seeds/demo/seed-document-demo.ts` if present.
- Remove deleted approval callback keys and deleted module seed records.

### Retained API Repairs

- Create `client/src/api/auth.ts`.
- Modify `client/src/views/Password.vue`.
- Modify `client/src/api/record.ts`, `server/src/modules/record/record.controller.ts`, `server/src/modules/record/record.service.ts`.
- Modify `client/src/api/record-template.ts`, `server/src/modules/record-template/record-template.controller.ts`, `server/src/modules/record-template/record-template.service.ts`.
- Modify `client/src/views/templates/TemplateList.vue`, `TemplateEdit.vue`, `ToleranceConfig.vue`, and their tests.
- Modify `client/src/api/training.ts` and training question views.
- Modify `client/src/api/warehouse.ts`, `client/src/views/warehouse/SupplierList.vue`, `MaterialBalance.vue`.
- Modify `client/src/api/permission.ts`, `client/src/components/permission/GrantPermissionDialog.vue`, `client/src/views/permission/UserPermissions.vue`, `UserPermissionsManager.vue`.

### Tests and E2E

- Delete or rewrite every E2E spec that references deleted surfaces, including monitoring, alert, internal-audit, management-review, workflow, SSO, asset-loan, change-approval, and health-to-monitoring coverage.
- Modify `client/src/__tests__/approval-api.spec.ts`.
- Delete tests for removed views and modules.
- Add focused backend tests for Record PDF, template tolerance, unified callback key coverage, and deleted-scope residue.

---

## Task 1: Preflight Evidence Snapshot

**Files:**
- Read: `docs/superpowers/specs/2026-05-13-api-contract-gap-repair-design.md`
- Read: `docs/AGENT_GUIDE.md`
- Read: `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- No code changes.

- [ ] **Step 1: Confirm worktree isolation**

Run:

```bash
pwd
git branch --show-current
git status --short
```

Expected:

```text
/Users/jiashenglin/Desktop/project/noidear-api-contract-cleanup
codex/api-contract-cleanup
```

`git status --short` may show no output at this point.

- [ ] **Step 2: Confirm unified approval callback mechanism**

Run:

```bash
rg -n "class ApprovalCallbackRegistry|register\\(|invoke\\(|onApproved|onRejected" server/src/modules/unified-approval server/src/modules server/src/prisma/seed*.ts
```

Expected: hits in `approval-callback.registry.ts`, `approval-engine.service.ts`, business modules, and seed definitions.

- [ ] **Step 3: Confirm `templates` alias**

Run:

```bash
rg -n "@Controller\\('templates'\\)|@Controller\\('record-templates'\\)" server/src/modules/record-template
```

Expected:

```text
server/src/modules/record-template/template-alias.controller.ts:...
server/src/modules/record-template/record-template.controller.ts:...
```

- [ ] **Step 4: Confirm document health dependency boundary**

Run:

```bash
rg -n "import.*(DocumentHealthService|DocumentControlWorkbenchService)|DocumentHealthService|DocumentControlWorkbenchService" server/src/modules/document/services/document-reference-health.service.ts
```

Expected: no output. If `DocumentReferenceHealthService` imports or calls deleted health/workbench services, first move only the reference-health logic into `DocumentReferenceHealthService` or a small helper, then delete document-control health/workbench services.

- [ ] **Step 5: Capture deleted-scope residue baseline**

Run:

```bash
rg -n "workflow|workflow-task|monitoring|management-dashboard|sso|asset-loan|internal-audit|management-review|change-approval|document-issuance|NumberRule|DocumentHealthService|DocumentControlWorkbenchService|ApprovalStepField|DeptSignoffPanel" client/src client/e2e server/src server/src/prisma
```

Expected: many hits. Save the output into the task notes or PR description as the baseline.

- [ ] **Step 6: Commit is not needed**

No files changed in this task.

---

## Task 2: Make System Map a Contract Gate

**Files:**
- Create: `tools/generate-system-map.py`
- Create: `tools/system-map-deleted-scopes.json`
- Modify: `docs/system-map.html` only if the script regenerates it and the repo expects it committed.

**Errata from root-checkout verification:**
- The controller scan must never skip files with a broad substring check such as `"spec" in path.name`. That incorrectly skips valid controllers such as `incoming-inspection.controller.ts` and `fragile-item-inspection.controller.ts`. Only skip `*.spec.ts`, `*.test.ts`, and explicit generated/private folders.
- `deleted_scope` classification must run before `matched`. If a frontend path or file is in deleted scope, the call must be reported as `deleted_scope_frontend_residue` even when a backend route still exists. Otherwise deleted modules such as `workflow`, `monitoring`, `asset-loan-record`, `internal-audit`, and `management-review` appear as false green `matched` calls.
- After creating the script, run the regression snippet in Step 10 before trusting `docs/system-map.html`.

- [ ] **Step 1: Add deleted-scope configuration**

Create `tools/system-map-deleted-scopes.json`:

```json
{
  "frontendPathPrefixes": [
    "/workflow",
    "/workflow-templates",
    "/monitoring",
    "/management-dashboard",
    "/statistics/dashboard",
    "/auth/sso",
    "/asset-loan-records",
    "/management-reviews",
    "/audit/plans",
    "/audit/rectifications",
    "/audit/reports",
    "/change-approvals",
    "/document-issuances",
    "/documents/number-rules",
    "/documents/export",
    "/export/documents"
  ],
  "frontendFiles": [
    "client/src/api/workflow.ts",
    "client/src/api/monitoring.ts",
    "client/src/api/sso.ts",
    "client/src/api/asset-loan-record.ts",
    "client/src/api/change-approval.ts",
    "client/src/api/management-review.ts",
    "client/src/api/document-issuance.ts",
    "client/src/api/internal-audit"
  ],
  "backendModules": [
    "approval",
    "workflow",
    "monitoring",
    "asset-loan-record",
    "change-approval",
    "internal-audit",
    "management-review",
    "document-issuance"
  ],
  "prismaModels": [
    "Approval",
    "WorkflowTemplate",
    "WorkflowInstance",
    "WorkflowTask",
    "TaskDelegationLog",
    "ChangeApproval",
    "ProcessStepApproval",
    "AssetLoanRecord",
    "NumberRule",
    "DocumentIssuance",
    "DocumentReadConfirmation",
    "DocumentReadRequirement",
    "DocumentTrainingNeed",
    "DocumentCoverageReview",
    "DocumentImpactReview",
    "DocumentImpactItem",
    "FulltextIndex",
    "DocumentRecommendation",
    "DocumentViewLog",
    "SystemMetric",
    "AlertRule",
    "AlertHistory"
  ],
  "allowedTerms": [
    "monitoring_method",
    "monitoring_frequency"
  ]
}
```

- [ ] **Step 2: Create the complete system-map script**

Current `origin/master` has no committed `tools/generate-system-map.py`. Create it from scratch with this complete baseline; later steps in this task are verification points for the same file, not patches to an existing script.

```python
#!/usr/bin/env python3
"""
Generate a frontend/backend API contract map from committed source code.

Usage:
  python3 tools/generate-system-map.py

Outputs:
  docs/system-map.html
  stdout status counters
"""

from __future__ import annotations

import html
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parent.parent
CLIENT_API_DIR = PROJECT_ROOT / "client/src/api"
CLIENT_SRC_DIR = PROJECT_ROOT / "client/src"
SERVER_MODULES_DIR = PROJECT_ROOT / "server/src/modules"
DELETED_SCOPE_FILE = PROJECT_ROOT / "tools/system-map-deleted-scopes.json"
OUTPUT_FILE = PROJECT_ROOT / "docs/system-map.html"

HTTP_METHODS = ("get", "post", "put", "patch", "delete", "head", "options")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_deleted_scopes() -> dict[str, Any]:
    if not DELETED_SCOPE_FILE.exists():
        return {}
    return json.loads(read_text(DELETED_SCOPE_FILE))


def normalize_url(url: str) -> str:
    url = url.split("?")[0]
    url = re.sub(r"\$\{[^}]+\}", ":id", url)
    url = re.sub(r"/[0-9]+(?=/|$)", "/:id", url)
    url = re.sub(r"/api/v1", "", url)
    if not url.startswith("/"):
        url = "/" + url
    return re.sub(r"/+", "/", url).rstrip("/") or "/"


def normalize_route(route: str) -> str:
    normalized = normalize_url(route)
    return re.sub(r":[^/]+", ":id", normalized)


def should_skip_frontend_file(path: Path) -> bool:
    rel = path.relative_to(PROJECT_ROOT).as_posix()
    return (
        "__tests__" in rel
        or path.name == "request.ts"
        or path.name.endswith(".spec.ts")
        or path.name.endswith(".test.ts")
    )


def parse_frontend_request_calls(path: Path) -> list[dict[str, str]]:
    text = read_text(path)
    calls: list[dict[str, str]] = []
    pattern = re.compile(
        r"\brequest\.(get|post|put|patch|delete|head|options)\s*(?:<[^>]+>)?\s*\(\s*([`'\"])(.*?)\2",
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(text):
        method = match.group(1).upper()
        url = match.group(3).strip()
        if not url.startswith("/") and not url.startswith("${"):
            continue
        before = text[: match.start()]
        fn_match = re.search(r"(?:async\s+)?([A-Za-z_][\w]*)\s*(?:=|\([^)]*\)\s*=>|\([^)]*\)\s*\{)?[^{}]*$", before[-500:])
        calls.append({
            "method": method,
            "url": url,
            "function": fn_match.group(1) if fn_match else "unknown",
            "file": path.relative_to(PROJECT_ROOT).as_posix(),
        })
    return calls


def load_all_frontend_apis() -> dict[str, list[dict[str, str]]]:
    modules: dict[str, list[dict[str, str]]] = {}
    for path in sorted(CLIENT_API_DIR.rglob("*.ts")):
        if should_skip_frontend_file(path):
            continue
        calls = parse_frontend_request_calls(path)
        if calls:
            modules[path.relative_to(CLIENT_API_DIR).with_suffix("").as_posix()] = calls
    return modules


def load_direct_client_requests() -> dict[str, list[dict[str, str]]]:
    modules: dict[str, list[dict[str, str]]] = {}
    for path in sorted(CLIENT_SRC_DIR.rglob("*")):
        if path.suffix not in {".ts", ".vue"}:
            continue
        rel = path.relative_to(PROJECT_ROOT).as_posix()
        if rel.startswith("client/src/api/") or should_skip_frontend_file(path):
            continue
        calls = parse_frontend_request_calls(path)
        if calls:
            modules[rel] = calls
    return modules


def parse_controller_file(path: Path) -> dict[str, Any]:
    text = read_text(path)
    ctrl_match = re.search(r"@Controller\s*\(\s*(?:(['\"`])([^'\"`]*)\1)?\s*\)", text, re.MULTILINE)
    prefix = ctrl_match.group(2) if ctrl_match and ctrl_match.group(2) is not None else ""
    route_decorator_pattern = re.compile(
        r"@(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*(?:(['\"`])([^'\"`]*)\2)?\s*\)",
        re.MULTILINE,
    )
    matches = list(route_decorator_pattern.finditer(text))
    routes: list[dict[str, str]] = []
    for index, match in enumerate(matches):
        method = match.group(1).upper()
        sub_path = (match.group(3) or "").strip()
        segment_end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        segment = text[match.end():segment_end]
        handler_match = re.search(r"(?:async\s+)?([A-Za-z_]\w*)\s*\(", segment)
        if not handler_match:
            continue
        route = ("/" + prefix + "/" + sub_path).replace("//", "/").rstrip("/") or "/"
        routes.append({
            "method": method,
            "path": route,
            "handler": handler_match.group(1),
            "file": path.relative_to(PROJECT_ROOT).as_posix(),
        })
    return {"prefix": prefix, "routes": routes, "file": path.relative_to(PROJECT_ROOT).as_posix()}


def load_all_backend_controllers() -> dict[str, list[dict[str, Any]]]:
    modules: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for path in sorted(SERVER_MODULES_DIR.rglob("*.controller.ts")):
        if path.name.endswith(".spec.ts") or path.name.endswith(".test.ts") or "__" in path.name:
            continue
        info = parse_controller_file(path)
        if info["routes"]:
            module_name = path.relative_to(SERVER_MODULES_DIR).parts[0]
            modules[module_name].append(info)
    return dict(modules)


def find_matching_backend_route(url: str, method: str, controllers: dict[str, list[dict[str, Any]]]) -> dict[str, str] | None:
    call_route = normalize_route(url)
    for module_name, controller_infos in controllers.items():
        for controller in controller_infos:
            for route in controller["routes"]:
                if route["method"] == method and normalize_route(route["path"]) == call_route:
                    return {"module": module_name, "handler": route["handler"], "file": route["file"]}
    return None


def is_deleted_frontend_call(url: str, deleted: dict[str, Any]) -> bool:
    normalized = normalize_url(url)
    return any(normalized.startswith(prefix) for prefix in deleted.get("frontendPathPrefixes", []))


def classify_call(url: str, method: str, match: dict[str, str] | None, source_kind: str, deleted: dict[str, Any]) -> str:
    if is_deleted_frontend_call(url, deleted):
        return "deleted_scope_frontend_residue"
    if match:
        return "matched"
    return "api_adapter_missing" if source_kind == "api" else "direct_client_missing"


def annotate_calls(calls: list[dict[str, str]], source_kind: str, controllers: dict[str, list[dict[str, Any]]], deleted: dict[str, Any]) -> list[dict[str, Any]]:
    annotated: list[dict[str, Any]] = []
    for call in calls:
        match = find_matching_backend_route(call["url"], call["method"], controllers)
        status = classify_call(call["url"], call["method"], match, source_kind, deleted)
        annotated.append({**call, "source_kind": source_kind, "status": status, "matched": status == "matched", "match_info": match})
    return annotated


def flatten_backend_routes(controllers: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [route for controller in controllers for route in controller["routes"]]


def build_module_data(
    api_calls: dict[str, list[dict[str, str]]],
    direct_calls: dict[str, list[dict[str, str]]],
    controllers: dict[str, list[dict[str, Any]]],
    deleted: dict[str, Any],
) -> list[dict[str, Any]]:
    names = sorted(set(api_calls) | set(direct_calls) | set(controllers))
    modules: list[dict[str, Any]] = []
    for name in names:
        be_routes = flatten_backend_routes(controllers.get(name, []))
        annotated = (
            annotate_calls(api_calls.get(name, []), "api", controllers, deleted)
            + annotate_calls(direct_calls.get(name, []), "direct", controllers, deleted)
        )
        deleted_backend = name in deleted.get("backendModules", []) and bool(be_routes)
        modules.append({
            "name": name,
            "fe_calls": annotated,
            "be_routes": be_routes,
            "has_issues": any(call["status"] != "matched" for call in annotated) or deleted_backend,
            "fe_only": bool(annotated) and not be_routes,
            "be_only": not annotated and bool(be_routes),
            "deleted_scope_backend_residue": deleted_backend,
        })
    return modules


def count_statuses(modules: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for module in modules:
        for call in module["fe_calls"]:
            counts[call["status"]] += 1
        if module["be_only"]:
            counts["backend_only"] += len(module["be_routes"])
        if module["deleted_scope_backend_residue"]:
            counts["deleted_scope_backend_residue"] += len(module["be_routes"])
    for key in ["matched", "api_adapter_missing", "direct_client_missing", "deleted_scope_frontend_residue", "deleted_scope_backend_residue", "backend_only"]:
        counts.setdefault(key, 0)
    return dict(counts)


def render_html(modules: list[dict[str, Any]], counters: dict[str, int]) -> str:
    rows = []
    for module in modules:
        for call in module["fe_calls"]:
            rows.append(
                "<tr>"
                f"<td>{html.escape(module['name'])}</td>"
                f"<td>{html.escape(call['source_kind'])}</td>"
                f"<td>{html.escape(call['method'])}</td>"
                f"<td><code>{html.escape(call['url'])}</code></td>"
                f"<td>{html.escape(call['status'])}</td>"
                f"<td>{html.escape(call['file'])}</td>"
                "</tr>"
            )
        if module["deleted_scope_backend_residue"]:
            rows.append(
                "<tr>"
                f"<td>{html.escape(module['name'])}</td><td>backend</td><td>*</td>"
                "<td><code>deleted backend module still registered</code></td>"
                "<td>deleted_scope_backend_residue</td><td></td>"
                "</tr>"
            )
    return f"""<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>noidear system map</title></head>
<body>
<h1>noidear system map</h1>
<pre id="counters">{html.escape(json.dumps(counters, ensure_ascii=False, indent=2))}</pre>
<table border="1" cellspacing="0" cellpadding="4">
<thead><tr><th>module</th><th>source</th><th>method</th><th>path</th><th>status</th><th>file</th></tr></thead>
<tbody>{''.join(rows)}</tbody>
</table>
</body>
</html>"""


def main() -> None:
    deleted = load_deleted_scopes()
    api_calls = load_all_frontend_apis()
    direct_calls = load_direct_client_requests()
    controllers = load_all_backend_controllers()
    modules = build_module_data(api_calls, direct_calls, controllers, deleted)
    counters = count_statuses(modules)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(render_html(modules, counters), encoding="utf-8")
    for key, value in counters.items():
        print(f"{key}: {value}")
    print(f"wrote: {OUTPUT_FILE.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Verify recursive API file scanning**

Ensure `load_all_frontend_apis()` in the new script uses recursive scanning:

```python
for f in sorted(CLIENT_API_DIR.rglob("*.ts")):
    rel = f.relative_to(PROJECT_ROOT).as_posix()
    if "__tests__" in rel or f.name == "request.ts" or f.name.endswith(".spec.ts"):
        continue
    name = f.relative_to(CLIENT_API_DIR).with_suffix("").as_posix()
    calls = parse_frontend_request_calls(f)
    if calls:
        modules[name] = calls
```

- [ ] **Step 4: Verify direct client request scan**

Ensure the new script includes direct `request.*(...)` scanning outside `client/src/api/`:

```python
CLIENT_SRC_DIR = PROJECT_ROOT / "client/src"

def load_direct_client_requests() -> dict:
    modules = {}
    for f in sorted(CLIENT_SRC_DIR.rglob("*")):
        if f.suffix not in {".ts", ".vue"}:
            continue
        rel = f.relative_to(PROJECT_ROOT).as_posix()
        if rel.startswith("client/src/api/") or "__tests__" in rel or f.name.endswith(".spec.ts"):
            continue
        calls = parse_frontend_request_calls(f)
        if calls:
            modules[rel] = calls
    return modules
```

- [ ] **Step 5: Verify backend controller parsing avoids cross-file backtracking**

Confirm the controller parser supports `@Controller()`, then parses route decorators by iterating route matches and inspecting only the text slice until the next route decorator. Do not use a `DOTALL` negative-lookahead pattern over the whole file.

```python
for path in sorted(SERVER_MODULES_DIR.rglob("*.controller.ts")):
    if path.name.endswith(".spec.ts") or path.name.endswith(".test.ts") or "__" in path.name:
        continue

ctrl_match = re.search(r"@Controller\s*\(\s*(?:(['\"`])([^'\"`]*)\1)?\s*\)", text, re.MULTILINE)
prefix = ctrl_match.group(2) if ctrl_match and ctrl_match.group(2) is not None else ""

route_decorator_pattern = re.compile(
    r"@(Get|Post|Put|Patch|Delete|Head|Options)\s*\(\s*(?:(['\"`])([^'\"`]*)\2)?\s*\)",
    re.MULTILINE,
)
route_matches = list(route_decorator_pattern.finditer(text))
for index, m in enumerate(route_matches):
    http_method = m.group(1).upper()
    sub_path = (m.group(3) or "").strip()
    segment_end = route_matches[index + 1].start() if index + 1 < len(route_matches) else len(text)
    segment = text[m.end():segment_end]
    handler_match = re.search(r"(?:async\s+)?(\w+)\s*\(", segment)
    if not handler_match:
        continue
    handler = handler_match.group(1)
```

Regression requirement: `incoming-inspection.controller.ts` and `fragile-item-inspection.controller.ts` must appear in backend controller output. If either module has zero parsed routes, the scanner is still wrong.

- [ ] **Step 6: Verify TypeScript indexed-access strings are ignored**

Inside `parse_frontend_request_calls`, skip URL candidates that do not start with `/` or a template expression that begins with `/`:

```python
if not url_template.startswith("/") and not url_template.startswith("${"):
    continue
```

This prevents `HealthCheckResponse['services']` from becoming `GET services`.

- [ ] **Step 7: Verify deleted-scope classification**

Confirm the new script includes these helper functions:

```python
def load_deleted_scopes() -> dict:
    path = PROJECT_ROOT / "tools/system-map-deleted-scopes.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))

def is_deleted_frontend_call(url: str, deleted: dict) -> bool:
    normalized = normalize_url(url)
    return any(normalized.startswith(prefix) for prefix in deleted.get("frontendPathPrefixes", []))

def classify_call(url: str, method: str, match, source_kind: str, deleted: dict) -> str:
    if is_deleted_frontend_call(url, deleted):
        return "deleted_scope_frontend_residue"
    if match:
        return "matched"
    return "api_adapter_missing" if source_kind == "api" else "direct_client_missing"
```

Classification rule: deleted scope wins over route matching. A deleted-scope call with a valid backend route is still `deleted_scope_frontend_residue`, not `matched`.

- [ ] **Step 8: Verify classification is wired into the main module builder**

Confirm `build_module_data(...)` gives every frontend call a `status`. This is the point where `classify_call(...)` must be called.

```python
def annotate_calls(calls: list, source_kind: str, backend_controllers: dict, deleted: dict) -> list:
    annotated = []
    for call in calls:
        match = find_matching_backend_route(call["url"], call["method"], backend_controllers)
        status = classify_call(call["url"], call["method"], match, source_kind, deleted)
        annotated.append({
            **call,
            "source_kind": source_kind,
            "status": status,
            "matched": status == "matched",
            "match_info": match,
        })
    return annotated
```

Update the module builder to merge API adapter calls and direct client calls:

```python
api_calls = annotate_calls(frontend_apis.get(name, []), "api", backend_controllers, deleted)
direct_calls = annotate_calls(direct_requests.get(name, []), "direct", backend_controllers, deleted)
annotated_calls = api_calls + direct_calls
has_issues = any(c["status"] != "matched" for c in annotated_calls)
```

Confirm `main()` loads `deleted = load_deleted_scopes()` and `direct_requests = load_direct_client_requests()`, then passes both into `build_module_data(...)`.

- [ ] **Step 9: Verify counters for every status**

Confirm status counters are emitted to stdout and the HTML data payload:

```python
def count_statuses(modules: list) -> dict:
    counts = defaultdict(int)
    for module in modules:
        for call in module["fe_calls"]:
            counts[call["status"]] += 1
        if module.get("be_only"):
            counts["backend_only"] += len(module.get("be_routes", []))
        if module.get("deleted_scope_backend_residue"):
            counts["deleted_scope_backend_residue"] += len(module["be_routes"])
    return dict(counts)
```

Call it as `count_statuses(modules)` after `modules` is built.

Expected counter keys:

```text
matched
api_adapter_missing
direct_client_missing
deleted_scope_frontend_residue
deleted_scope_backend_residue
backend_only
```

- [ ] **Step 10: Run the script**

Run:

```bash
python3 tools/generate-system-map.py
rg -n "api_adapter_missing|direct_client_missing|deleted_scope_frontend_residue|deleted_scope_backend_residue|GET services" docs/system-map.html tools/generate-system-map.py
```

Then run this regression snippet:

```bash
python3 - <<'PY'
import importlib.util
from pathlib import Path

root = Path.cwd()
spec = importlib.util.spec_from_file_location("system_map", root / "tools/generate-system-map.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

controllers = mod.load_all_backend_controllers()
assert "incoming-inspection" in controllers, "incoming-inspection.controller.ts was incorrectly skipped"
assert "fragile-item-inspection" in controllers, "fragile-item-inspection.controller.ts was incorrectly skipped"

match = {"module": "asset-loan-record", "handler": "findAll", "file": "server/src/modules/asset-loan-record/asset-loan-record.controller.ts"}
status = mod.classify_call("/asset-loan-records", "GET", match, "api", mod.load_deleted_scopes())
assert status == "deleted_scope_frontend_residue", f"deleted scope must win over matched, got {status}"
PY
```

Expected:

- `GET services` has no hits.
- `incoming-inspection` and `fragile-item-inspection` do not appear as `api_adapter_missing` merely because their filenames contain `inspection`.
- `deleted_scope_frontend_residue` exists while deletion work is not done.
- Deleted-scope calls still show as `deleted_scope_frontend_residue` even when a backend route currently matches them.
- `api_adapter_missing` and `direct_client_missing` are separate categories.

- [ ] **Step 11: Commit**

```bash
git add tools/generate-system-map.py tools/system-map-deleted-scopes.json docs/system-map.html
git commit -m "chore: make system map track deleted scopes"
```

---

## Task 3: Remove Frontend Product Surfaces

**Files:**
- Modify: `client/src/router/index.ts`
- Modify: `client/src/navigation/menu.ts`
- Modify: `client/src/constants/permission.ts`
- Delete frontend APIs and views listed in File Structure.

- [ ] **Step 1: Remove routes**

Edit `client/src/router/index.ts` and remove route records for:

```text
/login/sso
/sso
/approvals/all
/workflow/*
/workflow-templates/designer
/monitoring/*
/management-dashboard
/statistics/dashboard
/internal-audit/*
/management-reviews*
/asset-loan-records
/document-issuances
/documents/control/number-rules
/documents/control/workbench
/documents/control/workbench/issues
/documents/operations/read-confirmations
/documents/operations/training-needs
/documents/operations/health
/documents/operations/audit-coverage
/documents/operations/impact
/documents/operations/audit-chain
```

Keep:

```text
/documents
/documents/control/record-form-index
/templates
/templates/:id/tolerance
/approvals/pending
/approvals/history
/health backend probes only, no frontend health page
```

- [ ] **Step 2: Remove menu entries**

Edit `client/src/navigation/menu.ts` and remove entries with paths:

```text
/documents/control/number-rules
/documents/control/workbench
/documents/operations/read-confirmations
/documents/operations/training-needs
/documents/operations/health
/documents/operations/audit-coverage
/documents/operations/impact
/workflow/my-tasks
/workflow/instances
/workflow/templates
/workflow-templates/designer
/asset-loan-records
/document-issuances
/internal-audit/plans
/internal-audit/rectifications
/internal-audit/reports
/statistics/dashboard
/monitoring/dashboard
/monitoring/metrics
/monitoring/alerts/rules
/monitoring/alerts/history
```

- [ ] **Step 3: Delete frontend API files**

Run:

```bash
git rm -r --ignore-unmatch \
  client/src/api/internal-audit \
  client/src/api/workflow.ts \
  client/src/api/sso.ts \
  client/src/api/change-approval.ts \
  client/src/api/asset-loan-record.ts \
  client/src/api/management-review.ts \
  client/src/api/monitoring.ts \
  client/src/api/document-issuance.ts
```

Handle `client/src/api/health.ts` separately:

```bash
rg -n "@/api/health|from ['\"]@/api/health|from ['\"]\\.\\./api/health|from ['\"]\\./api/health" client/src --glob '!client/src/views/health/**' --glob '!client/src/views/monitoring/**'
```

If the command has no output, remove `client/src/api/health.ts` with `git rm --ignore-unmatch client/src/api/health.ts`. If it has non-UI consumers, keep the file and trim it to the minimal exported types/functions those consumers need; do not keep UI dashboard methods.

- [ ] **Step 4: Delete frontend views and components**

Run:

```bash
git rm -r --ignore-unmatch \
  client/src/views/workflow \
  client/src/views/login/SsoLogin.vue \
  client/src/views/asset-loan-record \
  client/src/views/internal-audit \
  client/src/views/management-review \
  client/src/views/monitoring \
  client/src/views/health/HealthPage.vue \
  client/src/views/dashboard/ManagementDashboard.vue \
  client/src/views/document-issuance \
  client/src/views/documents/NumberRuleCenter.vue \
  client/src/views/documents/DocumentControlWorkbench.vue \
  client/src/views/documents/DocumentControlIssueList.vue \
  client/src/views/documents/ReadConfirmationCenter.vue \
  client/src/views/documents/TrainingNeedCenter.vue \
  client/src/views/documents/DocumentHealthDashboard.vue \
  client/src/views/documents/AuditCoverageCenter.vue \
  client/src/views/documents/ImpactAnalysisWorkbench.vue \
  client/src/views/documents/AuditChainExplorer.vue \
  client/src/components/monitoring \
  client/src/components/document/EvidenceChainGraph.vue \
  client/src/components/document/ReferenceBlock.vue \
  client/src/components/process/DeptSignoffPanel.vue \
  client/src/components/fields/ApprovalStepField.vue \
  client/src/components/template/ExcelUpload.vue
```

- [ ] **Step 5: Remove permission constants for deleted modules**

Edit `client/src/constants/permission.ts` and remove `workflow`, deleted document-control operations, monitoring UI, internal-audit, management-review, SSO, and asset-loan entries. Keep system audit permissions.

- [ ] **Step 6: Run frontend residue scan**

```bash
rg -n "workflow|workflow-task|monitoring|management-dashboard|sso|asset-loan|internal-audit|management-review|document-issuance|NumberRuleCenter|DocumentControlWorkbench|AuditChainExplorer|ApprovalStepField|DeptSignoffPanel|ExcelUpload" client/src
```

Expected: only accepted false positives such as `monitoring_method` and `monitoring_frequency`, or no output.

- [ ] **Step 7: Run client build**

```bash
npm run build:client
```

Expected: build passes or only fails on backend-contract work scheduled in later tasks. If it fails because of deleted imports, fix the imports in this task before committing.

- [ ] **Step 8: Commit**

```bash
git add client/src
git commit -m "refactor: remove deleted frontend product surfaces"
```

---

## Task 4: Remove Backend Modules and App Wiring

**Files:**
- Modify: `server/src/app.module.ts`
- Modify: `server/src/modules/auth/auth.module.ts`
- Delete modules listed below.

- [ ] **Step 1: Remove module imports from AppModule**

In `server/src/app.module.ts`, remove import statements and `imports` entries for:

```ts
WorkflowModule,
MonitoringModule,
InternalAuditModule,
ManagementReviewModule,
ChangeApprovalModule,
AssetLoanRecordModule,
DocumentIssuanceModule,
```

Also remove `ApprovalModule` if it is imported in the current file or a downstream module. Keep `UnifiedApprovalModule`.

- [ ] **Step 2: Remove SSO from AuthModule**

In `server/src/modules/auth/auth.module.ts`, remove `SsoController` and `SsoService` imports/providers/controllers.

- [ ] **Step 3: Delete backend module directories**

Run:

```bash
git rm -r --ignore-unmatch \
  server/src/modules/approval \
  server/src/modules/workflow \
  server/src/modules/change-approval \
  server/src/modules/asset-loan-record \
  server/src/modules/internal-audit \
  server/src/modules/management-review \
  server/src/modules/document-issuance \
  server/src/modules/auth/sso.controller.ts \
  server/src/modules/auth/sso.service.ts
```

- [ ] **Step 4: Decide monitoring backend**

Run:

```bash
rg -n "MonitoringModule|MonitoringService|MetricsService|AlertRule|SystemMetric|alert\\.schedule|monitoring/" server/src --glob '*.ts'
```

If hits are only `server/src/modules/monitoring/**`, delete the module:

```bash
git rm -r --ignore-unmatch server/src/modules/monitoring
```

If a non-UI internal job still uses it, remove `MonitoringController` and keep only internal providers under a non-controller module. Do not expose `/monitoring/**` routes.

- [ ] **Step 5: Remove dashboard service**

Edit `server/src/modules/statistics/statistics.module.ts` and remove `ManagementDashboardService` provider if present. Delete:

```bash
git rm --ignore-unmatch server/src/modules/statistics/management-dashboard.service.ts server/src/modules/statistics/management-dashboard.service.spec.ts
```

- [ ] **Step 6: Protect system audit logs**

System audit stays. Verify `AuditModule` and system audit routes were not removed:

```bash
rg -n "class AuditModule|@Controller\\('audit'\\)|login-logs|permission-logs|sensitive-logs|search" server/src/modules/audit server/src/app.module.ts
```

Expected: hits in `server/src/modules/audit/**` and `AuditModule` still imported by `AppModule`.

- [ ] **Step 7: Run backend residue scan**

```bash
rg -n "ApprovalModule|WorkflowModule|MonitoringModule|InternalAuditModule|ManagementReviewModule|ChangeApprovalModule|AssetLoanRecordModule|DocumentIssuanceModule|SsoController|SsoService" server/src
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add server/src
git commit -m "refactor: remove deleted backend modules"
```

---

## Task 5: Prisma Schema Migration and Seed Cleanup

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/<timestamp>_api_contract_cleanup/migration.sql`
- Modify: `server/src/prisma/seed.ts`
- Modify: `server/src/prisma/seed-e2e.ts`
- Modify: `server/src/prisma/seed-demo.ts`
- Modify: `server/src/prisma/seeds/demo/seed-document-demo.ts`

- [ ] **Step 1: Remove schema relations from User and Department**

In `server/src/prisma/schema.prisma`, remove fields referencing deleted models, including:

```prisma
workflowsInitiated
workflowTasksAssigned
workflowTasksEscalated
stepApprovals
numberRules
workflowTemplates
```

Remove any relation fields to deleted internal-audit, management-review, document-issuance, asset-loan, monitoring alert, and old approval models.

- [ ] **Step 2: Remove deleted models**

Remove models:

```prisma
Approval
WorkflowTemplate
WorkflowInstance
WorkflowTask
TaskDelegationLog
ProcessStepApproval
ChangeApproval
AssetLoanRecord
NumberRule
DocumentIssuance
DocumentReadConfirmation
DocumentReadRequirement
DocumentTrainingNeed
DocumentCoverageReview
DocumentImpactReview
DocumentImpactItem
FulltextIndex
DocumentRecommendation
DocumentViewLog
SystemMetric
AlertRule
AlertHistory
```

Also remove models belonging only to internal audit and management review.

Current schema model names to remove for those deleted modules:

```prisma
AuditPlan
AuditFinding
AuditReport
ManagementReview
ManagementReviewInput
ManagementReviewAction
```

These are internal-audit / management-review business models. Do not delete `server/src/modules/audit/**`, which is system audit logging and remains in scope.

- [ ] **Step 3: Remove deleted foreign keys from retained models**

Remove retained-model fields that point to deleted runtime:

```prisma
workflowId
workflow
approvalId
legacyApprovalId
processStepApprovalId
```

Keep:

```prisma
approvalInstanceId
approvalInstance
```

on business objects that submit unified approval.

- [ ] **Step 4: Add internal document number counter**

The plan chooses the internal counter strategy. Do not scan existing numbers on every generate call.

Add this model to `server/src/prisma/schema.prisma`:

```prisma
model DocumentNumberCounter {
  id           String   @id @default(cuid())
  scope        String
  level        Int
  departmentId String
  sourceFolder String  @default("")
  categoryCode String  @default("")
  sequence     Int     @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  @@unique([scope, level, departmentId, sourceFolder, categoryCode], name: "doc_num_counter_uniq")
  @@map("document_number_counters")
}
```

Add the inverse relation to `Department`:

```prisma
documentNumberCounters DocumentNumberCounter[]
```

This model is a technical sequence counter, not a user-maintained numbering rule. It replaces the sequence storage previously hidden inside `NumberRule`.

- [ ] **Step 5: Verify Prisma migration script, then generate migration**

Verify the script exists:

```bash
npm pkg get scripts.prisma:migrate -w server
```

Expected:

```json
"prisma migrate dev --schema=src/prisma/schema.prisma"
```

Run:

```bash
cd server
npm run prisma:migrate -- --name api_contract_cleanup
npm run prisma:generate
cd ..
```

Expected: Prisma creates a new migration and generation succeeds.

If database connection is unavailable, create migration SQL with Prisma-compatible `DROP TABLE`, `ALTER TABLE DROP COLUMN`, `DROP TYPE`, and foreign-key drop statements, then run:

```bash
npm run prisma:generate -w server
```

- [ ] **Step 6: Clean approval seed callbacks**

Edit `server/src/prisma/seed.ts` and `seed-e2e.ts`.

Remove approval definitions whose callbacks point to deleted modules:

```ts
audit.findingVerified
```

`audit.findingVerified` belongs to the deleted internal-audit finding verification flow. It is unrelated to retained system audit logging under `server/src/modules/audit/**`.

Keep callbacks that remain registered:

```ts
document.approvalApproved
document.approvalRejected
process.stepApproved
record.submitApproved
taskRecord.approvalApproved
warehouse.requisitionApproved
warehouse.inboundApproved
warehouse.returnApproved
warehouse.scrapApproved
training.planApproved
equipment.maintenanceApproved
capa.verificationApproved
deviation.approvalApproved
changeEvent.approvalApproved
```

The module name for `capa.verificationApproved` is `corrective-action`; verify the callback key before keeping it:

```bash
rg -n "capa\\.verificationApproved|register\\('capa\\.verificationApproved'" server/src/modules/corrective-action server/src/prisma/seed*.ts
```

Expected: seed and corrective-action registration both use `capa.verificationApproved`.

- [ ] **Step 7: Remove workflow TodoTask fixture sources**

Run:

```bash
rg -n "WorkflowTask|workflow|workflow-task|audit.findingVerified|AssetLoanRecord|ChangeApproval|ProcessStepApproval|NumberRule|DocumentIssuance|AlertRule|SystemMetric" server/src/prisma
```

Edit seed files until deleted-scope seed hits are gone. `workflow` can remain only in comments that explain migration history inside migration files, not in executable seed code.

- [ ] **Step 8: Commit**

```bash
git add server/src/prisma
git commit -m "refactor: remove deleted prisma models and seeds"
```

---

## Task 6: Converge Approval Runtime

**Files:**
- Modify: `server/src/modules/unified-approval/**`
- Modify: business modules with local approve/reject routes.
- Modify: `client/src/api/unified-approval.ts`
- Modify: `client/src/views/approvals/**`
- Delete: `client/src/api/approval.ts` if fully replaced.

- [ ] **Step 1: Add real callback-key coverage test**

Create `server/src/modules/unified-approval/approval-callback.registry.coverage.spec.ts`:

```ts
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('Approval callback registry coverage', () => {
  const serverRoot = join(__dirname, '../../..');

  function readFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      const stat = statSync(path);
      if (stat.isDirectory()) return readFiles(path);
      return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
    });
  }

  function extractSeedCallbackKeys(): Set<string> {
    const seedFiles = [
      join(serverRoot, 'src/prisma/seed.ts'),
      join(serverRoot, 'src/prisma/seed-e2e.ts'),
      join(serverRoot, 'src/prisma/seed-demo.ts'),
    ].filter((file) => existsSync(file));
    const demoSeedDir = join(serverRoot, 'src/prisma/seeds/demo');
    if (existsSync(demoSeedDir)) {
      for (const file of readFiles(demoSeedDir)) {
        seedFiles.push(file);
      }
    }
    const keys = new Set<string>();
    for (const file of seedFiles) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/\bon(?:Approved|Rejected):\s*['"`]([^'"`]+)['"`]/g)) {
        keys.add(match[1]);
      }
    }
    return keys;
  }

  function extractRegisteredCallbackKeys(): Set<string> {
    const keys = new Set<string>();
    for (const file of readFiles(join(serverRoot, 'src/modules'))) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/\.register\(\s*['"`]([^'"`]+)['"`]/g)) {
        keys.add(match[1]);
      }
    }
    return keys;
  }

  it('all retained seed approval callback keys are registered by production modules', () => {
    const seedKeys = extractSeedCallbackKeys();
    const registeredKeys = extractRegisteredCallbackKeys();
    const missing = [...seedKeys].filter((key) => !registeredKeys.has(key));
    expect(missing).toEqual([]);
  });
});
```

This test must fail if `seed.ts` or `seed-e2e.ts` contains a retained `ApprovalDefinition.steps[*].onApproved/onRejected` key that no production module registers. It is not enough to test `ApprovalCallbackRegistry.invoke()` throwing for a manually invented missing key.

- [ ] **Step 2: Remove old approval API frontend**

If `client/src/api/approval.ts` only wraps deleted old approval routes, delete it. If it contains display helpers still used by active pages, move them into `client/src/api/unified-approval.ts` and delete old route methods:

```ts
createApprovalChain
getApprovalChain
approve
reject
```

- [ ] **Step 3: Route approval pages to unified approval**

Edit approval views so pending/history/detail pages call:

```ts
approvalTaskApi.getMyTasks()
approvalTaskApi.approveTask(taskId, payload)
approvalTaskApi.rejectTask(taskId, payload)
approvalInstanceApi.getInstance(id)
```

Use the actual exported names from `client/src/api/unified-approval.ts`; do not recreate `/approvals/**`.

- [ ] **Step 4: Remove local approve/reject route handlers**

Run:

```bash
rg -n "@Post\\([^)]*(approve|reject)|@Put\\([^)]*(approve|reject)|prisma\\.(approval|changeApproval|processStepApproval)\\b" server/src/modules --glob '*.ts'
```

For each hit outside `server/src/modules/unified-approval`, either delete it or rename it to a non-approval business verb if it is truly `complete`, `verify`, `close`, `issue`, or `archive`.

- [ ] **Step 5: Keep business callbacks**

For each retained callback module, ensure module constructor registers callback keys:

```ts
this.approvalCallbackRegistry.register('record.submitApproved', this.handleRecordSubmitApproved);
```

Use existing local patterns in document, record, process, warehouse, training, equipment, corrective-action, deviation, and change-event modules. The corrective-action module currently uses the callback key prefix `capa`; verify that before keeping the seed key:

```bash
rg -n "capa\\.verificationApproved|register\\('capa\\.verificationApproved'" server/src/modules/corrective-action server/src/prisma/seed*.ts
```

Expected: both the seed and the corrective-action module use `capa.verificationApproved`.

- [ ] **Step 6: Run approval scans**

```bash
rg -n "prisma\\.(approval|changeApproval|processStepApproval)\\b|@Post\\('[^']*(approve|reject)|@Post\\(\"[^\"]*(approve|reject)" server/src/modules --glob '*.ts'
npm run test -w server -- approval-callback.registry
```

Expected: only unified approval task controller or manually documented non-approval false positives remain.

- [ ] **Step 7: Commit**

```bash
git add server/src client/src
git commit -m "refactor: converge approvals on unified approval"
```

---

## Task 7: Slim Document Control

**Files:**
- Modify: `server/src/modules/document/document.module.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.service.ts`
- Modify: `server/src/modules/document/document-cron.service.ts`
- Modify: `server/src/modules/document/document-lifecycle.service.ts`
- Modify: `server/src/modules/document/services/number-rule.service.ts`
- Modify: `server/src/modules/document/constants/document-control.constants.ts`
- Delete document-control governance services and tests.
- Modify: `client/src/api/document-control.ts`
- Modify retained document views.

- [ ] **Step 1: Remove governance providers from DocumentModule**

In `server/src/modules/document/document.module.ts`, remove providers and imports for:

```ts
DocumentControlWorkbenchService,
DocumentHealthService,
DocumentReadRequirementService,
DocumentTrainingNeedService,
DocumentAuditCoverageService,
DocumentImpactService,
DocumentAuditChainService,
DocumentEvidenceChainService,
NumberRuleService list/upsert/deactivate controller usage,
```

Keep:

```ts
DocumentReferenceService,
MarkdownWikilinkService,
DocumentReferenceHealthService,
RecordFormLandingService,
DocumentExpiryService,
DocumentLifecycleService,
BusinessDocumentLinkService,
FilePreviewService,
```

- [ ] **Step 2: Delete governance services**

Run:

```bash
git rm --ignore-unmatch \
  server/src/modules/document/services/document-control-workbench.service.ts \
  server/src/modules/document/services/document-health.service.ts \
  server/src/modules/document/services/document-read-requirement.service.ts \
  server/src/modules/document/services/document-training-need.service.ts \
  server/src/modules/document/services/document-audit-coverage.service.ts \
  server/src/modules/document/services/document-impact.service.ts \
  server/src/modules/document/services/document-audit-chain.service.ts \
  server/src/modules/document/services/document-evidence-chain.service.ts \
  server/src/modules/document/services/document-control-workbench.service.spec.ts \
  server/src/modules/document/services/document-health.service.spec.ts \
  server/src/modules/document/services/document-training-need.service.spec.ts
```

- [ ] **Step 3: Remove deleted controller routes**

In `server/src/modules/document/document.controller.ts`, remove route handlers for:

```text
number-rules
read-confirmations
training-needs
control workbench
health dashboard
audit coverage
impact analysis
audit-chain
evidence-chain
export
obsolete
rollback
compare
```

Keep routes for document list/detail/upload/download/preview, lifecycle draft-submit-publish-archive-revise, record-form landing, references, and reference health.

- [ ] **Step 4: Convert numbering to internal constants**

In `server/src/modules/document/constants/document-control.constants.ts`, add:

```ts
export const DEFAULT_DOCUMENT_NUMBER_RULE = {
  format: '{level}-{departmentCode}-{categoryCode}-{sequence}',
  sequencePadding: 3,
  separator: '-',
} as const;
```

In `server/src/modules/document/services/number-rule.service.ts`, keep `generate()` but remove `list()`, `upsert()`, and `deactivate()`. Replace `numberRule` reads/writes with the `DocumentNumberCounter` model added in Task 5:

```ts
const counter = await tx.documentNumberCounter.upsert({
  where: {
    scope_level_departmentId_sourceFolder_categoryCode: {
      scope: input.scope,
      level: input.level,
      departmentId: input.departmentId,
      sourceFolder: input.sourceFolder ?? '',
      categoryCode: input.fallbackCategoryCode ?? '',
    },
  },
  create: {
    scope: input.scope,
    level: input.level,
    departmentId: input.departmentId,
    sourceFolder: input.sourceFolder ?? '',
    categoryCode: input.fallbackCategoryCode ?? '',
    sequence: 1,
  },
  update: {
    sequence: { increment: 1 },
  },
});

const sequence = String(counter.sequence).padStart(DEFAULT_DOCUMENT_NUMBER_RULE.sequencePadding, '0');
return DEFAULT_DOCUMENT_NUMBER_RULE.format
  .replaceAll('{level}', String(input.level))
  .replaceAll('{departmentCode}', department.code)
  .replaceAll('{categoryCode}', input.fallbackCategoryCode ?? '')
  .replaceAll('{sequence}', sequence)
  .replaceAll('--', '-')
  .replace(/^-|-$/g, '');
```

This explicitly uses the `DocumentNumberCounter` model added in Task 5. Do not reintroduce `NumberRule`, and do not leave the sequence strategy for the implementer to choose.

- [ ] **Step 5: Preserve reference health**

Run:

```bash
npm run test -w server -- document-reference-health.service
```

Expected: reference health tests pass. If tests do not exist or fail because deleted DTOs were used, update them to instantiate only `DocumentReferenceHealthService` with `PrismaService`.

- [ ] **Step 6: Remove frontend document API methods**

Edit `client/src/api/document-control.ts` and remove methods:

```ts
listNumberRules
upsertNumberRule
deactivateNumberRule
read confirmation methods
training need methods
workbench methods
health dashboard methods
audit coverage methods
impact analysis methods
audit/evidence chain methods
document export methods
obsolete/rollback/compare methods
```

Keep document list/detail/upload/preview/download/lifecycle/reference/record-form landing methods.

- [ ] **Step 7: Run document residue scan**

```bash
rg -n "NumberRule|number-rules|ReadConfirmation|TrainingNeed|DocumentHealth|DocumentControlWorkbench|AuditCoverage|ImpactAnalysis|AuditChain|EvidenceChain|DocumentIssuance|obsolete|rollback|compare|DocumentExport" client/src server/src/modules/document server/src/modules/export
```

Expected: no production-code hits for deleted features. Migration files may still contain historical names.

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/document client/src/api/document-control.ts client/src/views/documents client/src/components/document server/src/prisma
git commit -m "refactor: slim document control surface"
```

---

## Task 8: Repair Retained API Contracts

**Files:**
- Create: `client/src/api/auth.ts`
- Modify: `client/src/views/Password.vue`
- Modify: `server/src/modules/record/record.controller.ts`
- Modify: `server/src/modules/record/record.service.ts`
- Modify: `server/src/modules/record-template/record-template.controller.ts`
- Modify: `server/src/modules/record-template/record-template.service.ts`
- Modify: `client/src/api/record.ts`
- Modify: `client/src/api/record-template.ts`
- Modify: `client/src/views/templates/TemplateList.vue`
- Modify: `client/src/views/templates/ToleranceConfig.vue`
- Modify: `client/src/api/training.ts`
- Modify: `client/src/api/warehouse.ts`
- Modify: `client/src/api/permission.ts`

- [ ] **Step 1: Add auth adapter**

Create `client/src/api/auth.ts`:

```ts
import request from './request';

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export const authApi = {
  changePassword(payload: ChangePasswordPayload) {
    return request.patch('/auth/change-password', payload);
  },
};
```

Update `client/src/views/Password.vue` to import `authApi` and call:

```ts
await authApi.changePassword({
  oldPassword: form.oldPassword,
  newPassword: form.newPassword,
});
```

- [ ] **Step 2: Add Record PDF backend route**

In `server/src/modules/record/record.controller.ts`, add:

```ts
import { StreamableFile } from '@nestjs/common';
import { Response } from 'express';

@Get(':recordId/pdf')
async exportPdf(@Param('recordId') recordId: string, @Res({ passthrough: true }) res: Response) {
  const pdf = await this.recordService.generatePdf(recordId);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="record-${recordId}.pdf"`,
  });
  return new StreamableFile(pdf);
}
```

Use `@Res({ passthrough: true })` and return `StreamableFile` so Nest can still route `NotFoundException` or authorization exceptions through the normal exception filter before headers are sent. Keep the same auth guards as record detail routes.

In `server/src/modules/record/record.service.ts`, implement `generatePdf(recordId: string): Promise<Buffer>` using `pdfkit`. The method must load `Record` with its `RecordTemplate` and values, then write a simple PDF with template name, record id, status, submitted time, and field/value rows. Do not write the PDF to storage.

- [ ] **Step 3: Add Record PDF test**

Create or update `server/src/modules/record/record.service.spec.ts`:

```ts
it('generates a PDF buffer from record and template facts', async () => {
  prisma.record.findUnique.mockResolvedValue({
    id: 'record-1',
    status: 'submitted',
    createdAt: new Date('2026-05-13T00:00:00Z'),
    template: { id: 'template-1', name: '温度记录', fields: [{ key: 'temp', label: '温度' }] },
    data: { temp: '12C' },
  });

  const pdf = await service.generatePdf('record-1');

  expect(Buffer.isBuffer(pdf)).toBe(true);
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
});
```

- [ ] **Step 4: Move template tolerance to RecordTemplateController**

In `server/src/modules/record-template/record-template.controller.ts`, add:

```ts
@Get(':templateId/tolerance')
getTolerance(@Param('templateId') templateId: string) {
  return this.recordTemplateService.getTolerance(templateId);
}

@Put(':templateId/tolerance')
updateTolerance(@Param('templateId') templateId: string, @Body() body: UpdateToleranceDto) {
  return this.recordTemplateService.updateTolerance(templateId, body);
}
```

Define `UpdateToleranceDto` in `server/src/modules/record-template/dto/update-tolerance.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class TemplateToleranceRuleDto {
  @IsString()
  fieldKey!: string;

  @IsIn(['number', 'date', 'time'])
  valueType!: 'number' | 'date' | 'time';

  @IsIn(['between', 'min', 'max', 'equals'])
  operator!: 'between' | 'min' | 'max' | 'equals';

  @IsNumber()
  @IsOptional()
  min?: number;

  @IsNumber()
  @IsOptional()
  max?: number;

  @IsString()
  @IsOptional()
  unit?: string;
}

export class UpdateToleranceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateToleranceRuleDto)
  rules!: TemplateToleranceRuleDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
```

Do not add these routes to `TemplateAliasController`.

- [ ] **Step 5: Update template frontend adapter**

In `client/src/api/record-template.ts`, add:

```ts
export interface TemplateTolerancePayload {
  rules: Array<{
    fieldKey: string;
    valueType: 'number' | 'date' | 'time';
    operator: 'between' | 'min' | 'max' | 'equals';
    min?: number;
    max?: number;
    unit?: string;
  }>;
  notes?: string;
}

export function getTemplateTolerance(templateId: string) {
  return request.get(`/record-templates/${templateId}/tolerance`);
}

export function updateTemplateTolerance(templateId: string, payload: TemplateTolerancePayload) {
  return request.put(`/record-templates/${templateId}/tolerance`, payload);
}
```

Update `client/src/views/templates/ToleranceConfig.vue` to use these functions instead of `/templates/:id/tolerance`.

- [ ] **Step 6: Remove template copy/import/toggle**

In `client/src/views/templates/TemplateList.vue`:

- remove copy button and `handleCopy`
- remove Excel import button and handlers
- replace toggle with explicit archive/activate adapter calls

Delete `client/src/components/template/ExcelUpload.vue` if not already removed.

- [ ] **Step 7: Fix training question order**

In `client/src/api/training.ts`, replace `/training/questions/order` with:

```ts
return request.put('/training/questions/update-order', {
  projectId,
  questionOrders,
});
```

Update the caller to pass `projectId` from the current training project route or state.

- [ ] **Step 8: Fix warehouse adapter routes**

In `client/src/api/warehouse.ts`:

```ts
disableSupplier(id: string) {
  return request.put(`/warehouse/suppliers/${id}/disable`);
}

checkMaterialBalance(batchId?: string) {
  return batchId
    ? request.get(`/warehouse/material-balance/check/${batchId}`)
    : request.get('/warehouse/material-balance/check-all');
}
```

Update `SupplierList.vue` and `MaterialBalance.vue` callers.

- [ ] **Step 9: Fix user-permission frontend routes**

In `client/src/api/permission.ts`, expose:

```ts
grantUserPermission(payload: unknown) {
  return request.post('/user-permissions/grant', payload);
}

getEffectiveUserPermissions(userId: string) {
  return request.get(`/user-permissions/${userId}/effective`);
}

batchGrantUserPermissions(payload: unknown) {
  return request.post('/user-permissions/batch-grant', payload);
}

revokeUserPermission(grantId: string) {
  return request.delete(`/user-permissions/${grantId}/revoke`);
}
```

Update `GrantPermissionDialog.vue`, `UserPermissions.vue`, and `UserPermissionsManager.vue` to use these methods. In `UserPermissions.vue`, preserve the required permissionId-to-grantId lookup before revoke:

```ts
const revokePermission = async (permissionId: string) => {
  const effective = await permissionApi.getEffectiveUserPermissions(userId.value);
  const grant = effective.data?.permissions?.find((item: any) =>
    item.id === permissionId ||
    item.permissionId === permissionId ||
    item.permission?.id === permissionId,
  );
  if (!grant?.id) {
    ElMessage.error('未找到可撤销的授权记录');
    return;
  }
  await permissionApi.revokeUserPermission(grant.id);
  await loadPermissions();
};
```

If the real effective-permission response uses a different array property, adapt only the property access while keeping the same rule: revoke by authorization record id, not by `userId + permissionId`.

- [ ] **Step 10: Run focused tests**

```bash
npm run test -w server -- record.service record-template
npm run test -w client -- TemplateList ToleranceConfig Permission
npm run build:client
npm run build:server
```

Expected: all pass.

- [ ] **Step 11: Commit retained API fixes as small commits**

```bash
git add client/src/api/auth.ts client/src/views/Password.vue
git commit -m "fix: route password change through auth adapter"

git add server/src/modules/record client/src/api/record.ts
git commit -m "feat: add server-side record pdf export"

git add server/src/modules/record-template client/src/api/record-template.ts client/src/views/templates
git commit -m "fix: route template tolerance through record-template api"

git add client/src/views/templates client/src/components/template
git commit -m "refactor: remove template copy and excel import"

git add client/src/api/training.ts client/src/views/training client/src/components/training
git commit -m "fix: align training question order route"

git add client/src/api/warehouse.ts client/src/views/warehouse
git commit -m "fix: align warehouse retained routes"

git add client/src/api/permission.ts client/src/components/permission client/src/views/permission
git commit -m "fix: align user permission routes"
```

---

## Task 9: Clean Tests and E2E

**Files:**
- Delete or modify deleted feature tests.
- Modify retained tests to new routes.

- [ ] **Step 1: Delete deleted E2E specs**

Run:

```bash
git rm --ignore-unmatch \
  client/e2e/monitoring.spec.ts \
  client/e2e/monitoring-alert.spec.ts \
  client/e2e/alert.spec.ts \
  client/e2e/internal-audit.spec.ts \
  client/e2e/management-review.spec.ts \
  client/e2e/sso.spec.ts \
  client/e2e/asset-loan-record.spec.ts \
  client/e2e/change-approval.spec.ts \
  client/e2e/workflow.spec.ts
```

Edit `client/e2e/approval-engine.spec.ts` and remove sections that visit:

```text
/workflow/instances
/workflow/templates
```

Edit `client/e2e/health.spec.ts` and remove navigation from health page to monitoring dashboard.

Find any additional E2E specs before committing:

```bash
rg -l "workflow|workflow-task|monitoring|management-dashboard|sso|asset-loan|internal-audit|management-review|change-approval" client/e2e
```

For every listed file, either delete it with `git rm --ignore-unmatch <file>` if it only covers deleted product surfaces, or edit it so it tests a retained route.

- [ ] **Step 2: Delete unit tests for removed views**

Run:

```bash
git rm --ignore-unmatch \
  client/src/views/workflow/__tests__/MyTasks.spec.ts \
  client/src/views/documents/__tests__/NumberRuleCenter.spec.ts \
  client/src/views/documents/__tests__/AuditChainExplorer.spec.ts \
  client/src/views/documents/__tests__/DocumentControlWorkbench.spec.ts \
  client/src/views/documents/__tests__/DocumentControlIssueList.spec.ts \
  client/src/components/document/__tests__/EvidenceChainGraph.spec.ts
```

- [ ] **Step 3: Fix approval API test**

Edit `client/src/__tests__/approval-api.spec.ts` and remove assertions for:

```ts
POST /approvals/chains
```

If the file only tests old approval routes, delete it.

- [ ] **Step 4: Run test title list**

```bash
npm --prefix client run test:e2e -- --list
```

Expected: no test title or file path mentions deleted product surfaces, except accepted false positives in comments that are removed before commit.

- [ ] **Step 5: Run residue scan**

```bash
rg -n "workflow|workflow-task|monitoring|management-dashboard|sso|asset-loan|internal-audit|management-review|document-issuance|NumberRuleCenter|DocumentControlWorkbench|AuditChainExplorer" client/e2e client/src server/src --glob '!server/src/prisma/migrations/**'
```

Expected: no deleted-scope production/test residues. Accepted false positives must be listed in the PR description.

- [ ] **Step 6: Commit**

```bash
git add client/e2e client/src server/src
git commit -m "test: remove deleted surface coverage"
```

---

## Task 10: Final Contract Verification

**Files:**
- Modify only files needed to satisfy scans.

- [ ] **Step 1: Run system map**

```bash
python3 tools/generate-system-map.py
```

Expected:

```text
api_adapter_missing: 0
direct_client_missing: 0
deleted_scope_frontend_residue: 0
deleted_scope_backend_residue: 0
```

If the script writes only HTML, inspect the generated HTML and update the script to also print or embed these counters clearly.

- [ ] **Step 2: Run approval residue scan**

```bash
rg -n "prisma\\.(approval|changeApproval|processStepApproval)\\b|@Post\\('[^']*(approve|reject)|@Post\\(\"[^\"]*(approve|reject)" server/src/modules --glob '*.ts'
```

Expected: only unified approval task controller remains, plus documented non-approval business verbs if any.

- [ ] **Step 3: Run deleted schema scan**

```bash
rg -n "^model (Approval|WorkflowTemplate|WorkflowInstance|WorkflowTask|ProcessStepApproval|ChangeApproval|AssetLoanRecord|NumberRule|DocumentIssuance|SystemMetric|AlertRule|AlertHistory)\\b" server/src/prisma/schema.prisma
rg -n "\\b(WorkflowTask|ChangeApproval|ProcessStepApproval|AssetLoanRecord|NumberRule|DocumentIssuance|AlertRule|AlertHistory|SystemMetric)\\b" server/src/prisma/seed*.ts server/src/prisma/seeds
```

Expected: no output.

- [ ] **Step 4: Run builds and focused tests**

```bash
npm run prisma:generate
npm run build:server
npm run build:client
npm run test -w server -- approval-callback.registry document-reference-health record.service record-template
npm run test -w client -- TemplateList ToleranceConfig Permission
npm --prefix client run test:e2e -- --list
```

Expected: all commands pass, and E2E list excludes deleted features.

- [ ] **Step 5: Run GitNexus change detection**

```bash
npx gitnexus analyze
```

Then use the GitNexus MCP tool from the agent before final commit. Do not paste this into the shell:

```json
{"tool": "mcp__gitnexus__.detect_changes", "arguments": {"repo": "noidear", "scope": "all"}}
```

Expected: affected scope matches this plan. Investigate any unexpected HIGH or CRITICAL risk before pushing.

- [ ] **Step 6: Final commit**

```bash
git status --short
git add tools client server docs/system-map.html
git commit -m "refactor: complete api contract cleanup"
git push origin codex/api-contract-cleanup
```

---

## Self-Review Checklist

- Spec coverage: every deletion scope, retained route, approval convergence, document-control slimming, Prisma migration, seed cleanup, E2E cleanup, and verification command from the spec maps to a task above.
- Placeholder scan: this plan contains no unresolved marker strings or open-ended implementation slots.
- Type consistency: retained approval names use `ApprovalDefinition`, `ApprovalInstance`, `ApprovalTask`, and `ApprovalAction`; template tolerance is under `record-templates`; deleted workflow runtime is not reused.
- Execution boundary: implementation must happen in an isolated worktree.
- Data boundary: no historical data migration is required, but Prisma schema migration is mandatory.
