<template>
  <el-drawer
    :model-value="modelValue"
    title="新建留样检验"
    size="440px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="resetForm"
  >
    <div class="rs-inspection-drawer__info app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h4 class="app-panel-header__title">留样信息</h4>
      </div>
      <div class="app-panel--padded">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="留样编号">{{ sample.sample_code }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ SAMPLE_TYPE_LABEL[sample.sample_type] }}</el-descriptions-item>
          <el-descriptions-item label="数量">{{ sample.sample_qty }} {{ sample.unit }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="STATUS_TAG_TYPE[sample.status] ?? 'info'" size="small">
              {{ STATUS_LABEL[sample.status] ?? sample.status }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="110px"
      style="padding: 0 16px"
    >
      <el-form-item label="检验类型" prop="inspection_type">
        <el-select v-model="form.inspection_type" placeholder="请选择" style="width: 100%">
          <el-option label="外观检验" value="visual" />
          <el-option label="理化检验" value="physicochemical" />
          <el-option label="微生物检验" value="microbiological" />
          <el-option label="定期检验" value="periodic" />
        </el-select>
      </el-form-item>
      <el-form-item label="检验记录ID" prop="inspection_record_id">
        <el-input
          v-model="form.inspection_record_id"
          placeholder="已创建的 InspectionRecord ID"
          style="width: 100%"
        />
        <div style="font-size: 12px; color: #909399; margin-top: 4px">
          请先在检验记录工作台创建对应检验记录，再将 ID 填入此处
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        确认提交
      </el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import retainedSampleApi, { type RetainedSample } from '@/api/retained-sample';

// ── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  modelValue: boolean;
  sample: RetainedSample;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created'): void;
}>();

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

const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = ref({
  inspection_type: '',
  inspection_record_id: '',
});

const rules: FormRules = {
  inspection_type: [{ required: true, message: '请选择检验类型', trigger: 'change' }],
  inspection_record_id: [{ required: true, message: '请输入检验记录ID', trigger: 'blur' }],
};

// ── Actions ───────────────────────────────────────────────────────────────────

function resetForm() {
  form.value = { inspection_type: '', inspection_record_id: '' };
  formRef.value?.resetFields();
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await retainedSampleApi.createInspection(props.sample.id, {
      inspection_type: form.value.inspection_type,
      inspection_record_id: form.value.inspection_record_id,
    });
    ElMessage.success('检验记录创建成功');
    emit('created');
  } catch {
    ElMessage.error('操作失败，请重试');
  } finally {
    submitting.value = false;
  }
}
</script>
