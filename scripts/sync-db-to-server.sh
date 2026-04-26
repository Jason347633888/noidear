#!/bin/bash
# 将本地数据库同步到腾讯云测试服务器
# 用法: ./scripts/sync-db-to-server.sh

set -e

SERVER="119.91.216.201"
SSH_KEY="$HOME/.ssh/noidear.pem"
REMOTE_USER="ubuntu"
LOCAL_CONTAINER="noidear-postgres"   # 本地 Docker 容器名
REMOTE_CONTAINER="noidear-postgres"  # 远端 Docker 容器名
DB_USER="noidear"
DB_NAME="document_system"
DUMP_FILE="/tmp/noidear_sync_$(date +%Y%m%d_%H%M%S).sql"

echo "==> [1/5] 导出本地数据库..."
docker exec "$LOCAL_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$DUMP_FILE"
echo "    导出完成: $DUMP_FILE ($(wc -l < "$DUMP_FILE") 行)"

echo "==> [2/5] 上传到服务器..."
scp -i "$SSH_KEY" "$DUMP_FILE" "${REMOTE_USER}@${SERVER}:/tmp/noidear_sync.sql"
echo "    上传完成"

echo "==> [3/5] 停止远端 NestJS 服务..."
ssh -i "$SSH_KEY" "${REMOTE_USER}@${SERVER}" "sudo docker stop noidear-server 2>/dev/null || true"

echo "==> [4/5] 重建远端数据库并导入..."
ssh -i "$SSH_KEY" "${REMOTE_USER}@${SERVER}" "
  sudo docker exec $REMOTE_CONTAINER psql -U $DB_USER -d postgres -c 'DROP DATABASE IF EXISTS $DB_NAME;'
  sudo docker exec $REMOTE_CONTAINER psql -U $DB_USER -d postgres -c 'CREATE DATABASE $DB_NAME;'
  sudo docker cp /tmp/noidear_sync.sql $REMOTE_CONTAINER:/tmp/noidear_sync.sql
  sudo docker exec $REMOTE_CONTAINER psql -U $DB_USER -d $DB_NAME -f /tmp/noidear_sync.sql 2>&1 | grep -v 'already exists' | grep ERROR || true
  echo '    导入完成'
"

echo "==> [5/5] 重启远端 NestJS 服务..."
ssh -i "$SSH_KEY" "${REMOTE_USER}@${SERVER}" "sudo docker start noidear-server"

# 清理本地临时文件
rm -f "$DUMP_FILE"

echo ""
echo "✓ 同步完成！访问 http://$SERVER"
