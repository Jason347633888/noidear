<template>
  <div class="fii-list-page">
    <PageHeaderBlock eyebrow="设备与现场" title="玻璃及硬塑完整性检查" description="记录玻璃器具和硬质塑料容器的完整性巡查结果" />

    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">检查记录列表<span class="card-count">共 {{ list.length }} 条记录</span></h3>
        <div class="app-panel-header__actions">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="margin-right: 12px"
            @change="loadList"
          />
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建记录
          </el-button>
        </div>
      </div>
      <div class="app-panel--padded">

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="检查时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.inspected_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="item_name" label="器具名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="location" label="检查地点" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.location || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="总数" width="80">
          <template #default="{ row }">{{ row.total_qty }}</template>
        </el-table-column>
        <el-table-column label="完好数" width="80">
          <template #default="{ row }">{{ row.intact_qty }}</template>
        </el-table-column>
        <el-table-column label="检查结果" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_pass ? 'success' : 'danger'" effect="light" size="small">
              {{ row.is_pass ? '合格' : '不合格' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="damage_action" label="处置措施" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.damage_action || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="production_batch_id" label="批次号" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.production_batch_id || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-popconfirm title="确认删除此记录？" @confirm="handleRemove(row.id)">
              <template #reference>
                <el-button type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建玻璃/硬塑检查记录"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="器具名称" prop="item_name">
          <el-input v-model="createForm.item_name" placeholder="例如：量杯、玻璃刮刀" />
        </el-form-item>
        <el-form-item label="检查时间" prop="inspected_at">
          <el-date-picker
            v-model="createForm.inspected_at"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="选择检查时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="检查地点">
          <el-input v-model="createForm.location" placeholder="可选，例如：生产车间A区" />
        </el-form-item>
        <el-form-item label="总数量" prop="total_qty">
          <el-input-number
            v-model="createForm.total_qty"
            :min="0"
            :precision="0"
            placeholder="器具总数"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="完好数量" prop="intact_qty">
          <el-input-number
            v-model="createForm.intact_qty"
            :min="0"
            :precision="0"
            placeholder="完好无损数量"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="检查结果" prop="is_pass">
          <el-radio-group v-model="createForm.is_pass">
            <el-radio :value="true">合格</el-radio>
            <el-radio :value="false">不合格</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处置措施">
          <el-input
            v-model="createForm.damage_action"
            type="textarea"
            :rows="2"
            placeholder="发现破损时的处置措施"
          />
        </el-form-item>
        <el-form-item label="生产批次" prop="production_batch_id">
          <ProductionBatchSelect v-model="createForm.production_batch_id" />
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
import fragileItemInspectionApi, { type FragileItemInspection } from '@/api/fragile-item-inspection';
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';
import { toList } from '@/utils/apiResponse';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<FragileItemInspection[]>([]);
const loading = ref(false);
const dateRange = ref<[string, string] | null>(null);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  item_name: '',
  inspected_at: '',
  location: '',
  total_qty: undefined as number | undefined,
  intact_qty: undefined as number | undefined,
  is_pass: true,
  damage_action: '',
  production_batch_id: '',
});

const createRules: FormRules = {
  item_name: [{ required: true, message: '请输入器具名称', trigger: 'blur' }],
  inspected_at: [{ required: true, message: '请选择检查时间', trigger: 'change' }],
  total_qty: [{ required: true, message: '请输入总数量', trigger: 'blur' }],
  intact_qty: [{ required: true, message: '请输入完好数量', trigger: 'blur' }],
  production_batch_id: [{ required: true, message: '请选择生产批次', trigger: 'change' }],
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
    const [startDate, endDate] = dateRange.value ?? [undefined, undefined];
    const res = await fragileItemInspectionApi.getList(startDate, endDate);
    list.value = toList<FragileItemInspection>(res);
  } catch {
    ElMessage.error('加载检查记录列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.item_name = '';
  createForm.inspected_at = '';
  createForm.location = '';
  createForm.total_qty = undefined;
  createForm.intact_qty = undefined;
  createForm.is_pass = true;
  createForm.damage_action = '';
  createForm.production_batch_id = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await fragileItemInspectionApi.create({
      item_name: createForm.item_name,
      inspected_at: createForm.inspected_at,
      location: createForm.location || undefined,
      total_qty: createForm.total_qty!,
      intact_qty: createForm.intact_qty!,
      is_pass: createForm.is_pass,
      damage_action: createForm.damage_action || undefined,
      production_batch_id: createForm.production_batch_id,
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
    await fragileItemInspectionApi.remove(id);
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
.fii-list-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-count {
  font-size: 13px;
  color: #909399;
}
</style>
