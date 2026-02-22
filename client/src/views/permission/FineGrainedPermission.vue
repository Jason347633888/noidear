<template>
  <div class="fine-grained-permission">
    <el-card class="header-card">
      <div class="page-header">
        <div>
          <h3 class="page-title">细粒度权限配置</h3>
          <p class="page-desc">配置资源-操作权限矩阵，精确控制每个角色对系统资源的访问权限</p>
        </div>
        <div class="header-actions">
          <el-select
            v-model="selectedRoleId"
            placeholder="选择角色"
            style="width: 200px; margin-right: 12px"
            @change="handleRoleChange"
          >
            <el-option
              v-for="role in roles"
              :key="role.id"
              :value="role.id"
              :label="role.name"
            />
          </el-select>
          <el-button type="primary" :disabled="!selectedRoleId" @click="handleSave" :loading="saving">
            保存配置
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card v-loading="loading" class="matrix-card">
      <template #header>
        <div class="card-header">
          <span>权限矩阵</span>
          <div>
            <el-button size="small" @click="handleSelectAll">全选</el-button>
            <el-button size="small" @click="handleClearAll">清空</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="!selectedRoleId" description="请先选择角色" />

      <el-table
        v-else
        :data="resources"
        border
        stripe
        class="permission-matrix"
      >
        <el-table-column prop="label" label="资源" width="160" fixed>
          <template #default="{ row }">
            <span class="resource-name">{{ row.label }}</span>
          </template>
        </el-table-column>
        <el-table-column
          v-for="action in actions"
          :key="action.value"
          :label="action.label"
          align="center"
          width="100"
        >
          <template #default="{ row }">
            <el-checkbox
              v-model="matrix[row.value][action.value]"
              :disabled="!selectedRoleId"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 权限变更预览 -->
    <el-card v-if="selectedRoleId && changedCount > 0" class="preview-card">
      <template #header>
        <span>变更预览（{{ changedCount }} 项）</span>
      </template>
      <div class="change-list">
        <div
          v-for="change in pendingChanges"
          :key="`${change.resource}-${change.action}`"
          class="change-item"
        >
          <el-tag :type="change.granted ? 'success' : 'danger'" size="small">
            {{ change.granted ? '授予' : '撤销' }}
          </el-tag>
          <span class="change-text">
            {{ getResourceLabel(change.resource) }} - {{ getActionLabel(change.action) }}
          </span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import { PERMISSION_RESOURCES } from '@/constants/permission';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface ResourceItem {
  value: string;
  label: string;
}

interface ActionItem {
  value: string;
  label: string;
}

interface RolePermissionMatrix {
  resource: string;
  action: string;
  granted: boolean;
}

const resources: ResourceItem[] = PERMISSION_RESOURCES;

const actions: ActionItem[] = [
  { value: 'create', label: '创建' },
  { value: 'read', label: '查看' },
  { value: 'update', label: '编辑' },
  { value: 'delete', label: '删除' },
  { value: 'approve', label: '审批' },
  { value: 'export', label: '导出' },
];

const getResourceLabel = (resource: string) =>
  resources.find((r) => r.value === resource)?.label ?? resource;

const getActionLabel = (action: string) =>
  actions.find((a) => a.value === action)?.label ?? action;

const loading = ref(false);
const saving = ref(false);
const roles = ref<Role[]>([]);
const selectedRoleId = ref('');

// Initialize matrix: resource -> action -> boolean
const createEmptyMatrix = (): Record<string, Record<string, boolean>> => {
  const m: Record<string, Record<string, boolean>> = {};
  resources.forEach((r) => {
    m[r.value] = {};
    actions.forEach((a) => {
      m[r.value][a.value] = false;
    });
  });
  return m;
};

const matrix = reactive<Record<string, Record<string, boolean>>>(createEmptyMatrix());
const originalMatrix = ref<Record<string, Record<string, boolean>>>(createEmptyMatrix());

const pendingChanges = computed<RolePermissionMatrix[]>(() => {
  const changes: RolePermissionMatrix[] = [];
  resources.forEach((r) => {
    actions.forEach((a) => {
      const current = matrix[r.value][a.value];
      const original = originalMatrix.value[r.value][a.value];
      if (current !== original) {
        changes.push({ resource: r.value, action: a.value, granted: current });
      }
    });
  });
  return changes;
});

const changedCount = computed(() => pendingChanges.value.length);

const fetchRoles = async () => {
  try {
    const res = await request.get<{ list: Role[] }>('/roles', { params: { page: 1, limit: 100 } });
    roles.value = res.list;
  } catch {
    ElMessage.error('获取角色列表失败');
  }
};

const fetchRolePermissions = async (roleId: string) => {
  loading.value = true;
  try {
    const res = await request.get<{ permissions: Array<{ resource: string; action: string }> }>(
      `/fine-grained-permissions/role/${roleId}`,
    );
    // Reset matrix
    const m = createEmptyMatrix();
    res.permissions.forEach((p) => {
      if (m[p.resource] && p.action in m[p.resource]) {
        m[p.resource][p.action] = true;
      }
    });
    // Apply to reactive matrix
    resources.forEach((r) => {
      actions.forEach((a) => {
        matrix[r.value][a.value] = m[r.value][a.value];
      });
    });
    // Save original for diff
    originalMatrix.value = JSON.parse(JSON.stringify(m));
  } catch {
    ElMessage.error('获取角色权限配置失败');
  } finally {
    loading.value = false;
  }
};

const handleRoleChange = (roleId: string) => {
  if (roleId) {
    fetchRolePermissions(roleId);
  }
};

const handleSelectAll = () => {
  resources.forEach((r) => {
    actions.forEach((a) => {
      matrix[r.value][a.value] = true;
    });
  });
};

const handleClearAll = () => {
  resources.forEach((r) => {
    actions.forEach((a) => {
      matrix[r.value][a.value] = false;
    });
  });
};

const handleSave = async () => {
  if (!selectedRoleId.value) return;
  if (changedCount.value === 0) {
    ElMessage.info('没有变更需要保存');
    return;
  }

  saving.value = true;
  try {
    // Build full permission list
    const permissions: Array<{ resource: string; action: string }> = [];
    resources.forEach((r) => {
      actions.forEach((a) => {
        if (matrix[r.value][a.value]) {
          permissions.push({ resource: r.value, action: a.value });
        }
      });
    });

    await request.put(`/fine-grained-permissions/role/${selectedRoleId.value}`, { permissions });
    ElMessage.success('权限配置保存成功');

    // Update original to current
    originalMatrix.value = JSON.parse(JSON.stringify(matrix));
  } catch {
    ElMessage.error('保存权限配置失败');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchRoles();
});
</script>

<style scoped>
.fine-grained-permission {
  padding: 0;
}

.header-card {
  margin-bottom: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}

.page-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.matrix-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.permission-matrix {
  width: 100%;
}

.resource-name {
  font-weight: 500;
}

.preview-card {
  margin-bottom: 16px;
}

.change-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.change-text {
  font-size: 13px;
  color: #606266;
}
</style>
