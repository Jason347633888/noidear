# Closeout — manual-2026-05-14-dependency-image-hardening

## 状态

已完成合并，PR #215 关闭。

## 合并信息

- **PR URL**：https://github.com/Jason347633888/noidear/pull/215
- **Merge commit**：`0b72f3ba`（master）
- **远端分支**：`codex/dependency-image-hardening` 已删除（`git push origin --delete`）
- **本地分支**：因 worktree 仍存在，无法自动删除，需手动清理（见下方）

## 遗留手动清理

worktree 目录 `/Users/jiashenglin/Desktop/project/noidear-dependency-image-hardening` 因 macOS 权限保护（Operation not permitted）无法通过 rm -rf 删除，也无法通过 `git worktree remove` 移除（.git 为目录非文件）。

请手动在 Finder 或 Terminal 中删除该目录：
```bash
sudo rm -rf /Users/jiashenglin/Desktop/project/noidear-dependency-image-hardening
# 删除后执行：
git worktree prune
git branch -D codex/dependency-image-hardening
```

## 最终交付物

| 项目 | 状态 |
|---|---|
| strict npm audit gate（audit-register + check-npm-audit-strict） | ✅ 合并 |
| training statistics 导出移至后端 ExcelJS | ✅ 合并 |
| 移除 client 端 xlsx | ✅ 合并 |
| NestJS v10 → v11 迁移，HIGH advisory 归零 | ✅ 合并 |
| minimatch editorconfig 子树 override（9.0.9） | ✅ 合并 |
| Docker Trivy 扫描脚本 | ✅ 合并 |
| esbuild/vite moderate 注册进 risk register | ✅ 合并 |
| Docker digest 固化 | ⚠️ 用户签注待上游修复 |

## 待后续跟进

1. **esbuild/vite moderate**：nextReviewAt 2026-05-21，届时检查 vite@8 是否发布
2. **Docker digest 固化**：等待 alpine/bookworm openssl CVE-2025-15467 上游修复后，重新跑 Trivy + pin digest
3. **risk register staleRegistered 条目**：下次 audit 后可清理
