<template>
  <div class="audit-chain-explorer">
    <h2 class="page-title">证据链</h2>
    <div class="toolbar">
      <select v-model="sourceType" class="source-type-select">
        <option value="document">文件</option>
        <option value="record_template">记录模板</option>
        <option value="record">记录</option>
        <option value="change_event">变更事件</option>
        <option value="audit_finding">审核发现</option>
        <option value="corrective_action">纠正措施</option>
      </select>
      <input v-model="sourceId" placeholder="来源ID" class="source-id-input" />
      <button type="button" @click="load" class="btn-primary">查看证据链</button>
      <button
        v-if="chain"
        type="button"
        @click="downloadJson"
        class="btn-secondary"
      >下载 JSON</button>
      <button
        v-if="chain"
        type="button"
        @click="copySummary"
        class="btn-secondary"
      >复制摘要</button>
    </div>

    <div v-if="loading" class="loading-indicator" data-testid="loading">加载中…</div>
    <div v-else-if="error" class="error-message" data-testid="error">{{ error }}</div>
    <EvidenceChainGraph v-else :chain="chain" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { documentControlApi } from '@/api/document-control';
import EvidenceChainGraph from '@/components/document/EvidenceChainGraph.vue';
import type { EvidenceChainResult } from '@noidear/types';

const route = useRoute();

const sourceType = ref<string>((route.query.sourceType as string) || 'document');
const sourceId = ref<string>((route.query.sourceId as string) || '');
const maxDepth = ref<number>(Number(route.query.maxDepth) || 4);
const chain = ref<EvidenceChainResult | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const load = async () => {
  if (!sourceId.value) {
    error.value = '请输入来源ID';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const result = await documentControlApi.getEvidenceChain({
      sourceType: sourceType.value,
      sourceId: sourceId.value,
      maxDepth: maxDepth.value,
    });
    chain.value = result.data;
  } catch (err) {
    error.value = '获取证据链失败';
  } finally {
    loading.value = false;
  }
};

const downloadJson = () => {
  const blob = new Blob([JSON.stringify(chain.value, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'evidence-chain.json';
  a.click();
  URL.revokeObjectURL(url);
};

const copySummary = () => {
  const summary = `根节点: ${chain.value?.root?.label}\n节点数: ${chain.value?.nodes?.length}\n边数: ${chain.value?.edges?.length}\n警告数: ${chain.value?.warnings?.length}`;
  navigator.clipboard.writeText(summary);
};

onMounted(() => {
  if (sourceId.value) {
    load();
  }
});
</script>

<style scoped>
.page-title {
  margin: 0 0 12px;
  font-size: 1.25rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  align-items: center;
}

.source-type-select {
  min-width: 140px;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.source-id-input {
  flex: 1;
  min-width: 200px;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.btn-primary {
  padding: 6px 16px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  padding: 6px 16px;
  background: #fff;
  color: #409eff;
  border: 1px solid #409eff;
  border-radius: 4px;
  cursor: pointer;
}

.loading-indicator {
  padding: 24px;
  text-align: center;
  color: #999;
}

.error-message {
  padding: 12px;
  color: #f56c6c;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
}
</style>
