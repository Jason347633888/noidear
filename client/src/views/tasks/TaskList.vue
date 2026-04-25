<template>
  <div class="task-list">
    <div class="task-list__header">
      <el-page-header title="任务管理" @back="$router.back()" />
      <el-button type="primary" @click="router.push('/tasks/create')">新建任务</el-button>
    </div>
    <el-table :data="taskList" v-loading="loading">
      <el-table-column prop="id" label="ID" />
      <el-table-column prop="name" label="任务名称" />
      <el-table-column prop="status" label="状态" />
      <el-table-column prop="deadline" label="截止日期" />
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button class="action-btn" link type="primary" @click="router.push({ name: 'TaskDetail', params: { id: row.id } })">查看</el-button>
          <el-button
            v-if="row.status === 'pending'"
            class="action-btn"
            link
            type="danger"
            @click="handleCancelTask(row)"
          >取消</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && taskList.length === 0" description="暂无任务" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';

const router = useRouter();
const loading = ref(false);
const taskList = ref([]);

async function loadTasks() {
  loading.value = true;
  try {
    const res = await request.get<{ list?: any[] }>('/tasks');
    taskList.value = (res as any).list || [];
  } catch (error) {
    console.error('获取任务列表失败:', error);
  } finally {
    loading.value = false;
  }
}

async function handleCancelTask(row: any) {
  try {
    await ElMessageBox.confirm('确定要取消该任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await request.post(`/tasks/${row.id}/cancel`);
    ElMessage.success('任务已取消');
    await loadTasks();
  } catch {
    // user dismissed or request failed silently
  }
}

onMounted(loadTasks);
</script>

<style scoped>
.task-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
