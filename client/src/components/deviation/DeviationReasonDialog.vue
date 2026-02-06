<template>
  <el-dialog
    v-model="dialogVisible"
    title="填写偏离原因"
    width="700px"
    :close-on-click-modal="false"
    @close="handleCancel"
  >
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 16px;"
    >
      检测到 {{ deviations.length }} 个字段偏离标准范围，请说明偏离原因
    </el-alert>

    <el-table :data="deviations" stripe border style="margin-bottom: 16px;">
      <el-table-column prop="fieldName" label="字段名" width="120" />
      <el-table-column label="期望值" width="100">
        <template #default="{ row }">
          {{ formatValue(row.expectedValue, row.toleranceType, row.toleranceMin, row.toleranceMax) }}
        </template>
      </el-table-column>
      <el-table-column prop="actualValue" label="实际值" width="80" />
      <el-table-column label="偏离量" width="100">
        <template #default="{ row }">
          <span class="deviation-value">
            {{ row.deviationValue > 0 ? '+' : '' }}{{ row.deviationValue.toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="偏离率" width="100">
        <template #default="{ row }">
          <el-tag type="danger" size="small">
            {{ row.deviationRate > 0 ? '+' : '' }}{{ row.deviationRate.toFixed(2) }}%
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="偏离类型" min-width="100">
        <template #default="{ row }">
          <span v-if="row.actualValue < row.toleranceMin" class="deviation-type low">低于下限</span>
          <span v-else-if="row.actualValue > row.toleranceMax" class="deviation-type high">高于上限</span>
          <span v-else>正常</span>
        </template>
      </el-table-column>
    </el-table>

    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="偏离原因" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="4"
          placeholder="请详细说明偏离原因（10-500字符）"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="submitting">
          确认提交
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

export interface DeviationField {
  fieldName: string;
  expectedValue: number;
  actualValue: number;
  deviationValue: number;
  deviationRate: number;
  toleranceType: 'range' | 'percentage';
  toleranceMin: number;
  toleranceMax: number;
}

interface Props {
  visible: boolean;
  deviations: DeviationField[];
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', reason: string): void;
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  deviations: () => [],
});

const emit = defineEmits<Emits>();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const form = reactive({
  reason: '',
});

const rules: FormRules = {
  reason: [
    { required: true, message: '请填写偏离原因', trigger: 'blur' },
    { min: 10, max: 500, message: '偏离原因长度为 10-500 字符', trigger: 'blur' },
  ],
};

const formatValue = (value: number, type: string, min: number, max: number) => {
  if (type === 'range') {
    return `${value} ± ${min} ~ ${max}`;
  } else {
    return `${value} (±${min}% ~ ±${max}%)`;
  }
};

const handleConfirm = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitting.value = true;
    emit('confirm', form.reason);
    form.reason = '';
    submitting.value = false;
  } catch {
    // Validation failed
  }
};

const handleCancel = () => {
  form.reason = '';
  formRef.value?.clearValidate();
  emit('cancel');
};

watch(
  () => props.visible,
  (val) => {
    if (!val) {
      form.reason = '';
      formRef.value?.clearValidate();
    }
  },
);
</script>

<style scoped>
.deviation-value {
  font-weight: bold;
  color: #f56c6c;
}

.deviation-type {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.deviation-type.low {
  background: #e6f7ff;
  color: #1890ff;
}

.deviation-type.high {
  background: #fff1f0;
  color: #f5222d;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
