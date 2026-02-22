<template>
  <view class="signature">
    <view v-if="signatureUrl" class="signature__preview">
      <image class="signature__img" :src="signatureUrl" mode="aspectFit" />
      <view class="signature__actions">
        <view class="signature__btn" @tap="clearSignature">
          <text class="signature__btn-text">重新签名</text>
        </view>
      </view>
    </view>
    <view v-else class="signature__canvas-wrap">
      <view class="signature__hint">
        <text class="signature__hint-text">请在此处签名</text>
      </view>
      <canvas
        canvas-id="signatureCanvas"
        class="signature__canvas"
        :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      />
      <view class="signature__toolbar">
        <view class="signature__btn signature__btn--clear" @tap="onClear">
          <text class="signature__btn-text signature__btn-text--clear">清空</text>
        </view>
        <view class="signature__btn signature__btn--confirm" @tap="onConfirm">
          <text class="signature__btn-text">确认签名</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { uploadFile } from '@/utils/request'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const canvasWidth = ref(350)
const canvasHeight = ref(200)
const signatureUrl = ref(props.modelValue || '')
const isDrawing = ref(false)
const hasDrawn = ref(false)

let ctx: UniApp.CanvasContext | null = null
let lastX = 0
let lastY = 0

onMounted(() => {
  // Determine canvas size based on screen
  const sysInfo = uni.getSystemInfoSync()
  canvasWidth.value = Math.min(sysInfo.windowWidth - 40, 400)
  canvasHeight.value = 200

  initCanvas()
})

function initCanvas(): void {
  ctx = uni.createCanvasContext('signatureCanvas')
  if (ctx) {
    ctx.setStrokeStyle('#000000')
    ctx.setLineWidth(3)
    ctx.setLineCap('round')
    ctx.setLineJoin('round')
    // Draw white background
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
    ctx.draw()
  }
}

function onTouchStart(e: TouchEvent): void {
  if (!ctx) return
  isDrawing.value = true
  hasDrawn.value = true
  const touch = e.touches[0]
  lastX = touch.x
  lastY = touch.y
}

function onTouchMove(e: TouchEvent): void {
  if (!ctx || !isDrawing.value) return
  e.preventDefault()
  const touch = e.touches[0]
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(touch.x, touch.y)
  ctx.stroke()
  ctx.draw(true)
  lastX = touch.x
  lastY = touch.y
}

function onTouchEnd(): void {
  isDrawing.value = false
}

function onClear(): void {
  hasDrawn.value = false
  initCanvas()
}

async function onConfirm(): Promise<void> {
  if (!hasDrawn.value) {
    uni.showToast({ title: '请先签名', icon: 'none' })
    return
  }

  uni.showLoading({ title: '保存中...' })

  try {
    // Export canvas to image
    const tempFilePath = await new Promise<string>((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvasId: 'signatureCanvas',
        fileType: 'png',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => reject(err),
      })
    })

    // Upload signature image
    const result = await uploadFile(tempFilePath, 'file', { type: 'signature' })
    signatureUrl.value = result.url
    emit('update:modelValue', result.url)
    uni.hideLoading()
    uni.showToast({ title: '签名保存成功', icon: 'success' })
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '签名保存失败', icon: 'none' })
  }
}

function clearSignature(): void {
  signatureUrl.value = ''
  emit('update:modelValue', '')
  // Re-init canvas after DOM update
  setTimeout(() => initCanvas(), 100)
}
</script>

<style scoped>
.signature {
  width: 100%;
}

.signature__preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.signature__img {
  width: 100%;
  height: 300rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  background-color: #fff;
}

.signature__canvas-wrap {
  position: relative;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  overflow: hidden;
  background-color: #fff;
}

.signature__hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 0;
}

.signature__hint-text {
  font-size: 32rpx;
  color: #e0e0e0;
}

.signature__canvas {
  width: 100%;
  position: relative;
  z-index: 1;
}

.signature__toolbar {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  border-top: 2rpx solid #eee;
}

.signature__actions {
  display: flex;
  gap: 16rpx;
}

.signature__btn {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
}

.signature__btn--confirm {
  background-color: #409eff;
}

.signature__btn--clear {
  background-color: #fff;
  border: 2rpx solid #dcdfe6;
}

.signature__btn-text {
  font-size: 26rpx;
  color: #fff;
}

.signature__btn-text--clear {
  color: #606266;
}
</style>
