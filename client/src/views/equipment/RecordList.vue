<template>
  <div class="record-list-page">
    <div class="page-header">
      <h1 class="page-title">维保记录</h1>
      <p class="page-subtitle">查看和管理设备维保记录</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">记录列表</span>
            <span class="card-count">共 {{ pagination.total }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="$router.push('/equipment/records/create')" class="create-btn">
              <el-icon><Plus /></el-icon>新建记录
            </el-button>
          </div>
        </div>
      </template>

      <!-- Filters -->
      <div class="filter-bar">
        <el-select v-model="filters.equipmentId" placeholder="选择设备" clearable filterable @change="handleSearch">
          <el-option
            v-for="eq in equipmentOptions"
            :key="eq.id"
            :label="`${eq.name} (${eq.code})`"
            :value="eq.id"
          />
        </el-select>
        <el-select v-model="filters.maintenanceLevel" placeholder="保养级别" clearable @change="handleSearch">
          <el-option label="日保养" value="daily" />
          <el-option label="周保养" value="weekly" />
          <el-option label="月保养" value="monthly" />
          <el-option label="季保养" value="quarterly" />
          <el-option label="年保养" value="annual" />
        </el-select>
        <el-select v-model="filters.status" placeholder="记录状态" clearable @change="handleSearch">
          <el-option label="草稿" value="draft" />
          <el-option label="待审批" value="submitted" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="handleSearch"
        />
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="recordCode" label="记录编号" width="180">
          <template #default="{ row }">
            <span class="record-code">{{ row.recordCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="equipment" label="设备名称" min-width="150">
          <template #default="{ row }">
            {{ row.equipment?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="maintenanceLevel" label="保养级别" width="120">
          <template #default="{ row }">
            <el-tag
              :color="getLevelColor(row.maintenanceLevel)"
              effect="dark"
              size="small"
              style="border: none"
            >
              {{ getLevelText(row.maintenanceLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="maintenanceDate" label="维保日期" width="120">
          <template #default="{ row }">{{ formatDate(row.maintenanceDate) }}</template>
        </el-table-column>
        <el-table-column prop="operator" label="维保人员" width="100">
          <template #default="{ row }">{{ row.operator?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getRecordStatusType(row.status)" effect="light" size="small">
              {{ getRecordStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" @click="$router.push(`/equipment/records/${row.id}`)">
                <el-icon><View /></el-icon>查看
              </el-button>
              <el-button
                v-if="row.status === 'draft'"
                link
                type="warning"
                @click="$router.push(`/equipment/records/create?recordId=${row.id}`)"
              >
                <el-icon><Edit /></el-icon>编辑
              </el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, View, Edit } from '@element-plus/icons-vue';
import equipmentApi, {
  type MaintenanceRecord,
  type Equipment,
  type RecordListResponse,
  type MaintenanceLevel,
  type RecordStatus,
  getRecordStatusText,
  getRecordStatusType,
  getLevelText,
  getLevelColor,
} from '@/api/equipment';

const loading = ref(false);
const tableData = ref<MaintenanceRecord[]>([]);
const equipmentOptions = ref<Equipment[]>([]);
const dateRange = ref<[string, string] | null>(null);

const filters = reactive({
  equipmentId: '',
  maintenanceLevel: '' as MaintenanceLevel | '',
  status: '' as RecordStatus | '',
});

const pagination = reactive({ page: 1, limit: 20, total: 0 });

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await equipmentApi.getRecordList({
      page: pagination.page,
      limit: pagination.limit,
      equipmentId: filters.equipmentId || undefined,
      maintenanceLevel: (filters.maintenanceLevel as MaintenanceLevel) || undefined,
      status: (filters.status as RecordStatus) || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
    }) as unknown as RecordListResponse;
    tableData.value = res.list;
    pagination.total = res.total;
  } catch {
    ElMessage.error('获取维保记录列表失败');
  } finally {
    loading.value = false;
  }
};

const fetchEquipmentOptions = async () => {
  try {
    const res = await equipmentApi.getEquipmentList({ limit: 200 }) as any;
    equipmentOptions.value = res.list || [];
  } catch {
    // silent
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const resetFilters = () => {
  filters.equipmentId = '';
  filters.maintenanceLevel = '';
  filters.status = '';
  dateRange.value = null;
  handleSearch();
};

onMounted(() => {
  fetchData();
  fetchEquipmentOptions();
});
</script>

<style scoped>
.record-list-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text: #2c3e50;
  --text-light: #7f8c8d;
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

.page-subtitle { font-size: 14px; color: var(--text-light); margin: 0; }

.table-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.card-header { display: flex; justify-content: space-between; align-items: center; }

.card-title-wrap { display: flex; align-items: baseline; gap: 12px; }

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.card-count { font-size: 12px; color: var(--text-light); }

.create-btn {
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, #d4af37 100%);
  border: none;
  font-weight: 500;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.record-code {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: var(--text-light);
}

.action-btns { display: flex; gap: 4px; align-items: center; }

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}
</style>
