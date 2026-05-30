<template>
  <div class="product-validation-page">
    <PageHeaderBlock
      eyebrow="产品开发"
      title="产品验证"
      description="管理产品工艺验证记录"
    />
    <div class="app-panel">
      <p class="empty-hint">产品验证数据将在此显示。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const productId = route.params.id as string;
</script>
