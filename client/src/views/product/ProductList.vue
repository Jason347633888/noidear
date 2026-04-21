<template>
  <div class="product-list-page">
    <div class="page-header">
      <h1 class="page-title">产品目录</h1>
      <p class="page-subtitle">管理企业产品信息及状态</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">产品列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建产品
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="code" label="产品编号" min-width="140" show-overflow-tooltip />
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="spec" label="规格" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.spec || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="净重" width="130">
          <template #default="{ row }">
            {{ row.net_weight != null ? `${row.net_weight} ${row.weight_unit || ''}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getProductStatusType(row.status)"
              effect="light"
              size="small"
            >
              {{ getProductStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建 / 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑产品' : '新建产品'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="产品编号" prop="code">
          <el-input v-model="form.code" placeholder="例如：PRD-001" />
        </el-form-item>
        <el-form-item label="产品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model="form.spec" placeholder="可选，例如：500g/袋" />
        </el-form-item>
        <el-form-item label="净重">
          <div class="net-weight-row">
            <el-input-number
              v-model="form.net_weight"
              :min="0"
              :precision="3"
              placeholder="净重数值"
              style="flex: 1"
            />
            <el-input
              v-model="form.weight_unit"
              placeholder="单位"
              style="width: 80px; margin-left: 8px"
            />
          </div>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择" style="width: 100%">
            <el-option label="在产" value="active" />
            <el-option label="停产" value="inactive" />
            <el-option label="淘汰" value="discontinued" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingId ? '保存修改' : '确认新建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import {
  productApi,
  type Product,
  getProductStatusText,
  getProductStatusType,
} from '@/api/product';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<Product[]>([]);
const loading = ref(false);

// ── Dialog ────────────────────────────────────────────────────────────────────

const dialogVisible = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const form = reactive({
  code: '',
  name: '',
  spec: '',
  net_weight: undefined as number | undefined,
  weight_unit: '',
  status: 'active',
});

const formRules: FormRules = {
  code: [{ required: true, message: '请输入产品编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await productApi.getList();
    list.value = res.data as unknown as Product[];
  } catch {
    ElMessage.error('加载产品列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create / Edit ─────────────────────────────────────────────────────────────

function resetForm() {
  form.code = '';
  form.name = '';
  form.spec = '';
  form.net_weight = undefined;
  form.weight_unit = '';
  form.status = 'active';
}

function openCreateDialog() {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(row: Product) {
  editingId.value = row.id;
  form.code = row.code;
  form.name = row.name;
  form.spec = row.spec ?? '';
  form.net_weight = row.net_weight;
  form.weight_unit = row.weight_unit ?? '';
  form.status = row.status;
  dialogVisible.value = true;
}

async function handleSubmit() {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    const payload = {
      code: form.code,
      name: form.name,
      spec: form.spec || undefined,
      net_weight: form.net_weight,
      weight_unit: form.weight_unit || undefined,
      status: form.status,
    };
    if (editingId.value) {
      await productApi.update(editingId.value, payload);
      ElMessage.success('修改成功');
    } else {
      await productApi.create(payload);
      ElMessage.success('新建成功');
    }
    dialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error(editingId.value ? '修改失败，请重试' : '新建失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function handleDelete(row: Product) {
  await ElMessageBox.confirm(
    `确定要删除产品「${row.name}」吗？此操作不可撤销。`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  );
  try {
    await productApi.remove(row.id);
    ElMessage.success('删除成功');
    await loadList();
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
.product-list-page {
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

.net-weight-row {
  display: flex;
  align-items: center;
  width: 100%;
}
</style>
