<template>
  <div class="redirect-loading" v-loading="loading">
    <span>正在跳转到对应产品...</span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { productProcessChangeApi } from '@/api/product-process-change';

const route = useRoute();
const router = useRouter();
const loading = ref(true);

onMounted(async () => {
  const planId = route.params.planId as string;
  try {
    const plan = await productProcessChangeApi.getByPlanId(planId);
    const productId = (plan as any).product_id ?? (plan as any).productId;
    if (!productId) {
      throw new Error('产品工艺变更未关联产品');
    }
    router.replace(`/products/${productId}`);
  } catch (err: any) {
    ElMessage.error(err?.message ?? '跳转失败');
    router.replace('/products');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.redirect-loading {
  padding: 40px;
  text-align: center;
  color: #909399;
}
</style>
