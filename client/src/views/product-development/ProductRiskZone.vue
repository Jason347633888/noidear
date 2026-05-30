<template>
  <div class="product-risk-zone-page">
    <PageHeaderBlock
      eyebrow="产品开发"
      title="产品风险区"
      description="查看产品风险区域分析"
    />
    <div class="app-panel">
      <p class="empty-hint">产品风险区数据将在此显示。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const productId = route.params.id as string;
</script>
