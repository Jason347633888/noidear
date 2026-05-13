<template>
  <div class="export-page">
    <PageHeaderBlock eyebrow="系统治理" title="批量导出" description="支持导出文档和用户数据，最多10000条记录" />
    <el-card>

      <el-form :model="form" label-width="120px">
        <el-form-item label="导出类型" required>
          <el-radio-group v-model="form.exportType">
            <el-radio-button label="users">用户数据</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="onDateChange"
          />
        </el-form-item>

        <el-form-item label="关键词">
          <el-input v-model="form.keyword" placeholder="输入关键词筛选" style="width: 300px" clearable />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="exporting"
            :icon="Download"
            @click="handleExport"
          >
            {{ exporting ? '导出中...' : '开始导出' }}
          </el-button>
          <span v-if="exporting" class="export-progress">
            <el-progress :percentage="progress" style="width: 200px; margin-left: 16px" />
          </span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import exportApi from '@/api/export';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

interface ExportForm {
  exportType: 'users';
  keyword: string;
  startDate: string;
  endDate: string;
}

const form = reactive<ExportForm>({
  exportType: 'users',
  keyword: '',
  startDate: '',
  endDate: '',
});

const dateRange = ref<[string, string] | null>(null);
const exporting = ref(false);
const progress = ref(0);

function onDateChange(val: [string, string] | null) {
  if (val) {
    form.startDate = val[0];
    form.endDate = val[1];
  } else {
    form.startDate = '';
    form.endDate = '';
  }
}

async function handleExport() {
  exporting.value = true;
  progress.value = 30;
  try {
    const filters = {
      keyword: form.keyword || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    };

    const blob: Blob = await exportApi.exportUsers({ department: filters.keyword || undefined });

    progress.value = 90;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.exportType}_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    progress.value = 100;
    ElMessage.success('导出成功');
  } catch {
    ElMessage.error('导出失败，请重试');
  } finally {
    exporting.value = false;
    progress.value = 0;
  }
}
</script>

<style scoped>
.export-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-progress {
  display: inline-flex;
  align-items: center;
}
</style>
