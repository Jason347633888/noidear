<template>
  <div class="signature-field">
    <div v-if="modelValue" class="signature-preview">
      <img :src="modelValue" alt="电子签名" class="signature-image" />
      <el-button
        v-if="!field.disabled"
        type="danger"
        link
        @click="clearSignature"
      >
        清除签名
      </el-button>
    </div>
    <div v-else class="signature-pad-wrapper">
      <canvas
        ref="canvasRef"
        class="signature-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
        @touchend.prevent="stopDrawing"
      />
      <div class="signature-actions">
        <el-button size="small" @click="clearCanvas">
          清除
        </el-button>
        <el-button size="small" type="primary" @click="confirmSignature">
          确认签名
        </el-button>
      </div>
      <div class="signature-hint">
        请在上方区域手写签名
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import type { FieldConfig } from './TextField.vue';

defineProps<{
  modelValue: string;
  field: FieldConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'blur'): void;
  (e: 'change', value: string): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const hasDrawn = ref(false);
const canvasWidth = 400;
const canvasHeight = 200;

let ctx: CanvasRenderingContext2D | null = null;

onMounted(async () => {
  await nextTick();
  initCanvas();
});

const initCanvas = () => {
  if (!canvasRef.value) return;
  ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
};

const getCanvasPoint = (e: MouseEvent): { x: number; y: number } => {
  const canvas = canvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};

const getTouchPoint = (e: TouchEvent): { x: number; y: number } => {
  const canvas = canvasRef.value;
  if (!canvas || !e.touches[0]) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.touches[0].clientX - rect.left,
    y: e.touches[0].clientY - rect.top,
  };
};

const startDrawing = (e: MouseEvent) => {
  if (!ctx) return;
  isDrawing.value = true;
  hasDrawn.value = true;
  const point = getCanvasPoint(e);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
};

const draw = (e: MouseEvent) => {
  if (!isDrawing.value || !ctx) return;
  const point = getCanvasPoint(e);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
};

const stopDrawing = () => {
  isDrawing.value = false;
};

const handleTouchStart = (e: TouchEvent) => {
  if (!ctx) return;
  isDrawing.value = true;
  hasDrawn.value = true;
  const point = getTouchPoint(e);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDrawing.value || !ctx) return;
  const point = getTouchPoint(e);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
};

const clearCanvas = () => {
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  hasDrawn.value = false;
};

const confirmSignature = () => {
  if (!hasDrawn.value) {
    ElMessage.warning('请先签名');
    return;
  }
  if (!canvasRef.value) return;
  const dataUrl = canvasRef.value.toDataURL('image/png');
  emit('update:modelValue', dataUrl);
  emit('change', dataUrl);
};

const clearSignature = () => {
  emit('update:modelValue', '');
  emit('change', '');
  hasDrawn.value = false;
  nextTick(() => {
    initCanvas();
  });
};
</script>

<style scoped>
.signature-field {
  width: 100%;
}

.signature-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.signature-image {
  max-width: 400px;
  max-height: 200px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.signature-pad-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signature-canvas {
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  cursor: crosshair;
  touch-action: none;
}

.signature-actions {
  display: flex;
  gap: 8px;
}

.signature-hint {
  font-size: 12px;
  color: #909399;
}
</style>
