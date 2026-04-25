<template>
  <div class="task-create-page">
    <h2 class="page-title">新建任务</h2>
    <el-card>
      <el-form :model="form" label-width="100px">
        <el-form-item label="选择模板">
          <el-select v-model="form.templateId" placeholder="请选择模板" :loading="loadingTemplates">
            <el-option v-for="item in templateOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="执行部门">
          <el-select v-model="form.departmentId" placeholder="请选择部门" :loading="loadingDepartments">
            <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="截止日期">
          <el-date-picker v-model="form.deadline" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]" />
        </el-form-item>

        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>

        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>

        <el-form-item>
          <el-button @click="router.back()">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">创建</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import taskApi from '@/api/task';
import { request } from '@/api/request';

const router = useRouter();
const submitting = ref(false);
const loadingTemplates = ref(false);
const loadingDepartments = ref(false);
const templateOptions = ref<{ id: string; name: string }[]>([]);
const departmentOptions = ref<{ id: string; name: string }[]>([]);

const form = reactive({
  templateId: '',
  departmentId: '',
  deadline: '',
  title: '',
  description: '',
});

onMounted(async () => {
  await Promise.all([loadTemplates(), loadDepartments()]);
});

async function loadTemplates() {
  loadingTemplates.value = true;
  try {
    const data = await request.get<{ list?: Array<{ id: string; name: string; title?: string }> } | Array<{ id: string; name: string; title?: string }>>(
      '/record-templates?status=active&limit=100',
    );
    const items = Array.isArray(data) ? data : (data as any).list ?? [];
    templateOptions.value = items.map((t: any) => ({
      id: t.id,
      name: t.name ?? t.title ?? t.code ?? t.id,
    }));
  } catch {
    // Non-fatal: user can still fill in template ID manually
  } finally {
    loadingTemplates.value = false;
  }
}

async function loadDepartments() {
  loadingDepartments.value = true;
  try {
    const data = await request.get<{ list?: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }>>(
      '/departments?status=active&limit=100',
    );
    const items = Array.isArray(data) ? data : (data as any).list ?? [];
    departmentOptions.value = items.map((d: any) => ({ id: d.id, name: d.name }));
  } catch {
    // Non-fatal
  } finally {
    loadingDepartments.value = false;
  }
}

async function handleSubmit() {
  if (!form.templateId || !form.departmentId || !form.deadline) {
    ElMessage.error('请填写必填项');
    return;
  }
  submitting.value = true;
  try {
    await taskApi.createTask({
      templateId: form.templateId,
      departmentId: form.departmentId,
      deadline: form.deadline,
      title: form.title || undefined,
      description: form.description || undefined,
    });
    ElMessage.success('任务创建成功');
    router.push('/tasks');
  } finally {
    submitting.value = false;
  }
}
</script>
