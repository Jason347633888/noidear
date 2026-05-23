<template>
  <div class="capa-list-page">
    <PageHeaderBlock eyebrow="质量与合规" title="纠正措施管理" description="登记并追踪纠正与预防措施（CAPA）" />

    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">CAPA 列表<span class="card-count">共 {{ list.length }} 条记录</span></h3>
        <div class="app-panel-header__actions">
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 140px; margin-right: 12px"
            @change="loadList"
          >
            <el-option label="待处理" value="open" />
            <el-option label="实施中" value="implementing" />
            <el-option label="验证中" value="verifying" />
            <el-option label="已关闭" value="closed" />
          </el-select>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建 CAPA
          </el-button>
        </div>
      </div>
      <div class="app-panel--padded">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="capa_no" label="编号" width="200" />
        <el-table-column label="触发来源" width="120">
          <template #default="{ row }">
            {{ getCapaTriggerTypeText(row.trigger_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="问题描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="root_cause" label="根本原因" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.root_cause ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="截止日期" width="120">
          <template #default="{ row }">
            {{ row.due_date ? formatDate(row.due_date) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getCapaStatusType(row.status)" effect="light" size="small">
              {{ getCapaStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'closed'"
              link
              type="primary"
              @click="handleClose(row)"
            >
              关闭
            </el-button>
            <span v-else class="text-secondary">-</span>
          </template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建纠正措施"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="触发来源" prop="trigger_type">
          <el-select v-model="createForm.trigger_type" placeholder="请选择" style="width: 100%">
            <el-option label="不合格品" value="non_conformance" />
            <el-option label="顾客投诉" value="customer_complaint" />
            <el-option label="内部审核" value="internal_audit" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="触发来源 ID">
          <el-input v-model="createForm.trigger_id" placeholder="可选，填写关联记录 ID" />
        </el-form-item>
        <el-form-item label="问题描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请描述发现的问题"
          />
        </el-form-item>
        <el-form-item label="根本原因">
          <el-input
            v-model="createForm.root_cause"
            type="textarea"
            :rows="2"
            placeholder="可选，填写根本原因分析"
          />
        </el-form-item>
        <el-form-item label="纠正措施">
          <el-input
            v-model="createForm.corrective_action"
            type="textarea"
            :rows="2"
            placeholder="可选，填写纠正措施内容"
          />
        </el-form-item>
        <el-form-item label="预防措施">
          <el-input
            v-model="createForm.preventive_action"
            type="textarea"
            :rows="2"
            placeholder="可选，填写预防措施内容"
          />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="createForm.due_date"
            type="date"
            placeholder="请选择截止日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import correctiveActionApi, {
  type CorrectiveAction,
  type CapaTriggerType,
  getCapaStatusText,
  getCapaStatusType,
  getCapaTriggerTypeText,
} from '@/api/corrective-action';
import { toList } from '@/utils/apiResponse';

// ── State ────────────────────────────────────────────────────────────────────

const list = ref<CorrectiveAction[]>([]);
const loading = ref(false);
const filterStatus = ref<string>('');

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  trigger_type: '' as CapaTriggerType | '',
  trigger_id: '',
  description: '',
  root_cause: '',
  corrective_action: '',
  preventive_action: '',
  due_date: '',
});

const createRules: FormRules = {
  trigger_type: [{ required: true, message: '请选择触发来源', trigger: 'change' }],
  description: [{ required: true, message: '请填写问题描述', trigger: 'blur' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await correctiveActionApi.getList(filterStatus.value || undefined);
    list.value = toList<CorrectiveAction>(res);
  } catch {
    ElMessage.error('加载 CAPA 列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.trigger_type = '';
  createForm.trigger_id = '';
  createForm.description = '';
  createForm.root_cause = '';
  createForm.corrective_action = '';
  createForm.preventive_action = '';
  createForm.due_date = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await correctiveActionApi.create({
      trigger_type: createForm.trigger_type as CapaTriggerType,
      description: createForm.description,
      trigger_id: createForm.trigger_id || undefined,
      root_cause: createForm.root_cause || undefined,
      corrective_action: createForm.corrective_action || undefined,
      preventive_action: createForm.preventive_action || undefined,
      due_date: createForm.due_date || undefined,
    });
    ElMessage.success('新建成功');
    createDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('新建失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Close ─────────────────────────────────────────────────────────────────────

async function handleClose(capa: CorrectiveAction) {
  try {
    await ElMessageBox.confirm(
      `确认关闭 CAPA ${capa.capa_no}？关闭后不可再修改。`,
      '关闭确认',
      { confirmButtonText: '确认关闭', cancelButtonText: '取消', type: 'warning' },
    );
    await correctiveActionApi.close(capa.id);
    ElMessage.success('已关闭');
    await loadList();
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败，请重试');
    }
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.capa-list-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-count {
  font-size: 13px;
  color: #909399;
  margin-left: 12px;
  font-weight: 400;
}

.text-secondary {
  color: #c0c4cc;
  font-size: 13px;
}
</style>
