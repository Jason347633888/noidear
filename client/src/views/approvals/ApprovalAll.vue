<template>
  <div class="approval-all">
    <el-page-header title="全部审批" @back="$router.back()" />
    <el-table :data="approvalList" v-loading="loading">
      <el-table-column prop="id" label="ID" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="status" label="状态" />
      <el-table-column prop="createdAt" label="创建时间" />
    </el-table>
    <el-empty v-if="!loading && approvalList.length === 0" description="暂无审批记录" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import request from '@/api/request';

const loading = ref(false);
const approvalList = ref([]);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await request.get('/approvals');
    approvalList.value = res.data?.list || [];
  } catch (error) {
    console.error('获取审批列表失败:', error);
  } finally {
    loading.value = false;
  }
});
</script>
