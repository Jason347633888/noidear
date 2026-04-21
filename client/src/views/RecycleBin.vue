<template>
  <div class="recycle-bin">
    <div class="page-layout">
      <!-- 左侧：类型筛选 -->
      <div class="sidebar">
        <el-card class="type-card">
          <template #header>
            <span>类型筛选</span>
          </template>
          <div
            v-for="item in typeItems"
            :key="item.value"
            class="type-item"
            :class="{ active: activeType === item.value }"
            @click="handleTypeChange(item.value)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </div>
        </el-card>
      </div>

      <!-- 右侧：记录列表 -->
      <div class="main-content">
        <el-card class="filter-card">
          <el-form :model="filterForm" inline>
            <el-form-item label="名称搜索">
              <el-input
                v-model="filterForm.keyword"
                placeholder="模糊搜索名称"
                style="width: 180px"
                clearable
                @input="handleSearch"
              />
            </el-form-item>
            <el-form-item label="删除人">
              <el-input
                v-model="filterForm.deletedBy"
                placeholder="搜索删除人"
                style="width: 150px"
                clearable
                @input="handleSearch"
              />
            </el-form-item>
            <el-form-item label="删除时间">
              <el-date-picker
                v-model="filterForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 240px"
                @change="handleSearch"
              />
            </el-form-item>
            <el-form-item>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <div>
                <span class="table-title">{{ currentTypeLabel }}</span>
                <span class="item-count">共 {{ pagination.total }} 条</span>
              </div>
              <div class="batch-actions">
                <el-button
                  :disabled="selectedIds.length === 0"
                  @click="handleBatchRestore"
                >
                  批量恢复 ({{ selectedIds.length }})
                </el-button>
                <el-button
                  type="danger"
                  :disabled="selectedIds.length === 0"
                  @click="handleBatchDelete"
                >
                  批量彻底删除 ({{ selectedIds.length }})
                </el-button>
              </div>
            </div>
          </template>

          <el-table
            :data="tableData"
            v-loading="loading"
            stripe
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column label="名称/标题" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.title || row.name || row.number || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="编号" width="160" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="text-muted">{{ row.number || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default>
                <el-tag :type="typeTagMap[activeType]" size="small">
                  {{ currentTypeLabel }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="删除人" width="130">
              <template #default="{ row }">
                <div v-if="row.deletedBy" class="user-cell">
                  <div class="user-avatar">{{ getUserInitial(row.deletedBy) }}</div>
                  <span>{{ getUserName(row.deletedBy) }}</span>
                </div>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="删除时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.deletedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="handleRestore(row.id)">
                  恢复
                </el-button>
                <el-button size="small" type="danger" link @click="handlePermanentDelete(row.id)">
                  彻底删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.limit"
              :page-sizes="[20, 50, 100]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchData"
              @current-change="fetchData"
            />
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Document, Grid, List } from '@element-plus/icons-vue';
import recycleBinApi from '@/api/recycle-bin';

interface RecycleBinItem {
  id: string;
  title?: string;
  name?: string;
  number?: string;
  deletedBy?: any;
  deletedAt?: string;
}

const activeType = ref('document');
const loading = ref(false);
const tableData = ref<RecycleBinItem[]>([]);
const selectedIds = ref<string[]>([]);

const filterForm = reactive({
  keyword: '',
  deletedBy: '',
  dateRange: null as [Date, Date] | null,
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
});

const typeItems = [
  { value: 'document', label: '文档', icon: Document },
  { value: 'template', label: '模板', icon: Grid },
  { value: 'record', label: '记录', icon: List },
];

const typeTagMap: Record<string, string> = {
  document: 'primary',
  template: 'success',
  record: 'info',
};

const currentTypeLabel = computed(() => {
  return typeItems.find((t) => t.value === activeType.value)?.label || activeType.value;
});

const formatDate = (date?: string): string => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const getUserName = (user: any): string => {
  if (typeof user === 'string') return user;
  return user?.name || user?.username || '-';
};

const getUserInitial = (user: any): string => {
  const name = getUserName(user);
  return name.charAt(0)?.toUpperCase() || 'U';
};

const fetchData = async () => {
  loading.value = true;
  try {
    const [startDate, endDate] = filterForm.dateRange
      ? [
          filterForm.dateRange[0].toISOString().split('T')[0],
          filterForm.dateRange[1].toISOString().split('T')[0],
        ]
      : [undefined, undefined];
    const res = await recycleBinApi.findAll(
      activeType.value,
      pagination.page,
      pagination.limit,
      filterForm.keyword || undefined,
      filterForm.deletedBy || undefined,
      startDate,
      endDate,
    );
    tableData.value = res.list ?? [];
    pagination.total = res.total ?? 0;
  } catch (error) {
    ElMessage.error('获取回收站数据失败');
  } finally {
    loading.value = false;
  }
};

const handleTypeChange = (type: string) => {
  activeType.value = type;
  pagination.page = 1;
  selectedIds.value = [];
  fetchData();
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handleReset = () => {
  filterForm.keyword = '';
  filterForm.deletedBy = '';
  filterForm.dateRange = null;
  handleSearch();
};

const handleSelectionChange = (selection: RecycleBinItem[]) => {
  selectedIds.value = selection.map((item) => item.id);
};

const handleRestore = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定恢复该项目？恢复后将重新出现在原列表中。', '确认恢复', {
      type: 'warning',
      confirmButtonText: '确认恢复',
    });
    await recycleBinApi.restore(activeType.value, id);
    ElMessage.success('恢复成功');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel' && error?.message) {
      ElMessage.error(error.message);
    }
  }
};

const handlePermanentDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm(
      '彻底删除后无法恢复，数据将被永久清除。确定继续？',
      '警告：不可撤销操作',
      { type: 'error', confirmButtonText: '确认彻底删除' },
    );
    await recycleBinApi.permanentDelete(activeType.value, id);
    ElMessage.success('已彻底删除');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel' && error?.message) {
      ElMessage.error(error.message);
    }
  }
};

const handleBatchRestore = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `确定批量恢复选中的 ${selectedIds.value.length} 个项目？`,
      '确认批量恢复',
      { type: 'warning' },
    );
    await recycleBinApi.batchRestore(activeType.value, selectedIds.value);
    ElMessage.success(`已批量恢复 ${selectedIds.value.length} 个项目`);
    selectedIds.value = [];
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel' && error?.message) {
      ElMessage.error(error.message);
    }
  }
};

const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  try {
    await ElMessageBox.confirm(
      `将永久删除选中的 ${selectedIds.value.length} 个项目，此操作不可撤销。确定继续？`,
      '警告：批量彻底删除',
      { type: 'error', confirmButtonText: '确认删除' },
    );
    await recycleBinApi.batchPermanentDelete(activeType.value, selectedIds.value);
    ElMessage.success(`已彻底删除 ${selectedIds.value.length} 个项目`);
    selectedIds.value = [];
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel' && error?.message) {
      ElMessage.error(error.message);
    }
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.recycle-bin { padding: 0; }

.page-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.sidebar {
  width: 160px;
  flex-shrink: 0;
}

.type-card :deep(.el-card__body) { padding: 8px 0; }

.type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s ease;
}

.type-item:hover {
  background: #f5f7fa;
  color: #1a1a2e;
}

.type-item.active {
  background: rgba(201, 162, 39, 0.1);
  color: #c9a227;
  font-weight: 500;
}

.main-content { flex: 1; min-width: 0; }

.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title { font-weight: 500; font-size: 15px; }

.item-count {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.batch-actions { display: flex; gap: 8px; }

.user-cell { display: flex; align-items: center; gap: 6px; }

.user-avatar {
  width: 26px; height: 26px; border-radius: 6px;
  background: #1a1a2e; color: #c9a227;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600;
}

.text-muted { color: #c0c4cc; }

.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
