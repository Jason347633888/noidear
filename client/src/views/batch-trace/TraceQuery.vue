<template>
  <el-result
    icon="info"
    title="入口已收敛"
    sub-title="批次追溯查询已迁移至新的追溯查询入口，请使用新版本。"
  >
    <template #extra>
      <el-button type="primary" @click="$router.push('/traceability')">前往追溯查询</el-button>
    </template>
  </el-result>
</template>

<script setup lang="ts">
// This page is a bridge — the route already redirects to /traceability.
// This component is kept only for cases where it is lazy-loaded directly.
</script>
