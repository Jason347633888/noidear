<template>
  <div class="sls-list-page">
    <PageHeaderBlock eyebrow="质量与合规" title="货架寿命研究">
      <template #actions>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>新建研究
        </el-button>
      </template>
    </PageHeaderBlock>

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">
          研究列表
          <span class="card-count">共 {{ total }} 条</span>
        </h3>
        <div class="app-panel-header__actions">
          <el-select
            v-model="filterStatus"
            placeholder="状态筛选"
            clearable
            style="width: 120px"
            @change="loadList"
          >
            <el-option label="进行中" value="active" />
            <el-option label="已结论" value="concluded" />
          </el-select>
        </div>
      </div>
      <div class="app-panel--padded">
        <el-table :data="list" v-loading="loading" stripe>
          <el-table-column label="研究类型" width="100">
            <template #default="{ row }">
              {{ STUDY_TYPE_LABEL[row.study_type] ?? row.study_type }}
            </template>
          </el-table-column>
          <el-table-column label="产品ID" prop="product_id" min-width="160" show-overflow-tooltip />
          <el-table-column label="开始时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.started_at) }}
            </template>
          </el-table-column>
          <el-table-column label="计划结束" width="160">
            <template #default="{ row }">
              {{ formatDate(row.planned_ended_at) }}
            </template>
          </el-table-column>
          <el-table-column label="检验点数" width="100">
            <template #default="{ row }">
              {{ row.points?.length ?? 0 }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'warning' : 'success'" effect="light" size="small">
                {{ row.status === 'active' ? '进行中' : '已结论' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最终结论" width="100">
            <template #default="{ row }">
              <span v-if="row.final_conclusion">
                <el-tag :type="row.final_conclusion === 'pass' ? 'success' : 'danger'" size="small">
                  {{ row.final_conclusion === 'pass' ? '通过' : '不通过' }}
                </el-tag>
              </span>
              <span v-else style="color: #c0c4cc">—</span>
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

    <!-- 新建研究对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建货架寿命研究"
      width="620px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="110px"
      >
        <el-form-item label="产品ID" prop="productId">
          <el-input v-model="createForm.productId" placeholder="请输入产品ID" style="width: 100%" />
        </el-form-item>
        <el-form-item label="研究类型" prop="studyType">
          <el-select v-model="createForm.studyType" placeholder="请选择" style="width: 100%">
            <el-option label="初始研究" value="initial" />
            <el-option label="周期验证" value="periodic" />
          </el-select>
        </el-form-item>
        <el-form-item label="留样ID">
          <el-input v-model="createForm.retainedSampleId" placeholder="关联留样ID（可选）" style="width: 100%" />
        </el-form-item>
        <el-form-item label="开始时间" prop="startedAt">
          <el-date-picker
            v-model="createForm.startedAt"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="计划结束" prop="plannedEndedAt">
          <el-date-picker
            v-model="createForm.plannedEndedAt"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="储存条件">
          <el-input
            v-model="storageConditionsJson"
            type="textarea"
            :rows="2"
            placeholder='{"temperature": "4°C", "humidity": "60%"}'
            style="width: 100%"
          />
        </el-form-item>

        <el-divider content-position="left">检验时间点</el-divider>
        <div
          v-for="(point, index) in createForm.points"
          :key="index"
          class="point-row"
        >
          <el-input
            v-model="point.pointCode"
            placeholder="时间点编码（如 T0, T7d）"
            style="flex: 2"
          />
          <el-input-number
            v-model="point.sequence"
            :min="1"
            placeholder="序号"
            style="flex: 1"
          />
          <el-date-picker
            v-model="point.plannedAt"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="计划时间"
            style="flex: 2"
          />
          <el-button
            type="danger"
            link
            :disabled="createForm.points.length <= 1"
            @click="removePoint(index)"
          >
            删除
          </el-button>
        </div>
        <el-button style="margin-top: 8px" @click="addPoint">
          <el-icon><Plus /></el-icon>添加检验点
        </el-button>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';
import shelfLifeStudyApi, {
  type ShelfLifeStudy,
  type ShelfLifeStudyType,
} from '@/api/shelf-life-study';

// ── Constants ─────────────────────────────────────────────────────────────────

const STUDY_TYPE_LABEL: Record<string, string> = {
  initial: '初始研究',
  periodic: '周期验证',
};

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<ShelfLifeStudy[]>([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = 20;

const filterStatus = ref('');

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();
const storageConditionsJson = ref('{}');

const createForm = ref<{
  productId: string;
  studyType: ShelfLifeStudyType;
  retainedSampleId: string;
  startedAt: string;
  plannedEndedAt: string;
  points: Array<{ pointCode: string; sequence: number; plannedAt: string }>;
}>({
  productId: '',
  studyType: 'initial',
  retainedSampleId: '',
  startedAt: '',
  plannedEndedAt: '',
  points: [{ pointCode: 'T0', sequence: 1, plannedAt: '' }],
});

const createRules: FormRules = {
  productId: [{ required: true, message: '请输入产品ID', trigger: 'blur' }],
  studyType: [{ required: true, message: '请选择研究类型', trigger: 'change' }],
  startedAt: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  plannedEndedAt: [{ required: true, message: '请选择计划结束时间', trigger: 'change' }],
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

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const result = await shelfLifeStudyApi.getList({
      page: currentPage.value,
      limit: pageSize,
      ...(filterStatus.value ? { status: filterStatus.value as ShelfLifeStudy['status'] } : {}),
    });
    list.value = result.list;
    total.value = result.total;
  } catch {
    ElMessage.error('加载货架寿命研究列表失败');
  } finally {
    loading.value = false;
  }
}

// ── Point rows ────────────────────────────────────────────────────────────────

function addPoint() {
  const nextSeq = createForm.value.points.length + 1;
  createForm.value = {
    ...createForm.value,
    points: [...createForm.value.points, { pointCode: `T${nextSeq}`, sequence: nextSeq, plannedAt: '' }],
  };
}

function removePoint(index: number) {
  createForm.value = {
    ...createForm.value,
    points: createForm.value.points.filter((_, i) => i !== index),
  };
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.value = {
    productId: '',
    studyType: 'initial',
    retainedSampleId: '',
    startedAt: '',
    plannedEndedAt: '',
    points: [{ pointCode: 'T0', sequence: 1, plannedAt: '' }],
  };
  storageConditionsJson.value = '{}';
  createDialogVisible.value = true;
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  let storageConditions: Record<string, unknown> = {};
  try {
    storageConditions = JSON.parse(storageConditionsJson.value || '{}');
  } catch {
    ElMessage.error('储存条件 JSON 格式有误');
    return;
  }

  submitting.value = true;
  try {
    await shelfLifeStudyApi.create({
      productId: createForm.value.productId,
      studyType: createForm.value.studyType,
      ...(createForm.value.retainedSampleId ? { retainedSampleId: createForm.value.retainedSampleId } : {}),
      storageConditions,
      startedAt: createForm.value.startedAt,
      plannedEndedAt: createForm.value.plannedEndedAt,
      points: createForm.value.points.map((p) => ({
        pointCode: p.pointCode,
        sequence: p.sequence,
        plannedAt: p.plannedAt,
      })),
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
.sls-list-page {
  padding: 0 0 32px;
}

.card-count {
  font-size: 13px;
  color: #909399;
  margin-left: 8px;
  font-weight: 400;
}

.point-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
