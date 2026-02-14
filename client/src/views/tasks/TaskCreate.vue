<template>
  <div class="task-create">
    <el-page-header @back="$router.back()">
      <template #content><span class="page-title">创建任务</span></template>
    </el-page-header>

    <el-card class="form-card">
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="选择模板" prop="templateId">
          <el-select v-model="formData.templateId" placeholder="请选择模板" filterable>
            <el-option
              v-for="t in templates"
              :key="t.id"
              :label="`${t.number} - ${t.title}`"
              :value="t.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="执行部门" prop="departmentId">
          <el-select v-model="formData.departmentId" placeholder="请选择部门" filterable>
            <el-option
              v-for="d in departments"
              :key="d.id"
              :label="d.name"
              :value="d.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="截止日期" prop="deadline">
          <el-date-picker
            v-model="formData.deadline"
            type="date"
            placeholder="选择截止日期"
            :disabled-date="disablePastDates"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">创建</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import request from '@/api/request';
import taskApi from '@/api/task';

interface Template { id: string; number: string; title: string; }
interface Department { id: string; name: string; }

const router = useRouter();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const templates = ref<Template[]>([]);
const departments = ref<Department[]>([]);

const formData = reactive({
  templateId: '',
  departmentId: '',
  deadline: '',
});

const rules: FormRules = {
  templateId: [{ required: true, message: '请选择模板', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择部门', trigger: 'change' }],
  deadline: [{ required: true, message: '请选择截止日期', trigger: 'change' }],
};

const disablePastDates = (date: Date) => date < new Date(Date.now() - 86400000);

const fetchOptions = async () => {
  try {
    const [tplRes, deptRes] = await Promise.all([
      request.get<{ list: Template[] }>('/templates', { params: { status: 'active', limit: 100 } }),
      request.get<{ list: Department[] }>('/departments', { params: { status: 'active', limit: 100 } }),
    ]);
    templates.value = tplRes.list;
    departments.value = deptRes.list;
  } catch { ElMessage.error('获取选项失败'); }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate();
  submitting.value = true;
  try {
    await taskApi.createTask({
      templateId: formData.templateId,
      departmentId: formData.departmentId,
      deadline: new Date(formData.deadline).toISOString(),
    });
    ElMessage.success('创建成功');
    router.push('/tasks');
  } catch { ElMessage.error('创建任务失败'); } finally { submitting.value = false; }
};

onMounted(() => fetchOptions());
</script>

<style scoped>
.task-create { padding: 0; }
.page-title { font-size: 18px; font-weight: bold; }
.form-card { margin-top: 16px; max-width: 600px; }
</style>
