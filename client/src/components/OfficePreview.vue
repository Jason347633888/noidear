<template>
  <div class="office-preview">
    <div v-if="fileType === 'pdf'" class="preview-wrapper">
      <div v-if="isMobile" class="mobile-hint">
        <el-alert title="移动端暂不支持在线预览" type="info" :closable="false" show-icon />
        <el-button type="primary" style="margin-top: 16px" @click="handleDownload">下载文件</el-button>
      </div>
      <iframe v-else-if="previewUrl" :src="previewUrl" class="preview-iframe" frameborder="0" />
      <el-empty v-else description="无法生成预览链接" />
    </div>
    <div v-else-if="fileType === 'office'" class="preview-wrapper">
      <div v-if="isMobile" class="mobile-hint">
        <el-alert title="移动端暂不支持在线预览" type="info" :closable="false" show-icon />
        <el-button type="primary" style="margin-top: 16px" @click="handleDownload">下载文件</el-button>
      </div>
      <iframe v-else-if="officeViewerUrl" :src="officeViewerUrl" class="preview-iframe" frameborder="0" />
      <div v-else class="download-hint">
        <el-alert title="该文件格式暂不支持在线预览" type="info" :closable="false" show-icon />
        <el-button type="primary" style="margin-top: 16px" @click="handleDownload">下载文件</el-button>
      </div>
    </div>
    <div v-else-if="fileType === 'image'" class="preview-wrapper image-preview">
      <el-image v-if="previewUrl" :src="previewUrl" :preview-src-list="[previewUrl]" fit="contain" class="preview-image" :preview-teleported="true">
        <template #error><div class="image-error"><span>图片加载失败</span></div></template>
      </el-image>
      <el-empty v-else description="无法加载图片" />
    </div>
    <div v-else class="download-hint">
      <el-alert title="该文件格式暂不支持在线预览" type="info" :closable="false" show-icon />
      <el-button type="primary" style="margin-top: 16px" @click="handleDownload">下载文件</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  filename: string;
  previewUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  previewUrl: '',
});

const emit = defineEmits<{ download: [] }>();

const isMobile = computed(() =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
);

const fileType = computed(() => {
  const ext = props.filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
  return 'other';
});

const officeViewerUrl = computed(() => {
  if (!props.previewUrl || fileType.value !== 'office') return '';
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(props.previewUrl)}`;
});

const handleDownload = () => { emit('download'); };
</script>

<style scoped>
.office-preview { width: 100%; min-height: 400px; }
.preview-wrapper { width: 100%; height: 100%; }
.preview-iframe { width: 100%; height: 700px; border: none; }
.image-preview { display: flex; justify-content: center; align-items: center; padding: 16px; }
.preview-image { max-width: 100%; max-height: 700px; }
.mobile-hint, .download-hint { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
.image-error { display: flex; flex-direction: column; align-items: center; gap: 8px; }
</style>