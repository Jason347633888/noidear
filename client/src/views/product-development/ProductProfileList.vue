<template>
  <div class="product-profiles-page">
    <PageHeaderBlock
      eyebrow="产品开发"
      title="产品画像列表"
      description="查看所有产品的画像摘要信息"
    />
    <div class="app-panel">
      <p class="empty-hint">产品画像数据将在此显示。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
</script>
