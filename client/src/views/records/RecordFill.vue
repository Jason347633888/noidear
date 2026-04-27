<template>
  <div class="record-fill" v-loading="pageLoading">
    <el-page-header @back="router.back()" :content="pageTitle" />

    <el-card v-if="template" class="form-card">
      <template #header>
        <span>{{ template.name }}</span>
      </template>

      <DynamicForm
        ref="dynamicFormRef"
        :template="template"
        v-model="formData"
      />

      <div class="form-actions">
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          提交
        </el-button>
      </div>
    </el-card>

    <!-- 偏差原因对话框 -->
    <el-dialog
      v-model="deviationDialogVisible"
      title="检测到偏差，请填写原因"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px;"
      >
        检测到 {{ deviations.length }} 个字段偏离标准范围，请逐一填写原因（每项不少于10字）
      </el-alert>

      <el-form ref="deviationFormRef" :model="deviationForm" label-width="120px">
        <el-form-item
          v-for="(dev, index) in deviations"
          :key="dev.fieldName"
          :label="dev.fieldName"
          :prop="`reasons.${index}`"
          :rules="deviationRules"
        >
          <div class="deviation-info">
            <el-tag type="danger" size="small" style="margin-bottom: 6px;">
              实际值: {{ dev.actualValue }} | 偏差率: {{ dev.deviationRate?.toFixed(2) }}%
            </el-tag>
          </div>
          <el-input
            v-model="deviationForm.reasons[index]"
            type="textarea"
            :rows="2"
            placeholder="请填写偏差原因（不少于10字）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="deviationDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleDeviationSubmit">
            确认提交
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import DynamicForm from '@/components/DynamicForm.vue';
import { recordTemplateApi } from '@/api/record-template';
import { instanceApi } from '@/api/record-task';
import { newRecordApi, type DeviationInfo } from '@/api/new-record';
import changeEventApi from '@/api/change-event';

const route = useRoute();
const router = useRouter();

const pageLoading = ref(false);
const submitting = ref(false);
const template = ref<any>(null);
const formData = reactive<Record<string, any>>({});
const dynamicFormRef = ref<any>(null);
const deviationFormRef = ref<FormInstance>();
const deviationDialogVisible = ref(false);
const deviations = ref<DeviationInfo[]>([]);
const deviationForm = reactive<{ reasons: string[] }>({ reasons: [] });
const currentRecordId = ref('');

const isTaskMode = computed(() => !!route.params.instanceId);

const changeEventTaskId = computed(() => route.query.changeEventTaskId as string | undefined);

const pageTitle = computed(() => {
  if (isTaskMode.value) return '填写任务';
  return template.value?.name ? `填写记录：${template.value.name}` : '填写记录';
});

const deviationRules = [
  { required: true, message: '请填写偏差原因', trigger: 'blur' },
  { min: 10, message: '偏差原因不少于10字', trigger: 'blur' },
];

const loadTemplate = async (templateId: string) => {
  const res: any = await recordTemplateApi.getById(templateId);
  template.value = res;
};

const loadFromInstance = async (instanceId: string) => {
  const res: any = await instanceApi.getById(instanceId);
  const templateId = res.assignment?.templateId;
  if (!templateId) throw new Error('实例缺少模板信息');
  await loadTemplate(templateId);
};

const loadPage = async () => {
  pageLoading.value = true;
  try {
    if (isTaskMode.value) {
      await loadFromInstance(route.params.instanceId as string);
    } else {
      await loadTemplate(route.params.templateId as string);
    }
  } catch {
    ElMessage.error('加载模板失败');
  } finally {
    pageLoading.value = false;
  }
};

const buildCreatePayload = () => {
  const payload: any = {
    templateId: template.value.id,
    dataJson: { ...formData },
  };
  if (isTaskMode.value) {
    payload.taskInstanceId = route.params.instanceId as string;
  }
  if (changeEventTaskId.value) {
    payload.usageType = 'change';
    payload.sourceType = 'change_event';
    payload.sourceId = route.query.changeEventId as string;
    payload.changeEventId = route.query.changeEventId as string;
  }
  return payload;
};

const handleSubmit = async () => {
  if (!dynamicFormRef.value) return;

  const valid = await dynamicFormRef.value.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    const record: any = await newRecordApi.create(buildCreatePayload());
    currentRecordId.value = record.id;
    if (changeEventTaskId.value) {
      await changeEventApi.fillFormTask(changeEventTaskId.value, { existingRecordId: record.id });
    }
    await submitRecord();
  } catch {
    submitting.value = false;
  }
};

const submitRecord = async (reasonsMap?: Record<string, string>) => {
  try {
    const payload = reasonsMap ? { deviationReasons: reasonsMap } : undefined;
    await newRecordApi.submit(currentRecordId.value, payload);
    ElMessage.success('提交成功');
    router.back();
  } catch (err: any) {
    if (err?.details?.deviations && Array.isArray(err.details.deviations)) {
      deviations.value = err.details.deviations;
      deviationForm.reasons = deviations.value.map(() => '');
      deviationDialogVisible.value = true;
    } else if (err?.code === 400 && err?.details) {
      deviations.value = Array.isArray(err.details) ? err.details : [];
      if (deviations.value.length > 0) {
        deviationForm.reasons = deviations.value.map(() => '');
        deviationDialogVisible.value = true;
      }
    }
  } finally {
    submitting.value = false;
  }
};

const handleDeviationSubmit = async () => {
  if (!deviationFormRef.value) return;

  const valid = await deviationFormRef.value.validate().catch(() => false);
  if (!valid) return;

  const reasonsMap: Record<string, string> = {};
  deviations.value.forEach((dev, index) => {
    reasonsMap[dev.fieldName] = deviationForm.reasons[index];
  });

  submitting.value = true;
  deviationDialogVisible.value = false;
  await submitRecord(reasonsMap);
};

onMounted(() => { loadPage(); });
</script>

<style scoped>
.record-fill { padding: 0; }
.form-card { margin-top: 16px; }
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
.deviation-info { margin-bottom: 4px; }
</style>
