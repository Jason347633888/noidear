<template>
  <el-dialog
    :model-value="modelValue"
    title="开班"
    width="420px"
    @close="$emit('update:modelValue', false)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="班次类型" prop="shift_type">
        <el-radio-group v-model="form.shift_type">
          <el-radio value="白班">白班</el-radio>
          <el-radio value="夜班">夜班</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="开班日期" prop="shift_date">
        <el-date-picker
          v-model="form.shift_date"
          type="date"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.notes" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit">开班</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ShiftInstanceApi, type CreateShiftInstancePayload } from '@/api/shift-instance';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created'): void;
}>();

const formRef = ref<FormInstance>();
const loading = ref(false);
const today = new Date().toISOString().slice(0, 10);

const form = reactive<CreateShiftInstancePayload>({
  shift_type: '白班',
  shift_date: today,
  notes: '',
});

const rules: FormRules = {
  shift_type: [{ required: true, message: '请选择班次类型', trigger: 'change' }],
  shift_date: [{ required: true, message: '请选择日期', trigger: 'change' }],
};

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    await ShiftInstanceApi.create(form);
    emit('update:modelValue', false);
    emit('created');
  } finally {
    loading.value = false;
  }
}
</script>
