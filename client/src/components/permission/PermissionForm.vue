<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑权限' : '创建权限'"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="资源类型" prop="resource">
        <el-select
          v-model="form.resource"
          placeholder="请选择资源类型"
          :disabled="isEdit"
          style="width: 100%"
        >
          <el-option value="document" label="文档管理" />
          <el-option value="template" label="模板管理" />
          <el-option value="task" label="任务管理" />
          <el-option value="approval" label="审批管理" />
          <el-option value="user" label="用户管理" />
          <el-option value="role" label="角色管理" />
          <el-option value="permission" label="权限管理" />
        </el-select>
      </el-form-item>
      <el-form-item label="操作类型" prop="action">
        <el-select
          v-model="form.action"
          placeholder="请选择操作类型"
          :disabled="isEdit"
          style="width: 100%"
        >
          <el-option value="create" label="创建" />
          <el-option value="read" label="查看" />
          <el-option value="update" label="编辑" />
          <el-option value="delete" label="删除" />
          <el-option value="approve" label="审批" />
        </el-select>
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入权限描述"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import request from '@/api/request';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

interface FormData {
  resource: string;
  action: string;
  description: string;
}

const props = defineProps<{
  visible: boolean;
  permission: Permission | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'success': [];
}>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const isEdit = computed(() => !!props.permission);

const form = reactive<FormData>({
  resource: '',
  action: '',
  description: '',
});

const rules: FormRules = {
  resource: [
    { required: true, message: '请选择资源类型', trigger: 'change' },
  ],
  action: [
    { required: true, message: '请选择操作类型', trigger: 'change' },
  ],
};

// 监听 permission 变化，填充表单
watch(() => props.permission, (newPermission) => {
  if (newPermission) {
    form.resource = newPermission.resource;
    form.action = newPermission.action;
    form.description = newPermission.description || '';
  } else {
    resetForm();
  }
}, { immediate: true });

const resetForm = () => {
  form.resource = '';
  form.action = '';
  form.description = '';
  formRef.value?.clearValidate();
};

const handleClose = () => {
  emit('update:visible', false);
  resetForm();
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
  } catch (error) {
    return;
  }

  submitting.value = true;
  try {
    if (isEdit.value && props.permission) {
      await request.put(`/permissions/${props.permission.id}`, {
        description: form.description || undefined,
      });
      ElMessage.success('权限更新成功');
    } else {
      await request.post('/permissions', {
        resource: form.resource,
        action: form.action,
        description: form.description || undefined,
      });
      ElMessage.success('权限创建成功');
    }
    emit('success');
    handleClose();
  } catch (error) {
    // 错误信息已由拦截器处理
  } finally {
    submitting.value = false;
  }
};
</script>
