<template>
  <view class="camera-comp">
    <view class="camera-comp__list">
      <view
        v-for="(img, index) in images"
        :key="index"
        class="camera-comp__item"
      >
        <image
          class="camera-comp__img"
          :src="img.url || img.path"
          mode="aspectFill"
          @tap="onPreview(index)"
        />
        <view class="camera-comp__status" v-if="img.status !== 'success'">
          <text v-if="img.status === 'uploading'" class="camera-comp__progress">
            {{ img.progress || 0 }}%
          </text>
          <text v-else-if="img.status === 'error'" class="camera-comp__retry" @tap.stop="retryUpload(index)">
            重试
          </text>
        </view>
        <view class="camera-comp__delete" @tap.stop="onDelete(index)">
          <text class="camera-comp__delete-icon">&#x2715;</text>
        </view>
      </view>

      <view
        v-if="images.length < maxCount"
        class="camera-comp__add"
        @tap="onChooseImage"
      >
        <text class="camera-comp__add-icon">+</text>
        <text class="camera-comp__add-text">{{ images.length }}/{{ maxCount }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { chooseImages, compressImage, previewImages } from '@/utils/image'
import { uploadFile } from '@/utils/request'

interface ImageItem {
  path: string
  url: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
}

const props = withDefaults(defineProps<{
  modelValue: string[]
  maxCount?: number
  sourceType?: ('camera' | 'album')[]
}>(), {
  maxCount: 9,
  sourceType: () => ['camera', 'album'],
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const images = ref<ImageItem[]>([])

// Sync with model value
watch(
  () => props.modelValue,
  (val) => {
    if (val && val.length > 0 && images.value.length === 0) {
      images.value = val.map((url) => ({
        path: url,
        url,
        status: 'success' as const,
        progress: 100,
      }))
    }
  },
  { immediate: true },
)

function emitUpdate(): void {
  const urls = images.value
    .filter((img) => img.status === 'success' && img.url)
    .map((img) => img.url)
  emit('update:modelValue', urls)
}

async function onChooseImage(): Promise<void> {
  try {
    const remaining = props.maxCount - images.value.length
    if (remaining <= 0) return

    const paths = await chooseImages(props.sourceType, remaining)
    if (paths.length === 0) return

    for (const path of paths) {
      const compressed = await compressImage(path)
      const item: ImageItem = {
        path: compressed,
        url: '',
        status: 'uploading',
        progress: 0,
      }
      images.value = [...images.value, item]
      const idx = images.value.length - 1
      uploadImage(idx, compressed)
    }
  } catch (err) {
    uni.showToast({ title: '选择图片失败', icon: 'none' })
  }
}

async function uploadImage(index: number, filePath: string, retryCount: number = 0): Promise<void> {
  try {
    images.value = images.value.map((img, i) =>
      i === index ? { ...img, status: 'uploading' as const, progress: 0 } : img,
    )

    const result = await uploadFile(
      filePath,
      'file',
      undefined,
      (progress) => {
        images.value = images.value.map((img, i) =>
          i === index ? { ...img, progress } : img,
        )
      },
    )

    images.value = images.value.map((img, i) =>
      i === index ? { ...img, url: result.url, status: 'success' as const, progress: 100 } : img,
    )
    emitUpdate()
  } catch {
    if (retryCount < 3) {
      uploadImage(index, filePath, retryCount + 1)
    } else {
      images.value = images.value.map((img, i) =>
        i === index ? { ...img, status: 'error' as const } : img,
      )
    }
  }
}

function retryUpload(index: number): void {
  const img = images.value[index]
  if (img) {
    uploadImage(index, img.path)
  }
}

function onDelete(index: number): void {
  images.value = images.value.filter((_, i) => i !== index)
  emitUpdate()
}

function onPreview(index: number): void {
  const urls = images.value.map((img) => img.url || img.path)
  previewImages(urls, urls[index])
}
</script>

<style scoped>
.camera-comp__list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.camera-comp__item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.camera-comp__img {
  width: 100%;
  height: 100%;
}

.camera-comp__status {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx;
}

.camera-comp__progress {
  color: #fff;
  font-size: 22rpx;
}

.camera-comp__retry {
  color: #f56c6c;
  font-size: 22rpx;
}

.camera-comp__delete {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 36rpx;
  height: 36rpx;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-comp__delete-icon {
  color: #fff;
  font-size: 20rpx;
}

.camera-comp__add {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed #dcdfe6;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.camera-comp__add-icon {
  font-size: 60rpx;
  color: #dcdfe6;
  line-height: 1;
}

.camera-comp__add-text {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}
</style>
