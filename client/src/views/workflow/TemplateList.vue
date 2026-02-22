<template>
  <div class="workflow-template-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" clearable placeholder="全部">
            <el-option value="draft" label="草稿" />
            <el-option value="active" label="已发布" />
            <el-option value="archived" label="已归档" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="filterForm.category" clearable placeholder="搜索分类" />
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
          <span>工作流模板</span>
          <el-button type="primary" @click="router.push('/workflow/templates/create')">
            创建模板
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="name" label="模板名称" min-width="180" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTypeMap[row.status]" size="small">
              {{ statusTextMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/workflow/templates/${row.id}/edit`)">
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'draft'"
              link
              type="success"
              @click="handlePublish(row)"
            >
              发布
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              link
              type="warning"
              @click="handleArchive(row)"
            >
              归档
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">
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
import workflowApi, { type WorkflowTemplate } from '@/api/workflow';

const router = useRouter();
const loading = ref(false);
const tableData = ref<WorkflowTemplate[]>([]);

const statusTextMap: Record<string, string> = {
  draft: '草稿',
  active: '已发布',
  archived: '已归档',
};

const statusTypeMap: Record<string, string> = {
  draft: 'info',
  active: 'success',
  archived: 'warning',
};

const filterForm = reactive({ status: '', category: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await workflowApi.getTemplates({
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status || undefined,
      category: filterForm.category || undefined,
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取工作流模板列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.status = ''; filterForm.category = ''; handleSearch(); };

const handlePublish = async (row: WorkflowTemplate) => {
  try {
    await ElMessageBox.confirm('确定要发布该模板吗？发布后可用于创建工作流实例。', '确认');
    await workflowApi.publishTemplate(row.id);
    ElMessage.success('发布成功');
    fetchData();
  } catch (error) { /* 取消 */ }
};

const handleArchive = async (row: WorkflowTemplate) => {
  try {
    await ElMessageBox.confirm('确定要归档该模板吗？归档后不可再用于创建新实例。', '确认');
    await workflowApi.archiveTemplate(row.id);
    ElMessage.success('归档成功');
    fetchData();
  } catch (error) { /* 取消 */ }
};

const handleDelete = async (row: WorkflowTemplate) => {
  try {
    await ElMessageBox.confirm('确定要删除该模板吗？此操作不可恢复。', '警告', { type: 'warning' });
    await workflowApi.deleteTemplate(row.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) { /* 取消 */ }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
