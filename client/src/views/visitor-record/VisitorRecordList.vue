<template>
  <div class="visitor-list-page">
    <div class="page-header">
      <h1 class="page-title">访客登记</h1>
      <p class="page-subtitle">登记并追踪外来访客信息</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">访客记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-date-picker
              v-model="filterDate"
              type="date"
              placeholder="按日期筛选"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              clearable
              style="width: 160px; margin-right: 12px"
              @change="loadList"
              @clear="loadList"
            />
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建访客记录
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="visitor_name" label="访客姓名" width="120" />
        <el-table-column prop="organization" label="所属单位" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.organization ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="purpose" label="来访目的" min-width="160" show-overflow-tooltip />
        <el-table-column label="健康状况" width="100">
          <template #default="{ row }">
            <el-tag
              v-if="row.health_status"
              :type="row.health_status === 'healthy' ? 'success' : row.health_status === 'sick' ? 'danger' : 'info'"
              size="small"
            >
              {{ getHealthText(row.health_status) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="来访日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.visit_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="escort" label="陪同人员" width="120">
          <template #default="{ row }">
            {{ row.escort ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default>
            <span class="action-placeholder">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建访客记录"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="访客姓名" prop="visitor_name">
          <el-input v-model="createForm.visitor_name" placeholder="请输入访客姓名" />
        </el-form-item>
        <el-form-item label="所属单位">
          <el-input v-model="createForm.organization" placeholder="请输入所属单位（可选）" />
        </el-form-item>
        <el-form-item label="来访目的" prop="purpose">
          <el-input
            v-model="createForm.purpose"
            type="textarea"
            :rows="2"
            placeholder="请描述来访目的"
          />
        </el-form-item>
        <el-form-item label="来访日期" prop="visit_date">
          <el-date-picker
            v-model="createForm.visit_date"
            type="datetime"
            placeholder="请选择来访日期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="陪同人员">
          <el-input v-model="createForm.escort" placeholder="请输入陪同人员（可选）" />
        </el-form-item>
        <el-form-item label="健康状况">
          <el-select v-model="createForm.health_status" placeholder="请选择" clearable style="width: 100%">
            <el-option label="健康" value="healthy" />
            <el-option label="不适" value="sick" />
            <el-option label="未知" value="unknown" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createForm.notes"
            type="textarea"
            :rows="2"
            placeholder="备注信息（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import visitorRecordApi, { type VisitorRecord } from '@/api/visitor-record';

const list = ref<VisitorRecord[]>([]);
const loading = ref(false);
const filterDate = ref('');

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  visitor_name: '',
  organization: '',
  purpose: '',
  visit_date: '',
  escort: '',
  health_status: '',
  notes: '',
});

const createRules: FormRules = {
  visitor_name: [{ required: true, message: '请输入访客姓名', trigger: 'blur' }],
  purpose: [{ required: true, message: '请填写来访目的', trigger: 'blur' }],
  visit_date: [{ required: true, message: '请选择来访日期', trigger: 'change' }],
};

function getHealthText(status: string): string {
  const map: Record<string, string> = {
    healthy: '健康',
    sick: '不适',
    unknown: '未知',
  };
  return map[status] ?? status;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

async function loadList() {
  loading.value = true;
  try {
    const res = await visitorRecordApi.getList(filterDate.value || undefined);
    list.value = res.data as unknown as VisitorRecord[];
  } catch {
    ElMessage.error('加载访客记录列表失败');
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  createForm.visitor_name = '';
  createForm.organization = '';
  createForm.purpose = '';
  createForm.visit_date = '';
  createForm.escort = '';
  createForm.health_status = '';
  createForm.notes = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await visitorRecordApi.create({
      visitor_name: createForm.visitor_name,
      purpose: createForm.purpose,
      visit_date: createForm.visit_date,
      organization: createForm.organization || undefined,
      escort: createForm.escort || undefined,
      health_status: createForm.health_status || undefined,
      notes: createForm.notes || undefined,
    });
    ElMessage.success('新建成功');
    createDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('新建失败，请重试');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.visitor-list-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-count {
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
}

.action-placeholder {
  color: #c0c4cc;
}
</style>
