<template>
  <div class="equipment-detail-page" v-loading="loading">
    <div class="page-header">
      <el-button @click="$router.back()" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>返回
      </el-button>
      <h1 class="page-title">{{ equipment?.name || '设备详情' }}</h1>
      <el-tag :type="getEquipmentStatusType(equipment?.status || '')" effect="light" size="large">
        {{ getEquipmentStatusText(equipment?.status || '') }}
      </el-tag>
    </div>

    <template v-if="equipment">
      <!-- Basic Info Card -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">基本信息</span>
            <el-button type="primary" link @click="$router.push(`/equipment`)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
          </div>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="设备编号">
            <span class="code-text">{{ equipment.code }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="设备名称">{{ equipment.name }}</el-descriptions-item>
          <el-descriptions-item label="设备型号">{{ equipment.model }}</el-descriptions-item>
          <el-descriptions-item label="设备分类">
            <el-tag size="small" effect="plain">{{ getCategoryText(equipment.category) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="设备位置">{{ equipment.location }}</el-descriptions-item>
          <el-descriptions-item label="责任人">{{ equipment.responsiblePerson }}</el-descriptions-item>
          <el-descriptions-item label="购买日期">
            {{ equipment.purchaseDate ? formatDate(equipment.purchaseDate) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="启用日期">
            {{ equipment.activationDate ? formatDate(equipment.activationDate) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="保修到期">
            {{ equipment.warrantyExpiry ? formatDate(equipment.warrantyExpiry) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="3">
            {{ equipment.description || '无' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Maintenance Config -->
      <el-card class="info-card">
        <template #header>
          <span class="card-title">保养配置</span>
        </template>
        <div class="maintenance-levels">
          <div
            v-for="levelKey in maintenanceLevels"
            :key="levelKey.key"
            class="level-item"
            :class="{ disabled: !equipment.maintenanceConfig?.[levelKey.key]?.enabled }"
          >
            <div class="level-dot" :style="{ backgroundColor: levelKey.color }"></div>
            <span class="level-name">{{ levelKey.label }}</span>
            <template v-if="equipment.maintenanceConfig?.[levelKey.key]?.enabled">
              <el-tag size="small" type="success" effect="plain">已启用</el-tag>
              <span class="level-detail">
                周期: {{ equipment.maintenanceConfig[levelKey.key].cycle }}天
                | 提前提醒: {{ equipment.maintenanceConfig[levelKey.key].reminderDays }}天
              </span>
            </template>
            <el-tag v-else size="small" type="info" effect="plain">未启用</el-tag>
          </div>
        </div>
      </el-card>

      <!-- Tabs: Plans / Records / Faults -->
      <el-card class="info-card">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="维护计划" name="plans">
            <el-table :data="plans" v-loading="plansLoading" stripe>
              <el-table-column prop="planCode" label="计划编号" width="180" />
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
                <template #default="{ row }">{{ formatDate(row.plannedDate) }}</template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getPlanStatusType(row.status)" effect="light" size="small">
                    {{ getPlanStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="responsiblePerson" label="责任人" width="100" />
              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-button link type="primary" @click="$router.push(`/equipment/plans`)">
                    查看
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="维保记录" name="records">
            <el-table :data="records" v-loading="recordsLoading" stripe>
              <el-table-column prop="recordCode" label="记录编号" width="180" />
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
              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-button link type="primary" @click="$router.push(`/equipment/records/${row.id}`)">
                    查看
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="报修记录" name="faults">
            <el-table :data="faults" v-loading="faultsLoading" stripe>
              <el-table-column prop="faultCode" label="报修单号" width="180" />
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
              <el-table-column prop="reportTime" label="报修时间" width="160">
                <template #default="{ row }">{{ formatDateTime(row.reportTime) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-button link type="primary" @click="$router.push(`/equipment/faults/${row.id}`)">
                    查看
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Edit } from '@element-plus/icons-vue';
import equipmentApi, {
  type Equipment,
  type MaintenancePlan,
  type MaintenanceRecord,
  type EquipmentFault,
  type MaintenanceConfig,
  getEquipmentStatusText,
  getEquipmentStatusType,
  getPlanStatusText,
  getPlanStatusType,
  getRecordStatusText,
  getRecordStatusType,
  getFaultStatusText,
  getFaultStatusType,
  getUrgencyText,
  getUrgencyType,
  getLevelText,
  getLevelColor,
} from '@/api/equipment';

const route = useRoute();
const loading = ref(false);
const equipment = ref<Equipment | null>(null);
const activeTab = ref('plans');

const plans = ref<MaintenancePlan[]>([]);
const plansLoading = ref(false);
const records = ref<MaintenanceRecord[]>([]);
const recordsLoading = ref(false);
const faults = ref<EquipmentFault[]>([]);
const faultsLoading = ref(false);

const maintenanceLevels = [
  { key: 'daily' as keyof MaintenanceConfig, label: '日保养', color: '#67c23a' },
  { key: 'weekly' as keyof MaintenanceConfig, label: '周保养', color: '#409eff' },
  { key: 'monthly' as keyof MaintenanceConfig, label: '月保养', color: '#e6a23c' },
  { key: 'quarterly' as keyof MaintenanceConfig, label: '季保养', color: '#f56c6c' },
  { key: 'annual' as keyof MaintenanceConfig, label: '年保养', color: '#909399' },
];

const CATEGORY_MAP: Record<string, string> = {
  production: '生产设备',
  testing: '检测设备',
  auxiliary: '辅助设备',
  utility: '公用设备',
};

const getCategoryText = (category: string) => CATEGORY_MAP[category] ?? category;
const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');
const formatDateTime = (date: string) => new Date(date).toLocaleString('zh-CN');

const fetchEquipment = async () => {
  const id = route.params.id as string;
  if (!id) return;
  loading.value = true;
  try {
    equipment.value = await equipmentApi.getEquipmentById(id) as unknown as Equipment;
  } catch {
    ElMessage.error('获取设备详情失败');
  } finally {
    loading.value = false;
  }
};

const fetchPlans = async () => {
  const id = route.params.id as string;
  if (!id) return;
  plansLoading.value = true;
  try {
    const res = await equipmentApi.getPlanList({ equipmentId: id, limit: 50 }) as any;
    plans.value = res.list || [];
  } catch {
    // silent
  } finally {
    plansLoading.value = false;
  }
};

const fetchRecords = async () => {
  const id = route.params.id as string;
  if (!id) return;
  recordsLoading.value = true;
  try {
    const res = await equipmentApi.getRecordList({ equipmentId: id, limit: 50 }) as any;
    records.value = res.list || [];
  } catch {
    // silent
  } finally {
    recordsLoading.value = false;
  }
};

const fetchFaults = async () => {
  const id = route.params.id as string;
  if (!id) return;
  faultsLoading.value = true;
  try {
    const res = await equipmentApi.getFaultList({ equipmentId: id, limit: 50 }) as any;
    faults.value = res.list || [];
  } catch {
    // silent
  } finally {
    faultsLoading.value = false;
  }
};

watch(activeTab, (tab) => {
  if (tab === 'plans' && plans.value.length === 0) fetchPlans();
  if (tab === 'records' && records.value.length === 0) fetchRecords();
  if (tab === 'faults' && faults.value.length === 0) fetchFaults();
});

onMounted(() => {
  fetchEquipment();
  fetchPlans();
});
</script>

<style scoped>
.equipment-detail-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  font-family: 'Inter', sans-serif;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn {
  border-radius: 8px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin: 0;
}

.info-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.code-text {
  font-family: 'SF Mono', monospace;
  color: var(--text-light);
}

.maintenance-levels {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.level-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 8px;
  background: #fafafa;
  transition: background 0.2s;
}

.level-item.disabled {
  opacity: 0.5;
}

.level-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.level-name {
  font-weight: 500;
  min-width: 60px;
}

.level-detail {
  font-size: 13px;
  color: var(--text-light);
  margin-left: auto;
}
</style>
