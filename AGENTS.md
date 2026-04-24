# AGENTS

This file is the root entry point for any agent working in `noidear`.

## Mandatory Reading Order

Every agent must read these documents in order before analysis, implementation, schema decisions, or behavior changes:

1. `AGENTS.md` (this file)
2. `docs/AGENT_GUIDE.md`

## Food-Safety Hard Gate

If the task involves any of the following, the agent must also read:

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
It only does three things:

- identify itself as the root entry point
- enforce the reading order
- route agents into `docs/AGENT_GUIDE.md`

For operating rules, continue in:

`docs/AGENT_GUIDE.md`
