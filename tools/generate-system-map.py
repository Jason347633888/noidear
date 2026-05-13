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
