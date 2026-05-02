<template>
  <div class="recall-list-page">
    <div class="page-header">
      <h1 class="page-title">产品召回管理</h1>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">召回列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-select
              v-model="filterStatus"
              placeholder="全部状态"
              clearable
              style="width: 140px; margin-right: 12px"
              @change="loadList"
            >
              <el-option v-for="(label, val) in statusMap" :key="val" :label="label" :value="val" />
            </el-select>
            <el-select
              v-model="filterRisk"
              placeholder="全部风险"
              clearable
              style="width: 120px; margin-right: 12px"
              @change="loadList"
            >
              <el-option label="低" value="low" />
              <el-option label="中" value="medium" />
              <el-option label="高" value="high" />
              <el-option label="严重" value="critical" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="recall_no" label="召回编号" width="180" />
        <el-table-column prop="title" label="召回标题" show-overflow-tooltip />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusMap[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="riskTagType(row.risk_level)" size="small">
              {{ riskMap[row.risk_level] ?? row.risk_level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="受影响批次" width="100">
          <template #default="{ row }">
            {{ row.batches?.length ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="通知进度" width="120">
          <template #default="{ row }">
            <span v-if="row.notifications?.length">
              {{ row.notifications.filter((n: any) => n.status === 'sent').length }} /
              {{ row.notifications.length }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="requested_at" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.requested_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import productRecallApi from '@/api/product-recall';
import type { ProductRecall, ProductRecallStatus } from '@/api/product-recall';

const router = useRouter();
const list = ref<ProductRecall[]>([]);
const loading = ref(false);
const filterStatus = ref<string>('');
const filterRisk = ref<string>('');

const statusMap: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已批准',
  notified: '已通知',
  in_progress: '执行中',
  completed: '已完成',
  rejected: '已驳回',
  cancelled: '已取消',
};

const riskMap: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

function statusTagType(status: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    draft: 'info',
    pending_review: 'warning',
    approved: '',
    notified: '',
    in_progress: 'warning',
    completed: 'success',
    rejected: 'danger',
    cancelled: 'info',
  };
  return map[status] ?? '';
}

function riskTagType(risk: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return map[risk] ?? '';
}

function formatDate(date: string) {
  return date ? new Date(date).toLocaleString('zh-CN') : '-';
}

async function loadList() {
  loading.value = true;
  try {
    const res = await productRecallApi.getList({
      status: filterStatus.value as ProductRecallStatus || undefined,
      risk_level: filterRisk.value || undefined,
    });
    list.value = (res as any).data ?? res;
  } catch {
    ElMessage.error('加载召回列表失败');
  } finally {
    loading.value = false;
  }
}

function goDetail(id: string) {
  router.push({ name: 'ProductRecallDetail', params: { id } });
}

onMounted(loadList);
</script>
