<template>
  <div class="complaint-list-page">
    <div class="page-header">
      <h1 class="page-title">顾客投诉管理</h1>
      <p class="page-subtitle">登记、追踪并处理顾客投诉</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">投诉列表</span>
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
              <el-option label="待处理" value="open" />
              <el-option label="已关闭" value="closed" />
            </el-select>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建投诉
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="complaint_no" label="投诉编号" width="180" />
        <el-table-column prop="customer_name" label="顾客名称" width="150" show-overflow-tooltip />
        <el-table-column prop="complaint_type" label="投诉类型" width="120">
          <template #default="{ row }">
            {{ row.complaint_type ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="投诉描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="production_batch_id" label="相关批次" width="160">
          <template #default="{ row }">
            {{ row.production_batch_id ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getComplaintStatusType(row.status)" effect="light" size="small">
              {{ getComplaintStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收到时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.received_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'open'"
              link
              type="primary"
              @click="openResolveDialog(row)"
            >
              处理
            </el-button>
            <span v-else class="text-secondary">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建顾客投诉" width="520px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="顾客名称" prop="customer_name">
          <el-input v-model="createForm.customer_name" placeholder="请输入顾客名称" />
        </el-form-item>
        <el-form-item label="投诉类型" prop="complaint_type">
          <el-input v-model="createForm.complaint_type" placeholder="例如：质量问题、包装问题等" />
        </el-form-item>
        <el-form-item label="相关批次" prop="production_batch_id">
          <ProductionBatchSelect v-model="createForm.production_batch_id" />
        </el-form-item>
        <el-form-item label="投诉描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请详细描述投诉内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>

    <!-- 处理对话框 -->
    <el-dialog v-model="resolveDialogVisible" title="处理投诉" width="420px" :close-on-click-modal="false">
      <p style="margin-bottom: 16px; color: #606266">
        编号：<strong>{{ currentComplaint?.complaint_no }}</strong>
      </p>
      <el-form ref="resolveFormRef" :model="resolveForm" :rules="resolveRules" label-width="100px">
        <el-form-item label="处理结果" prop="resolution">
          <el-input
            v-model="resolveForm.resolution"
            type="textarea"
            :rows="3"
            placeholder="请填写处理结果"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="resolving" @click="handleResolve">确认处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import customerComplaintApi, {
  type CustomerComplaint,
  getComplaintStatusText,
  getComplaintStatusType,
} from '@/api/customer-complaint';
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';

// ── State ────────────────────────────────────────────────────────────────────

const list = ref<CustomerComplaint[]>([]);
const loading = ref(false);
const filterStatus = ref<string>('');

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  customer_name: '',
  complaint_type: '',
  production_batch_id: '',
  description: '',
});

const createRules: FormRules = {
  customer_name: [{ required: true, message: '请输入顾客名称', trigger: 'blur' }],
  production_batch_id: [{ required: true, message: '请选择相关批次', trigger: 'change' }],
  description: [{ required: true, message: '请填写投诉描述', trigger: 'blur' }],
};

// ── Resolve dialog ────────────────────────────────────────────────────────────

const resolveDialogVisible = ref(false);
const resolving = ref(false);
const resolveFormRef = ref<FormInstance>();
const currentComplaint = ref<CustomerComplaint | null>(null);

const resolveForm = reactive({
  resolution: '',
});

const resolveRules: FormRules = {
  resolution: [{ required: true, message: '请填写处理结果', trigger: 'blur' }],
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
  loading.value = true;
  try {
    const res = await customerComplaintApi.getList(filterStatus.value || undefined);
    list.value = res.data as unknown as CustomerComplaint[];
  } catch {
    ElMessage.error('加载投诉列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.customer_name = '';
  createForm.complaint_type = '';
  createForm.production_batch_id = '';
  createForm.description = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await customerComplaintApi.create({
      customer_name: createForm.customer_name,
      complaint_type: createForm.complaint_type || undefined,
      production_batch_id: createForm.production_batch_id,
      description: createForm.description,
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

// ── Resolve ───────────────────────────────────────────────────────────────────

function openResolveDialog(complaint: CustomerComplaint) {
  currentComplaint.value = complaint;
  resolveForm.resolution = '';
  resolveDialogVisible.value = true;
}

async function handleResolve() {
  await resolveFormRef.value?.validate();
  if (!currentComplaint.value) return;
  resolving.value = true;
  try {
    await customerComplaintApi.resolve(currentComplaint.value.id, {
      resolution: resolveForm.resolution,
    });
    ElMessage.success('处理成功');
    resolveDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('处理失败，请重试');
  } finally {
    resolving.value = false;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.complaint-list-page {
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

.text-secondary {
  color: #c0c4cc;
  font-size: 13px;
}
</style>
