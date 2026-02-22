<template>
  <el-dialog
    :model-value="visible"
    title="权限配置"
    width="800px"
    @close="handleClose"
  >
    <div v-loading="loading">
      <el-alert
        title="权限配置"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      >
        为角色 "{{ role?.name }}" 配置权限
      </el-alert>

      <el-tree
        ref="treeRef"
        :data="treeData"
        :props="treeProps"
        show-checkbox
        node-key="id"
        :default-checked-keys="checkedKeys"
        @check="handleCheck"
      >
        <template #default="{ node, data }">
          <span class="custom-tree-node" :class="{ 'assigned-permission': isAssigned(data.id) }">
            <span>{{ node.label }}</span>
            <span v-if="data.description" class="node-description">
              （{{ data.description }}）
            </span>
            <el-tag v-if="isAssigned(data.id)" type="success" size="small" style="margin-left: 8px">
              已分配
            </el-tag>
          </span>
        </template>
      </el-tree>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage, type ElTree } from 'element-plus';
import request from '@/api/request';

interface Role {
  id: string;
  code: string;
  name: string;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

interface TreeNode {
  id: string;
  label: string;
  description?: string;
  children?: TreeNode[];
}

const props = defineProps<{
  visible: boolean;
  role: Role | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'success': [];
}>();

const treeRef = ref<InstanceType<typeof ElTree>>();
const loading = ref(false);
const submitting = ref(false);
const treeData = ref<TreeNode[]>([]);
const checkedKeys = ref<string[]>([]);
const allPermissions = ref<Permission[]>([]);

const treeProps = {
  label: 'label',
  children: 'children',
};

// 监听 role 变化，加载权限数据
watch(() => props.role, async (newRole) => {
  if (newRole && props.visible) {
    await loadPermissions();
    await loadRolePermissions();
  }
}, { immediate: true });

// 监听对话框显示状态
watch(() => props.visible, async (visible) => {
  if (visible && props.role) {
    await loadPermissions();
    await loadRolePermissions();
  }
});

const loadPermissions = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: Permission[] }>('/permissions', {
      params: { page: 1, limit: 1000 },
    });
    allPermissions.value = res.list;
    buildTree();
  } catch (error) {
    ElMessage.error('加载权限列表失败');
  } finally {
    loading.value = false;
  }
};

const loadRolePermissions = async () => {
  if (!props.role) return;

  loading.value = true;
  try {
    const res = await request.get<Permission[]>(`/roles/${props.role.id}/permissions`);
    checkedKeys.value = res.map((p: Permission) => p.id);
  } catch (error) {
    ElMessage.error('加载角色权限失败');
  } finally {
    loading.value = false;
  }
};

const buildTree = () => {
  const resourceMap = new Map<string, TreeNode>();

  allPermissions.value.forEach((permission) => {
    if (!resourceMap.has(permission.resource)) {
      resourceMap.set(permission.resource, {
        id: `resource_${permission.resource}`,
        label: getResourceLabel(permission.resource),
        children: [],
      });
    }

    const resourceNode = resourceMap.get(permission.resource)!;
    resourceNode.children!.push({
      id: permission.id,
      label: getActionLabel(permission.action),
      description: permission.description,
    });
  });

  treeData.value = Array.from(resourceMap.values());
};

const getResourceLabel = (resource: string): string => {
  const map: Record<string, string> = {
    document: '文档管理',
    template: '模板管理',
    task: '任务管理',
    approval: '审批管理',
    user: '用户管理',
    role: '角色管理',
    permission: '权限管理',
  };
  return map[resource] || resource;
};

const getActionLabel = (action: string): string => {
  const map: Record<string, string> = {
    create: '创建',
    read: '查看',
    update: '编辑',
    delete: '删除',
    approve: '审批',
  };
  return map[action] || action;
};

const isAssigned = (permissionId: string): boolean => {
  return checkedKeys.value.includes(permissionId);
};

const handleCheck = () => {
  // Tree 组件自动处理选中状态
};

const handleClose = () => {
  emit('update:visible', false);
  checkedKeys.value = [];
  treeData.value = [];
};

const handleSubmit = async () => {
  if (!props.role || !treeRef.value) return;

  const checkedNodes = treeRef.value.getCheckedNodes(false, false);
  const permissionIds = checkedNodes
    .filter((node: any) => !node.id.startsWith('resource_'))
    .map((node: any) => node.id);

  submitting.value = true;
  try {
    await request.post(`/roles/${props.role.id}/permissions`, {
      permissionIds,
    });
    ElMessage.success('权限配置成功');
    emit('success');
    handleClose();
  } catch (error) {
    // 错误信息已由拦截器处理
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assigned-permission {
  font-weight: 500;
  color: #67c23a;
}

.node-description {
  font-size: 12px;
  color: #909399;
}
</style>
