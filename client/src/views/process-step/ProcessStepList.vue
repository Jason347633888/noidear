<template>
  <div class="process-step-list-page">
    <PageHeaderBlock eyebrow="生产执行" title="工序步骤管理" description="管理生产工序步骤及关键控制点（CCP）" />

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">工序步骤列表</span>
            <span class="card-count">共 {{ filteredList.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-select
              v-model="filterProductId"
              placeholder="按产品筛选"
              clearable
              style="width: 200px; margin-right: 12px"
              @change="handleProductFilter"
            >
              <el-option
                v-for="p in productOptions"
                :key="p.id"
                :label="p.name"
                :value="p.id"
              />
            </el-select>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建工序步骤
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="filteredList" v-loading="loading" stripe>
        <el-table-column label="步骤序号" width="90" align="center">
          <template #default="{ row }">
            <span class="step-no">{{ row.step_no }}</span>
          </template>
        </el-table-column>
        <el-table-column label="步骤名称" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.step_name }}
          </template>
        </el-table-column>
        <el-table-column label="是否CCP" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.is_ccp ? 'danger' : 'info'"
              effect="light"
              size="small"
            >
              {{ row.is_ccp ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关键限值" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.critical_limit || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="监控方法" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.monitoring_method || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="监控频率" width="110" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.monitoring_frequency || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="纠正措施" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.corrective_action || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.responsible_person || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑工序步骤' : '新建工序步骤'"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="关联产品">
          <el-select
            v-model="form.product_id"
            placeholder="请选择产品（可选）"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="p in productOptions"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="步骤序号" prop="step_no">
          <el-input-number
            v-model="form.step_no"
            :min="1"
            :precision="0"
            style="width: 160px"
          />
        </el-form-item>
        <el-form-item label="步骤名称" prop="step_name">
          <el-input v-model="form.step_name" placeholder="请输入步骤名称" />
        </el-form-item>
        <el-form-item label="步骤描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item label="是否CCP">
          <el-switch v-model="form.is_ccp" />
          <span class="switch-label">{{ form.is_ccp ? '是关键控制点' : '非关键控制点' }}</span>
        </el-form-item>
        <template v-if="form.is_ccp">
          <el-form-item label="控制措施">
            <el-input
              v-model="form.control_measures"
              type="textarea"
              :rows="2"
              placeholder="描述控制措施"
            />
          </el-form-item>
          <el-form-item label="关键限值">
            <el-input v-model="form.critical_limit" placeholder="例如：温度 ≥ 72°C" />
          </el-form-item>
          <el-form-item label="监控方法">
            <el-input v-model="form.monitoring_method" placeholder="例如：温度计测量" />
          </el-form-item>
          <el-form-item label="监控频率">
            <el-input v-model="form.monitoring_frequency" placeholder="例如：每批次" />
          </el-form-item>
          <el-form-item label="纠正措施">
            <el-input
              v-model="form.corrective_action"
              type="textarea"
              :rows="2"
              placeholder="当超出关键限值时采取的措施"
            />
          </el-form-item>
        </template>
        <el-form-item label="负责人">
          <el-input v-model="form.responsible_person" placeholder="可选" />
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
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { processStepApi, type ProcessStep } from '@/api/process-step';
import { productApi, type Product } from '@/api/product';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<ProcessStep[]>([]);
const loading = ref(false);
const productOptions = ref<Product[]>([]);
const filterProductId = ref<string>('');

const filteredList = computed(() => {
  if (!filterProductId.value) return list.value;
  return list.value.filter((s) => s.product_id === filterProductId.value);
});

// ── Dialog ────────────────────────────────────────────────────────────────────

const dialogVisible = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const defaultForm = () => ({
  product_id: '',
  step_no: 1,
  step_name: '',
  description: '',
  is_ccp: false,
  control_measures: '',
  critical_limit: '',
  monitoring_method: '',
  monitoring_frequency: '',
  corrective_action: '',
  responsible_person: '',
});

const form = reactive(defaultForm());

const formRules: FormRules = {
  step_no: [{ required: true, message: '请输入步骤序号', trigger: 'blur' }],
  step_name: [{ required: true, message: '请输入步骤名称', trigger: 'blur' }],
};

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await processStepApi.getList();
    list.value = res as unknown as ProcessStep[];
  } catch {
    ElMessage.error('加载工序步骤列表失败');
  } finally {
    loading.value = false;
  }
}

async function loadProducts() {
  try {
    const res = await productApi.getList();
    productOptions.value = res as unknown as Product[];
  } catch {
    ElMessage.error('加载产品列表失败');
  }
}

async function handleProductFilter(productId: string) {
  if (!productId) {
    await loadList();
    return;
  }
  loading.value = true;
  try {
    const res = await processStepApi.getByProduct(productId);
    list.value = res as unknown as ProcessStep[];
  } catch {
    ElMessage.error('加载产品工序失败');
  } finally {
    loading.value = false;
  }
}

// ── Dialog helpers ────────────────────────────────────────────────────────────

function resetForm() {
  const defaults = defaultForm();
  form.product_id = defaults.product_id;
  form.step_no = defaults.step_no;
  form.step_name = defaults.step_name;
  form.description = defaults.description;
  form.is_ccp = defaults.is_ccp;
  form.control_measures = defaults.control_measures;
  form.critical_limit = defaults.critical_limit;
  form.monitoring_method = defaults.monitoring_method;
  form.monitoring_frequency = defaults.monitoring_frequency;
  form.corrective_action = defaults.corrective_action;
  form.responsible_person = defaults.responsible_person;
}

function openCreateDialog() {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(row: ProcessStep) {
  editingId.value = row.id;
  form.product_id = row.product_id ?? '';
  form.step_no = row.step_no;
  form.step_name = row.step_name;
  form.description = row.description ?? '';
  form.is_ccp = row.is_ccp;
  form.control_measures = row.control_measures ?? '';
  form.critical_limit = row.critical_limit ?? '';
  form.monitoring_method = row.monitoring_method ?? '';
  form.monitoring_frequency = row.monitoring_frequency ?? '';
  form.corrective_action = row.corrective_action ?? '';
  form.responsible_person = row.responsible_person ?? '';
  dialogVisible.value = true;
}

// ── Submit ────────────────────────────────────────────────────────────────────

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const payload = {
    product_id: form.product_id || undefined,
    step_no: form.step_no,
    step_name: form.step_name,
    description: form.description || undefined,
    is_ccp: form.is_ccp,
    control_measures: form.control_measures || undefined,
    critical_limit: form.critical_limit || undefined,
    monitoring_method: form.monitoring_method || undefined,
    monitoring_frequency: form.monitoring_frequency || undefined,
    corrective_action: form.corrective_action || undefined,
    responsible_person: form.responsible_person || undefined,
  };

  submitting.value = true;
  try {
    if (editingId.value) {
      await processStepApi.update(editingId.value, payload);
      ElMessage.success('修改成功');
    } else {
      await processStepApi.create(payload);
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

async function handleDelete(row: ProcessStep) {
  await ElMessageBox.confirm(
    `确定要删除步骤「${row.step_name}」吗？此操作不可撤销。`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  );
  try {
    await processStepApi.remove(row.id);
    ElMessage.success('删除成功');
    list.value = list.value.filter((s) => s.id !== row.id);
  } catch {
    ElMessage.error('删除失败，请重试');
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
  loadProducts();
});
</script>

<style scoped>
.process-step-list-page {
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

.header-actions {
  display: flex;
  align-items: center;
}

.step-no {
  font-weight: 600;
  color: #409eff;
}

.switch-label {
  margin-left: 10px;
  font-size: 13px;
  color: #606266;
}
</style>
