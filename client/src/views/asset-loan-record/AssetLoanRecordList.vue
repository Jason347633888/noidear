<template>
  <div class="alr-list-page">
    <PageHeaderBlock eyebrow="设备与现场" title="资产借用记录" description="管理设备、工具、车辆等资产的借用与归还情况" />

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">借用记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建记录
          </el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="资产类型" width="100">
          <template #default="{ row }">
            {{ getAssetTypeText(row.asset_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="asset_name" label="资产名称" min-width="130" show-overflow-tooltip />
        <el-table-column label="资产编号" width="120">
          <template #default="{ row }">
            {{ row.asset_code || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="借用人" width="100">
          <template #default="{ row }">
            {{ row.borrower_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="借用时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.borrow_at) }}
          </template>
        </el-table-column>
        <el-table-column label="预计归还" width="160">
          <template #default="{ row }">
            {{ row.expected_return ? formatDate(row.expected_return) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="实际归还" width="160">
          <template #default="{ row }">
            {{ row.actual_return ? formatDate(row.actual_return) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag
              :type="getStatusTagType(row.status)"
              effect="light"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.notes || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'borrowed'"
              type="success"
              size="small"
              @click="handleReturn(row.id)"
            >
              归还
            </el-button>
            <el-popconfirm
              title="确认删除该记录？"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <el-button type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建借用记录"
      width="540px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="资产类型" prop="asset_type">
          <el-select v-model="createForm.asset_type" placeholder="请选择" style="width: 100%">
            <el-option label="设备" value="equipment" />
            <el-option label="工具" value="tool" />
            <el-option label="车辆" value="vehicle" />
            <el-option label="家具" value="furniture" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="资产名称" prop="asset_name">
          <el-input v-model="createForm.asset_name" placeholder="请输入资产名称" />
        </el-form-item>
        <el-form-item label="资产编号">
          <el-input v-model="createForm.asset_code" placeholder="可选" />
        </el-form-item>
        <el-form-item label="借用人">
          <el-input v-model="createForm.borrower_name" placeholder="借用人姓名" />
        </el-form-item>
        <el-form-item label="借用时间">
          <el-date-picker
            v-model="createForm.borrow_at"
            type="datetime"
            placeholder="选择借用时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="预计归还">
          <el-date-picker
            v-model="createForm.expected_return"
            type="datetime"
            placeholder="选择预计归还时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="借用目的">
          <el-input v-model="createForm.purpose" type="textarea" :rows="2" placeholder="填写借用目的" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.notes" type="textarea" :rows="2" placeholder="可选" />
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
import assetLoanRecordApi, {
  type AssetLoanRecord,
  type AssetType,
  getAssetTypeText,
  getStatusText,
} from '@/api/asset-loan-record';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<AssetLoanRecord[]>([]);
const loading = ref(false);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  asset_type: '' as AssetType | '',
  asset_name: '',
  asset_code: '',
  borrower_name: '',
  borrow_at: '',
  expected_return: '',
  purpose: '',
  notes: '',
});

const createRules: FormRules = {
  asset_type: [{ required: true, message: '请选择资产类型', trigger: 'change' }],
  asset_name: [{ required: true, message: '请输入资产名称', trigger: 'blur' }],
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

function getStatusTagType(status: string): 'warning' | 'success' | 'danger' | 'info' {
  if (status === 'borrowed') return 'warning';
  if (status === 'returned') return 'success';
  if (status === 'overdue') return 'danger';
  return 'info';
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await assetLoanRecordApi.getList();
    list.value = res as unknown as AssetLoanRecord[];
  } catch {
    ElMessage.error('加载借用记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.asset_type = '';
  createForm.asset_name = '';
  createForm.asset_code = '';
  createForm.borrower_name = '';
  createForm.borrow_at = '';
  createForm.expected_return = '';
  createForm.purpose = '';
  createForm.notes = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await assetLoanRecordApi.create({
      asset_type: createForm.asset_type as AssetType,
      asset_name: createForm.asset_name,
      asset_code: createForm.asset_code || undefined,
      borrower_name: createForm.borrower_name || undefined,
      borrow_at: createForm.borrow_at || undefined,
      expected_return: createForm.expected_return || undefined,
      purpose: createForm.purpose || undefined,
      notes: createForm.notes || undefined,
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

// ── Return ────────────────────────────────────────────────────────────────────

async function handleReturn(id: string) {
  try {
    await assetLoanRecordApi.updateReturn(id);
    ElMessage.success('已标记为归还');
    list.value = list.value.map((item) =>
      item.id === id
        ? { ...item, status: 'returned', actual_return: new Date().toISOString() }
        : item,
    );
  } catch {
    ElMessage.error('操作失败，请重试');
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function handleDelete(id: string) {
  try {
    await assetLoanRecordApi.remove(id);
    ElMessage.success('删除成功');
    list.value = list.value.filter((item) => item.id !== id);
  } catch {
    ElMessage.error('删除失败，请重试');
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.alr-list-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
</style>
