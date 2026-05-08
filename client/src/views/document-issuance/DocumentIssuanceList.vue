<template>
  <div class="di-list-page">
    <PageHeaderBlock eyebrow="设备与现场" title="表单领用记录" description="记录受控文件、表单的发放与领用情况" />

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">领用记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建记录
          </el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="document_name" label="文件名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="文件编号" width="130">
          <template #default="{ row }">
            {{ row.document_code || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="领用人" width="100">
          <template #default="{ row }">
            {{ row.issued_to || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="发放人" width="100">
          <template #default="{ row }">
            {{ row.issued_by || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="用途" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.purpose || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="发放时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.issued_at) }}
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.notes || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
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
      title="新建领用记录"
      width="540px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="受控文件" prop="document_id">
          <el-select
            v-model="createForm.document_id"
            filterable
            remote
            reserve-keyword
            :remote-method="searchDocuments"
            :loading="documentLoading"
            placeholder="搜索文件编号或名称"
            style="width: 100%"
          >
            <el-option
              v-for="doc in documentOptions"
              :key="doc.id"
              :label="`${doc.doc_code || doc.number} - ${doc.title}`"
              :value="doc.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="领用人">
          <el-input v-model="createForm.issued_to" placeholder="领用人姓名" />
        </el-form-item>
        <el-form-item label="发放人">
          <el-input v-model="createForm.issued_by" placeholder="发放人姓名" />
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number
            v-model="createForm.quantity"
            :min="1"
            :precision="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="用途">
          <el-input v-model="createForm.purpose" type="textarea" :rows="2" placeholder="填写领用目的" />
        </el-form-item>
        <el-form-item label="发放时间">
          <el-date-picker
            v-model="createForm.issued_at"
            type="datetime"
            placeholder="选择发放时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
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
import documentIssuanceApi, { type DocumentIssuance } from '@/api/document-issuance';
import { documentControlApi, type DocumentControlDocument } from '@/api/document-control';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<DocumentIssuance[]>([]);
const loading = ref(false);
const documentLoading = ref(false);
const documentOptions = ref<DocumentControlDocument[]>([]);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  document_id: '',
  issued_to: '',
  issued_by: '',
  quantity: 1,
  purpose: '',
  issued_at: '',
  notes: '',
});

const createRules: FormRules = {
  document_id: [{ required: true, message: '请选择受控文件', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
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

async function searchDocuments(keyword = '') {
  documentLoading.value = true;
  try {
    const res = await documentControlApi.listDocuments({
      keyword: keyword || undefined,
      limit: 20,
    });
    documentOptions.value = res.list || [];
  } catch {
    ElMessage.error('加载受控文件失败');
  } finally {
    documentLoading.value = false;
  }
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await documentIssuanceApi.getList();
    list.value = res as unknown as DocumentIssuance[];
  } catch {
    ElMessage.error('加载领用记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.document_id = '';
  createForm.issued_to = '';
  createForm.issued_by = '';
  createForm.quantity = 1;
  createForm.purpose = '';
  createForm.issued_at = '';
  createForm.notes = '';
  createDialogVisible.value = true;
  searchDocuments();
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await documentIssuanceApi.create({
      document_id: createForm.document_id,
      issued_to: createForm.issued_to || undefined,
      issued_by: createForm.issued_by || undefined,
      quantity: createForm.quantity,
      purpose: createForm.purpose || undefined,
      issued_at: createForm.issued_at || undefined,
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

// ── Delete ────────────────────────────────────────────────────────────────────

async function handleDelete(id: string) {
  try {
    await documentIssuanceApi.remove(id);
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
.di-list-page {
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
