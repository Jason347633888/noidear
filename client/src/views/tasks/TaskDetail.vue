<template>
  <div class="task-detail" v-loading="loading">
    <el-page-header @back="$router.back()">
      <template #content><span class="page-title">任务详情</span></template>
    </el-page-header>

    <el-card class="info-card" v-if="task">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务ID">{{ task.id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(task.status)">{{ getStatusText(task.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="模板">{{ task.template?.title }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ task.department?.name }}</el-descriptions-item>
        <el-descriptions-item label="截止日期">{{ formatDate(task.deadline) }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ task.creator?.name }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="form-card" v-if="task?.status === 'pending'">
      <template #header><span>填写任务</span></template>
      <FormBuilder
        :fields="task?.template?.fieldsJson || []"
        v-model="formData"
        ref="formRef"
      />
      <div class="actions">
        <el-button type="primary" @click="handleSubmit" :loading="submitting">提交</el-button>
      </div>
    </el-card>

    <el-card class="records-card" v-if="records.length">
      <template #header><span>提交记录</span></template>
      <el-table :data="records" stripe>
        <el-table-column prop="submitter" label="提交人" width="100">
          <template #default="{ row }">{{ row.submitter?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="submittedAt" label="提交时间" width="180">
          <template #default="{ row }">{{ formatDate(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getRecordStatusType(row.status)">{{ getRecordStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="approver" label="审批人" width="100">
          <template #default="{ row }">{{ row.approver?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="approvedAt" label="审批时间" width="180">
          <template #default="{ row }">{{ row.approvedAt ? formatDate(row.approvedAt) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="comment" label="意见" min-width="150" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import FormBuilder, { type TemplateField } from '@/components/FormBuilder.vue';

interface Task {
  id: string;
  template: { id: string; title: string; fieldsJson: TemplateField[] };
  department: { id: string; name: string };
  deadline: string;
  status: string;
  creator: { name: string } | null;
}

interface Record {
  id: string;
  submitter: { name: string } | null;
  approver: { name: string } | null;
  submittedAt: string;
  approvedAt: string;
  status: string;
  comment: string;
}

const route = useRoute();
const loading = ref(false);
const submitting = ref(false);
const task = ref<Task | null>(null);
const records = ref<Record[]>([]);
const formData = reactive<Record<string, unknown>>({});

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');
const getStatusType = (s: string) => ({ pending: 'warning', completed: 'success', cancelled: 'info' }[s] || 'info');
const getStatusText = (s: string) => ({ pending: '进行中', completed: '已完成', cancelled: '已取消' }[s] || s);
const getRecordStatusType = (s: string) => ({ submitted: 'info', approved: 'success', rejected: 'danger' }[s] || 'info');
const getRecordStatusText = (s: string) => ({ submitted: '待审批', approved: '通过', rejected: '驳回' }[s] || s);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<any>(`/tasks/${route.params.id}`);
    task.value = res;
    records.value = res.records || [];
  } catch { ElMessage.error('获取任务详情失败'); }
  finally { loading.value = false; }
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    await request.post('/tasks/submit', { taskId: task.value?.id, data: formData });
    ElMessage.success('提交成功');
    fetchData();
  } catch {} finally { submitting.value = false; }
};

onMounted(() => fetchData());
</script>

<style scoped>
.task-detail { padding: 0; }
.page-title { font-size: 18px; font-weight: bold; }
.info-card, .form-card, .records-card { margin-top: 16px; }
.actions { margin-top: 16px; text-align: right; }
</style>
