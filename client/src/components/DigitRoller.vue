<template>
  <div class="digit-roller">
    <div
      v-for="(col, ci) in columns"
      :key="ci"
      class="digit-col"
    >
      <div class="digit-label">{{ col.label }}</div>
      <div
        class="digit-viewport"
        @wheel.prevent="onWheel(ci, $event)"
        @touchstart.prevent="onTouchStart(ci, $event)"
        @touchmove.prevent="onTouchMove(ci, $event)"
        @touchend.prevent="onTouchEnd(ci)"
      >
        <div
          class="digit-list"
          :style="{ transform: `translateY(${-digits[ci] * ITEM_H}px)` }"
        >
          <div v-for="d in col.digits" :key="d" class="digit-item">{{ d }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const ITEM_H = 36;

const props = defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const maxVal = computed(() => props.max ?? 300);
const use3cols = computed(() => maxVal.value > 50);

const columns = computed(() => {
  if (use3cols.value) {
    return [
      { label: '百', digits: Array.from({ length: Math.floor(maxVal.value / 100) + 1 }, (_, i) => i) },
      { label: '十', digits: Array.from({ length: 10 }, (_, i) => i) },
      { label: '个', digits: Array.from({ length: 10 }, (_, i) => i) },
    ];
  }
  return [
    { label: '十', digits: Array.from({ length: Math.floor(maxVal.value / 10) + 1 }, (_, i) => i) },
    { label: '个', digits: Array.from({ length: 10 }, (_, i) => i) },
  ];
});

const toDigits = (v: number) => {
  const clamped = Math.max(props.min ?? 0, Math.min(maxVal.value, v));
  if (use3cols.value) return [Math.floor(clamped / 100), Math.floor((clamped % 100) / 10), clamped % 10];
  return [Math.floor(clamped / 10), clamped % 10];
};

const fromDigits = (ds: number[]) => {
  if (use3cols.value) return ds[0] * 100 + ds[1] * 10 + ds[2];
  return ds[0] * 10 + ds[1];
};

const digits = ref(toDigits(props.modelValue ?? 0));
watch(() => props.modelValue, (v) => { digits.value = toDigits(v ?? 0); });

const setDigit = (colIdx: number, delta: number) => {
  const col = columns.value[colIdx];
  const newDigit = Math.max(0, Math.min(col.digits.length - 1, digits.value[colIdx] + delta));
  digits.value = digits.value.map((d, i) => (i === colIdx ? newDigit : d));
  const newVal = Math.max(props.min ?? 0, Math.min(maxVal.value, fromDigits(digits.value)));
  emit('update:modelValue', newVal);
};

const onWheel = (ci: number, e: WheelEvent) => setDigit(ci, e.deltaY > 0 ? 1 : -1);

const touchStartY = ref(0);
const activeTouchCol = ref(-1);
const onTouchStart = (ci: number, e: TouchEvent) => {
  activeTouchCol.value = ci;
  touchStartY.value = e.touches[0].clientY;
};
const onTouchMove = (ci: number, e: TouchEvent) => {
  const delta = touchStartY.value - e.touches[0].clientY;
  if (Math.abs(delta) > ITEM_H / 2) {
    setDigit(ci, delta > 0 ? 1 : -1);
    touchStartY.value = e.touches[0].clientY;
  }
};
const onTouchEnd = (_ci: number) => { activeTouchCol.value = -1; };
</script>

<style scoped>
.digit-roller { display: flex; gap: 4px; user-select: none; }
.digit-col { display: flex; flex-direction: column; align-items: center; }
.digit-label { font-size: 11px; color: var(--el-text-color-secondary); margin-bottom: 2px; }
.digit-viewport { width: 36px; height: 36px; overflow: hidden; border: 1px solid var(--el-border-color); border-radius: 4px; cursor: ns-resize; }
.digit-list { transition: transform 0.15s ease; }
.digit-item { height: 36px; line-height: 36px; text-align: center; font-size: 16px; font-weight: 600; }
</style>
