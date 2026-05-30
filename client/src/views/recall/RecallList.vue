<template>
  <div class="recall-list-page">
    <PageHeaderBlock eyebrow="追溯与批次" title="产品召回管理" description="管理产品召回事件，锁定批次范围，跟踪通知与证据" />

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
              <el-option v-for="(label, val) in STATUS_MAP" :key="val" :label="label" :value="val" />
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
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建召回
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="recall_no" label="召回编号" width="180" />
        <el-table-column prop="title" label="召回标题" show-overflow-tooltip />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ STATUS_MAP[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="riskTagType(row.risk_level)" size="small">
              {{ RISK_MAP[row.risk_level] ?? row.risk_level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="受影响批次" width="100">
          <template #default="{ row }">{{ row.batches?.length ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="快照关联" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.source_query_ref" type="success" size="small">已关联</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="requested_at" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.requested_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="createDialogVisible"
      title="新建产品召回"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px">
        <el-form-item label="召回标题" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入召回标题" />
        </el-form-item>
        <el-form-item label="召回原因" prop="reason">
          <el-input v-model="createForm.reason" type="textarea" :rows="3" placeholder="请描述召回原因" />
        </el-form-item>
        <el-form-item label="风险等级" prop="risk_level">
          <el-select v-model="createForm.risk_level" style="width: 100%">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="严重" value="critical" />
          </el-select>
        </el-form-item>
        <el-form-item label="追溯快照引用">
          <el-input v-model="createForm.source_query_ref" placeholder="可选，关联追溯快照ID以锁定范围" />
          <div class="form-hint">填写快照ID后，召回范围将自动锁定为快照所包含的批次</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import productRecallApi, { type ProductRecall, type ProductRecallStatus } from '@/api/product-recall';
import { toList } from '@/utils/apiResponse';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已批准',
  notified: '已通知',
  in_progress: '执行中',
  completed: '已完成',
  rejected: '已驳回',
  cancelled: '已取消',
};

const RISK_MAP: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

const router = useRouter();
const list = ref<ProductRecall[]>([]);
const loading = ref(false);
const filterStatus = ref('');
const filterRisk = ref('');
const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  title: '',
  reason: '',
  risk_level: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  source_query_ref: '',
});

const createRules: FormRules = {
  title: [{ required: true, message: '请输入召回标题', trigger: 'blur' }],
  reason: [{ required: true, message: '请填写召回原因', trigger: 'blur' }],
  risk_level: [{ required: true, message: '请选择风险等级', trigger: 'change' }],
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

function formatDate(date: string): string {
  return date ? new Date(date).toLocaleString('zh-CN') : '-';
}

async function loadList() {
  loading.value = true;
  try {
    const res = await productRecallApi.getList({
      status: filterStatus.value as ProductRecallStatus || undefined,
      risk_level: filterRisk.value || undefined,
    });
    list.value = toList<ProductRecall>(res);
  } catch {
    ElMessage.error('加载召回列表失败');
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  createForm.title = '';
  createForm.reason = '';
  createForm.risk_level = 'medium';
  createForm.source_query_ref = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await productRecallApi.create({
      title: createForm.title,
      reason: createForm.reason,
      risk_level: createForm.risk_level,
      source_query_ref: createForm.source_query_ref || undefined,
    });
    ElMessage.success('召回已创建');
    createDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('创建失败，请重试');
  } finally {
    submitting.value = false;
  }
}

function goDetail(id: string) {
  router.push({ name: 'RecallDetail', params: { id } });
}

onMounted(loadList);
</script>

<style scoped>
.recall-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
}

.card-count {
  font-size: 12px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
}

.form-hint {
  font-size: 11px;
  color: #909399;
  margin-top: 4px;
}
</style>
