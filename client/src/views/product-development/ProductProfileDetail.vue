<template>
  <div class="product-profile-detail-page">
    <PageHeaderBlock
      eyebrow="产品开发"
      title="产品画像"
      description="查看产品详细画像信息"
    />
    <div class="app-panel">
      <p class="empty-hint">产品画像详情将在此显示。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const productId = route.params.id as string;
</script>
