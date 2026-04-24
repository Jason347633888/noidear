<template>
  <el-result
    icon="info"
    title="入口已收敛"
    sub-title="追溯报告已整合至新的追溯查询入口，请使用新版本的导出功能。"
  >
    <template #extra>
      <el-button type="primary" @click="$router.push('/traceability')">前往追溯查询</el-button>
    </template>
  </el-result>
</template>

<script setup lang="ts">
// Bridge page — route already redirects to /traceability.
</script>
