<template>
  <div class="task-create-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>新建任务</span>
        </div>
      </template>

      <el-form :model="form" label-width="100px">
        <el-form-item label="模板">
          <el-select v-model="form.templateId" placeholder="选择模板">
            <el-option v-for="item in templateOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="部门">
          <el-select v-model="form.departmentId" placeholder="选择部门">
            <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="截止时间">
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
          <el-button type="primary" :loading="submitting" @click="handleSubmit">创建任务</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import taskApi from '@/api/task';

const router = useRouter();
const submitting = ref(false);
const templateOptions = ref<{ id: string; name: string }[]>([]);
const departmentOptions = ref<{ id: string; name: string }[]>([]);

const form = reactive({
  templateId: '',
  departmentId: '',
  deadline: '',
  title: '',
  description: '',
});

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
