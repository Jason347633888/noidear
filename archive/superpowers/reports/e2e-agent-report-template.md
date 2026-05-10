# E2E Agent Report Template

Use this template in the Multica E2E issue comment after every `E2E测试1` run.

```text
E2E 测试报告

PR: <url>
PR number: <number>
baseBranch: <branch>
headBranch: <branch>
testedHeadSha: <full sha>
composeProject: <compose project name>
runtime: Claude (jiashengmacmini.local)
e2eRequirement: required
e2eScope: scoped | full
e2eTarget: <real spec / grep / matrix>
command: <exact command>
result: PASS | FAIL | BLOCKED
handoffResult: none | pass-feedback-sent | repair-issued | blocked-feedback-sent
repairAgent: <same execution agent id/name or none>
followUpIssue: <repair/finalize/review issue id or none>
reviewIssue: <review issue id or none>
playwrightJson: client/playwright-results.json | none
playwrightReport: client/playwright-report | none
artifacts: <trace/screenshot/video/log paths or none>
failures: <short failure summary or none>
cleanup: completed | failed | not-applicable
remainingRisk: <risk summary>
```

`PASS` only means the E2E gate passed for `testedHeadSha`. It is not a merge recommendation.
`FAIL` must include the same execution agent that should receive the repair issue. If the same execution agent cannot be identified, report `BLOCKED` instead of assigning repair work to a random agent.
