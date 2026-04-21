<template>
  <el-dialog v-model="dialogVisible" title="选择引用文档" width="640px" @open="handleOpen">
    <div class="selector-body">
      <el-input
        v-model="keyword"
        placeholder="搜索文档名称..."
        clearable
        style="margin-bottom: 12px"
        @input="handleSearch"
      />
      <div v-if="loading" class="loading-wrap">
        <el-skeleton :rows="4" animated />
      </div>
      <el-table
        v-else
        :data="documents"
        highlight-current-row
        max-height="300"
        @current-change="handleDocSelect"
      >
        <el-table-column prop="title" label="文档名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="documentNumber" label="编号" width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template v-if="selectedDoc">
        <el-divider>已选文档</el-divider>
        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item label="文档名称">{{ selectedDoc.title }}</el-descriptions-item>
          <el-descriptions-item label="文档编号">{{ selectedDoc.documentNumber }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 12px">
          <span style="font-size: 13px; color: #606266;">引用章节（可选）：</span>
          <el-input
            v-model="sectionId"
            placeholder="如: section-2.1"
            style="margin-top: 4px"
          />
        </div>
      </template>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!selectedDoc" :loading="submitting" @click="handleConfirm">
        确认引用
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

interface DocItem {
  id: string;
  title: string;
  documentNumber: string;
  status: string;
}

const props = defineProps<{
  visible: boolean;
  sourceDocId: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'success', payload: { targetDocId: string; sectionId?: string }): void;
}>();

const dialogVisible = ref(false);
const keyword = ref('');
const loading = ref(false);
const submitting = ref(false);
const documents = ref<DocItem[]>([]);
const selectedDoc = ref<DocItem | null>(null);
const sectionId = ref('');

const statusLabel = (s: string): string => {
  const m: Record<string, string> = { draft: '草稿', pending: '待审', approved: '已发布', archived: '已归档' };
  return m[s] || s;
};

const statusType = (s: string): string => {
  const m: Record<string, string> = { draft: 'info', pending: 'warning', approved: 'success', archived: 'danger' };
  return m[s] || 'info';
};

const fetchDocuments = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: DocItem[] }>('/documents', {
      params: { keyword: keyword.value || undefined, limit: 20 },
    });
    documents.value = (res.list ?? []).filter((d) => d.id !== props.sourceDocId);
  } catch {
    documents.value = [];
  } finally {
    loading.value = false;
  }
};

const handleOpen = () => {
  keyword.value = '';
  selectedDoc.value = null;
  sectionId.value = '';
  fetchDocuments();
};

let searchTimer: ReturnType<typeof setTimeout>;
const handleSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchDocuments, 400);
};

const handleDocSelect = (row: DocItem | null) => {
  selectedDoc.value = row;
};

const handleConfirm = async () => {
  if (!selectedDoc.value || !props.sourceDocId) return;
  submitting.value = true;
  try {
    await request.post(`/documents/${props.sourceDocId}/references`, {
      targetDocId: selectedDoc.value.id,
      sectionId: sectionId.value || undefined,
    });
    ElMessage.success('文档引用创建成功');
    emit('success', { targetDocId: selectedDoc.value.id, sectionId: sectionId.value || undefined });
    dialogVisible.value = false;
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '创建引用失败');
  } finally {
    submitting.value = false;
  }
};

watch(() => props.visible, (val) => { dialogVisible.value = val; });
watch(dialogVisible, (val) => { emit('update:visible', val); });
</script>

<style scoped>
.selector-body { min-height: 200px; }
.loading-wrap { padding: 16px; }
</style>
