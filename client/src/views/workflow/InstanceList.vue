<template>
  <div class="workflow-instance-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" clearable placeholder="全部">
            <el-option value="pending" label="待处理" />
            <el-option value="in_progress" label="进行中" />
            <el-option value="completed" label="已完成" />
            <el-option value="rejected" label="已驳回" />
            <el-option value="cancelled" label="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务类型">
          <el-select v-model="filterForm.businessType" clearable placeholder="全部">
            <el-option value="document" label="文档审批" />
            <el-option value="task" label="任务审批" />
            <el-option value="requisition" label="领料审批" />
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
          <span>工作流实例</span>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="实例ID" width="100" show-overflow-tooltip />
        <el-table-column label="模板" min-width="180">
          <template #default="{ row }">
            {{ row.template?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="businessType" label="业务类型" width="120" />
        <el-table-column prop="currentStep" label="当前步骤" width="100">
          <template #default="{ row }">
            第 {{ row.currentStep + 1 }} 步
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTypeMap[row.status]" size="small">
              {{ statusTextMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发起人" width="120">
          <template #default="{ row }">
            {{ row.initiator?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/workflow/instances/${row.id}`)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'pending' || row.status === 'in_progress'"
              link
              type="danger"
              @click="handleCancel(row)"
            >
              取消
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
import workflowApi, { type WorkflowInstance } from '@/api/workflow';

const router = useRouter();
const loading = ref(false);
const tableData = ref<WorkflowInstance[]>([]);

const statusTextMap: Record<string, string> = {
  pending: '待处理', in_progress: '进行中', completed: '已完成', rejected: '已驳回', cancelled: '已取消',
};
const statusTypeMap: Record<string, string> = {
  pending: 'warning', in_progress: 'primary', completed: 'success', rejected: 'danger', cancelled: 'info',
};

const filterForm = reactive({ status: '', businessType: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await workflowApi.getInstances({
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status || undefined,
      businessType: filterForm.businessType || undefined,
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取工作流实例列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.status = ''; filterForm.businessType = ''; handleSearch(); };

const handleCancel = async (row: WorkflowInstance) => {
  try {
    await ElMessageBox.confirm('确定要取消该工作流实例吗？', '警告', { type: 'warning' });
    await workflowApi.cancelInstance(row.id);
    ElMessage.success('已取消');
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
