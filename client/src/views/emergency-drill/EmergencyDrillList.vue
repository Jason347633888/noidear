<template>
  <div class="drill-list-page">
    <div class="page-header">
      <h1 class="page-title">应急演练记录</h1>
      <p class="page-subtitle">登记并追踪应急演练情况</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">演练记录列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建演练记录
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="演练类型" width="130">
          <template #default="{ row }">
            {{ getDrillTypeText(row.drill_type) }}
          </template>
        </el-table-column>
        <el-table-column label="演练日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.drill_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="participants" label="参与人数" width="100" />
        <el-table-column label="时长（分钟）" width="120">
          <template #default="{ row }">
            {{ row.duration_min ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="结果" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.result === 'pass' ? 'success' : row.result === 'fail' ? 'danger' : 'warning'"
              size="small"
            >
              {{ getResultText(row.result) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="issues" label="发现问题" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.issues ?? '-' }}
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
      title="新建演练记录"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="110px">
        <el-form-item label="演练类型" prop="drill_type">
          <el-select v-model="createForm.drill_type" placeholder="请选择演练类型" style="width: 100%">
            <el-option label="消防演练" value="fire" />
            <el-option label="食品安全" value="food_safety" />
            <el-option label="化学品" value="chemical" />
            <el-option label="地震" value="earthquake" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="演练日期" prop="drill_date">
          <el-date-picker
            v-model="createForm.drill_date"
            type="datetime"
            placeholder="请选择演练日期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="参与人数" prop="participants">
          <el-input-number
            v-model="createForm.participants"
            :min="1"
            placeholder="请输入参与人数"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="演练结果" prop="result">
          <el-select v-model="createForm.result" placeholder="请选择演练结果" style="width: 100%">
            <el-option label="通过" value="pass" />
            <el-option label="失败" value="fail" />
            <el-option label="部分通过" value="partial" />
          </el-select>
        </el-form-item>
        <el-form-item label="时长（分钟）">
          <el-input-number
            v-model="createForm.duration_min"
            :min="1"
            placeholder="演练时长（可选）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="组织人">
          <el-input v-model="createForm.organizer" placeholder="请输入组织人（可选）" />
        </el-form-item>
        <el-form-item label="发现问题">
          <el-input
            v-model="createForm.issues"
            type="textarea"
            :rows="2"
            placeholder="演练中发现的问题（可选）"
          />
        </el-form-item>
        <el-form-item label="改进措施">
          <el-input
            v-model="createForm.improvement"
            type="textarea"
            :rows="2"
            placeholder="改进措施（可选）"
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
import emergencyDrillApi, { type EmergencyDrillRecord, getDrillTypeText, getResultText } from '@/api/emergency-drill';

const list = ref<EmergencyDrillRecord[]>([]);
const loading = ref(false);

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  drill_type: '',
  drill_date: '',
  participants: 1,
  result: '',
  duration_min: undefined as number | undefined,
  organizer: '',
  issues: '',
  improvement: '',
});

const createRules: FormRules = {
  drill_type: [{ required: true, message: '请选择演练类型', trigger: 'change' }],
  drill_date: [{ required: true, message: '请选择演练日期', trigger: 'change' }],
  participants: [{ required: true, message: '请输入参与人数', trigger: 'blur' }],
  result: [{ required: true, message: '请选择演练结果', trigger: 'change' }],
};

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
    const res = await emergencyDrillApi.getList();
    list.value = res.data as unknown as EmergencyDrillRecord[];
  } catch {
    ElMessage.error('加载演练记录列表失败');
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  createForm.drill_type = '';
  createForm.drill_date = '';
  createForm.participants = 1;
  createForm.result = '';
  createForm.duration_min = undefined;
  createForm.organizer = '';
  createForm.issues = '';
  createForm.improvement = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  await createFormRef.value?.validate();
  submitting.value = true;
  try {
    await emergencyDrillApi.create({
      drill_type: createForm.drill_type,
      drill_date: createForm.drill_date,
      participants: createForm.participants,
      result: createForm.result,
      duration_min: createForm.duration_min,
      organizer: createForm.organizer || undefined,
      issues: createForm.issues || undefined,
      improvement: createForm.improvement || undefined,
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
.drill-list-page {
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
