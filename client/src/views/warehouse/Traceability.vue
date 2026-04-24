<template>
  <el-result
    icon="info"
    title="入口已收敛"
    sub-title="仓库追溯功能已迁移至统一追溯查询入口，请使用新版本。"
  >
    <template #extra>
      <el-button type="primary" @click="$router.push('/traceability')">前往追溯查询</el-button>
    </template>
  </el-result>
</template>

<script setup lang="ts">
// Bridge page — route already redirects to /traceability.
</script>
