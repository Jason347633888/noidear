<template>
  <div class="ppc-impact-page">
    <PageHeaderBlock
      eyebrow="产品开发"
      title="工艺变更影响分析"
      description="评估产品工艺变更对配方、工序及 CCP 的影响范围"
    />
    <div class="app-panel">
      <p class="empty-hint">工艺变更影响分析数据将在此显示。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const planId = route.params.id as string;
</script>
