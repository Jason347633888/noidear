<template>
  <div class="fault-list-page">
    <div class="page-header">
      <h1 class="page-title">报修管理</h1>
      <p class="page-subtitle">查看和处理设备报修单</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">报修单列表</span>
            <span class="card-count">共 {{ pagination.total }} 条报修</span>
          </div>
          <div class="header-actions">
            <el-button @click="$router.push('/equipment/faults/stats')">
              <el-icon><DataAnalysis /></el-icon>报修统计
            </el-button>
            <el-button type="primary" @click="$router.push('/equipment/faults/create')" class="create-btn">
              <el-icon><Plus /></el-icon>发起报修
            </el-button>
          </div>
        </div>
      </template>

      <!-- Filters -->
      <div class="filter-bar">
        <el-select v-model="filters.status" placeholder="报修状态" clearable @change="handleSearch">
          <el-option label="待处理" value="pending" />
          <el-option label="处理中" value="in_progress" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-select v-model="filters.urgencyLevel" placeholder="紧急程度" clearable @change="handleSearch">
          <el-option label="紧急" value="urgent" />
          <el-option label="普通" value="normal" />
          <el-option label="低" value="low" />
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

      <el-table :data="tableData" v-loading="loading" stripe :row-class-name="getRowClassName">
        <el-table-column prop="faultCode" label="报修单号" width="180">
          <template #default="{ row }">
            <span class="fault-code">{{ row.faultCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="equipment" label="设备名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/equipment/${row.equipmentId}`)">
              {{ row.equipment?.name || '-' }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="故障描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="urgencyLevel" label="紧急程度" width="100">
          <template #default="{ row }">
            <el-tag :type="getUrgencyType(row.urgencyLevel)" effect="light" size="small">
              {{ getUrgencyText(row.urgencyLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getFaultStatusType(row.status)" effect="light" size="small">
              {{ getFaultStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reporter" label="报修人" width="100">
          <template #default="{ row }">{{ row.reporter?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="reportTime" label="报修时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.reportTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" @click="$router.push(`/equipment/faults/${row.id}`)">
                <el-icon><View /></el-icon>详情
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                link
                type="success"
                @click="handleAccept(row)"
              >
                <el-icon><Select /></el-icon>接单
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                link
                type="info"
                @click="handleCancelFault(row)"
              >
                取消
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, View, Select, DataAnalysis } from '@element-plus/icons-vue';
import equipmentApi, {
  type EquipmentFault,
  type FaultListResponse,
  type FaultStatus,
  type FaultUrgency,
  getFaultStatusText,
  getFaultStatusType,
  getUrgencyText,
  getUrgencyType,
} from '@/api/equipment';

const loading = ref(false);
const tableData = ref<EquipmentFault[]>([]);
const dateRange = ref<[string, string] | null>(null);

const filters = reactive({
  status: '' as FaultStatus | '',
  urgencyLevel: '' as FaultUrgency | '',
});

const pagination = reactive({ page: 1, limit: 20, total: 0 });

const formatDateTime = (date: string) => new Date(date).toLocaleString('zh-CN');

const getRowClassName = ({ row }: { row: EquipmentFault }) => {
  if (row.urgencyLevel === 'urgent' && row.status === 'pending') {
    return 'urgent-row';
  }
  return '';
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await equipmentApi.getFaultList({
      page: pagination.page,
      limit: pagination.limit,
      status: (filters.status as FaultStatus) || undefined,
      urgencyLevel: (filters.urgencyLevel as FaultUrgency) || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
    }) as unknown as FaultListResponse;
    tableData.value = res.list;
    pagination.total = res.total;
  } catch {
    ElMessage.error('获取报修列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const resetFilters = () => {
  filters.status = '';
  filters.urgencyLevel = '';
  dateRange.value = null;
  handleSearch();
};

const handleAccept = async (fault: EquipmentFault) => {
  try {
    await ElMessageBox.confirm(`确定要接单处理报修 "${fault.faultCode}" 吗？`, '确认接单');
    await equipmentApi.acceptFault(fault.id);
    ElMessage.success('已接单');
    fetchData();
  } catch {
    // cancelled or error
  }
};

const handleCancelFault = async (fault: EquipmentFault) => {
  try {
    await ElMessageBox.confirm(`确定要取消报修 "${fault.faultCode}" 吗？`, '确认取消', { type: 'warning' });
    await equipmentApi.cancelFault(fault.id);
    ElMessage.success('已取消');
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
.fault-list-page {
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

.header-actions { display: flex; gap: 8px; }

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

.fault-code {
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

/* Urgent row highlighting */
:deep(.urgent-row) {
  background-color: #fef0f0 !important;
}

:deep(.urgent-row:hover > td) {
  background-color: #fde2e2 !important;
}
</style>
