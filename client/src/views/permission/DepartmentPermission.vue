<template>
  <div class="department-permission">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="部门">
          <el-select
            v-model="filterForm.departmentId"
            placeholder="选择部门"
            clearable
            style="width: 200px"
            @change="handleDepartmentChange"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :value="dept.id"
              :label="dept.name"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16">
      <!-- 左侧：部门列表 -->
      <el-col :span="8">
        <el-card class="dept-list-card" v-loading="deptLoading">
          <template #header>
            <span>部门列表</span>
          </template>
          <el-tree
            :data="departmentTree"
            :props="treeProps"
            highlight-current
            node-key="id"
            @node-click="handleNodeClick"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <span>{{ node.label }}</span>
                <el-tag v-if="data.permissionCount > 0" size="small" type="info">
                  {{ data.permissionCount }}
                </el-tag>
              </div>
            </template>
          </el-tree>
        </el-card>
      </el-col>

      <!-- 右侧：部门权限配置 -->
      <el-col :span="16">
        <el-card class="permission-config-card" v-loading="permLoading">
          <template #header>
            <div class="card-header">
              <span v-if="selectedDept">
                {{ selectedDept.name }} - 权限配置
              </span>
              <span v-else>请选择部门</span>
              <div v-if="selectedDept">
                <el-button
                  type="primary"
                  size="small"
                  @click="handleSave"
                  :loading="saving"
                >
                  保存
                </el-button>
              </div>
            </div>
          </template>

          <el-empty v-if="!selectedDept" description="请从左侧选择部门" />

          <div v-else>
            <!-- 数据隔离级别 -->
            <el-form-item label="数据隔离级别" style="margin-bottom: 16px">
              <el-radio-group v-model="deptConfig.isolationLevel">
                <el-radio value="none">无隔离（可查看全部数据）</el-radio>
                <el-radio value="department">部门隔离（仅本部门数据）</el-radio>
                <el-radio value="subdepartment">子部门隔离（本部门及下级）</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-divider>可访问资源</el-divider>

            <!-- 资源权限配置 -->
            <el-table :data="resourcePermissions" border stripe>
              <el-table-column prop="resourceLabel" label="资源" width="150" />
              <el-table-column label="查看" align="center" width="80">
                <template #default="{ row }">
                  <el-checkbox v-model="row.read" />
                </template>
              </el-table-column>
              <el-table-column label="创建" align="center" width="80">
                <template #default="{ row }">
                  <el-checkbox v-model="row.create" />
                </template>
              </el-table-column>
              <el-table-column label="编辑" align="center" width="80">
                <template #default="{ row }">
                  <el-checkbox v-model="row.update" />
                </template>
              </el-table-column>
              <el-table-column label="删除" align="center" width="80">
                <template #default="{ row }">
                  <el-checkbox v-model="row.delete" />
                </template>
              </el-table-column>
              <el-table-column label="审批" align="center" width="80">
                <template #default="{ row }">
                  <el-checkbox v-model="row.approve" />
                </template>
              </el-table-column>
            </el-table>

            <!-- 跨部门协作配置 -->
            <el-divider>跨部门协作</el-divider>
            <el-form-item label="允许访问部门">
              <el-select
                v-model="deptConfig.allowedDeptIds"
                multiple
                placeholder="选择可协作的部门"
                style="width: 100%"
              >
                <el-option
                  v-for="dept in otherDepartments"
                  :key="dept.id"
                  :value="dept.id"
                  :label="dept.name"
                />
              </el-select>
            </el-form-item>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

interface Department {
  id: string;
  name: string;
  parentId: string | null;
  permissionCount: number;
  children?: Department[];
}

interface ResourcePermission {
  resource: string;
  resourceLabel: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
}

interface DeptConfig {
  isolationLevel: 'none' | 'department' | 'subdepartment';
  allowedDeptIds: string[];
}

const RESOURCES = [
  { value: 'document', label: '文档管理' },
  { value: 'template', label: '模板管理' },
  { value: 'task', label: '任务管理' },
  { value: 'approval', label: '审批管理' },
  { value: 'record', label: '记录管理' },
  { value: 'warehouse', label: '仓库管理' },
  { value: 'deviation', label: '偏离检测' },
];

const filterForm = reactive({ departmentId: '' });
const deptLoading = ref(false);
const permLoading = ref(false);
const saving = ref(false);

const departments = ref<Department[]>([]);
const departmentTree = ref<Department[]>([]);
const selectedDept = ref<Department | null>(null);

const treeProps = { children: 'children', label: 'name' };

const deptConfig = reactive<DeptConfig>({
  isolationLevel: 'none',
  allowedDeptIds: [],
});

const resourcePermissions = ref<ResourcePermission[]>(
  RESOURCES.map((r) => ({
    resource: r.value,
    resourceLabel: r.label,
    read: false,
    create: false,
    update: false,
    delete: false,
    approve: false,
  })),
);

const otherDepartments = computed(() =>
  departments.value.filter((d) => d.id !== selectedDept.value?.id),
);

const buildTree = (depts: Department[]): Department[] => {
  const map = new Map<string, Department>();
  depts.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: Department[] = [];
  depts.forEach((d) => {
    const node = map.get(d.id)!;
    if (d.parentId && map.has(d.parentId)) {
      map.get(d.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

const fetchDepartments = async () => {
  deptLoading.value = true;
  try {
    const res = await request.get<{ list: Department[] }>('/departments', {
      params: { page: 1, limit: 200 },
    });
    departments.value = res.list;
    departmentTree.value = buildTree(res.list);
  } catch {
    ElMessage.error('获取部门列表失败');
  } finally {
    deptLoading.value = false;
  }
};

const fetchDeptPermissions = async (deptId: string) => {
  permLoading.value = true;
  try {
    const res = await request.get<{
      isolationLevel: string;
      allowedDeptIds: string[];
      resources: Array<{ resource: string; actions: string[] }>;
    }>(`/department-permissions/${deptId}`);

    deptConfig.isolationLevel = (res.isolationLevel as DeptConfig['isolationLevel']) || 'none';
    deptConfig.allowedDeptIds = res.allowedDeptIds || [];

    // Reset permissions
    resourcePermissions.value = RESOURCES.map((r) => {
      const found = (res.resources || []).find((rp) => rp.resource === r.value);
      const actions = found?.actions ?? [];
      return {
        resource: r.value,
        resourceLabel: r.label,
        read: actions.includes('read'),
        create: actions.includes('create'),
        update: actions.includes('update'),
        delete: actions.includes('delete'),
        approve: actions.includes('approve'),
      };
    });
  } catch {
    // If not found, show empty config
    deptConfig.isolationLevel = 'none';
    deptConfig.allowedDeptIds = [];
    resourcePermissions.value = RESOURCES.map((r) => ({
      resource: r.value,
      resourceLabel: r.label,
      read: false,
      create: false,
      update: false,
      delete: false,
      approve: false,
    }));
  } finally {
    permLoading.value = false;
  }
};

const handleNodeClick = (data: Department) => {
  selectedDept.value = data;
  fetchDeptPermissions(data.id);
};

const handleDepartmentChange = (deptId: string) => {
  const dept = departments.value.find((d) => d.id === deptId);
  if (dept) {
    selectedDept.value = dept;
    fetchDeptPermissions(deptId);
  }
};

const handleSave = async () => {
  if (!selectedDept.value) return;

  saving.value = true;
  try {
    const resources = resourcePermissions.value.map((rp) => {
      const actions: string[] = [];
      if (rp.read) actions.push('read');
      if (rp.create) actions.push('create');
      if (rp.update) actions.push('update');
      if (rp.delete) actions.push('delete');
      if (rp.approve) actions.push('approve');
      return { resource: rp.resource, actions };
    });

    await request.put(`/department-permissions/${selectedDept.value.id}`, {
      isolationLevel: deptConfig.isolationLevel,
      allowedDeptIds: deptConfig.allowedDeptIds,
      resources,
    });
    ElMessage.success('部门权限配置保存成功');
  } catch {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchDepartments();
});
</script>

<style scoped>
.department-permission {
  padding: 0;
}

.filter-card {
  margin-bottom: 16px;
}

.dept-list-card,
.permission-config-card {
  height: 600px;
  overflow-y: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;
}
</style>
