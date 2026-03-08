<template>
  <div class="process-params">
    <!-- 暂存锅温度 -->
    <el-card class="param-section" shadow="never">
      <template #header>暂存锅温度</template>
      <div class="param-row">
        <template v-if="isFendan">
          <el-form-item label="蛋黄暂存温度(℃)">
            <el-input-number v-model="inner.yolkTemp" :disabled="disabled" controls-position="right" />
          </el-form-item>
          <el-form-item label="蛋清暂存温度(℃)">
            <el-input-number v-model="inner.whiteTemp" :disabled="disabled" controls-position="right" />
          </el-form-item>
        </template>
        <el-form-item v-else label="面糊暂存温度(℃)">
          <el-input-number v-model="inner.batterTemp" :disabled="disabled" controls-position="right" />
        </el-form-item>
      </div>
    </el-card>

    <!-- 打发机数据 (戚风分蛋专属) -->
    <el-card v-if="isFendan" class="param-section" shadow="never">
      <template #header>打发机数据</template>
      <el-form-item label="打发时间(min)">
        <el-input-number v-model="inner.whippingTime" :disabled="disabled" controls-position="right" />
      </el-form-item>
      <el-form-item label="打发转速(rpm)">
        <el-input-number v-model="inner.whippingSpeed" :disabled="disabled" controls-position="right" />
      </el-form-item>
    </el-card>

    <!-- 出炉温度 / 包装温度 -->
    <el-card class="param-section" shadow="never">
      <template #header>温度参数</template>
      <div class="param-row">
        <el-form-item label="出炉中心温度(℃)">
          <el-input-number v-model="inner.exitTemp" :min="0" :max="300" :disabled="disabled" controls-position="right" />
        </el-form-item>
        <el-form-item label="包装中心温度(℃)">
          <el-input-number v-model="inner.packTemp" :min="0" :max="60" :disabled="disabled" controls-position="right" />
        </el-form-item>
      </div>
    </el-card>

    <!-- 炉温参数表 -->
    <el-card class="param-section" shadow="never">
      <template #header>炉温参数</template>
      <OvenZoneTable v-model="inner.ovenZones" :disabled="disabled" @update:model-value="emitUpdate" />
    </el-card>

    <!-- 风机频率表 -->
    <el-card class="param-section" shadow="never">
      <template #header>风机频率</template>
      <FanDeviceTable v-model="inner.fanDevices" :disabled="disabled" @update:model-value="emitUpdate" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import OvenZoneTable from './OvenZoneTable.vue';
import FanDeviceTable from './FanDeviceTable.vue';

const props = defineProps<{
  processType?: string[];
  modelValue?: Record<string, any>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void;
}>();

const isFendan = computed(() => (props.processType ?? []).includes('戚风分蛋工艺'));

const inner = reactive<Record<string, any>>({
  yolkTemp: null, whiteTemp: null, batterTemp: null,
  whippingTime: null, whippingSpeed: null,
  exitTemp: null, packTemp: null,
  ovenZones: {}, fanDevices: [],
});

watch(() => props.modelValue, (val) => {
  if (!val) return;
  Object.assign(inner, val);
}, { immediate: true });

watch(inner, () => emitUpdate(), { deep: true });

const emitUpdate = () => emit('update:modelValue', { ...inner });
</script>

<style scoped>
.process-params { display: flex; flex-direction: column; gap: 16px; }
.param-section :deep(.el-card__header) { font-weight: 600; padding: 10px 16px; }
.param-row { display: flex; gap: 16px; flex-wrap: wrap; }
</style>
