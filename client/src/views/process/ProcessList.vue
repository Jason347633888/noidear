<template>
  <div class="process-list">
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>产品研发流程</span>
          <el-button type="primary" @click="handleCreate" :loading="creating">
            新建研发流程
          </el-button>
        </div>
      </template>

      <el-table :data="instances" v-loading="loading" stripe>
        <el-table-column prop="productName" label="产品名称" min-width="200">
          <template #default="{ row }">
            {{ row.productName || '（未命名）' }}
          </template>
        </el-table-column>
        <el-table-column label="当前步骤" width="120">
          <template #default="{ row }">
            Step {{ row.currentStep }} / 9
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建人" width="120">
          <template #default="{ row }">{{ row.createdBy?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/process/instances/${row.id}`)">
              查看/填写
            </el-button>
            <el-button link type="info" @click="router.push(`/process/instances/${row.id}/print`)">
              打印
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          :page-size="20"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadInstances"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { processApi, type ProcessInstance } from '@/api/process';

const router = useRouter();
const instances = ref<ProcessInstance[]>([]);
const loading = ref(false);
const creating = ref(false);
const total = ref(0);
const page = ref(1);

const statusType = (s: string) =>
  ({ DRAFT: 'info', IN_PROGRESS: 'warning', COMPLETED: 'success', REJECTED: 'danger' }[s] ?? 'info');

const statusText = (s: string) =>
  ({ DRAFT: '草稿', IN_PROGRESS: '进行中', COMPLETED: '已完成', REJECTED: '已驳回' }[s] ?? s);

const loadInstances = async () => {
  loading.value = true;
  try {
    const res = await processApi.listInstances();
    instances.value = Array.isArray(res) ? res : [];
    total.value = instances.value.length;
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const handleCreate = async () => {
  creating.value = true;
  try {
    const tpl = await processApi.getDefaultTemplate();
    const inst = await processApi.createInstance(tpl.id, '新产品研发');
    router.push(`/process/instances/${inst.id}`);
  } catch {
    ElMessage.error('创建失败');
  } finally {
    creating.value = false;
  }
};

const handleDelete = async (row: ProcessInstance) => {
  await ElMessageBox.confirm(`确认删除"${row.productName || '该流程'}"？`, '删除确认', {
    type: 'warning',
  });
  try {
    await processApi.deleteInstance(row.id);
    ElMessage.success('已删除');
    await loadInstances();
  } catch {
    ElMessage.error('删除失败');
  }
};

onMounted(loadInstances);
</script>

<style scoped>
.process-list { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
