<template>
  <el-card class="recommended-documents">
    <template #header>
      <div class="card-header">
        <span class="card-title">{{ title }}</span>
      </div>
    </template>

    <div v-loading="loading">
      <el-empty v-if="!loading && documents.length === 0" description="暂无推荐" />
      <div v-else class="doc-list">
        <div
          v-for="doc in documents.slice(0, maxCount)"
          :key="doc.id"
          class="doc-item"
          @click="handleClick(doc.id)"
        >
          <div class="doc-info">
            <div class="doc-title">{{ doc.title }}</div>
            <div class="doc-meta">
              <el-tag size="small" type="info">{{ doc.type }}</el-tag>
              <span class="doc-department">{{ doc.department }}</span>
              <span class="doc-date">{{ formatDate(doc.updatedAt) }}</span>
            </div>
            <div v-if="doc.reason" class="doc-reason">
              <el-icon><InfoFilled /></el-icon>
              {{ doc.reason }}
            </div>
          </div>
          <div class="doc-score">
            <el-tag type="warning" size="small">{{ Math.round(doc.score) }}分</el-tag>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { InfoFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import recommendationApi from '@/api/recommendation';
import type { RecommendedDocument } from '@/api/recommendation';

const props = withDefaults(defineProps<{
  title?: string;
  maxCount?: number;
}>(), {
  title: '推荐文档',
  maxCount: 10,
});

const router = useRouter();
const loading = ref(false);
const documents = ref<RecommendedDocument[]>([]);

onMounted(() => {
  fetchRecommendations();
});

async function fetchRecommendations() {
  loading.value = true;
  try {
    documents.value = await recommendationApi.getMyRecommendations();
  } catch {
    ElMessage.error('获取推荐文档失败');
  } finally {
    loading.value = false;
  }
}

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD');
}

function handleClick(id: string) {
  recommendationApi.trackView(id, 0).catch(() => { /* non-blocking */ });
  router.push(`/documents/${id}`);
}
</script>

<style scoped>
.recommended-documents {
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.doc-item:hover {
  background: #f5f7fa;
}

.doc-info {
  flex: 1;
}

.doc-title {
  font-size: 14px;
  font-weight: 500;
  color: #1890ff;
  margin-bottom: 4px;
}

.doc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.doc-reason {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #888;
}
</style>
