<template>
  <div class="backup-manage">
    <el-card class="page-header">
      <div class="header-content">
        <div>
          <h2>备份管理</h2>
          <p class="subtitle">手动触发和管理数据库备份</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="handleTriggerBackup('postgres')" :loading="triggering">
            触发 PostgreSQL 备份
          </el-button>
          <el-button type="success" @click="handleTriggerBackup('minio')" :loading="triggering">
            触发 MinIO 备份
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <span>备份历史</span>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="backupType" label="备份类型" width="120" :formatter="formatTypeColumn" />
        <el-table-column prop="filePath" label="文件路径" min-width="200" show-overflow-tooltip />
        <el-table-column prop="fileSize" label="文件大小" width="120" :formatter="formatSizeColumn" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'success' ? 'success' : row.status === 'running' ? 'warning' : 'danger'"
              size="small"
            >
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" :formatter="formatTimeColumn" />
        <el-table-column prop="completedAt" label="完成时间" width="160" :formatter="formatCompletedColumn" />
        <el-table-column prop="errorMessage" label="错误信息" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              type="danger"
              link
              @click="handleDelete(row)"
              :disabled="row.status === 'running'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import {
  triggerPostgresBackup,
  triggerMinIOBackup,
  queryBackupHistory,
  deleteBackup,
  type BackupRecord,
} from '@/api/backup';

const loading = ref(false);
const triggering = ref(false);

const pagination = reactive({ page: 1, limit: 20, total: 0 });
const tableData = ref<BackupRecord[]>([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const { items, total } = await queryBackupHistory({
      page: pagination.page,
      limit: pagination.limit,
    });
    tableData.value = items;
    pagination.total = total;
  } catch (error) {
    ElMessage.error('查询备份历史失败');
  } finally {
    loading.value = false;
  }
};

const handleTriggerBackup = async (type: 'postgres' | 'minio') => {
  triggering.value = true;
  try {
    if (type === 'postgres') {
      await triggerPostgresBackup();
    } else {
      await triggerMinIOBackup();
    }
    ElMessage.success('备份任务已启动');
    fetchData();
  } catch (error) {
    ElMessage.error('触发备份失败');
  } finally {
    triggering.value = false;
  }
};

const handleDelete = async (row: BackupRecord) => {
  try {
    await ElMessageBox.confirm('确定删除此备份吗？', '提示', { type: 'warning' });
    await deleteBackup(row.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    // User cancelled
  }
};

const formatTypeColumn = (row: BackupRecord) => {
  const map = { postgres: 'PostgreSQL', minio: 'MinIO' };
  return map[row.backupType] || row.backupType;
};

const formatSizeColumn = (row: BackupRecord) => {
  const size = row.fileSize;
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = { running: '运行中', success: '成功', failed: '失败' };
  return map[status] || status;
};

const formatTimeColumn = (row: BackupRecord) => dayjs(row.createdAt).format('YYYY-MM-DD HH:mm:ss');
const formatCompletedColumn = (row: BackupRecord) =>
  row.completedAt ? dayjs(row.completedAt).format('YYYY-MM-DD HH:mm:ss') : '-';

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.backup-manage {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  font-size: 24px;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
