# Layer 4 运维 - 业务规则汇总

> **来源**: DESIGN.md 第二十一章（系统运维与监控设计）  
> **文档版本**: 1.0  
> **最后更新**: 2026-02-14  
> **规则编号范围**: BR-261 ~ BR-272  
> **规则总数**: 12 条

---

## 目录

- [1. 数据备份规则（BR-261 ~ BR-263）](#1-数据备份规则br-261--br-263)
- [2. 系统监控规则（BR-264 ~ BR-268）](#2-系统监控规则br-264--br-268)
- [3. 审计日志规则（BR-269 ~ BR-272）](#3-审计日志规则br-269--br-272)

---

## 1. 数据备份规则（BR-261 ~ BR-263）

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-261 | **PostgreSQL 自动备份**: 每天凌晨 2:00 自动备份数据库，保留 7 天 | Docker 容器定时任务，使用 pg_dump --format=custom --compress=9 |
| BR-262 | **MinIO 文件自动备份**: 每天凌晨 3:00 自动备份所有文件，保留 7 天 | Docker 容器定时任务，使用 mc mirror 镜像备份 |
| BR-263 | **备份恢复目标**: RPO（恢复点目标）24 小时，RTO（恢复时间目标）2 小时 | 备份策略保障 + 每月灾难恢复演练 |

---

## 2. 系统监控规则（BR-264 ~ BR-268）

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-264 | **Prometheus 指标保留**: 监控指标数据保留 30 天 | Prometheus TSDB 配置 `--storage.tsdb.retention.time=30d` |
| BR-265 | **Loki 日志保留**: 应用日志保留 30 天 | Loki 配置 `retention_period: 720h` |
| BR-266 | **API 响应时间告警**: API P99 响应时间 > 2 秒持续 5 分钟时触发告警 | Prometheus 告警规则 `histogram_quantile(0.99, ...) > 2` |
| BR-267 | **HTTP 错误率告警**: HTTP 5xx 错误率 > 5% 持续 2 分钟时触发告警 | Prometheus 告警规则 `rate(...{status=~"5.."}) / rate(...) > 0.05` |
| BR-268 | **暴力破解检测**: 登录失败次数 > 10 次/分钟持续 2 分钟时触发告警（疑似暴力破解） | Prometheus 告警规则 `rate(doc_system_login_failures_total[1m]) > 10` |

---

## 3. 审计日志规则（BR-269 ~ BR-272）

| 编号 | 规则 | 实现方式 |
|------|------|----------|
| BR-269 | **日志保留时长**: 登录日志保留 90 天；权限变更日志和敏感操作日志永久保留；普通操作日志保留 30 天 | 定时归档任务（每月 1 号执行） |
| BR-270 | **敏感操作必须记录**: 所有敏感操作（文档删除、数据导出、审批）必须记录审计日志 | SensitiveLog 拦截器自动记录 |
| BR-271 | **灾难恢复演练**: 每月执行一次灾难恢复演练，验证备份可用性和恢复流程 | 运维流程（模拟数据库损坏 + 完整系统恢复） |
| BR-272 | **审计日志归档**: 超过保留时长的审计日志归档到 MinIO audit-archive 桶 | 定时任务导出 JSON 文件上传到 MinIO |

---

## 规则实施检查清单

### 数据备份验证

```bash
# 验证 PostgreSQL 备份
ls -lh backups/postgres/
docker exec doc_postgres_backup bash -c 'find /backups -name "backup_*.dump" -mtime -1'

# 验证 MinIO 备份
ls -lh backups/minio/
docker exec doc_minio_backup mc ls local/documents
```

### 监控告警验证

```bash
# 访问 Prometheus 告警规则
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.name | contains("High"))'

# 访问 Grafana 仪表板
open http://localhost:3001  # 默认账号 admin/admin

# 验证 /metrics 端点
curl http://localhost:3000/metrics | grep doc_system
```

### 审计日志验证

```sql
-- 验证登录日志记录
SELECT COUNT(*) FROM login_logs WHERE login_time > NOW() - INTERVAL '1 day';

-- 验证权限变更日志记录
SELECT COUNT(*) FROM permission_logs WHERE created_at > NOW() - INTERVAL '1 day';

-- 验证敏感操作日志记录
SELECT COUNT(*) FROM sensitive_logs WHERE created_at > NOW() - INTERVAL '1 day';

-- 验证日志保留时长
SELECT 
  (SELECT MIN(login_time) FROM login_logs) AS oldest_login_log,
  (SELECT MIN(created_at) FROM permission_logs) AS oldest_permission_log,
  (SELECT MIN(created_at) FROM sensitive_logs) AS oldest_sensitive_log;
```

---

## 运维命令速查

### 备份相关

```bash
# 手动触发 PostgreSQL 备份
docker exec doc_postgres_backup bash -c 'PGPASSWORD=${POSTGRES_PASSWORD} pg_dump -h postgres -U ${POSTGRES_USER} -d document_system --format=custom > /backups/manual_$(date +%Y%m%d_%H%M%S).dump'

# 手动触发 MinIO 备份
docker exec doc_minio_backup mc mirror local/documents /backups/$(date +%Y%m%d)/documents

# 恢复 PostgreSQL 数据库
docker-compose stop server
docker exec -i doc_postgres pg_restore -U postgres -d document_system --clean --if-exists < backups/postgres/backup_20260212_020000.dump
docker-compose start server

# 恢复 MinIO 文件
docker exec doc_minio_backup mc mirror /backups/20260212/documents local/documents
```

### 监控相关

```bash
# 查看 Prometheus 目标状态
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# 查看当前告警
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.state == "firing")'

# 查看 Grafana 日志
docker-compose logs -f grafana

# 重载 Prometheus 配置
curl -X POST http://localhost:9090/-/reload
```

### 审计日志相关

```bash
# 导出登录日志（最近 7 天）
curl -X POST http://localhost:3000/api/v1/audit/login-logs/export \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-02-07", "endDate": "2026-02-14"}' \
  -o login_logs.xlsx

# 导出权限变更日志
curl -X POST http://localhost:3000/api/v1/audit/permission-logs/export \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2026-02-01", "endDate": "2026-02-14"}' \
  -o permission_logs.xlsx

# 查看审计仪表板统计
curl http://localhost:3000/api/v1/audit/dashboard \
  -H "Authorization: Bearer <token>" | jq
```

---

## BRCGS 合规要点

| BRCGS 条款 | 要求 | 系统实现 | 对应规则 |
|-----------|------|---------|----------|
| **3.5.2 记录修改** | 所有记录修改必须记录历史版本 | RecordChangeLog 表自动记录 | BR-270 |
| **3.5.3 权限变更** | 所有权限变更必须有审计日志 | PermissionLog 表永久保留 | BR-270 |
| **3.5.4 登录日志** | 所有用户登录必须记录 | LoginLog 表保留 90 天 | BR-269 |
| **3.11.1 数据备份** | 关键数据必须定期备份 | PostgreSQL/MinIO 每日备份 | BR-261, BR-262 |
| **3.11.2 灾难恢复** | 必须有灾难恢复计划 | 每月演练，2 小时内恢复 | BR-263, BR-271 |

---

**本文档完成 ✅**
