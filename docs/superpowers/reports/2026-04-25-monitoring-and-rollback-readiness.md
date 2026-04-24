# Monitoring And Rollback Readiness

**Date:** 2026-04-25

## Monitoring Signals

| Signal | Source | Threshold | Owner |
| --- | --- | --- | --- |
| 服务健康 | GET /health | 200 OK | 系统管理员 |
| 数据库连接 | Prisma health check | < 2s response | 后端负责人 |
| 追溯查询延迟 | POST /traceability/query | < 3s p99 | 后端负责人 |
| 前端构建哈希 | Vite build manifest | 版本一致 | 前端负责人 |
| 错误日志率 | Server logs | < 1% 5xx | 系统管理员 |

## Error Logs

- Server error logs: Docker container logs (`docker logs noidear-server`)
- Database error logs: PostgreSQL logs
- Frontend console errors: Browser DevTools / Sentry (if configured)
- Access logs: Nginx / reverse proxy

## Stop-Run Triggers

内测试运行期间，以下任一条件触发立即停运：

1. 追溯查询持续返回 5xx 错误
2. 数据库连接断开 > 30 秒
3. 权限越权访问被发现
4. 数据完整性问题（批次数据丢失或污染）
5. 关键合规功能（召回评估、偏差联动）不可用

## Rollback Triggers

以下情况触发回滚：

1. 停运触发条件无法在 2 小时内修复
2. 数据库迁移导致数据损坏
3. 权限系统失效导致未授权访问

## Rollback Procedure

1. 切换 Nginx 到上一版本的静态文件
2. 执行 `docker-compose down && git checkout <previous-tag> && docker-compose up -d`
3. 如有数据库迁移，执行 `npx prisma migrate resolve --rolled-back <migration-name>`
4. 通知内测试用户

## Rollback Owners

| 角色 | 负责人 | 联系方式 |
| --- | --- | --- |
| 技术负责人 | TBD | TBD |
| 数据库管理员 | TBD | TBD |
| 系统管理员 | TBD | TBD |
