<template>
  <div class="oven-zone-table">
    <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px">
      <span style="font-weight: 600">炉温参数</span>
      <el-button size="small" @click="addZone">添加区</el-button>
      <el-button size="small" type="danger" @click="removeZone" :disabled="zones.length <= 1">
        删除末区
      </el-button>
    </div>
    <el-scrollbar>
      <table class="oven-table" border="1">
        <thead>
          <tr>
            <th>参数</th>
            <th v-for="z in zones" :key="z">{{ z }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in ROWS" :key="row.key">
            <td>{{ row.label }}</td>
            <td v-for="z in zones" :key="z">
              <el-input-number
                :model-value="getValue(row.key, z)"
                :min="0" :max="300" :controls="false" size="small"
                style="width:80px"
                :disabled="disabled"
                @change="setValue(row.key, z, $event ?? 0)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const ROWS = [
  { key: 'topTemp', label: '上火温度(℃)' },
  { key: 'bottomTemp', label: '下火温度(℃)' },
  { key: 'fanSpeed', label: '风速' },
  { key: 'humidity', label: '湿度(%)' },
] as const;

type RowKey = (typeof ROWS)[number]['key'];

const props = defineProps<{
  modelValue?: Record<string, Record<RowKey, number>>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, Record<RowKey, number>>): void;
}>();

const zones = ref(['一区', '二区', '三区', '四区', '五区', '六区', '七区', '八区']);
const data = ref<Record<string, Record<RowKey, number>>>({});

watch(() => props.modelValue, (val) => { if (val) data.value = val; }, { immediate: true });

const getValue = (rowKey: RowKey, zone: string) => data.value[zone]?.[rowKey] ?? 0;

const setValue = (rowKey: RowKey, zone: string, val: number) => {
  data.value = {
    ...data.value,
    [zone]: {
      ...(data.value[zone] ?? {}),
      [rowKey]: val,
    },
  };
  emitUpdate();
};

const emitUpdate = () => emit('update:modelValue', { ...data.value });

const addZone = () => {
  zones.value = [...zones.value, `${zones.value.length + 1}区`];
};

const removeZone = () => {
  if (zones.value.length <= 1) return;
  const last = zones.value[zones.value.length - 1];
  const newData = { ...data.value };
  delete newData[last];
  zones.value = zones.value.slice(0, -1);
  data.value = newData;
  emit('update:modelValue', newData);
};
</script>

<style scoped>
.oven-table { border-collapse: collapse; min-width: 600px; }
.oven-table th, .oven-table td { padding: 6px 10px; border: 1px solid var(--el-border-color); text-align: center; white-space: nowrap; }
.oven-table th { background: var(--el-fill-color-light); font-weight: 600; }
</style>
