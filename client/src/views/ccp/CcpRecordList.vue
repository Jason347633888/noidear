<template>
  <div class="ccp-list-page">
    <PageHeaderBlock eyebrow="质量与合规" title="CCP 监控记录" description="关键控制点监控数据录入与查看" />

    <el-card class="filter-card" style="margin-bottom: 16px">
      <div class="filter-row">
        <el-input
          v-model="batchIdInput"
          placeholder="请输入生产批次 ID"
          clearable
          style="width: 280px; margin-right: 12px"
          @keyup.enter="loadRecords"
        />
        <el-button type="primary" @click="loadRecords">查询</el-button>
        <el-button
          v-if="batchId"
          type="warning"
          plain
          style="margin-left: 8px"
          @click="loadMissing"
        >
          检查缺失 CCP
        </el-button>
      </div>
    </el-card>

    <el-alert
      v-if="missingCCPs.length > 0"
      type="warning"
      :closable="true"
      style="margin-bottom: 16px"
      @close="missingCCPs = []"
    >
      <template #title>
        该批次尚有 {{ missingCCPs.length }} 个 CCP 点未填写监控记录：
        <span v-for="c in missingCCPs" :key="c.id" style="margin-left: 8px">
          <el-tag size="small" type="warning">{{ c.ccp_no }}</el-tag>
        </span>
      </template>
    </el-alert>

    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">监控记录列表<span class="card-count">共 {{ list.length }} 条记录</span></h3>
        <div class="app-panel-header__actions">
          <el-button type="primary" :disabled="!batchId" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建记录
          </el-button>
        </div>
      </div>
      <div class="app-panel--padded">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="ccp_point.ccp_no" label="CCP 编号" width="140" />
        <el-table-column prop="ccp_point.hazard_type" label="危害类型" width="120">
          <template #default="{ row }">
            {{ getHazardTypeText(row.ccp_point?.hazard_type) }}
          </template>
        </el-table-column>
        <el-table-column label="监控值" width="160">
          <template #default="{ row }">
            <span v-if="row.measured_value != null">
              {{ row.measured_value }} {{ row.unit ?? '' }}
            </span>
            <span v-else-if="row.measured_text">{{ row.measured_text }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="是否在 CL 内" width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.is_within_cl ? 'success' : 'danger'"
              effect="light"
              size="small"
            >
              {{ row.is_within_cl ? '合格' : '超限' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deviation_action" label="偏差纠正措施" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.deviation_action || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="监控时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.monitored_at) }}
          </template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 新建记录对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建 CCP 监控记录"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="120px">
        <el-form-item label="CCP 点 ID" prop="ccp_point_id">
          <el-input v-model="createForm.ccp_point_id" placeholder="请输入 CCP 点 ID" />
        </el-form-item>
        <el-form-item label="监控数值">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input-number
              v-model="createForm.measured_value"
              :precision="4"
              placeholder="数值"
              style="flex: 1"
            />
            <el-input v-model="createForm.unit" placeholder="单位" style="width: 80px" />
          </div>
        </el-form-item>
        <el-form-item label="监控文本描述">
          <el-input
            v-model="createForm.measured_text"
            placeholder="如数值不适用，可填写文字描述"
          />
        </el-form-item>
        <el-form-item label="是否在 CL 内" prop="is_within_cl">
          <el-radio-group v-model="createForm.is_within_cl">
            <el-radio :value="true">合格（在 CL 内）</el-radio>
            <el-radio :value="false">超限（偏离 CL）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="createForm.is_within_cl === false"
          label="偏差纠正措施"
          prop="deviation_action"
        >
          <el-input
            v-model="createForm.deviation_action"
            type="textarea"
            :rows="3"
            placeholder="请描述采取的纠正措施"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import ccpApi, { type CcpRecord, type CcpPoint } from '@/api/ccp';

// ── State ────────────────────────────────────────────────────────────────────

const list = ref<CcpRecord[]>([]);
const loading = ref(false);
const batchIdInput = ref('');
const batchId = ref('');
const missingCCPs = ref<CcpPoint[]>([]);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  ccp_point_id: '',
  measured_value: undefined as number | undefined,
  measured_text: '',
  unit: '',
  is_within_cl: true as boolean,
  deviation_action: '',
});

const createRules: FormRules = {
  ccp_point_id: [{ required: true, message: '请输入 CCP 点 ID', trigger: 'blur' }],
  is_within_cl: [{ required: true, message: '请选择是否在 CL 内', trigger: 'change' }],
  deviation_action: [
    {
      validator: (_rule, _value, callback) => {
        if (createForm.is_within_cl === false && !createForm.deviation_action?.trim()) {
          callback(new Error('超限时必须填写纠正措施'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const HAZARD_TYPE_MAP: Record<string, string> = {
  biological: '生物性',
  chemical: '化学性',
  physical: '物理性',
};

function getHazardTypeText(type: string | undefined): string {
  if (!type) return '-';
  return HAZARD_TYPE_MAP[type] ?? type;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadRecords() {
  const id = batchIdInput.value.trim();
  if (!id) {
    ElMessage.warning('请输入生产批次 ID');
    return;
  }
  batchId.value = id;
  missingCCPs.value = [];
  loading.value = true;
  try {
    const res = await ccpApi.getRecordsByBatch(id);
    list.value = res.data as unknown as CcpRecord[];
  } catch {
    ElMessage.error('加载 CCP 记录失败');
  } finally {
    loading.value = false;
  }
}

async function loadMissing() {
  if (!batchId.value) return;
  try {
    const res = await ccpApi.getMissingCCPs(batchId.value);
    missingCCPs.value = res.data as unknown as CcpPoint[];
    if (missingCCPs.value.length === 0) {
      ElMessage.success('该批次所有 CCP 点均已填写监控记录');
    }
  } catch {
    ElMessage.error('检查缺失 CCP 失败');
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.ccp_point_id = '';
  createForm.measured_value = undefined;
  createForm.measured_text = '';
  createForm.unit = '';
  createForm.is_within_cl = true;
  createForm.deviation_action = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await ccpApi.createRecord({
      production_batch_id: batchId.value,
      ccp_point_id: createForm.ccp_point_id,
      measured_value: createForm.measured_value,
      measured_text: createForm.measured_text || undefined,
      unit: createForm.unit || undefined,
      is_within_cl: createForm.is_within_cl,
      deviation_action: createForm.deviation_action || undefined,
    });
    ElMessage.success('记录提交成功');
    createDialogVisible.value = false;
    await loadRecords();
  } catch {
    ElMessage.error('提交失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  // 不自动加载，等用户输入批次 ID
});
</script>

<style scoped>
.ccp-list-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
}

.card-count {
  font-size: 13px;
  color: #909399;
  margin-left: 12px;
  font-weight: 400;
}
</style>
