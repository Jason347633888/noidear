<template>
  <div class="cleaning-execution-page">
    <PageHeaderBlock
      eyebrow="设备与现场"
      title="清洁执行"
      description="按激活计划逐项完成清洁任务，记录每个清洁项目的执行结果"
    />

    <!-- 区域 & 日期选择 -->
    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">创建执行记录</h3>
      </div>
      <div class="app-panel--padded">
        <el-form inline>
          <el-form-item label="区域点位">
            <el-select
              v-model="selectedAreaId"
              placeholder="请选择区域"
              filterable
              clearable
              style="width: 200px"
            >
              <el-option
                v-for="area in workshopAreas"
                :key="area.id"
                :label="area.name"
                :value="area.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="清洁日期">
            <el-date-picker
              v-model="selectedDate"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 160px"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="creating"
              :disabled="!selectedAreaId || !selectedDate"
              @click="handleCreateFromPlan"
            >
              从激活计划创建记录
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 现有记录列表 -->
    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">
          清洁执行记录
          <span class="card-count">共 {{ records.length }} 条</span>
        </h3>
        <el-button @click="loadRecords">刷新</el-button>
      </div>
      <div class="app-panel--padded">
        <el-table :data="records" v-loading="loading" stripe>
          <el-table-column label="区域" width="140">
            <template #default="{ row }">{{ row.target_name }}</template>
          </el-table-column>
          <el-table-column label="清洁日期" width="130">
            <template #default="{ row }">{{ formatDate(row.cleaning_date) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" effect="light" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="结果" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.status !== 'draft'" :type="row.is_pass ? 'success' : 'danger'" size="small">
                {{ row.is_pass ? '合格' : '不合格' }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="项目数" width="90" align="center">
            <template #default="{ row }">{{ row.items?.length ?? 0 }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="selectRecord(row)">执行</el-button>
              <el-button
                v-if="row.status === 'draft'"
                link
                type="success"
                size="small"
                :loading="submitting === row.id"
                @click="handleSubmit(row)"
              >提交</el-button>
              <el-button
                v-if="row.status === 'submitted'"
                link
                type="warning"
                size="small"
                :loading="verifying === row.id"
                @click="handleVerify(row, true)"
              >验证通过</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 执行详情面板 -->
    <div v-if="activeRecord" class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">
          执行项目 — {{ activeRecord.target_name }}
          <el-tag :type="getStatusTagType(activeRecord.status)" effect="light" size="small" style="margin-left: 8px">
            {{ getStatusText(activeRecord.status) }}
          </el-tag>
        </h3>
      </div>

      <!-- Items grouped by target_type -->
      <div class="app-panel--padded">
        <div
          v-for="(groupItems, groupType) in groupedItems"
          :key="groupType"
          class="item-group"
        >
          <h4 class="item-group__title">{{ getTargetTypeText(groupType) }}</h4>
          <el-table :data="groupItems" stripe>
            <el-table-column prop="target_name" label="清洁对象" width="160" />
            <el-table-column label="方法" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ row.method_snapshot ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="需消毒" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.requires_disinfection ? 'warning' : 'info'" size="small" effect="plain">
                  {{ row.requires_disinfection ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="结果" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getResultTagType(row.result)" size="small">
                  {{ getResultText(row.result) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.remark ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <template v-if="activeRecord!.status === 'draft' && !row.completed">
                  <el-button
                    link
                    type="success"
                    size="small"
                    @click="openCompleteDialog(row, 'pass')"
                  >合格</el-button>
                  <el-button
                    link
                    type="danger"
                    size="small"
                    @click="openCompleteDialog(row, 'fail')"
                  >不合格</el-button>
                </template>
                <el-button
                  v-if="row.result === 'fail'"
                  link
                  type="warning"
                  size="small"
                  @click="openNcDialog(row)"
                >创建不合格</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-if="activeRecord.items.length === 0" description="暂无清洁项目" />
      </div>
    </div>

    <!-- 完成项目对话框 -->
    <el-dialog
      v-model="completeDialogVisible"
      :title="completeForm.result === 'pass' ? '标记合格' : '标记不合格'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form :model="completeForm" label-width="100px">
        <el-form-item label="消毒液浓度">
          <el-input-number
            v-model="completeForm.actual_concentration"
            :min="0"
            :precision="2"
            placeholder="可选"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="消毒检查单">
          <el-input
            v-model="completeForm.sanitizer_check_id"
            placeholder="消毒液检查记录ID（可选）"
          />
        </el-form-item>
        <el-form-item label="备注" :required="completeForm.result === 'fail'">
          <el-input
            v-model="completeForm.remark"
            type="textarea"
            :rows="3"
            placeholder="不合格项目必须填写备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button
          :type="completeForm.result === 'pass' ? 'success' : 'danger'"
          :loading="completing"
          @click="handleCompleteItem"
        >确认</el-button>
      </template>
    </el-dialog>

    <!-- 创建不合格对话框 -->
    <el-dialog v-model="ncDialogVisible" title="创建不合格记录" width="400px" :close-on-click-modal="false">
      <el-form label-width="100px">
        <el-form-item label="不合格编号">
          <el-input v-model="ncNo" placeholder="例如：NC-2024-001" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ncDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creatingNc" @click="handleCreateNc">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { workshopAreaApi, type WorkshopArea } from '@/api/workshop-area';
import cleaningRecordApi, {
  type CleaningRecord,
  type CleaningRecordItem,
  getTargetTypeText,
  getResultText,
  getStatusText,
} from '@/api/cleaning-record';
import { toList } from '@/utils/apiResponse';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

// ── State ─────────────────────────────────────────────────────────────────────

const workshopAreas = ref<WorkshopArea[]>([]);
const records = ref<CleaningRecord[]>([]);
const activeRecord = ref<CleaningRecord | null>(null);
const selectedAreaId = ref('');
const selectedDate = ref('');
const loading = ref(false);
const creating = ref(false);
const submitting = ref<string | null>(null);
const verifying = ref<string | null>(null);
const completing = ref(false);
const creatingNc = ref(false);

// ── Complete dialog ───────────────────────────────────────────────────────────

const completeDialogVisible = ref(false);
const completeTargetItem = ref<CleaningRecordItem | null>(null);
const completeForm = reactive({
  result: 'pass' as 'pass' | 'fail',
  remark: '',
  actual_concentration: undefined as number | undefined,
  sanitizer_check_id: '',
});

// ── NC dialog ─────────────────────────────────────────────────────────────────

const ncDialogVisible = ref(false);
const ncTargetItem = ref<CleaningRecordItem | null>(null);
const ncNo = ref('');

// ── Computed ──────────────────────────────────────────────────────────────────

const groupedItems = computed<Record<string, CleaningRecordItem[]>>(() => {
  if (!activeRecord.value) return {};
  return activeRecord.value.items.reduce(
    (acc, item) => {
      const key = item.target_type;
      if (!acc[key]) acc[key] = [];
      acc[key] = [...acc[key], item];
      return acc;
    },
    {} as Record<string, CleaningRecordItem[]>,
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getStatusTagType(status: string): 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
    draft: 'info',
    submitted: 'warning',
    verified: 'success',
    rejected: 'danger',
  };
  return map[status] ?? 'info';
}

function getResultTagType(result: string): 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
    pending: 'info',
    pass: 'success',
    fail: 'danger',
  };
  return map[result] ?? 'info';
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadWorkshopAreas() {
  try {
    const res = await workshopAreaApi.getList();
    workshopAreas.value = toList<WorkshopArea>(res);
  } catch {
    ElMessage.error('加载区域列表失败');
  }
}

async function loadRecords() {
  loading.value = true;
  try {
    const res = await cleaningRecordApi.getList();
    records.value = toList<CleaningRecord>(res);
  } catch {
    ElMessage.error('加载清洁记录失败');
  } finally {
    loading.value = false;
  }
}

// ── Record operations ─────────────────────────────────────────────────────────

async function handleCreateFromPlan() {
  if (!selectedAreaId.value || !selectedDate.value) return;
  creating.value = true;
  try {
    const res = await cleaningRecordApi.createFromPlan({
      area_point_id: selectedAreaId.value,
      cleaning_date: selectedDate.value,
    });
    const record = (res as { data?: CleaningRecord } & CleaningRecord).data ?? (res as CleaningRecord);
    ElMessage.success('执行记录已创建');
    await loadRecords();
    activeRecord.value = record;
  } catch {
    ElMessage.error('创建失败，请确认该区域已有激活的清洁计划');
  } finally {
    creating.value = false;
  }
}

function selectRecord(record: CleaningRecord) {
  activeRecord.value = record;
}

async function handleSubmit(record: CleaningRecord) {
  try {
    await ElMessageBox.confirm('确认提交该清洁记录？提交后不可修改。', '提交确认', {
      type: 'warning',
      confirmButtonText: '确认提交',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  submitting.value = record.id;
  try {
    await cleaningRecordApi.submit(record.id);
    ElMessage.success('记录已提交');
    await loadRecords();
    activeRecord.value = null;
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
    ElMessage.error(msg ?? '提交失败');
  } finally {
    submitting.value = null;
  }
}

async function handleVerify(record: CleaningRecord, pass: boolean) {
  verifying.value = record.id;
  try {
    await cleaningRecordApi.verify(record.id, pass);
    ElMessage.success(pass ? '已验证通过' : '已驳回');
    await loadRecords();
  } catch {
    ElMessage.error('验证操作失败');
  } finally {
    verifying.value = null;
  }
}

// ── Item operations ───────────────────────────────────────────────────────────

function openCompleteDialog(item: CleaningRecordItem, result: 'pass' | 'fail') {
  completeTargetItem.value = item;
  completeForm.result = result;
  completeForm.remark = '';
  completeForm.actual_concentration = undefined;
  completeForm.sanitizer_check_id = '';
  completeDialogVisible.value = true;
}

async function handleCompleteItem() {
  if (!activeRecord.value || !completeTargetItem.value) return;
  if (completeForm.result === 'fail' && !completeForm.remark.trim()) {
    ElMessage.warning('不合格项目必须填写备注');
    return;
  }

  completing.value = true;
  try {
    await cleaningRecordApi.completeItem(activeRecord.value.id, completeTargetItem.value.id, {
      result: completeForm.result,
      remark: completeForm.remark.trim() || undefined,
      actual_concentration: completeForm.actual_concentration,
      sanitizer_check_id: completeForm.sanitizer_check_id.trim() || undefined,
    });
    ElMessage.success('项目已更新');
    completeDialogVisible.value = false;
    await reloadActiveRecord();
  } catch {
    ElMessage.error('更新失败');
  } finally {
    completing.value = false;
  }
}

function openNcDialog(item: CleaningRecordItem) {
  ncTargetItem.value = item;
  ncNo.value = '';
  ncDialogVisible.value = true;
}

async function handleCreateNc() {
  if (!activeRecord.value || !ncTargetItem.value || !ncNo.value.trim()) {
    ElMessage.warning('请输入不合格编号');
    return;
  }

  creatingNc.value = true;
  try {
    await cleaningRecordApi.createNonConformance(
      activeRecord.value.id,
      ncTargetItem.value.id,
      ncNo.value.trim(),
    );
    ElMessage.success('不合格记录已创建');
    ncDialogVisible.value = false;
  } catch {
    ElMessage.error('创建不合格记录失败');
  } finally {
    creatingNc.value = false;
  }
}

async function reloadActiveRecord() {
  if (!activeRecord.value) return;
  await loadRecords();
  const updated = records.value.find((r) => r.id === activeRecord.value!.id);
  activeRecord.value = updated ?? null;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([loadWorkshopAreas(), loadRecords()]);
});
</script>

<style scoped>
.cleaning-execution-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-count {
  font-size: 13px;
  color: #909399;
  margin-left: 8px;
}

.item-group {
  margin-bottom: 24px;
}

.item-group__title {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin: 0 0 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
</style>
