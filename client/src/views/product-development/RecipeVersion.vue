<template>
  <div class="recipe-version-page">
    <PageHeaderBlock
      eyebrow="产品开发"
      title="配方版本"
      description="查看配方历史版本与变更记录"
    />
    <div class="app-panel">
      <p class="empty-hint">配方版本数据将在此显示。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const recipeId = route.params.id as string;
</script>
