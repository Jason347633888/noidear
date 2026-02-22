<template>
  <div class="export-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h2>批量导出</h2>
          <p class="subtitle">支持导出文档和用户数据，最多10000条记录</p>
        </div>
      </template>

      <el-form :model="form" label-width="120px">
        <el-form-item label="导出类型" required>
          <el-radio-group v-model="form.exportType">
            <el-radio-button label="documents">文档数据</el-radio-button>
            <el-radio-button label="users">用户数据</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <template v-if="form.exportType === 'documents'">
          <el-form-item label="文档类型">
            <el-select v-model="form.docLevel" placeholder="全部" clearable style="width: 200px">
              <el-option label="一级文件" :value="1" />
              <el-option label="二级文件" :value="2" />
              <el-option label="三级文件" :value="3" />
            </el-select>
          </el-form-item>
          <el-form-item label="文档状态">
            <el-select v-model="form.docStatus" placeholder="全部" clearable style="width: 200px">
              <el-option label="草稿" value="draft" />
              <el-option label="审批中" value="pending" />
              <el-option label="已发布" value="published" />
              <el-option label="已作废" value="obsolete" />
            </el-select>
          </el-form-item>
        </template>

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

interface ExportForm {
  exportType: 'documents' | 'users';
  docLevel: number | null;
  docStatus: string;
  keyword: string;
  startDate: string;
  endDate: string;
}

const form = reactive<ExportForm>({
  exportType: 'documents',
  docLevel: null,
  docStatus: '',
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
      level: form.docLevel ?? undefined,
      status: form.docStatus || undefined,
      keyword: form.keyword || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    };

    let blob: Blob;
    if (form.exportType === 'documents') {
      blob = await exportApi.exportDocuments(filters);
    } else {
      blob = await exportApi.exportUsers({ department: filters.keyword || undefined });
    }

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
  padding: 0;
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.subtitle {
  margin: 0;
  color: #888;
  font-size: 13px;
}

.export-progress {
  display: inline-flex;
  align-items: center;
}
</style>
