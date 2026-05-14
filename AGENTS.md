# AGENTS

This file is the root entry point for any agent working in `noidear`.

## Response Language

All agent replies to the user must be written in Chinese.

## Mandatory Reading Order

Every agent must read these documents in order before analysis, implementation, schema decisions, or behavior changes:

1. `docs/AGENT_GUIDE.md`

## Food-Safety Hard Gate

If the task involves any of the following, the agent must read this document before any implementation or schema decisions:

`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`

Trigger topics include:

- food-safety SaaS
- the 283 source forms
- master data
- products, materials, suppliers, customers, employees, locations
- material lots, production batches, finished-goods batches
- traceability, forward trace, backward trace, material balance
- recall, complaint, nonconformance, rework
- warehouse / manufacturing / QA / QC / R&D cross-module linkage
- deciding between `RecordTemplate/Record` and independent business tables

## Root Entry Responsibility

This document must stay short.
It only does four things:

- identify itself as the root entry point
- enforce Chinese replies to the user
- enforce the reading order
- route agents into `docs/AGENT_GUIDE.md`

For operating rules, continue in:

`docs/AGENT_GUIDE.md`

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **noidear** (20980 symbols, 36905 relationships, 284 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/noidear/context` | Codebase overview, check index freshness |
| `gitnexus://repo/noidear/clusters` | All functional areas |
| `gitnexus://repo/noidear/processes` | All execution flows |
| `gitnexus://repo/noidear/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
