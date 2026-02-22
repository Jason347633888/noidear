<template>
  <div class="requisition-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" clearable placeholder="全部">
            <el-option value="draft" label="草稿" />
            <el-option value="submitted" label="已提交" />
            <el-option value="approved" label="已批准" />
            <el-option value="rejected" label="已驳回" />
            <el-option value="completed" label="已完成" />
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
          <span>领料单管理</span>
          <el-button type="primary" @click="router.push('/warehouse/requisitions/create')">
            创建领料单
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="number" label="单号" width="160" />
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">{{ row.requester?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="部门" width="120">
          <template #default="{ row }">{{ row.department?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="reqStatusType(row.status)" size="small">{{ reqStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'draft'"
              link type="primary" @click="handleSubmit(row)"
            >提交</el-button>
            <el-button
              v-if="row.status === 'submitted'"
              link type="success" @click="handleApprove(row, 'approved')"
            >批准</el-button>
            <el-button
              v-if="row.status === 'submitted'"
              link type="danger" @click="handleApprove(row, 'rejected')"
            >驳回</el-button>
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
import { requisitionApi } from '@/api/warehouse';

const router = useRouter();
const loading = ref(false);
const tableData = ref<any[]>([]);
const filterForm = reactive({ status: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const reqStatusText = (s: string) => ({ draft: '草稿', submitted: '已提交', approved: '已批准', rejected: '已驳回', completed: '已完成' }[s] || s);
const reqStatusType = (s: string) => ({ draft: 'info', submitted: 'warning', approved: 'success', rejected: 'danger', completed: 'primary' }[s] || 'info');

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await requisitionApi.getList({
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status || undefined,
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取领料单列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.status = ''; handleSearch(); };

const handleSubmit = async (row: any) => {
  try {
    await requisitionApi.submit(row.id);
    ElMessage.success('提交成功');
    fetchData();
  } catch (error) {
    ElMessage.error('提交失败');
  }
};

const handleApprove = async (row: any, action: 'approved' | 'rejected') => {
  const msg = action === 'approved' ? '确定批准该领料单？' : '确定驳回该领料单？';
  try {
    await ElMessageBox.confirm(msg, '确认');
    await requisitionApi.approve(row.id, action);
    ElMessage.success(action === 'approved' ? '已批准' : '已驳回');
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
