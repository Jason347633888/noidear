# Audit Risk Register

**Date:** 2026-05-14
**Scope:** 记录因上游生态暂无稳定修复而暂时无法清零的 low / moderate npm audit advisory。

本文件不是永久豁免清单。目标仍然是 full `npm audit` cleanup。每条记录都必须在 release 前重新复核，high / critical advisory 不允许登记在这里。

## Rules

- 不得登记 high 或 critical 漏洞。
- 不得用本文件配合 `--omit=dev` 隐藏 devDependencies 漏洞。
- 只有在 `npm audit --json` 和上游 release notes 都显示暂无稳定修复版本时，才允许登记。
- 每条记录必须包含下次复核日期，复核日期不得晚于发现后的 7 天。
- 如果本文件存在有效条目，implementation PR 必须说明 full audit cleanup 仍被上游修复阻塞。

## Entries

当前没有已接受的残留风险条目。

| Advisory | Severity | Workspace | Package chain | 是否触达本项目代码路径 | 当前阻塞 | 决策 | 下次复核 |
|---|---|---|---|---|---|---|---|
| _none_ |  |  |  |  |  |  |  |
