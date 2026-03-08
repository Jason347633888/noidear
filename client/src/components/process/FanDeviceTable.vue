<template>
  <div class="fan-device-table">
    <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px">
      <span style="font-weight: 600">风机频率</span>
      <el-button size="small" @click="addDevice" :disabled="disabled">添加设备</el-button>
    </div>
    <el-table :data="rows" border size="small">
      <el-table-column label="设备名称" prop="name" width="200" />
      <el-table-column label="低速频率(Hz)" align="center">
        <template #default="{ row }">
          <DigitRoller :model-value="row.lowFreq" :max="50" :disabled="disabled"
            @update:model-value="update(row, 'lowFreq', $event)" />
        </template>
      </el-table-column>
      <el-table-column label="高速频率(Hz)" align="center">
        <template #default="{ row }">
          <DigitRoller :model-value="row.highFreq" :max="50" :disabled="disabled"
            @update:model-value="update(row, 'highFreq', $event)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" v-if="!disabled">
        <template #default="{ $index }">
          <el-button type="danger" size="small" text @click="removeDevice($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import DigitRoller from '@/components/DigitRoller.vue';

const DEFAULT_DEVICES = [
  '进炉风机', '出炉风机', '热风循环风机1', '热风循环风机2',
  '排湿风机', '进风风机', '冷却风机1', '冷却风机2',
  '冷却风机3', '包装间送风机', '包装间排风机',
];

interface FanRow { name: string; lowFreq: number; highFreq: number; }

const props = defineProps<{
  modelValue?: FanRow[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FanRow[]): void;
}>();

const rows = ref<FanRow[]>([]);

watch(
  () => props.modelValue,
  (val) => {
    rows.value = Array.isArray(val) && val.length > 0
      ? val
      : DEFAULT_DEVICES.map((name) => ({ name, lowFreq: 0, highFreq: 0 }));
  },
  { immediate: true }
);

const update = (row: FanRow, key: 'lowFreq' | 'highFreq', val: number) => {
  row[key] = val;
  emit('update:modelValue', [...rows.value]);
};

const addDevice = () => {
  rows.value = [...rows.value, { name: `设备${rows.value.length + 1}`, lowFreq: 0, highFreq: 0 }];
  emit('update:modelValue', rows.value);
};

const removeDevice = (index: number) => {
  rows.value = rows.value.filter((_, i) => i !== index);
  emit('update:modelValue', rows.value);
};
</script>
