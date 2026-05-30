<template>
  <div class="rs-list-page">
    <PageHeaderBlock eyebrow="质量与合规" title="留样管理">
      <template #actions>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>新建留样
        </el-button>
      </template>
    </PageHeaderBlock>

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">
          留样列表
          <span class="card-count">共 {{ total }} 条</span>
        </h3>
        <div class="app-panel-header__actions">
          <el-select
            v-model="filterStatus"
            placeholder="状态筛选"
            clearable
            style="width: 120px; margin-right: 8px"
            @change="loadList"
          >
            <el-option label="在库" value="retained" />
            <el-option label="检验中" value="inspecting" />
            <el-option label="已处置" value="disposed" />
          </el-select>
          <el-select
            v-model="filterSampleType"
            placeholder="样品类型"
            clearable
            style="width: 120px"
            @change="loadList"
          >
            <el-option label="成品" value="product" />
            <el-option label="物料" value="material" />
            <el-option label="包材" value="packaging" />
          </el-select>
        </div>
      </div>
      <div class="app-panel--padded">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="留样编号" prop="sample_code" min-width="150" show-overflow-tooltip />
          <el-table-column label="样品类型" width="100">
            <template #default="{ row }">
              {{ SAMPLE_TYPE_LABEL[row.sample_type] ?? row.sample_type }}
            </template>
          </el-table-column>
          <el-table-column label="数量" width="120">
            <template #default="{ row }">
              {{ row.sample_qty }} {{ row.unit }}
            </template>
          </el-table-column>
          <el-table-column label="留样时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.retained_at) }}
            </template>
          </el-table-column>
          <el-table-column label="到期时间" width="160">
            <template #default="{ row }">
              {{ row.expires_at ? formatDate(row.expires_at) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="STATUS_TAG_TYPE[row.status] ?? 'info'" effect="light" size="small">
                {{ STATUS_LABEL[row.status] ?? row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
              <el-button
                v-if="row.status !== 'disposed'"
                link
                type="warning"
                @click="openInspectionDrawer(row)"
              >
                新建检验
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="total > pageSize"
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          style="margin-top: 16px; justify-content: flex-end"
          @current-change="loadList"
        />
      </div>
    </div>

    <!-- 新建留样对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建留样"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="留样类型" prop="sample_type">
          <el-select v-model="createForm.sample_type" placeholder="请选择" style="width: 100%">
            <el-option label="成品" value="product" />
            <el-option label="物料" value="material" />
            <el-option label="包材" value="packaging" />
          </el-select>
        </el-form-item>
        <el-form-item label="留样编号" prop="sample_code">
          <el-input v-model="createForm.sample_code" placeholder="如: RS-20260530-001" style="width: 100%" />
        </el-form-item>
        <el-form-item label="数量" prop="sample_qty">
          <div style="display: flex; gap: 8px; width: 100%">
            <el-input-number v-model="createForm.sample_qty" :min="0.01" :precision="3" style="flex: 1" />
            <el-input v-model="createForm.unit" placeholder="单位（如 kg）" style="flex: 1" />
          </div>
        </el-form-item>
        <el-form-item label="留样时间" prop="retained_at">
          <el-date-picker
            v-model="createForm.retained_at"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="保留期限">
          <el-input v-model="createForm.retention_period" placeholder="如 90d, 6m, 1y" style="width: 100%" />
        </el-form-item>
        <el-form-item label="储存条件">
          <el-input v-model="createForm.storage_condition" placeholder="如: 冷藏 2-8°C" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="createForm.sample_type === 'product'" label="生产批次ID">
          <el-input v-model="createForm.production_batch_id" placeholder="关联生产批次ID（可选）" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="createForm.sample_type !== 'product'" label="物料批次ID">
          <el-input v-model="createForm.material_batch_id" placeholder="关联物料批次ID" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>

    <!-- 留样检验抽屉 -->
    <RetainedSampleInspectionDrawer
      v-if="inspectionDrawerSample"
      v-model="inspectionDrawerVisible"
      :sample="inspectionDrawerSample"
      @created="handleInspectionCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { useRouter } from 'vue-router';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import RetainedSampleInspectionDrawer from './RetainedSampleInspectionDrawer.vue';
import retainedSampleApi, {
  type RetainedSample,
  type CreateRetainedSamplePayload,
  type RetainedSampleType,
} from '@/api/retained-sample';

// ── Constants ─────────────────────────────────────────────────────────────────

const SAMPLE_TYPE_LABEL: Record<string, string> = {
  product: '成品',
  material: '物料',
  packaging: '包材',
};

const STATUS_LABEL: Record<string, string> = {
  retained: '在库',
  inspecting: '检验中',
  disposed: '已处置',
};

const STATUS_TAG_TYPE: Record<string, string> = {
  retained: 'success',
  inspecting: 'warning',
  disposed: 'info',
};

// ── State ─────────────────────────────────────────────────────────────────────

const router = useRouter();
const list = ref<RetainedSample[]>([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = 20;

const filterStatus = ref('');
const filterSampleType = ref('');

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const inspectionDrawerVisible = ref(false);
const inspectionDrawerSample = ref<RetainedSample | null>(null);

const createForm = ref<Partial<CreateRetainedSamplePayload> & { sample_type: RetainedSampleType; sample_code: string; unit: string }>({
  sample_type: 'product',
  sample_code: '',
  sample_qty: 0.5,
  unit: 'kg',
  retained_at: new Date().toISOString().slice(0, 19),
  retention_period: '',
  storage_condition: '',
  production_batch_id: '',
  material_batch_id: '',
});

const createRules: FormRules = {
  sample_type: [{ required: true, message: '请选择留样类型', trigger: 'change' }],
  sample_code: [{ required: true, message: '请输入留样编号', trigger: 'blur' }],
  sample_qty: [{ required: true, type: 'number', message: '请输入数量', trigger: 'blur' }],
  retained_at: [{ required: true, message: '请选择留样时间', trigger: 'change' }],
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
    const result = await retainedSampleApi.getList({
      page: currentPage.value,
      limit: pageSize,
      ...(filterStatus.value ? { status: filterStatus.value as RetainedSample['status'] } : {}),
      ...(filterSampleType.value ? { sample_type: filterSampleType.value as RetainedSampleType } : {}),
    });
    list.value = result.list;
    total.value = result.total;
  } catch {
    ElMessage.error('加载留样列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.value = {
    sample_type: 'product',
    sample_code: '',
    sample_qty: 0.5,
    unit: 'kg',
    retained_at: new Date().toISOString().slice(0, 19),
    retention_period: '',
    storage_condition: '',
    production_batch_id: '',
    material_batch_id: '',
  };
  createDialogVisible.value = true;
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const { production_batch_id, material_batch_id, retention_period, storage_condition, ...rest } = createForm.value;
    await retainedSampleApi.create({
      ...rest,
      sample_type: rest.sample_type as RetainedSampleType,
      sample_qty: rest.sample_qty ?? 0,
      unit: rest.unit ?? '',
      retained_at: rest.retained_at ?? new Date().toISOString(),
      ...(production_batch_id ? { production_batch_id } : {}),
      ...(material_batch_id ? { material_batch_id } : {}),
      ...(retention_period ? { retention_period } : {}),
      ...(storage_condition ? { storage_condition } : {}),
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

// ── Navigation ────────────────────────────────────────────────────────────────

function openDetail(row: RetainedSample) {
  router.push(`/retained-samples/${row.id}`);
}

function openInspectionDrawer(row: RetainedSample) {
  inspectionDrawerSample.value = row;
  inspectionDrawerVisible.value = true;
}

async function handleInspectionCreated() {
  inspectionDrawerVisible.value = false;
  await loadList();
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.rs-list-page {
  padding: 0 0 32px;
}

.card-count {
  font-size: 13px;
  color: #909399;
  margin-left: 8px;
  font-weight: 400;
}
</style>
