<template>
  <div class="record-form-landing-index">
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索表单编号或名称" clearable @keyup.enter="fetchRows" />
      <el-button type="primary" @click="fetchRows">搜索</el-button>
    </div>

    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="code" label="源编号" width="150" />
      <el-table-column prop="formName" label="表单名" min-width="220" show-overflow-tooltip />
      <el-table-column prop="department" label="部门" width="120" />
      <el-table-column prop="chain" label="链路定位" width="130" />
      <el-table-column label="目标入口" min-width="220">
        <template #default="{ row }">
          <el-link v-if="row.landingEntry?.targetRoute" type="primary" @click="openRoute(row.landingEntry.targetRoute)">
            {{ row.landingEntry.targetModule || row.landingEntry.targetRoute }}
          </el-link>
          <el-tag v-else type="warning">待补齐入口</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { documentControlApi, type RecordFormLandingEntry } from '@/api/document-control';

const router = useRouter();
const keyword = ref('');
const loading = ref(false);
const rows = ref<RecordFormLandingEntry[]>([]);

const fetchRows = async () => {
  loading.value = true;
  try {
    rows.value = await documentControlApi.listRecordFormIndex({
      keyword: keyword.value || undefined,
    });
  } catch {
    ElMessage.error('获取记录表单索引失败');
  } finally {
    loading.value = false;
  }
};

const openRoute = (route: string) => {
  router.push(route);
};

onMounted(fetchRows);
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
