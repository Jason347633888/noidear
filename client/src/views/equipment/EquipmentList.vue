<template>
  <div class="equipment-list-page">
    <div class="page-header">
      <h1 class="page-title">设备台账</h1>
      <p class="page-subtitle">管理企业所有设备资产信息</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">设备列表</span>
            <span class="card-count">共 {{ pagination.total }} 台设备</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="showFormDialog()" class="create-btn">
              <el-icon><Plus /></el-icon>新增设备
            </el-button>
          </div>
        </div>
      </template>

      <!-- Filters -->
      <AdvancedFilter
        v-model="filters"
        :fields="filterFields"
        :autoSearch="false"
        @search="handleSearch"
        @reset="resetFilters"
      />

      <el-table :data="tableData" v-loading="loading" stripe class="equipment-table">
        <el-table-column prop="code" label="设备编号" width="160">
          <template #default="{ row }">
            <span class="equipment-code">{{ row.code }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="设备名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/equipment/${row.id}`)">
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="model" label="型号" width="120" />
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ getCategoryText(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="位置" width="120" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getEquipmentStatusType(row.status)" effect="light" size="small">
              {{ getEquipmentStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responsiblePerson" label="责任人" width="100" />
        <el-table-column prop="activationDate" label="启用日期" width="120">
          <template #default="{ row }">
            {{ row.activationDate ? formatDate(row.activationDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" @click="$router.push(`/equipment/${row.id}`)">
                <el-icon><View /></el-icon>详情
              </el-button>
              <el-button link type="warning" @click="showFormDialog(row)">
                <el-icon><Edit /></el-icon>编辑
              </el-button>
              <el-dropdown trigger="click" @command="(cmd: string) => handleStatusCommand(cmd, row)">
                <el-button link type="info">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="row.status !== 'active'" command="active">启用</el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 'active'" command="inactive">停用</el-dropdown-item>
                    <el-dropdown-item v-if="row.status !== 'scrapped'" command="scrapped" divided>
                      <span style="color: #f56c6c">报废</span>
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <span style="color: #f56c6c">删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- Create/Edit Dialog -->
    <EquipmentForm
      v-model:visible="formDialogVisible"
      :equipment="editingEquipment"
      @saved="handleFormSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, View, Edit, ArrowDown } from '@element-plus/icons-vue';
import equipmentApi, {
  type Equipment,
  type EquipmentListResponse,
  type EquipmentStatus,
  getEquipmentStatusText,
  getEquipmentStatusType,
} from '@/api/equipment';
import EquipmentForm from './EquipmentForm.vue';
import AdvancedFilter, { type FilterField } from '@/components/AdvancedFilter.vue';

const loading = ref(false);
const tableData = ref<Equipment[]>([]);
const formDialogVisible = ref(false);
const editingEquipment = ref<Equipment | null>(null);

const filters = reactive({
  keyword: '',
  category: '',
  status: '' as EquipmentStatus | '',
});

const pagination = reactive({ page: 1, limit: 20, total: 0 });

const CATEGORY_MAP: Record<string, string> = {
  production: '生产设备',
  testing: '检测设备',
  auxiliary: '辅助设备',
  utility: '公用设备',
};

const getCategoryText = (category: string) => CATEGORY_MAP[category] ?? category;

const filterFields: FilterField[] = [
  {
    prop: 'keyword',
    label: '关键词',
    type: 'input',
    placeholder: '搜索设备名称/编号',
    showSearchIcon: true,
    colMd: 8,
  },
  {
    prop: 'category',
    label: '设备分类',
    type: 'select',
    options: [
      { label: '生产设备', value: 'production' },
      { label: '检测设备', value: 'testing' },
      { label: '辅助设备', value: 'auxiliary' },
      { label: '公用设备', value: 'utility' },
    ],
    colMd: 8,
  },
  {
    prop: 'status',
    label: '设备状态',
    type: 'select',
    options: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'inactive' },
      { label: '报废', value: 'scrapped' },
    ],
    colMd: 8,
  },
];

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await equipmentApi.getEquipmentList({
      page: pagination.page,
      limit: pagination.limit,
      keyword: filters.keyword || undefined,
      category: filters.category || undefined,
      status: (filters.status as EquipmentStatus) || undefined,
    }) as unknown as EquipmentListResponse;
    tableData.value = res.list;
    pagination.total = res.total;
  } catch {
    ElMessage.error('获取设备列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const resetFilters = () => {
  filters.keyword = '';
  filters.category = '';
  filters.status = '';
  handleSearch();
};

const showFormDialog = (equipment?: Equipment) => {
  editingEquipment.value = equipment || null;
  formDialogVisible.value = true;
};

const handleFormSaved = () => {
  formDialogVisible.value = false;
  fetchData();
};

const handleStatusCommand = async (command: string, equipment: Equipment) => {
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm(`确定要删除设备 "${equipment.name}" 吗？此操作不可恢复。`, '确认删除', {
        type: 'warning',
      });
      await equipmentApi.deleteEquipment(equipment.id);
      ElMessage.success('删除成功');
      fetchData();
    } catch {
      // cancelled or error
    }
    return;
  }

  const statusLabels: Record<string, string> = {
    active: '启用',
    inactive: '停用',
    scrapped: '报废',
  };

  const confirmMessage = command === 'scrapped'
    ? `确定要将设备 "${equipment.name}" 标记为报废吗？报废后将自动取消所有未完成的维护计划。`
    : `确定要将设备 "${equipment.name}" 状态变更为 "${statusLabels[command]}" 吗？`;

  try {
    await ElMessageBox.confirm(confirmMessage, '确认变更', {
      type: command === 'scrapped' ? 'warning' : 'info',
    });
    await equipmentApi.updateEquipmentStatus(equipment.id, command as EquipmentStatus);
    ElMessage.success(`设备已${statusLabels[command]}`);
    fetchData();
  } catch {
    // cancelled or error
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.equipment-list-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  --bg: #f5f6fa;
  font-family: 'Inter', sans-serif;
}

.page-header { margin-bottom: 24px; }

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--text-light);
  margin: 0;
}

.table-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.card-count {
  font-size: 12px;
  color: var(--text-light);
}

.create-btn {
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, #d4af37 100%);
  border: none;
  font-weight: 500;
}

.equipment-table {
  --el-table-border-color: #f0f0f0;
  --el-table-row-hover-bg-color: #fafafa;
}

.equipment-table :deep(th) {
  background: #fafafa;
  font-weight: 500;
  color: var(--text-light);
  font-size: 12px;
}

.equipment-code {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: var(--text-light);
}

.action-btns {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}
</style>
