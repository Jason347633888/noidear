<template>
  <div class="system-file-library">
    <aside class="library-tree">
      <button
        v-for="folder in folders"
        :key="folder.value"
        class="folder-button"
        :class="{ active: filters.sourceFolder === folder.value }"
        @click="selectFolder(folder.value)"
      >
        <strong>{{ folder.value }}</strong>
        <span>{{ folder.label }}</span>
      </button>
    </aside>

    <main class="library-main">
      <div class="toolbar">
        <el-input v-model="filters.keyword" placeholder="搜索编号、标题、正文" clearable @keyup.enter="searchDocuments" />
        <el-select v-model="filters.documentType" clearable placeholder="文件类型">
          <el-option v-for="type in documentTypes" :key="type.value" :value="type.value" :label="type.label" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="状态">
          <el-option value="effective" label="有效" />
          <el-option value="draft" label="草稿" />
          <el-option value="pending_review" label="待审核" />
          <el-option value="archived" label="归档" />
          <el-option value="obsolete" label="作废" />
        </el-select>
        <el-button type="primary" @click="searchDocuments">搜索</el-button>
      </div>

      <el-table :data="documents" v-loading="loading" stripe>
        <el-table-column prop="number" label="编号" width="160" />
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column label="类型" width="150">
          <template #default="{ row }">{{ typeLabel(row.document_type) }}</template>
        </el-table-column>
        <el-table-column prop="owner_department" label="负责部门" width="140" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><el-tag>{{ row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="复审日期" width="140">
          <template #default="{ row }">{{ formatDate(row.review_due_date) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/documents/${row.id}`)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { documentControlApi, type DocumentControlDocument } from '@/api/document-control';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const documents = ref<DocumentControlDocument[]>([]);
const pagination = reactive({
  page: 1,
  limit: 50,
  total: 0,
});

const folders = [
  { value: '01', label: '管理手册' },
  { value: '02', label: '程序文件' },
  { value: '03', label: '作业指导书' },
  { value: '05', label: '公司文件' },
  { value: '06', label: '外来文件' },
];

const documentTypes = [
  { value: 'MANUAL', label: '管理手册' },
  { value: 'PROCEDURE', label: '程序文件' },
  { value: 'WORK_INSTRUCTION', label: '作业指导书' },
  { value: 'COMPANY_FILE', label: '公司文件' },
  { value: 'EXTERNAL_FILE', label: '外来文件' },
];
const systemLibraryDocumentTypes = new Set(documentTypes.map((item) => item.value));

const filters = reactive({
  sourceFolder: '',
  documentType: '',
  status: '',
  keyword: '',
  dueWithinDays: undefined as number | undefined,
  issue: '',
});

const typeLabel = (type?: string) => documentTypes.find((item) => item.value === type)?.label || '-';
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('zh-CN') : '-';

const selectFolder = (folder: string) => {
  filters.sourceFolder = folder;
  pagination.page = 1;
  fetchDocuments();
};

const searchDocuments = () => {
  pagination.page = 1;
  fetchDocuments();
};

const handlePageChange = (page: number) => {
  pagination.page = page;
  fetchDocuments();
};

const handlePageSizeChange = (limit: number) => {
  pagination.limit = limit;
  pagination.page = 1;
  fetchDocuments();
};

const fetchDocuments = async () => {
  loading.value = true;
  try {
    const res = await documentControlApi.listDocuments({
      sourceFolder: filters.sourceFolder || undefined,
      documentType: filters.documentType || undefined,
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
      dueWithinDays: filters.dueWithinDays,
      issue: filters.issue || undefined,
      page: pagination.page,
      limit: pagination.limit,
    });
    documents.value = res.list.filter(
      (document) =>
        document.source_folder !== '04' &&
        document.document_type !== 'RECORD_FORM_INDEX' &&
        (!document.document_type || systemLibraryDocumentTypes.has(document.document_type)),
    );
    pagination.total = res.total;
  } catch {
    ElMessage.error('获取体系文件失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (route.query.issue === 'expiringExternalFiles') {
    filters.documentType = 'EXTERNAL_FILE';
  }
  if (route.query.issue === 'dueForReview') {
    filters.status = 'effective';
    filters.dueWithinDays = 30;
  }
  if (route.query.issue === 'missingMetadata') {
    filters.issue = 'missingMetadata';
  }
  fetchDocuments();
});
</script>

<style scoped>
.system-file-library {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
}

.library-tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.folder-button {
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 6px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.folder-button.active {
  border-color: #409eff;
  color: #1677d2;
}

.folder-button span {
  margin-left: 8px;
  font-size: 12px;
  color: #606266;
}

.library-main {
  min-width: 0;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 180px 150px auto;
  gap: 10px;
  margin-bottom: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
