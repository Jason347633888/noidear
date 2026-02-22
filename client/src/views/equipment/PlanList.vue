<template>
  <div class="plan-list-page">
    <div class="page-header">
      <h1 class="page-title">维护计划</h1>
      <p class="page-subtitle">查看和管理设备维护计划</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">计划列表</span>
            <span class="card-count">共 {{ pagination.total }} 个计划</span>
          </div>
          <div class="header-actions">
            <el-button @click="$router.push('/equipment/plans/calendar')">
              <el-icon><Calendar /></el-icon>日历视图
            </el-button>
          </div>
        </div>
      </template>

      <!-- Filters -->
      <AdvancedFilter
        v-model="filters"
        :fields="filterFields"
        :autoSearch="true"
        @search="handleSearch"
        @reset="resetFilters"
      />

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="planCode" label="计划编号" width="180">
          <template #default="{ row }">
            <span class="plan-code">{{ row.planCode }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="equipment" label="设备名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/equipment/${row.equipmentId}`)">
              {{ row.equipment?.name || '-' }}
            </el-link>
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
        <el-table-column prop="plannedDate" label="计划日期" width="120">
          <template #default="{ row }">
            <span :class="{ 'date-overdue': isPlanOverdue(row) }">
              {{ formatDate(row.plannedDate) }}
              <el-tag v-if="isPlanOverdue(row)" type="danger" size="small" class="overdue-tag">逾期</el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getPlanStatusType(row.status)" effect="light" size="small">
              {{ getPlanStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responsiblePerson" label="责任人" width="100" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button
                v-if="row.status === 'pending'"
                link
                type="success"
                @click="handleStart(row)"
              >
                <el-icon><VideoPlay /></el-icon>开始维保
              </el-button>
              <el-button
                v-if="row.status === 'in_progress'"
                link
                type="primary"
                @click="handleComplete(row)"
              >
                <el-icon><CircleCheck /></el-icon>完成
              </el-button>
              <el-button
                v-if="row.status === 'pending' || row.status === 'in_progress'"
                link
                type="danger"
                @click="handleCancel(row)"
              >
                <el-icon><CircleClose /></el-icon>取消
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
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Calendar, VideoPlay, CircleCheck, CircleClose } from '@element-plus/icons-vue';
import equipmentApi, {
  type MaintenancePlan,
  type Equipment,
  type PlanListResponse,
  type MaintenanceLevel,
  type PlanStatus,
  getPlanStatusText,
  getPlanStatusType,
  getLevelText,
  getLevelColor,
} from '@/api/equipment';
import AdvancedFilter, { type FilterField } from '@/components/AdvancedFilter.vue';

const router = useRouter();
const loading = ref(false);
const tableData = ref<MaintenancePlan[]>([]);
const equipmentOptions = ref<Equipment[]>([]);

const filters = reactive({
  equipmentId: '',
  maintenanceLevel: '' as MaintenanceLevel | '',
  status: '' as PlanStatus | '',
});

const pagination = reactive({ page: 1, limit: 20, total: 0 });

const filterFields = computed<FilterField[]>(() => [
  {
    prop: 'equipmentId',
    label: '选择设备',
    type: 'select',
    filterable: true,
    options: equipmentOptions.value.map((eq) => ({
      label: `${eq.name} (${eq.code})`,
      value: eq.id,
    })),
    colMd: 8,
  },
  {
    prop: 'maintenanceLevel',
    label: '保养级别',
    type: 'select',
    options: [
      { label: '日保养', value: 'daily' },
      { label: '周保养', value: 'weekly' },
      { label: '月保养', value: 'monthly' },
      { label: '季保养', value: 'quarterly' },
      { label: '年保养', value: 'annual' },
    ],
    colMd: 8,
  },
  {
    prop: 'status',
    label: '计划状态',
    type: 'select',
    options: [
      { label: '待执行', value: 'pending' },
      { label: '进行中', value: 'in_progress' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' },
    ],
    colMd: 8,
  },
]);

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');

const isPlanOverdue = (plan: MaintenancePlan) => {
  if (plan.status === 'completed' || plan.status === 'cancelled') return false;
  return new Date(plan.plannedDate) < new Date();
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await equipmentApi.getPlanList({
      page: pagination.page,
      limit: pagination.limit,
      equipmentId: filters.equipmentId || undefined,
      maintenanceLevel: (filters.maintenanceLevel as MaintenanceLevel) || undefined,
      status: (filters.status as PlanStatus) || undefined,
    }) as unknown as PlanListResponse;
    tableData.value = res.list;
    pagination.total = res.total;
  } catch {
    ElMessage.error('获取维护计划列表失败');
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
  handleSearch();
};

const handleStart = async (plan: MaintenancePlan) => {
  try {
    await ElMessageBox.confirm(
      `确定要开始维保计划 "${plan.planCode}" 吗？将跳转到维保记录填写页面。`,
      '确认开始维保',
    );
    await equipmentApi.startPlan(plan.id);
    ElMessage.success('维保已开始');
    router.push(`/equipment/records/create?planId=${plan.id}&equipmentId=${plan.equipmentId}&level=${plan.maintenanceLevel}`);
  } catch {
    // cancelled or error
  }
};

const handleComplete = async (plan: MaintenancePlan) => {
  try {
    await ElMessageBox.confirm(
      `确定要完成维保计划 "${plan.planCode}" 吗？`,
      '确认完成',
    );
    await equipmentApi.completePlan(plan.id);
    ElMessage.success('维保已完成');
    fetchData();
  } catch {
    // cancelled or error
  }
};

const handleCancel = async (plan: MaintenancePlan) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消维保计划 "${plan.planCode}" 吗？`,
      '确认取消',
      { type: 'warning' },
    );
    await equipmentApi.cancelPlan(plan.id);
    ElMessage.success('计划已取消');
    fetchData();
  } catch {
    // cancelled or error
  }
};

onMounted(() => {
  fetchData();
  fetchEquipmentOptions();
});
</script>

<style scoped>
.plan-list-page {
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

.card-count { font-size: 12px; color: var(--text-light); }

.plan-code {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: var(--text-light);
}

.date-overdue { color: #f56c6c; font-weight: 500; }
.overdue-tag { margin-left: 4px; }

.action-btns { display: flex; gap: 4px; align-items: center; }

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}
</style>
