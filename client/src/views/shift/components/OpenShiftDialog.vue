<template>
  <el-dialog
    :model-value="modelValue"
    title="开班"
    width="420px"
    @close="$emit('update:modelValue', false)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="班次类型" prop="shiftTypeId">
        <el-select v-model="form.shiftTypeId" placeholder="请选择班次类型" style="width: 100%">
          <el-option
            v-for="shiftType in shiftTypes"
            :key="shiftType.id"
            :label="formatShiftTypeLabel(shiftType)"
            :value="shiftType.id"
          />
        </el-select>
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
import { ref, reactive, onMounted } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ShiftInstanceApi, type CreateShiftInstancePayload, type ShiftTypeSummary } from '@/api/shift-instance';
import { teamShiftApi } from '@/api/team-shift';

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created'): void;
}>();

const formRef = ref<FormInstance>();
const loading = ref(false);
const today = new Date().toISOString().slice(0, 10);
const shiftTypes = ref<ShiftTypeSummary[]>([]);

const form = reactive<CreateShiftInstancePayload>({
  shiftTypeId: '',
  shift_date: today,
  notes: '',
});

const rules: FormRules = {
  shiftTypeId: [{ required: true, message: '请选择班次类型', trigger: 'change' }],
  shift_date: [{ required: true, message: '请选择日期', trigger: 'change' }],
};

onMounted(loadShiftTypes);

async function loadShiftTypes() {
  const response = await teamShiftApi.listShiftTypes();
  const data = Array.isArray((response as any).data)
    ? (response as any).data
    : Array.isArray(response)
      ? response
      : [];
  shiftTypes.value = data as ShiftTypeSummary[];
  if (!form.shiftTypeId && shiftTypes.value.length > 0) {
    form.shiftTypeId = shiftTypes.value[0].id;
  }
}

function formatShiftTypeLabel(shiftType: ShiftTypeSummary): string {
  return `${shiftType.name} ${shiftType.start_time}-${shiftType.end_time}`;
}

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
