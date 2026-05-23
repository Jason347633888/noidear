<template>
  <div class="no-access">
    <el-result
      icon="warning"
      title="模块未开放"
      :sub-title="subTitle"
    >
      <template #extra>
        <el-button @click="goBack">返回上一页</el-button>
        <el-button type="primary" @click="goHome">回到首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const subTitle = computed(() => {
  const mod = route.query.module as string;
  return mod ? `模块 "${mod}" 当前角色无权访问或已关闭` : '您无权访问此功能模块';
});

const goBack = () => router.back();
const goHome = () => router.push('/dashboard');
</script>

<style scoped>
.no-access {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
</style>
