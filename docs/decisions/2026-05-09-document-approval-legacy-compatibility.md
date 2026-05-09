# Document Approvals: ApprovalInstance for new workflows, legacy Approval table preserved for historical compatibility

**Date:** 2026-05-09
**Status:** Accepted

## Context

Document approval currently has two paths: the legacy `Approval` table and the unified `ApprovalInstance` platform. New document submissions were writing legacy `Approval` rows and attempting `ApprovalInstance` creation as an optional side path, while historical evidence, preview/signature display, and audit queries still read legacy approval data.

## Decision

After the document approval migration, new document workflows must use `ApprovalInstance`; `submitForApproval()` must not create new legacy `Approval` rows. The legacy `Approval` table remains for historical document compatibility, evidence-chain queries, and preview/signature display. Historical documents without `approvalInstanceId` may continue to use the legacy approval compatibility path, including updates to already-existing legacy rows, but no new module or new document submission may write new legacy `Approval` records.

## Consequences

The old table is intentionally retained even after new workflows move to `ApprovalInstance`; its presence is not by itself a bug. PR 4 must verify that `prisma.approval.create` has no remaining production call sites under `server/src/modules/`. Dropping the legacy table or migrating all historical rows is a future decision that requires its own migration plan and audit review.
