<template>
  <div class="lcc-list-page">
    <div class="page-header">
      <h1 class="page-title">换产前检查记录</h1>
      <p class="page-subtitle">记录换产前过敏原清场、设备清洁及主管确认情况</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">换产检查列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建记录
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="检查日期" width="160">
          <template #default="{ row }">
            {{ formatDate(row.check_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="production_line" label="生产线" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.production_line || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="换产自→换产至" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.product_from || '-' }} → {{ row.product_to || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="过敏原清场" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.allergen_cleared ? 'success' : 'danger'" effect="light" size="small">
              {{ row.allergen_cleared ? '✓' : '✗' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="设备清洁" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.equipment_cleaned ? 'success' : 'danger'" effect="light" size="small">
              {{ row.equipment_cleaned ? '✓' : '✗' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="主管确认" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.supervisor_ok ? 'success' : 'warning'" effect="light" size="small">
              {{ row.supervisor_ok ? '✓' : '✗' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.notes || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-popconfirm
              title="确认删除该条记录？"
              confirm-button-text="删除"
              cancel-button-text="取消"
              @confirm="handleRemove(row.id)"
            >
              <template #reference>
                <el-button type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建换产前检查记录"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="120px"
      >
        <el-form-item label="检查日期" prop="check_date">
          <el-date-picker
            v-model="createForm.check_date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="生产线">
          <el-input v-model="createForm.production_line" placeholder="例如：A线" />
        </el-form-item>
        <el-form-item label="换产自">
          <el-input v-model="createForm.product_from" placeholder="原产品名称" />
        </el-form-item>
        <el-form-item label="换产至">
          <el-input v-model="createForm.product_to" placeholder="新产品名称" />
        </el-form-item>
        <el-form-item label="过敏原清场">
          <el-switch v-model="createForm.allergen_cleared" active-text="已完成" inactive-text="未完成" />
        </el-form-item>
        <el-form-item label="设备清洁">
          <el-switch v-model="createForm.equipment_cleaned" active-text="已完成" inactive-text="未完成" />
        </el-form-item>
        <el-form-item label="器具更换">
          <el-switch v-model="createForm.utensils_replaced" active-text="已完成" inactive-text="未完成" />
        </el-form-item>
        <el-form-item label="标签更新">
          <el-switch v-model="createForm.labels_updated" active-text="已完成" inactive-text="未完成" />
        </el-form-item>
        <el-form-item label="包装清场">
          <el-switch v-model="createForm.packaging_cleared" active-text="已完成" inactive-text="未完成" />
        </el-form-item>
        <el-form-item label="原料清场">
          <el-switch v-model="createForm.raw_materials_cleared" active-text="已完成" inactive-text="未完成" />
        </el-form-item>
        <el-form-item label="主管确认">
          <el-switch v-model="createForm.supervisor_ok" active-text="已确认" inactive-text="未确认" />
        </el-form-item>
        <el-form-item label="检查人工号">
          <el-input v-model="createForm.inspector_id" placeholder="可选" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createForm.notes"
            type="textarea"
            :rows="2"
            placeholder="其他说明"
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
import lineChangeCheckRecordApi, { type LineChangeCheckRecord } from '@/api/line-change-check-record';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<LineChangeCheckRecord[]>([]);
const loading = ref(false);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  check_date: '',
  production_line: '',
  product_from: '',
  product_to: '',
  allergen_cleared: false,
  equipment_cleaned: false,
  utensils_replaced: false,
  labels_updated: false,
  packaging_cleared: false,
  raw_materials_cleared: false,
  inspector_id: '',
  supervisor_ok: false,
  notes: '',
});

const createRules: FormRules = {
  check_date: [{ required: true, message: '请选择检查日期', trigger: 'change' }],
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

function resetForm() {
  createForm.check_date = '';
  createForm.production_line = '';
  createForm.product_from = '';
  createForm.product_to = '';
  createForm.allergen_cleared = false;
  createForm.equipment_cleaned = false;
  createForm.utensils_replaced = false;
  createForm.labels_updated = false;
  createForm.packaging_cleared = false;
  createForm.raw_materials_cleared = false;
  createForm.inspector_id = '';
  createForm.supervisor_ok = false;
  createForm.notes = '';
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await lineChangeCheckRecordApi.getList();
    list.value = res as unknown as LineChangeCheckRecord[];
  } catch {
    ElMessage.error('加载换产检查记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  resetForm();
  createDialogVisible.value = true;
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await lineChangeCheckRecordApi.create({
      check_date: createForm.check_date || undefined,
      production_line: createForm.production_line || undefined,
      product_from: createForm.product_from || undefined,
      product_to: createForm.product_to || undefined,
      allergen_cleared: createForm.allergen_cleared,
      equipment_cleaned: createForm.equipment_cleaned,
      utensils_replaced: createForm.utensils_replaced,
      labels_updated: createForm.labels_updated,
      packaging_cleared: createForm.packaging_cleared,
      raw_materials_cleared: createForm.raw_materials_cleared,
      inspector_id: createForm.inspector_id || undefined,
      supervisor_ok: createForm.supervisor_ok,
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

// ── Remove ────────────────────────────────────────────────────────────────────

async function handleRemove(id: string) {
  try {
    await lineChangeCheckRecordApi.remove(id);
    list.value = list.value.filter((item) => item.id !== id);
    ElMessage.success('删除成功');
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
.lcc-list-page {
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
