<template>
  <div class="task-list">
    <el-page-header title="任务管理" @back="$router.back()" />
    <el-table :data="taskList" v-loading="loading">
      <el-table-column prop="id" label="ID" />
      <el-table-column prop="name" label="任务名称" />
      <el-table-column prop="status" label="状态" />
      <el-table-column prop="deadline" label="截止日期" />
    </el-table>
    <el-empty v-if="!loading && taskList.length === 0" description="暂无任务" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import request from '@/api/request';

const loading = ref(false);
const taskList = ref([]);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await request.get('/tasks');
    taskList.value = res.data?.list || [];
  } catch (error) {
    console.error('获取任务列表失败:', error);
  } finally {
    loading.value = false;
  }
});
</script>
