<template>
  <el-dropdown trigger="click" @command="handleLocaleChange">
    <el-button link class="lang-btn">
      <el-icon><Switch /></el-icon>
      <span class="lang-text">{{ currentLabel }}</span>
      <el-icon class="arrow"><ArrowDown /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="locale in localeOptions"
          :key="locale.value"
          :command="locale.value"
          :class="{ active: currentLocale === locale.value }"
        >
          {{ locale.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Switch, ArrowDown } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { setLocale, getLocale } from '@/i18n/index';
import type { Locale } from '@/i18n/index';

const localeOptions = [
  { value: 'zh-CN' as Locale, label: '简体中文' },
  { value: 'en-US' as Locale, label: 'English' },
];

const currentLocale = ref<Locale>(getLocale());

const currentLabel = computed(() => {
  const found = localeOptions.find((o) => o.value === currentLocale.value);
  return found?.label ?? currentLocale.value;
});

async function handleLocaleChange(locale: Locale) {
  if (locale === currentLocale.value) return;
  await setLocale(locale);
  currentLocale.value = locale;
  ElMessage.success(locale === 'zh-CN' ? '已切换为简体中文' : 'Switched to English');
}
</script>

<style scoped>
.lang-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 14px;
}

.lang-text {
  margin: 0 2px;
}

.arrow {
  font-size: 12px;
}

:deep(.el-dropdown-item.active) {
  color: var(--el-color-primary);
  font-weight: 600;
}
</style>
