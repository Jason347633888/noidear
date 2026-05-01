#!/usr/bin/env node
/**
 * check-module-usage-docs.mjs
 * Validates the consistency and completeness of docs/module-usage/ artifacts.
 * Run: node tools/check-module-usage-docs.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const DOCS = join(ROOT, 'docs', 'module-usage')
const TOOLS = join(ROOT, 'tools')

let errors = []
let warnings = []

function err(msg) { errors.push(msg) }
function warn(msg) { warnings.push(msg) }

// ── Required files ──────────────────────────────────────────────────────────
const REQUIRED_DOCS = [
  '00-index.md',
  '01-business-chain-overview.md',
  '02-master-data-and-boundaries.md',
  '03-document-control-and-record-forms.md',
  '04-supplier-procurement-incoming.md',
  '05-warehouse-inventory.md',
  '06-mixing-production-packaging.md',
  '07-quality-qc-release.md',
  '08-traceability-complaint-recall.md',
  '09-nonconformance-capa.md',
  '10-equipment-and-measuring.md',
  '11-training-internal-audit.md',
  '12-task-approval-workflow.md',
  '13-system-admin-ops.md',
  'module-usage.manifest.json',
  '96-pr-roadmap.md',
  '97-gap-triage.md',
  '98-coverage-matrix.md',
  '99-current-gap-register.md',
]

const REQUIRED_MODULE_DOCS = REQUIRED_DOCS.filter(f =>
  /^(0[2-9]|1[0-3])-/.test(f)
)

console.log('Checking required files...')
for (const f of REQUIRED_DOCS) {
  const p = join(DOCS, f)
  if (!existsSync(p)) {
    err(`Missing required file: docs/module-usage/${f}`)
  }
}

if (!existsSync(join(TOOLS, 'check-module-usage-docs.mjs'))) {
  err('Missing: tools/check-module-usage-docs.mjs')
}

if (errors.length > 0) {
  console.error('\n[TODO] Script skeleton: some validations not yet implemented.')
  console.error('Errors found:')
  errors.forEach(e => console.error('  ✗', e))
  process.exit(1)
}

// ── Module doc metadata ──────────────────────────────────────────────────────
console.log('Checking module doc metadata...')
for (const f of REQUIRED_MODULE_DOCS) {
  const p = join(DOCS, f)
  if (!existsSync(p)) continue
  const content = readFileSync(p, 'utf8')
  if (!content.includes('module_id:')) err(`${f}: missing module_id: in metadata`)
  if (!content.includes('source_of_truth:')) err(`${f}: missing source_of_truth: in metadata`)
  if (!content.includes('last_verified_commit:')) err(`${f}: missing last_verified_commit: in metadata`)
  if (!content.includes('## 10. 禁止重复实现与事实源边界')) err(`${f}: missing section 10 禁止重复实现与事实源边界`)
  if (!content.includes('## 11. 后续整改入口')) err(`${f}: missing section 11 后续整改入口`)
}

// ── GAP ID uniqueness ────────────────────────────────────────────────────────
console.log('Checking GAP ID uniqueness...')
const registerPath = join(DOCS, '99-current-gap-register.md')
const registerContent = existsSync(registerPath) ? readFileSync(registerPath, 'utf8') : ''
const registerGapIds = [...registerContent.matchAll(/^\| (GAP-\d{3}) \|/gm)].map(m => m[1])
const uniqueIds = new Set(registerGapIds)
if (registerGapIds.length !== uniqueIds.size) {
  err('99-current-gap-register.md: duplicate GAP IDs found')
}

// ── Provisional GAP IDs must not remain ─────────────────────────────────────
console.log('Checking for provisional GAP IDs...')
for (const f of REQUIRED_MODULE_DOCS) {
  const p = join(DOCS, f)
  if (!existsSync(p)) continue
  const content = readFileSync(p, 'utf8')
  if (/AGENT-\d+-GAP-\d+/.test(content)) {
    err(`${f}: contains provisional AGENT-N-GAP-M IDs — normalize to stable GAP-NNN first`)
  }
}

// ── Manifest consistency ─────────────────────────────────────────────────────
console.log('Checking manifest...')
const manifestPath = join(DOCS, 'module-usage.manifest.json')
let manifest = { documents: [], gaps: [] }
if (existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (e) {
    err('module-usage.manifest.json: invalid JSON')
  }
}

const manifestGapIds = new Set(manifest.gaps.map(g => g.id))
const manifestDocIds = new Set(manifest.documents.map(d => d.moduleId))

// Every register GAP must be in manifest
for (const gapId of registerGapIds) {
  if (!manifestGapIds.has(gapId)) {
    err(`${gapId} is in 99-current-gap-register.md but missing from module-usage.manifest.json`)
  }
}

// ── GAP triage completeness ───────────────────────────────────────────────────
console.log('Checking GAP triage...')
const triagePath = join(DOCS, '97-gap-triage.md')
const triageContent = existsSync(triagePath) ? readFileSync(triagePath, 'utf8') : ''
for (const gapId of registerGapIds) {
  if (!triageContent.includes(gapId)) {
    err(`${gapId} is in gap register but missing from 97-gap-triage.md`)
  }
}

// ── Coverage matrix: no unresolved rows ──────────────────────────────────────
console.log('Checking coverage matrix...')
const matrixPath = join(DOCS, '98-coverage-matrix.md')
const matrixContent = existsSync(matrixPath) ? readFileSync(matrixPath, 'utf8') : ''
if (/\|\s*未判定\s*\|/.test(matrixContent)) {
  err('98-coverage-matrix.md: contains unresolved 未判定 rows')
}
if (/\|\s*待判定\s*\|/.test(matrixContent)) {
  err('98-coverage-matrix.md: contains unresolved 待判定 rows')
}

// ── PR roadmap references valid GAPs ─────────────────────────────────────────
console.log('Checking PR roadmap...')
const roadmapPath = join(DOCS, '96-pr-roadmap.md')
const roadmapContent = existsSync(roadmapPath) ? readFileSync(roadmapPath, 'utf8') : ''

// Extract primary GAP IDs from roadmap rows (column 3 = GAP column, not dependency column)
const roadmapRows = roadmapContent.split('\n').filter(l => /^\| \d+/.test(l))
const roadmapPrimaryGaps = new Set()
for (const row of roadmapRows) {
  const cols = row.split('|').map(c => c.trim())
  // cols[3] is the GAP column (顺序|PR|GAP|依赖 GAP|...)
  const ids = [...(cols[3] || '').matchAll(/GAP-\d{3}/g)].map(m => m[0])
  ids.forEach(id => roadmapPrimaryGaps.add(id))
}

// Check all GAP references (including dependency column) are known IDs
const roadmapGapRefs = [...roadmapContent.matchAll(/GAP-\d{3}/g)].map(m => m[0])
for (const ref of roadmapGapRefs) {
  if (!uniqueIds.has(ref)) {
    err(`96-pr-roadmap.md references unknown GAP ID: ${ref}`)
  }
}

const manifestGapMap = new Map(manifest.gaps.map(g => [g.id, g]))

// Strict gate: every GAP in the roadmap primary column must have a non-empty planPath.
// No planPath = no roadmap row, regardless of triageStatus.
// Rule: 没有 implementation plan，就不能进入 PR roadmap。
const BLOCKED_STATUSES = new Set([
  'needs_spec',
  'needs_plan',
  'needs_business_confirmation',
  'needs_runtime_confirmation',
  'needs_database_sample',
  'defer',
  'no_action',
])
for (const gapId of roadmapPrimaryGaps) {
  const g = manifestGapMap.get(gapId)
  if (!g) continue

  // Any blocked triage status
  if (BLOCKED_STATUSES.has(g.triageStatus)) {
    err(
      `96-pr-roadmap.md schedules ${gapId} but triageStatus="${g.triageStatus}" — ` +
      `GAP must reach ready_for_plan with a real planPath before entering the roadmap`
    )
  }

  // planPath must be non-empty and the file must exist
  if (!g.planPath) {
    err(
      `96-pr-roadmap.md schedules ${gapId} but planPath is empty — ` +
      `write an implementation plan first, then add it to the roadmap`
    )
  } else {
    const planFile = join(ROOT, g.planPath)
    if (existsSync(planFile)) {
      const planContent = readFileSync(planFile, 'utf8')
      if (!planContent.includes('Superpower 与 grill-me 校准记录')) {
        err(
          `96-pr-roadmap.md schedules ${gapId} but ${g.planPath} is missing ` +
          `"Superpower 与 grill-me 校准记录" — every implementation plan must pass the superpower + grill-me gate`
        )
      }
      if (!planContent.includes('superpowers:executing-plans')) {
        err(
          `96-pr-roadmap.md schedules ${gapId} but ${g.planPath} does not require ` +
          `superpowers:executing-plans for execution`
        )
      }
    }
  }
}

// Gate 3: needs_spec manifest entries must include the full spec workflow.
// The required order is: brainstorming -> grill-with-docs -> writing-plans.
console.log('Checking superpower gates...')
const REQUIRED_NEEDS_SPEC_SUPERPOWERS = ['brainstorming', 'grill-with-docs', 'writing-plans']
for (const g of manifest.gaps) {
  if (g.triageStatus === 'needs_spec') {
    const missing = REQUIRED_NEEDS_SPEC_SUPERPOWERS.filter(s => !g.recommendedSuperpowers.includes(s))
    if (missing.length > 0) {
      err(
        `manifest GAP ${g.id} has triageStatus="needs_spec" but recommendedSuperpowers ` +
        `is missing ${missing.map(s => `"${s}"`).join(', ')} — ` +
        `required workflow is brainstorming -> grill-with-docs -> writing-plans`
      )
    }

    const extra = g.recommendedSuperpowers.filter(s => !REQUIRED_NEEDS_SPEC_SUPERPOWERS.includes(s))
    if (extra.length > 0) {
      err(
        `manifest GAP ${g.id} has triageStatus="needs_spec" but recommendedSuperpowers ` +
        `includes ${extra.map(s => `"${s}"`).join(', ')} — ` +
        `do not include execution superpowers until specPath and planPath exist`
      )
    }
  }

  if (g.recommendedSuperpowers.includes('executing-plans') && !g.planPath) {
    err(
      `manifest GAP ${g.id} recommends "executing-plans" but planPath is empty — ` +
      `execution may only be recommended after an implementation plan exists`
    )
  }

  if (g.planPath && !existsSync(join(ROOT, g.planPath))) {
    err(`manifest GAP ${g.id} planPath points to a missing file: ${g.planPath}`)
  }

  if (g.specPath && !existsSync(join(ROOT, g.specPath))) {
    err(`manifest GAP ${g.id} specPath points to a missing file: ${g.specPath}`)
  }
}

// ── P0/P1 rows must include required execution fields ────────────────────────
console.log('Checking P0/P1 row completeness...')
// Basic check: P0 rows must be verified
for (const match of registerContent.matchAll(/^\| (GAP-\d{3}) \|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\| P0 \| ([^|]+) \|/gm)) {
  const [, gapId, verifyStatus] = match
  if (verifyStatus.trim() !== '已验证') {
    warn(`${gapId} is P0 but verification status is "${verifyStatus.trim()}" — only 已验证 P0s may drive implementation PRs`)
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  console.warn('\nWarnings:')
  warnings.forEach(w => console.warn('  ⚠', w))
}

if (errors.length > 0) {
  console.error('\nErrors:')
  errors.forEach(e => console.error('  ✗', e))
  console.error(`\n${errors.length} error(s) found. Fix before committing.`)
  process.exit(1)
}

console.log(`\n✓ All checks passed. ${registerGapIds.length} GAP(s) registered.`)
