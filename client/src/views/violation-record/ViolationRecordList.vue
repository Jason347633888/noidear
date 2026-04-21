<template>
  <div class="violation-list-page">
    <div class="page-header">
      <h1 class="page-title">员工违规记录</h1>
      <p class="page-subtitle">登记并追踪员工违规行为</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">违规记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-input
              v-model="filterEmployeeId"
              placeholder="按员工 ID 筛选"
              clearable
              style="width: 200px; margin-right: 12px"
              @change="loadList"
              @clear="loadList"
            />
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建违规记录
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="employee_id" label="员工 ID" width="150" />
        <el-table-column prop="violation_type" label="违规类型" width="150" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="penalty" label="处罚措施" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.penalty ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="corrective_requirement" label="整改要求" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.corrective_requirement ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="发生时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.occurred_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建违规记录"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="员工 ID" prop="employee_id">
          <el-input v-model="createForm.employee_id" placeholder="请输入员工 ID" />
        </el-form-item>
        <el-form-item label="违规类型" prop="violation_type">
          <el-input v-model="createForm.violation_type" placeholder="例如：未佩戴防护用品、操作规程违规等" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请描述违规详情"
          />
        </el-form-item>
        <el-form-item label="处罚措施">
          <el-input v-model="createForm.penalty" placeholder="例如：警告、罚款等（可选）" />
        </el-form-item>
        <el-form-item label="整改要求">
          <el-input
            v-model="createForm.corrective_requirement"
            type="textarea"
            :rows="2"
            placeholder="请描述整改要求（可选）"
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
import violationRecordApi, { type ViolationRecord } from '@/api/violation-record';

const list = ref<ViolationRecord[]>([]);
const loading = ref(false);
const filterEmployeeId = ref('');

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  employee_id: '',
  violation_type: '',
  description: '',
  penalty: '',
  corrective_requirement: '',
});

const createRules: FormRules = {
  employee_id: [{ required: true, message: '请输入员工 ID', trigger: 'blur' }],
  violation_type: [{ required: true, message: '请输入违规类型', trigger: 'blur' }],
  description: [{ required: true, message: '请填写描述', trigger: 'blur' }],
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function loadList() {
  loading.value = true;
  try {
    const res = await violationRecordApi.getList(filterEmployeeId.value || undefined);
    list.value = res.data as unknown as ViolationRecord[];
  } catch {
    ElMessage.error('加载违规记录列表失败');
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  createForm.employee_id = '';
  createForm.violation_type = '';
  createForm.description = '';
  createForm.penalty = '';
  createForm.corrective_requirement = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await violationRecordApi.create({
      employee_id: createForm.employee_id,
      violation_type: createForm.violation_type,
      description: createForm.description,
      penalty: createForm.penalty || undefined,
      corrective_requirement: createForm.corrective_requirement || undefined,
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
.violation-list-page {
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
</style>
