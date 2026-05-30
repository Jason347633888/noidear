<template>
  <div class="drill-list-page">
    <PageHeaderBlock
      eyebrow="追溯与批次"
      title="追溯演练"
      description="计划、执行并结案追溯演练，支持快照挂载与 CAPA 联动"
    />

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">演练列表</span>
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
              <el-option label="已计划" value="planned" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-select
              v-model="filterType"
              placeholder="全部类型"
              clearable
              style="width: 120px; margin-right: 12px"
              @change="loadList"
            >
              <el-option label="正向追溯" value="forward" />
              <el-option label="逆向追溯" value="backward" />
              <el-option label="双向追溯" value="both" />
            </el-select>
            <el-button type="primary" @click="openPlanDialog">
              <el-icon><Plus /></el-icon>新建演练
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="追溯类型" width="110">
          <template #default="{ row }">
            {{ drillTypeLabel(row.drill_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="drill_date" label="演练日期" width="120">
          <template #default="{ row }">{{ formatDate(row.drill_date) }}</template>
        </el-table-column>
        <el-table-column prop="root_object_type" label="根对象类型" width="130" />
        <el-table-column prop="root_object_id" label="根对象ID" show-overflow-tooltip />
        <el-table-column prop="simulated_case" label="模拟场景" show-overflow-tooltip>
          <template #default="{ row }">{{ row.simulated_case ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="结论" width="90">
          <template #default="{ row }">
            <el-tag
              v-if="row.conclusion"
              :type="row.conclusion === 'passed' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.conclusion === 'passed' ? '通过' : '未通过' }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="planDialogVisible"
      title="新建追溯演练"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="planFormRef" :model="planForm" :rules="planRules" label-width="110px">
        <el-form-item label="追溯类型" prop="drill_type">
          <el-select v-model="planForm.drill_type" style="width: 100%">
            <el-option label="正向追溯" value="forward" />
            <el-option label="逆向追溯" value="backward" />
            <el-option label="双向追溯" value="both" />
          </el-select>
        </el-form-item>
        <el-form-item label="演练日期" prop="drill_date">
          <el-date-picker
            v-model="planForm.drill_date"
            type="date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="根对象类型" prop="root_object_type">
          <el-select v-model="planForm.root_object_type" style="width: 100%">
            <el-option label="生产批次" value="production_batch" />
            <el-option label="物料批次" value="material_lot" />
          </el-select>
        </el-form-item>
        <el-form-item label="根对象ID" prop="root_object_id">
          <el-input v-model="planForm.root_object_id" placeholder="请输入根对象ID" />
        </el-form-item>
        <el-form-item label="模拟场景">
          <el-input
            v-model="planForm.simulated_case"
            type="textarea"
            :rows="2"
            placeholder="可选，描述模拟场景"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handlePlan">确认创建</el-button>
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
import { traceabilityDrillApi, type TraceabilityDrill, type DrillStatus, type DrillType } from '@/api/traceability-drill';
import { toList } from '@/utils/apiResponse';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const router = useRouter();
const list = ref<TraceabilityDrill[]>([]);
const loading = ref(false);
const filterStatus = ref<string>('');
const filterType = ref<string>('');
const planDialogVisible = ref(false);
const submitting = ref(false);
const planFormRef = ref<FormInstance>();

const planForm = reactive({
  drill_type: 'forward' as DrillType,
  drill_date: '',
  root_object_type: 'production_batch',
  root_object_id: '',
  simulated_case: '',
});

const planRules: FormRules = {
  drill_type: [{ required: true, message: '请选择追溯类型', trigger: 'change' }],
  drill_date: [{ required: true, message: '请选择演练日期', trigger: 'change' }],
  root_object_type: [{ required: true, message: '请选择根对象类型', trigger: 'change' }],
  root_object_id: [{ required: true, message: '请输入根对象ID', trigger: 'blur' }],
};

function drillTypeLabel(type: string): string {
  const map: Record<string, string> = {
    forward: '正向追溯',
    backward: '逆向追溯',
    both: '双向追溯',
  };
  return map[type] ?? type;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    planned: '已计划',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] ?? status;
}

function statusTagType(status: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    planned: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'info',
  };
  return map[status] ?? '';
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
}

async function loadList() {
  loading.value = true;
  try {
    const res = await traceabilityDrillApi.getList({
      status: filterStatus.value as DrillStatus || undefined,
      drill_type: filterType.value as DrillType || undefined,
    });
    list.value = toList<TraceabilityDrill>(res);
  } catch {
    ElMessage.error('加载演练列表失败');
  } finally {
    loading.value = false;
  }
}

function openPlanDialog() {
  planForm.drill_type = 'forward';
  planForm.drill_date = '';
  planForm.root_object_type = 'production_batch';
  planForm.root_object_id = '';
  planForm.simulated_case = '';
  planDialogVisible.value = true;
}

async function handlePlan() {
  await planFormRef.value?.validate();
  submitting.value = true;
  try {
    await traceabilityDrillApi.plan({
      drill_type: planForm.drill_type,
      drill_date: planForm.drill_date,
      root_object_type: planForm.root_object_type,
      root_object_id: planForm.root_object_id,
      participants: [],
      simulated_case: planForm.simulated_case || undefined,
    });
    ElMessage.success('演练计划已创建');
    planDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('创建失败，请重试');
  } finally {
    submitting.value = false;
  }
}

function goDetail(id: string) {
  router.push({ name: 'TraceabilityDrillDetail', params: { id } });
}

onMounted(loadList);
</script>

<style scoped>
.drill-list-page {
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
</style>
