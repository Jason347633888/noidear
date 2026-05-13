<template>
  <el-dialog
    v-model="dialogVisible"
    title="授予用户权限"
    width="560px"
    @close="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="90px"
    >
      <el-form-item label="目标用户" prop="userId">
        <el-select
          v-model="form.userId"
          filterable
          remote
          :remote-method="searchUsers"
          :loading="userLoading"
          placeholder="输入用户名搜索"
          style="width: 100%"
        >
          <el-option
            v-for="user in userOptions"
            :key="user.id"
            :value="user.id"
            :label="`${user.name} (${user.username})`"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="权限类型" prop="permissionId">
        <el-select
          v-model="form.permissionId"
          filterable
          placeholder="选择权限"
          style="width: 100%"
          :loading="permissionLoading"
        >
          <el-option
            v-for="perm in permissionOptions"
            :key="perm.id"
            :value="perm.id"
            :label="`${getResourceLabel(perm.resource)} - ${getActionLabel(perm.action)}`"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="过期时间">
        <el-date-picker
          v-model="form.expiresAt"
          type="datetime"
          placeholder="留空表示永不过期"
          style="width: 100%"
          :disabled-date="disablePastDate"
        />
      </el-form-item>

      <el-form-item label="授权原因" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          placeholder="请填写授权原因（必填）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        确认授权
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

interface UserOption {
  id: string;
  name: string;
  username: string;
}

interface PermissionOption {
  id: string;
  resource: string;
  action: string;
}

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'success'): void;
}>();

const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const submitting = ref(false);
const userLoading = ref(false);
const permissionLoading = ref(false);
const userOptions = ref<UserOption[]>([]);
const permissionOptions = ref<PermissionOption[]>([]);

const form = reactive({
  userId: '',
  permissionId: '',
  expiresAt: null as Date | null,
  reason: '',
});

const rules: FormRules = {
  userId: [{ required: true, message: '请选择目标用户', trigger: 'change' }],
  permissionId: [{ required: true, message: '请选择权限类型', trigger: 'change' }],
  reason: [
    { required: true, message: '授权原因为必填项', trigger: 'blur' },
    { min: 2, message: '原因至少2个字符', trigger: 'blur' },
  ],
};

const getResourceLabel = (resource: string): string => {
  const map: Record<string, string> = {
    document: '文档管理', template: '模板管理', task: '任务管理',
    approval: '审批管理', user: '用户管理', role: '角色管理',
    permission: '权限管理', warehouse: '仓库管理', record: '记录管理',
    batch: '批次管理',
  };
  return map[resource] || resource;
};

const getActionLabel = (action: string): string => {
  const map: Record<string, string> = {
    create: '创建', read: '查看', update: '编辑',
    delete: '删除', approve: '审批', export: '导出',
  };
  return map[action] || action;
};

const disablePastDate = (date: Date) => date < new Date(Date.now() - 86400000);

const searchUsers = async (query: string) => {
  if (!query) return;
  userLoading.value = true;
  try {
    const res = await request.get<{ list: UserOption[] }>('/users', {
      params: { keyword: query, limit: 20 },
    });
    userOptions.value = res.list ?? [];
  } catch {
    userOptions.value = [];
  } finally {
    userLoading.value = false;
  }
};

const fetchPermissions = async () => {
  permissionLoading.value = true;
  try {
    const res = await request.get<{ list: PermissionOption[] }>('/permissions', {
      params: { limit: 1000 },
    });
    permissionOptions.value = res.list ?? [];
  } catch {
    permissionOptions.value = [];
  } finally {
    permissionLoading.value = false;
  }
};

const resetForm = () => {
  form.userId = '';
  form.permissionId = '';
  form.expiresAt = null;
  form.reason = '';
  formRef.value?.clearValidate();
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await request.post('/user-permissions', {
      userId: form.userId,
      permissionId: form.permissionId,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      reason: form.reason,
    });
    ElMessage.success('权限授予成功');
    dialogVisible.value = false;
    emit('success');
  } catch {
    // 错误由拦截器处理
  } finally {
    submitting.value = false;
  }
};

watch(() => props.visible, (val) => {
  dialogVisible.value = val;
  if (val) {
    fetchPermissions();
  }
});

watch(dialogVisible, (val) => {
  emit('update:visible', val);
});
</script>
