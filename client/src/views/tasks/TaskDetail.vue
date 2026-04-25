<template>
  <div class="task-detail-page" v-loading="loading">
    <h2 class="page-title">{{ task?.template?.name || task?.template?.title || '任务详情' }}</h2>

    <template v-if="task">
      <!-- Info card: task meta with el-descriptions so statusTag locator works -->
      <el-card class="info-card" style="margin-bottom: 16px;">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType">{{ statusLabel }}</el-tag>
            <el-tag v-if="isLocked" type="warning" style="margin-left: 8px;">已锁定</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="截止日期">{{ task.deadline }}</el-descriptions-item>
          <el-descriptions-item label="执行部门">{{ task.department?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ task.creator?.name || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- Task-level actions (e.g. cancel) -->
        <div class="task-actions" style="margin-top: 12px;">
          <el-button
            v-if="canCancel"
            type="danger"
            @click="handleCancelTask"
          >取消任务</el-button>
        </div>
      </el-card>

      <!-- Form card: fill-in form rendered from template fieldsJson -->
      <el-card class="form-card" style="margin-bottom: 16px;" v-if="!isLocked">
        <el-form label-width="120px">
          <el-form-item
            v-for="field in templateFields"
            :key="(field as FieldDef).name"
            :label="(field as FieldDef).label || (field as FieldDef).name"
          >
            <el-input v-model="formData[(field as FieldDef).name]" />
          </el-form-item>
          <el-form-item v-if="templateFields.length === 0">
            <span style="color: #909399;">暂无表单字段</span>
          </el-form-item>
        </el-form>

        <div v-if="isLocked" class="locked-notice" style="color: #909399; margin-bottom: 16px;">
          任务已锁定，不可修改
        </div>

        <!-- Record-level submit actions -->
        <div class="actions" style="margin-top: 16px; display: flex; gap: 8px;">
          <el-button v-if="canDraft" @click="handleSaveDraft">保存草稿</el-button>
          <el-button v-if="canSubmit" type="primary" @click="handleSubmit">提交</el-button>
        </div>
      </el-card>

      <!-- Locked state without form -->
      <el-card class="form-card" style="margin-bottom: 16px;" v-else-if="isLocked">
        <div class="locked-notice" style="color: #909399;">任务已锁定，不可修改</div>
      </el-card>

      <!-- Records card: submission history -->
      <el-card class="records-card" v-if="task.records?.length">
        <template #header><span>提交记录</span></template>
        <el-table :data="task.records" style="width: 100%">
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getRecordStatusType(row.status)" size="small">
                {{ getRecordStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交人" prop="submitter.name" />
          <el-table-column label="备注" prop="comment" />
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <template v-if="row.status === 'submitted'">
                <el-button size="small" type="success" @click="handleApproveRecord(row.id)">通过</el-button>
                <el-button size="small" type="danger" @click="handleRejectRecord(row.id)">驳回</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <el-card v-else-if="!loading">
      <div>任务不存在或无权访问</div>
      <el-button style="margin-top: 16px;" @click="router.back()">返回</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import taskApi, {
  isTaskLocked,
  getTaskStatusText,
  getTaskStatusType,
  getRecordStatusText,
  getRecordStatusType,
} from '@/api/task';
import type { Task } from '@/api/task';

interface FieldDef {
  name: string;
  label?: string;
  type?: string;
}

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const task = ref<Task | null>(null);
const formData = ref<Record<string, unknown>>({});

const templateFields = computed((): FieldDef[] => {
  const json = task.value?.template?.fieldsJson as any;
  if (!json) return [];
  if (Array.isArray(json)) return json as FieldDef[];
  if (json.sections && Array.isArray(json.sections)) {
    return json.sections.flatMap((s: any) => (Array.isArray(s.fields) ? s.fields : []));
  }
  return [];
});

const isLocked = computed(
  () => task.value != null && (isTaskLocked(task.value.status) || task.value.status === 'submitted'),
);
const canDraft = computed(() => task.value?.status === 'pending');
const canSubmit = computed(
  () => task.value?.status === 'pending' || task.value?.status === 'rejected',
);
const canCancel = computed(
  () => task.value?.status === 'pending' || task.value?.status === 'rejected',
);

const statusLabel = computed(() =>
  task.value ? getTaskStatusText(task.value.status) : '-',
);
const statusTagType = computed(() =>
  task.value ? getTaskStatusType(task.value.status) : 'info',
);

onMounted(loadTask);

async function loadTask() {
  loading.value = true;
  try {
    task.value = await taskApi.getTaskById(String(route.params.id));
    formData.value = { ...(task.value?.draftData ?? {}) };
  } catch (err) {
    ElMessage.error('加载任务失败');
    throw err;
  } finally {
    loading.value = false;
  }
}

async function handleSaveDraft() {
  if (!task.value) return;
  try {
    await taskApi.saveDraft(task.value.id, { data: formData.value as Record<string, unknown> });
    ElMessage.success('草稿已保存');
    await loadTask();
  } catch (err) {
    ElMessage.error('保存草稿失败');
    throw err;
  }
}

async function handleSubmit() {
  if (!task.value) return;
  try {
    await taskApi.submitTaskById(task.value.id, formData.value as Record<string, unknown>);
    ElMessage.success('提交成功');
    await loadTask();
  } catch (err) {
    ElMessage.error('提交失败');
    throw err;
  }
}

async function handleCancelTask() {
  if (!task.value) return;
  try {
    await ElMessageBox.confirm('确认取消该任务？', '提示', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await taskApi.cancelTask(task.value.id);
    ElMessage.success('任务已取消');
    await loadTask();
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('取消任务失败');
      throw err;
    }
  }
}

async function handleApproveRecord(recordId: string) {
  if (!task.value) return;
  try {
    await taskApi.approveTask({ recordId, status: 'approved' });
    ElMessage.success('已通过');
    await loadTask();
  } catch (err) {
    ElMessage.error('操作失败');
    throw err;
  }
}

async function handleRejectRecord(recordId: string) {
  if (!task.value) return;
  try {
    await taskApi.approveTask({ recordId, status: 'rejected' });
    ElMessage.success('已驳回');
    await loadTask();
  } catch (err) {
    ElMessage.error('操作失败');
    throw err;
  }
}

defineExpose({ handleSaveDraft, handleSubmit, handleCancelTask });
</script>

<style scoped>
.task-detail-page {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.page-title {
  margin-bottom: 16px;
}
</style>
