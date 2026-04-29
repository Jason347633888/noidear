<template>
  <div class="pmu-list-page">
    <div class="page-header">
      <h1 class="page-title">包装材料用量记录</h1>
      <p class="page-subtitle">记录生产过程中包装材料使用量与废料量</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">用量记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建记录
          </el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="material_name" label="物料名称" min-width="140" show-overflow-tooltip />
        <el-table-column label="物料编号" width="120">
          <template #default="{ row }">{{ row.material_code || '-' }}</template>
        </el-table-column>
        <el-table-column label="生产批次ID" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.production_batch_id || '-' }}</template>
        </el-table-column>
        <el-table-column label="用量" width="120">
          <template #default="{ row }">
            {{ row.used_weight != null ? `${row.used_weight} ${row.unit || ''}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="废料量" width="120">
          <template #default="{ row }">
            {{ row.waste_weight != null ? `${row.waste_weight} ${row.unit || ''}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="使用日期" width="160">
          <template #default="{ row }">{{ formatDate(row.usage_date) }}</template>
        </el-table-column>
        <el-table-column label="操作员" width="100">
          <template #default="{ row }">{{ row.operator_id || '-' }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.notes || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-popconfirm title="确认删除该记录？" @confirm="handleDelete(row.id)">
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
      v-model="dialogVisible"
      title="新建包装材料用量记录"
      width="540px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="110px"
      >
        <el-form-item label="物料" prop="material_name">
          <MaterialSelect v-model="form.material_id" />
        </el-form-item>
        <el-form-item label="生产批次">
          <ProductionBatchSelect v-model="form.production_batch_id" />
        </el-form-item>
        <el-form-item label="用量">
          <el-input-number
            v-model="form.used_weight"
            :precision="3"
            :min="0"
            style="width: 100%"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item label="废料量">
          <el-input-number
            v-model="form.waste_weight"
            :precision="3"
            :min="0"
            style="width: 100%"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="form.unit" placeholder="如：kg, g, 个" />
        </el-form-item>
        <el-form-item label="使用日期">
          <el-date-picker
            v-model="form.usage_date"
            type="datetime"
            placeholder="选择使用日期"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="操作员ID">
          <el-input v-model="form.operator_id" placeholder="可选" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
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
import packagingMaterialUsageApi, {
  type PackagingMaterialUsage,
} from '@/api/packaging-material-usage';
import MaterialSelect from '@/components/master-data/MaterialSelect.vue';
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<PackagingMaterialUsage[]>([]);
const loading = ref(false);

// ── Dialog ────────────────────────────────────────────────────────────────────

const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  material_id: '',
  material_name: '',
  material_code: '',
  production_batch_id: '',
  used_weight: undefined as number | undefined,
  waste_weight: undefined as number | undefined,
  unit: '',
  usage_date: '',
  operator_id: '',
  notes: '',
});

const formRules: FormRules = {
  material_name: [{ required: true, message: '请选择物料', trigger: 'change' }],
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

function resetForm() {
  form.material_id = '';
  form.material_name = '';
  form.material_code = '';
  form.production_batch_id = '';
  form.used_weight = undefined;
  form.waste_weight = undefined;
  form.unit = '';
  form.usage_date = '';
  form.operator_id = '';
  form.notes = '';
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await packagingMaterialUsageApi.getList();
    list.value = res as unknown as PackagingMaterialUsage[];
  } catch {
    ElMessage.error('加载包装材料用量记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  resetForm();
  dialogVisible.value = true;
}

async function handleCreate() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await packagingMaterialUsageApi.create({
      material_name: form.material_name || form.material_id,
      material_code: form.material_code || undefined,
      production_batch_id: form.production_batch_id || undefined,
      used_weight: form.used_weight,
      waste_weight: form.waste_weight,
      unit: form.unit || undefined,
      usage_date: form.usage_date || undefined,
      operator_id: form.operator_id || undefined,
      notes: form.notes || undefined,
    });
    ElMessage.success('新建成功');
    dialogVisible.value = false;
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
    await packagingMaterialUsageApi.remove(id);
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
.pmu-list-page {
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
</style>
