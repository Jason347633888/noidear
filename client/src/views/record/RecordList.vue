<template>
  <div class="record-list">
    <PageHeaderBlock eyebrow="生产执行" title="记录管理" description="查询历史记录与执行结果" />

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel--padded">
        <el-form :model="filterForm" inline>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" clearable placeholder="全部">
              <el-option value="draft" label="草稿" />
              <el-option value="submitted" label="已提交" />
              <el-option value="approved" label="已通过" />
              <el-option value="rejected" label="已驳回" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">记录列表</h3>
        <div class="app-panel-header__actions">
          <el-button type="primary" :loading="exporting" @click="openExportDialog">
            导出记录
          </el-button>
        </div>
      </div>

      <!-- 导出筛选对话框 -->
      <el-dialog v-model="exportDialogVisible" title="导出记录" width="480px">
        <el-form label-width="100px">
          <el-form-item label="模板ID">
            <el-input v-model="exportFilters.templateId" placeholder="留空则导出所有模板" clearable />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="exportFilters.status" clearable placeholder="留空则排除草稿">
              <el-option value="submitted" label="已提交" />
              <el-option value="signed" label="已签署" />
              <el-option value="approved" label="已通过" />
              <el-option value="rejected" label="已驳回" />
              <el-option value="draft" label="草稿" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input v-model="exportFilters.keyword" placeholder="记录编号" clearable />
          </el-form-item>
          <el-form-item label="提交人ID">
            <el-input v-model="exportFilters.submitterId" clearable />
          </el-form-item>
          <el-form-item label="开始日期">
            <el-date-picker v-model="exportFilters.startDate" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="exportFilters.endDate" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width: 100%" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="exportDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="exporting" @click="handleExportRecords">确认导出</el-button>
        </template>
      </el-dialog>
      <div class="app-panel--padded">
        <el-table :data="tableData" v-loading="loading" stripe>
          <el-table-column prop="id" label="记录ID" width="100" show-overflow-tooltip />
          <el-table-column label="所属任务" min-width="180">
            <template #default="{ row }">
              {{ row.task?.template?.title || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="提交人" width="120">
            <template #default="{ row }">
              {{ row.submitter?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTypeMap[row.status]" size="small">
                {{ statusTextMap[row.status] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="偏差" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.hasDeviation" type="danger" size="small">
                {{ row.deviationCount || 0 }}
              </el-tag>
              <span v-else class="text-muted">无</span>
            </template>
          </el-table-column>
          <el-table-column prop="submittedAt" label="提交时间" width="180">
            <template #default="{ row }">
              {{ row.submittedAt ? new Date(row.submittedAt).toLocaleString('zh-CN') : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="router.push(`/records/${row.id}`)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSearch"
            @current-change="handleSearch"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import recordApi from '@/api/record';
import type { ExportRecordsPayload } from '@/api/record';

const router = useRouter();
const loading = ref(false);
const tableData = ref<any[]>([]);

const statusTextMap: Record<string, string> = { draft: '草稿', submitted: '已提交', signed: '已签署', approved: '已通过', rejected: '已驳回' };
const statusTypeMap: Record<string, string> = { draft: 'info', submitted: 'warning', signed: 'success', approved: 'success', rejected: 'danger' };

const filterForm = reactive({ status: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await recordApi.getRecords({
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status || undefined,
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取记录列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.status = ''; handleSearch(); };

const exporting = ref(false);
const exportDialogVisible = ref(false);
const exportFilters = reactive({
  templateId: '',
  status: '',
  keyword: '',
  submitterId: '',
  startDate: '',
  endDate: '',
});

const openExportDialog = () => {
  exportFilters.status = filterForm.status || '';
  exportFilters.templateId = '';
  exportFilters.keyword = '';
  exportDialogVisible.value = true;
};

const handleExportRecords = async () => {
  exporting.value = true;
  try {
    const payload: ExportRecordsPayload = {
      templateId: exportFilters.templateId || undefined,
      status: exportFilters.status || undefined,
      keyword: exportFilters.keyword || undefined,
      submitterId: exportFilters.submitterId || undefined,
      startDate: exportFilters.startDate || undefined,
      endDate: exportFilters.endDate || undefined,
    };
    const blob = await recordApi.exportRecords(payload);
    const contentType = (blob as Blob).type;
    const extension = contentType.includes('zip') ? 'zip' : 'xlsx';
    const url = window.URL.createObjectURL(blob as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `记录导出_${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
    exportDialogVisible.value = false;
    ElMessage.success('记录导出成功');
  } catch (error: any) {
    ElMessage.error(error.message || '记录导出失败');
  } finally {
    exporting.value = false;
  }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.record-list { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.text-muted { color: #909399; }
</style>
