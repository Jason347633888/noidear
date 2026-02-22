<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑角色' : '创建角色'"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="角色代码" prop="code">
        <el-input
          v-model="form.code"
          placeholder="请输入角色代码（如：admin, leader, user）"
          :disabled="isEdit"
        />
      </el-form-item>
      <el-form-item label="角色名称" prop="name">
        <el-input
          v-model="form.name"
          placeholder="请输入角色名称（如：管理员、主管）"
        />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入角色描述"
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

interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface FormData {
  code: string;
  name: string;
  description: string;
}

const props = defineProps<{
  visible: boolean;
  role: Role | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'success': [];
}>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const isEdit = computed(() => !!props.role);

const form = reactive<FormData>({
  code: '',
  name: '',
  description: '',
});

const rules: FormRules = {
  code: [
    { required: true, message: '请输入角色代码', trigger: 'blur' },
    { min: 2, max: 50, message: '角色代码长度为 2-50 个字符', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]*$/, message: '角色代码只能包含小写字母、数字和下划线，且必须以字母开头', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 50, message: '角色名称长度为 2-50 个字符', trigger: 'blur' },
  ],
};

// 监听 role 变化，填充表单
watch(() => props.role, (newRole) => {
  if (newRole) {
    form.code = newRole.code;
    form.name = newRole.name;
    form.description = newRole.description || '';
  } else {
    resetForm();
  }
}, { immediate: true });

const resetForm = () => {
  form.code = '';
  form.name = '';
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
    if (isEdit.value && props.role) {
      await request.put(`/roles/${props.role.id}`, {
        name: form.name,
        description: form.description || undefined,
      });
      ElMessage.success('角色更新成功');
    } else {
      await request.post('/roles', {
        code: form.code,
        name: form.name,
        description: form.description || undefined,
      });
      ElMessage.success('角色创建成功');
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
