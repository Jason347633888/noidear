<template>
  <div class="task-detail-page" v-loading="loading">
    <el-card v-if="task">
      <template #header>
        <div class="card-header">
          <span>{{ task.template?.title || '任务详情' }}</span>
          <el-tag :type="statusTagType">{{ statusLabel }}</el-tag>
        </div>
      </template>

      <div class="task-meta" style="margin-bottom: 16px;">
        <div>截止时间：{{ task.deadline }}</div>
        <div>部门：{{ task.department?.name || '-' }}</div>
        <div>创建人：{{ task.creator?.name || '-' }}</div>
      </div>

      <div v-if="!isLocked && task.template?.fieldsJson?.length" class="task-form">
        <el-form label-width="120px">
          <el-form-item
            v-for="field in task.template.fieldsJson"
            :key="(field as FieldDef).name"
            :label="(field as FieldDef).label || (field as FieldDef).name"
          >
            <el-input v-model="formData[(field as FieldDef).name]" />
          </el-form-item>
        </el-form>
      </div>

      <div v-if="isLocked" class="locked-notice" style="color: #909399; margin-bottom: 16px;">
        任务已锁定，不可修改
      </div>

      <div v-if="task.records?.length" class="records-section" style="margin-top: 16px;">
        <h4>提交记录</h4>
        <div
          v-for="record in task.records"
          :key="record.id"
          class="record-item"
          style="border: 1px solid #eee; padding: 8px; margin-bottom: 8px; border-radius: 4px;"
        >
          <el-tag :type="getRecordStatusType(record.status)" size="small">
            {{ getRecordStatusText(record.status) }}
          </el-tag>
          <span style="margin-left: 8px; color: #606266; font-size: 12px;">
            {{ record.submitter?.name || '-' }}
          </span>
          <span v-if="record.comment" style="margin-left: 8px; color: #909399; font-size: 12px;">
            备注：{{ record.comment }}
          </span>
        </div>
      </div>

      <div class="actions" style="margin-top: 16px; display: flex; gap: 8px;">
        <el-button @click="router.back()">返回</el-button>
        <el-button v-if="canDraft" @click="handleSaveDraft">保存草稿</el-button>
        <el-button v-if="canSubmit" type="primary" @click="handleSubmit">提交</el-button>
      </div>
    </el-card>

    <el-card v-else-if="!loading">
      <div>任务不存在或无权访问</div>
      <el-button style="margin-top: 16px;" @click="router.back()">返回</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
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

const isLocked = computed(
  () => task.value != null && (isTaskLocked(task.value.status) || task.value.status === 'submitted'),
);
const canDraft = computed(() => task.value?.status === 'pending');
const canSubmit = computed(
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

defineExpose({ handleSaveDraft, handleSubmit });
</script>

<style scoped>
.task-detail-page {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
