<template>
  <div class="document-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="文档级别">
          <el-select v-model="filterForm.level" disabled>
            <el-option :value="1" label="一级文件" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="搜索标题或编号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" clearable placeholder="全部">
            <el-option value="draft" label="草稿" />
            <el-option value="pending" label="待审批" />
            <el-option value="approved" label="已发布" />
            <el-option value="rejected" label="已驳回" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>一级文件列表</span>
          <el-button type="primary" @click="$router.push('/documents/upload/1')">
            上传文档
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="number" label="文档编号" width="180" />
        <el-table-column prop="title" label="文档标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="fileName" label="文件名" width="200" show-overflow-tooltip />
        <el-table-column prop="fileSize" label="大小" width="100">
          <template #default="{ row }">
            {{ formatSize(Number(row.fileSize)) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" width="100">
          <template #default="{ row }">
            {{ row.creator?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button
              link
              type="primary"
              v-if="row.status === 'draft'"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="success"
              v-if="row.status === 'draft'"
              @click="handleSubmit(row)"
            >
              提交审批
            </el-button>
            <el-button
              link
              type="danger"
              v-if="row.status === 'draft'"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';

interface Document {
  id: string;
  number: string;
  title: string;
  fileName: string;
  fileSize: string;
  status: string;
  creator: { name: string } | null;
  createdAt: string;
}

const router = useRouter();
const loading = ref(false);
const tableData = ref<Document[]>([]);

const filterForm = reactive({
  level: 1,
  keyword: '',
  status: '',
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleString('zh-CN');
};

const getStatusType = (status: string): string => {
  const map: Record<string, string> = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  };
  return map[status] || 'info';
};

const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    draft: '草稿',
    pending: '待审批',
    approved: '已发布',
    rejected: '已驳回',
  };
  return map[status] || status;
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: Document[]; total: number }>('/documents', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        level: filterForm.level,
        keyword: filterForm.keyword || undefined,
        status: filterForm.status || undefined,
      },
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取文档列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.keyword = '';
  filterForm.status = '';
  handleSearch();
};

const handleView = (row: Document) => {
  router.push(`/documents/${row.id}`);
};

const handleEdit = (row: Document) => {
  router.push(`/documents/${row.id}/edit`);
};

const handleSubmit = async (row: Document) => {
  try {
    await ElMessageBox.confirm('确定要提交该文档进行审批吗？', '提示');
    await request.post(`/documents/${row.id}/submit`);
    ElMessage.success('提交成功');
    fetchData();
  } catch (error) {
    // 用户取消
  }
};

const handleDelete = async (row: Document) => {
  try {
    await ElMessageBox.confirm('确定要删除该文档吗？此操作不可恢复。', '警告', {
      type: 'warning',
    });
    await request.delete(`/documents/${row.id}`);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    // 用户取消
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.document-list {
  padding: 0;
}

.filter-card {
  margin-bottom: 16px;
}

.table-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
