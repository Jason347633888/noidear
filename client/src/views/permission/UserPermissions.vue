<template>
  <div class="user-permissions">
    <el-page-header @back="router.back()" content="用户权限管理" />

    <el-card class="info-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>用户信息</span>
        </div>
      </template>
      <el-descriptions :column="3" border v-if="userInfo">
        <el-descriptions-item label="用户名">{{ userInfo.username }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ userInfo.name }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ userInfo.role }}</el-descriptions-item>
        <el-descriptions-item label="部门">{{ userInfo.department?.name || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="permission-card">
      <template #header>
        <div class="card-header">
          <span>已授权权限</span>
          <el-button type="primary" @click="grantDialogVisible = true">
            授予权限
          </el-button>
        </div>
      </template>

      <el-table :data="userPermissions" v-loading="permissionLoading" stripe>
        <el-table-column prop="resource" label="资源类型" width="150">
          <template #default="{ row }">
            {{ getResourceLabel(row.resource) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作类型" width="120">
          <template #default="{ row }">
            {{ getActionLabel(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="source" label="来源" width="120">
          <template #default="{ row }">
            <el-tag :type="row.source === 'role' ? 'info' : 'warning'" size="small">
              {{ row.source === 'role' ? '角色继承' : '直接授权' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.source === 'direct'"
              link
              type="danger"
              @click="handleRevoke(row)"
            >
              撤销
            </el-button>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 授予权限对话框 -->
    <el-dialog
      v-model="grantDialogVisible"
      title="授予权限"
      width="600px"
    >
      <el-transfer
        v-model="selectedPermissionIds"
        :data="availablePermissions"
        :titles="['可用权限', '已选权限']"
        :props="{ key: 'id', label: 'displayName' }"
        filterable
        filter-placeholder="搜索权限"
      />

      <template #footer>
        <el-button @click="grantDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleGrant" :loading="granting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';

interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  department?: { id: string; name: string };
}

interface UserPermission {
  id: string;
  resource: string;
  action: string;
  description: string;
  source: 'role' | 'direct';
}

interface TransferPermission {
  id: string;
  displayName: string;
}

const route = useRoute();
const router = useRouter();
const userId = route.params.id as string;

const loading = ref(false);
const permissionLoading = ref(false);
const granting = ref(false);
const grantDialogVisible = ref(false);
const userInfo = ref<UserInfo | null>(null);
const userPermissions = ref<UserPermission[]>([]);
const availablePermissions = ref<TransferPermission[]>([]);
const selectedPermissionIds = ref<string[]>([]);

const getResourceLabel = (resource: string): string => {
  const map: Record<string, string> = {
    document: '文档管理',
    template: '模板管理',
    task: '任务管理',
    approval: '审批管理',
    user: '用户管理',
    role: '角色管理',
    permission: '权限管理',
    warehouse: '仓库管理',
    record: '记录管理',
    workflow: '工作流管理',
    batch: '批次管理',
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
    export: '导出',
  };
  return map[action] || action;
};

const fetchUserInfo = async () => {
  loading.value = true;
  try {
    const res = await request.get<UserInfo>(`/users/${userId}`);
    userInfo.value = res;
  } catch (error) {
    ElMessage.error('获取用户信息失败');
  } finally {
    loading.value = false;
  }
};

const fetchUserPermissions = async () => {
  permissionLoading.value = true;
  try {
    const res = await request.get<UserPermission[]>(`/user-permissions/${userId}`);
    userPermissions.value = res;
  } catch (error) {
    ElMessage.error('获取用户权限失败');
  } finally {
    permissionLoading.value = false;
  }
};

const fetchAvailablePermissions = async () => {
  try {
    const res = await request.get<{ list: { id: string; resource: string; action: string; description: string }[] }>(
      '/permissions',
      { params: { page: 1, limit: 1000 } },
    );
    const existingIds = new Set(
      userPermissions.value
        .filter((p) => p.source === 'direct')
        .map((p) => p.id),
    );
    availablePermissions.value = res.list.map((p) => ({
      id: p.id,
      displayName: `${getResourceLabel(p.resource)} - ${getActionLabel(p.action)}`,
    }));
    selectedPermissionIds.value = Array.from(existingIds);
  } catch (error) {
    ElMessage.error('获取可用权限失败');
  }
};

const handleGrant = async () => {
  granting.value = true;
  try {
    await request.post(`/user-permissions/${userId}`, {
      permissionIds: selectedPermissionIds.value,
    });
    ElMessage.success('权限授予成功');
    grantDialogVisible.value = false;
    fetchUserPermissions();
  } catch (error) {
    // 错误信息已由拦截器处理
  } finally {
    granting.value = false;
  }
};

const handleRevoke = async (permission: UserPermission) => {
  try {
    await ElMessageBox.confirm(
      `确定要撤销权限 "${getResourceLabel(permission.resource)} - ${getActionLabel(permission.action)}" 吗？`,
      '警告',
      { type: 'warning' },
    );
    await request.delete(`/user-permissions/${userId}/${permission.id}`);
    ElMessage.success('权限撤销成功');
    fetchUserPermissions();
  } catch (error) {
    // 用户取消或错误
  }
};

onMounted(async () => {
  await fetchUserInfo();
  await fetchUserPermissions();
  await fetchAvailablePermissions();
});
</script>

<style scoped>
.user-permissions {
  padding: 0;
}

.info-card {
  margin-top: 16px;
  margin-bottom: 16px;
}

.permission-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.text-muted {
  color: #909399;
}
</style>
