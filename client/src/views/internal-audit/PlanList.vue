<template>
  <div class="audit-plan-list">
    <el-card>
      <template #header>
        <div class="header">
          <h2>内审计划管理</h2>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            创建计划
          </el-button>
        </div>
      </template>

      <!-- 筛选 -->
      <el-form :inline="true" :model="queryForm" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部" clearable @change="handleQuery">
            <el-option label="草稿" value="draft" />
            <el-option label="进行中" value="ongoing" />
            <el-option label="待整改" value="pending_rectification" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="queryForm.type" placeholder="全部" clearable @change="handleQuery">
            <el-option label="季度内审" value="quarterly" />
            <el-option label="半年内审" value="semiannual" />
            <el-option label="年度内审" value="annual" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="queryForm.keyword"
            placeholder="搜索标题"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading" border>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'quarterly'" type="success">季度内审</el-tag>
            <el-tag v-else-if="row.type === 'semiannual'" type="warning">半年内审</el-tag>
            <el-tag v-else type="danger">年度内审</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'draft'" type="info">草稿</el-tag>
            <el-tag v-else-if="row.status === 'ongoing'" type="primary">进行中</el-tag>
            <el-tag v-else-if="row.status === 'pending_rectification'" type="warning">待整改</el-tag>
            <el-tag v-else type="success">已完成</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核时间" width="200">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }} ~ {{ formatDate(row.endDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="auditor.name" label="内审员" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">查看</el-button>
            <el-button
              link
              type="primary"
              size="small"
              @click="handleEdit(row)"
              v-if="row.status === 'draft'"
            >
              编辑
            </el-button>
            <el-button
              link
              type="success"
              size="small"
              @click="handleStart(row)"
              v-if="row.status === 'draft'"
            >
              启动
            </el-button>
            <el-button link type="warning" size="small" @click="handleCopy(row)">复制</el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click="handleDelete(row)"
              v-if="row.status === 'draft'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleQuery"
        @current-change="handleQuery"
        class="pagination"
      />
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '创建内审计划' : '编辑内审计划'"
      width="800px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题（5-100字符）" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio value="quarterly">季度内审</el-radio>
            <el-radio value="semiannual">半年内审</el-radio>
            <el-radio value="annual">年度内审</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核时间" prop="dateRange">
          <el-date-picker
            v-model="form.dateRange"
            type="daterange"
            range-separator="~"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="内审员" prop="auditorId">
          <el-select v-model="form.auditorId" placeholder="请选择内审员" filterable>
            <el-option
              v-for="user in auditors"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="审核文档" prop="documentIds">
          <el-button @click="showDocumentSelector">选择文档（已选 {{ form.documentIds.length }} 个）</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import {
  queryAuditPlans,
  createAuditPlan,
  updateAuditPlan,
  deleteAuditPlan,
  startAuditPlan,
  copyAuditPlan,
  type AuditPlan,
} from '@/api/internal-audit/plan';

const loading = ref(false);
const tableData = ref<AuditPlan[]>([]);
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const queryForm = reactive({
  status: '',
  type: '',
  keyword: '',
});

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const submitting = ref(false);
const formRef = ref();
const form = reactive({
  id: '',
  title: '',
  type: 'quarterly',
  dateRange: [] as string[],
  auditorId: '',
  documentIds: [] as string[],
});

const auditors = ref<any[]>([]);

const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度为 5-100 字符', trigger: 'blur' },
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  dateRange: [{ required: true, message: '请选择审核时间', trigger: 'change' }],
  auditorId: [{ required: true, message: '请选择内审员', trigger: 'change' }],
  documentIds: [
    {
      required: true,
      validator: (_: any, value: string[]) => {
        if (!value || value.length === 0) {
          return Promise.reject('请至少选择 1 个文档');
        }
        return Promise.resolve();
      },
      trigger: 'change',
    },
  ],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await queryAuditPlans({
      page: pagination.page,
      limit: pagination.limit,
      ...queryForm,
    });
    tableData.value = res.items;
    pagination.total = res.total;
  } catch (error: any) {
    ElMessage.error(error.message || '获取数据失败');
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  queryForm.status = '';
  queryForm.type = '';
  queryForm.keyword = '';
  handleQuery();
};

const handleCreate = () => {
  dialogMode.value = 'create';
  Object.assign(form, {
    id: '',
    title: '',
    type: 'quarterly',
    dateRange: [],
    auditorId: '',
    documentIds: [],
  });
  dialogVisible.value = true;
};

const handleEdit = (row: AuditPlan) => {
  dialogMode.value = 'edit';
  Object.assign(form, {
    id: row.id,
    title: row.title,
    type: row.type,
    dateRange: [row.startDate, row.endDate],
    auditorId: row.auditorId,
    documentIds: row.documentIds,
  });
  dialogVisible.value = true;
};

const handleView = (row: AuditPlan) => {
  ElMessage.info('查看功能待实现');
};

const handleStart = async (row: AuditPlan) => {
  try {
    await ElMessageBox.confirm('确定要启动该内审计划吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await startAuditPlan(row.id);
    ElMessage.success('启动成功');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '启动失败');
    }
  }
};

const handleCopy = async (row: AuditPlan) => {
  try {
    await copyAuditPlan(row.id);
    ElMessage.success('复制成功');
    fetchData();
  } catch (error: any) {
    ElMessage.error(error.message || '复制失败');
  }
};

const handleDelete = async (row: AuditPlan) => {
  try {
    await ElMessageBox.confirm('确定要删除该内审计划吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await deleteAuditPlan(row.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    submitting.value = true;

    const data = {
      title: form.title,
      type: form.type,
      startDate: form.dateRange[0],
      endDate: form.dateRange[1],
      auditorId: form.auditorId,
      documentIds: form.documentIds,
    };

    if (dialogMode.value === 'create') {
      await createAuditPlan(data);
      ElMessage.success('创建成功');
    } else {
      await updateAuditPlan(form.id, data);
      ElMessage.success('更新成功');
    }

    dialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

const showDocumentSelector = () => {
  ElMessage.info('文档选择器待实现');
};

const formatDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatDateTime = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.audit-plan-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
}

.filter-form {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
