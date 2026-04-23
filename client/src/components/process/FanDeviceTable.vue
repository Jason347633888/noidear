<template>
  <div class="fan-device-table">
    <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px">
      <span style="font-weight: 600">风机频率</span>
      <el-button size="small" @click="addDevice" :disabled="disabled">添加设备</el-button>
    </div>
    <el-table :data="rows" border size="small">
      <el-table-column label="设备名称" prop="name" width="200" />
      <el-table-column label="低速频率(Hz)" align="center" width="140">
        <template #default="{ row }">
          <el-input-number
            v-model="row.lowFreq" :min="0" :max="100" :controls="false"
            size="small" style="width:100px" :disabled="disabled"
            @change="emit('update:modelValue', [...rows])"
          />
        </template>
      </el-table-column>
      <el-table-column label="高速频率(Hz)" align="center" width="140">
        <template #default="{ row }">
          <el-input-number
            v-model="row.highFreq" :min="0" :max="100" :controls="false"
            size="small" style="width:100px" :disabled="disabled"
            @change="emit('update:modelValue', [...rows])"
          />
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
import { onMounted, ref, watch } from 'vue';

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

const createDefaultRows = () => DEFAULT_DEVICES.map((name) => ({ name, lowFreq: 0, highFreq: 0 }));

const emitUpdate = () => {
  emit('update:modelValue', rows.value.map((row) => ({ ...row })));
};

watch(
  () => props.modelValue,
  (val) => {
    rows.value = Array.isArray(val) && val.length > 0
      ? val
      : createDefaultRows();
  },
  { immediate: true }
);

onMounted(() => {
  emitUpdate();
});

const addDevice = () => {
  rows.value = [...rows.value, { name: `设备${rows.value.length + 1}`, lowFreq: 0, highFreq: 0 }];
  emitUpdate();
};

const removeDevice = (index: number) => {
  rows.value = rows.value.filter((_, i) => i !== index);
  emitUpdate();
};
</script>
