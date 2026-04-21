<template>
  <div class="reference-block">
    <el-card class="ref-card" shadow="never">
      <template #header>
        <div class="ref-header">
          <el-icon class="ref-icon"><Link /></el-icon>
          <span class="ref-title">引用自：{{ ref.targetDoc?.title || '加载中...' }}</span>
          <div class="ref-actions">
            <el-tooltip :content="`最后同步：${syncedAtLabel}`">
              <el-icon class="sync-icon"><Clock /></el-icon>
            </el-tooltip>
            <el-button link size="small" :loading="refreshing" @click="handleRefresh">
              刷新
            </el-button>
          </div>
        </div>
      </template>
      <div v-if="ref.snapshot" class="ref-content">
        {{ ref.snapshot }}
      </div>
      <el-empty v-else description="引用内容为空" :image-size="40" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref as vRef, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Link, Clock } from '@element-plus/icons-vue';
import request from '@/api/request';

interface DocRef {
  id: string;
  sourceDocId: string;
  targetDocId: string;
  sectionId?: string;
  snapshot?: string;
  syncedAt?: string;
  targetDoc?: { id: string; title: string };
}

const props = defineProps<{
  ref: DocRef;
}>();

const emit = defineEmits<{
  (e: 'refreshed', updated: DocRef): void;
}>();

const refreshing = vRef(false);

const syncedAtLabel = computed(() => {
  if (!props.ref.syncedAt) return '从未同步';
  return new Date(props.ref.syncedAt).toLocaleString('zh-CN');
});

const handleRefresh = async () => {
  refreshing.value = true;
  try {
    const res = await request.post<DocRef>(`/documents/${props.ref.sourceDocId}/references/${props.ref.id}/sync`);
    ElMessage.success('引用内容已刷新');
    emit('refreshed', res);
  } catch {
    ElMessage.error('刷新引用内容失败');
  } finally {
    refreshing.value = false;
  }
};
</script>

<style scoped>
.reference-block { margin: 8px 0; }

.ref-card {
  border-left: 3px solid #409eff;
  background: #f0f7ff;
}

.ref-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ref-icon { color: #409eff; }

.ref-title {
  flex: 1;
  font-weight: 500;
  font-size: 13px;
  color: #303133;
}

.ref-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sync-icon {
  color: #909399;
  cursor: help;
}

.ref-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  padding: 4px 0;
  white-space: pre-wrap;
}
</style>
