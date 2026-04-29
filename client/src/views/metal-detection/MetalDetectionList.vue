<template>
  <div class="metal-detection-page">
    <div class="page-header">
      <h1 class="page-title">金属探测记录</h1>
      <p class="page-subtitle">记录和追踪金属探测仪检测结果</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">检测记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <div style="width: 260px; margin-right: 12px">
              <ProductionBatchSelect v-model="filterBatchId" @update:model-value="loadList" />
            </div>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建记录
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="production_batch_id" label="生产批次 ID" width="200" show-overflow-tooltip />
        <el-table-column label="Fe 球规格" width="100">
          <template #default="{ row }">{{ row.fe_ball_spec ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="SUS 球规格" width="110">
          <template #default="{ row }">{{ row.sus_ball_spec ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="Al 球规格" width="100">
          <template #default="{ row }">{{ row.al_ball_spec ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="Fe 通过" width="90">
          <template #default="{ row }">
            <el-tag :type="row.fe_test_pass ? 'success' : 'danger'" effect="light" size="small">
              {{ row.fe_test_pass ? '通过' : '未通过' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="SUS 通过" width="90">
          <template #default="{ row }">
            <el-tag :type="row.sus_test_pass ? 'success' : 'danger'" effect="light" size="small">
              {{ row.sus_test_pass ? '通过' : '未通过' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Al 通过" width="90">
          <template #default="{ row }">
            <el-tag :type="row.al_test_pass ? 'success' : 'danger'" effect="light" size="small">
              {{ row.al_test_pass ? '通过' : '未通过' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="综合结果" width="100">
          <template #default="{ row }">
            <el-tag :type="row.overall_pass ? 'success' : 'danger'" effect="plain" size="small">
              {{ row.overall_pass ? '合格' : '不合格' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rejection_action" label="拒绝处理" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.rejection_action ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="检测时间" width="160">
          <template #default="{ row }">{{ formatDate(row.tested_at) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建金属探测记录" width="520px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px">
        <el-form-item label="生产批次" prop="production_batch_id">
          <ProductionBatchSelect v-model="createForm.production_batch_id" />
        </el-form-item>
        <el-form-item label="Fe 球规格">
          <el-input v-model="createForm.fe_ball_spec" placeholder="例如：Φ1.5mm" />
        </el-form-item>
        <el-form-item label="SUS 球规格">
          <el-input v-model="createForm.sus_ball_spec" placeholder="例如：Φ2.0mm" />
        </el-form-item>
        <el-form-item label="Al 球规格">
          <el-input v-model="createForm.al_ball_spec" placeholder="例如：Φ2.5mm" />
        </el-form-item>
        <el-form-item label="Fe 测试" prop="fe_test_pass">
          <el-radio-group v-model="createForm.fe_test_pass">
            <el-radio :value="true">通过</el-radio>
            <el-radio :value="false">未通过</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="SUS 测试" prop="sus_test_pass">
          <el-radio-group v-model="createForm.sus_test_pass">
            <el-radio :value="true">通过</el-radio>
            <el-radio :value="false">未通过</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Al 测试" prop="al_test_pass">
          <el-radio-group v-model="createForm.al_test_pass">
            <el-radio :value="true">通过</el-radio>
            <el-radio :value="false">未通过</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="综合结果" prop="overall_pass">
          <el-radio-group v-model="createForm.overall_pass">
            <el-radio :value="true">合格</el-radio>
            <el-radio :value="false">不合格</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!createForm.overall_pass" label="拒绝处理">
          <el-input
            v-model="createForm.rejection_action"
            type="textarea"
            :rows="2"
            placeholder="请描述产品拒绝处理措施"
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
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import metalDetectionApi, { type MetalDetectionLog } from '@/api/metal-detection';
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';

// ── State ────────────────────────────────────────────────────────────────────

const list = ref<MetalDetectionLog[]>([]);
const loading = ref(false);
const filterBatchId = ref('');

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  production_batch_id: '',
  fe_ball_spec: '',
  sus_ball_spec: '',
  al_ball_spec: '',
  fe_test_pass: true,
  sus_test_pass: true,
  al_test_pass: true,
  overall_pass: true,
  rejection_action: '',
});

const createRules: FormRules = {
  production_batch_id: [{ required: true, message: '请输入生产批次 ID', trigger: 'blur' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function loadList() {
  if (!filterBatchId.value) {
    list.value = [];
    return;
  }
  loading.value = true;
  try {
    const res = await metalDetectionApi.getByBatch(filterBatchId.value);
    list.value = res.data as unknown as MetalDetectionLog[];
  } catch {
    ElMessage.error('加载记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.production_batch_id = filterBatchId.value;
  createForm.fe_ball_spec = '';
  createForm.sus_ball_spec = '';
  createForm.al_ball_spec = '';
  createForm.fe_test_pass = true;
  createForm.sus_test_pass = true;
  createForm.al_test_pass = true;
  createForm.overall_pass = true;
  createForm.rejection_action = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await metalDetectionApi.create({
      production_batch_id: createForm.production_batch_id,
      fe_ball_spec: createForm.fe_ball_spec || undefined,
      sus_ball_spec: createForm.sus_ball_spec || undefined,
      al_ball_spec: createForm.al_ball_spec || undefined,
      fe_test_pass: createForm.fe_test_pass,
      sus_test_pass: createForm.sus_test_pass,
      al_test_pass: createForm.al_test_pass,
      overall_pass: createForm.overall_pass,
      rejection_action: createForm.rejection_action || undefined,
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

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.metal-detection-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-count {
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
}
</style>
