<template>
  <div class="plan-calendar-page">
    <div class="page-header">
      <h1 class="page-title">维护计划日历</h1>
      <p class="page-subtitle">以日历形式查看设备维护计划安排</p>
    </div>

    <el-card class="calendar-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">{{ currentYear }}年{{ currentMonth }}月</span>
          <el-button @click="$router.push('/equipment/plans')">
            <el-icon><List /></el-icon>列表视图
          </el-button>
        </div>
      </template>

      <div class="calendar-legend">
        <div v-for="level in levelLegend" :key="level.key" class="legend-item">
          <span class="legend-dot" :style="{ backgroundColor: level.color }"></span>
          <span class="legend-text">{{ level.label }}</span>
        </div>
      </div>

      <el-calendar v-model="calendarDate" class="maintenance-calendar">
        <template #date-cell="{ data }">
          <div class="calendar-cell" @click="handleDateClick(data.day)">
            <span class="date-number" :class="{ today: isToday(data.day) }">
              {{ getDayNumber(data.day) }}
            </span>
            <div class="plan-dots" v-if="getPlansForDate(data.day).length > 0">
              <div v-for="(plan, idx) in getPlansForDate(data.day).slice(0, 3)" :key="idx" class="plan-dot-item">
                <span class="dot" :style="{ backgroundColor: getLevelColor(plan.maintenanceLevel) }"></span>
                <span class="dot-text">{{ getLevelText(plan.maintenanceLevel) }}</span>
              </div>
              <div v-if="getPlansForDate(data.day).length > 3" class="more-plans">
                +{{ getPlansForDate(data.day).length - 3 }} 更多
              </div>
            </div>
          </div>
        </template>
      </el-calendar>
    </el-card>

    <el-drawer v-model="drawerVisible" :title="`${selectedDate} 维护计划`" size="480px">
      <div v-if="selectedDatePlans.length === 0" class="empty-state">
        <el-empty description="当天没有维护计划" />
      </div>
      <div v-else class="plan-list">
        <div v-for="plan in selectedDatePlans" :key="plan.id" class="plan-item" @click="$router.push('/equipment/plans')">
          <div class="plan-item-header">
            <el-tag :color="getLevelColor(plan.maintenanceLevel)" effect="dark" size="small" style="border: none">
              {{ getLevelText(plan.maintenanceLevel) }}
            </el-tag>
            <el-tag :type="getPlanStatusType(plan.status)" effect="light" size="small">
              {{ getPlanStatusText(plan.status) }}
            </el-tag>
          </div>
          <div class="plan-item-body">
            <div class="plan-item-field">
              <span class="field-label">计划编号:</span>
              <span class="field-value code">{{ plan.planCode }}</span>
            </div>
            <div class="plan-item-field">
              <span class="field-label">设备名称:</span>
              <span class="field-value">{{ plan.equipment?.name || '-' }}</span>
            </div>
            <div class="plan-item-field">
              <span class="field-label">责任人:</span>
              <span class="field-value">{{ plan.responsiblePerson }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * Maintenance Plan Calendar View.
 * Uses Element Plus Calendar component to display maintenance plans.
 * All data fetched via REST API from backend (Prisma ORM).
 */
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { List } from '@element-plus/icons-vue';
import equipmentApi, {
  type MaintenancePlan,
  type CalendarData,
  getPlanStatusText,
  getPlanStatusType,
  getLevelText,
  getLevelColor,
} from '@/api/equipment';

const calendarDate = ref(new Date());
const calendarData = ref<CalendarData>({});
const drawerVisible = ref(false);
const selectedDate = ref('');
const selectedDatePlans = ref<MaintenancePlan[]>([]);

const currentYear = computed(() => calendarDate.value.getFullYear());
const currentMonth = computed(() => calendarDate.value.getMonth() + 1);

const levelLegend = [
  { key: 'daily', label: '日保养', color: '#67c23a' },
  { key: 'weekly', label: '周保养', color: '#409eff' },
  { key: 'monthly', label: '月保养', color: '#e6a23c' },
  { key: 'quarterly', label: '季保养', color: '#f56c6c' },
  { key: 'annual', label: '年保养', color: '#909399' },
];

const isToday = (dateStr: string) => dateStr === new Date().toISOString().split('T')[0];

const getDayNumber = (dateStr: string) => parseInt(dateStr.split('-')[2], 10);

const getPlansForDate = (dateStr: string): MaintenancePlan[] => calendarData.value[dateStr] || [];

const handleDateClick = (dateStr: string) => {
  const plans = getPlansForDate(dateStr);
  if (plans.length === 0) return;
  selectedDate.value = dateStr;
  selectedDatePlans.value = plans;
  drawerVisible.value = true;
};

const fetchCalendarData = async () => {
  try {
    const res = await equipmentApi.getPlanCalendar(currentYear.value, currentMonth.value) as unknown as CalendarData;
    calendarData.value = res || {};
  } catch {
    ElMessage.error('获取日历数据失败');
    calendarData.value = {};
  }
};

watch([currentYear, currentMonth], () => { fetchCalendarData(); });

onMounted(() => { fetchCalendarData(); });
</script>

<style scoped>
.plan-calendar-page {
  --primary: #1a1a2e; --accent: #c9a227; --text: #2c3e50; --text-light: #7f8c8d;
  font-family: 'Inter', sans-serif;
}
.page-header { margin-bottom: 24px; }
.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px; font-weight: 600; color: var(--primary); margin: 0 0 4px;
}
.page-subtitle { font-size: 14px; color: var(--text-light); margin: 0; }
.calendar-card {
  border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: none;
}
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px; font-weight: 600; color: var(--primary);
}
.calendar-legend {
  display: flex; gap: 20px; margin-bottom: 16px;
  padding: 12px 16px; background: #fafafa; border-radius: 8px;
}
.legend-item { display: flex; align-items: center; gap: 6px; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
.legend-text { font-size: 13px; color: var(--text-light); }

.maintenance-calendar :deep(.el-calendar-day) {
  height: auto; min-height: 100px; padding: 4px;
}
.calendar-cell { height: 100%; cursor: pointer; padding: 4px; }
.date-number { display: inline-block; font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
.date-number.today {
  background: var(--accent); color: white;
  width: 24px; height: 24px; line-height: 24px;
  text-align: center; border-radius: 50%;
}
.plan-dots { display: flex; flex-direction: column; gap: 2px; }
.plan-dot-item { display: flex; align-items: center; gap: 4px; }
.dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-text { font-size: 11px; color: var(--text-light); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.more-plans { font-size: 11px; color: var(--accent); cursor: pointer; }

.empty-state { padding: 40px 0; }
.plan-list { display: flex; flex-direction: column; gap: 16px; }
.plan-item {
  border: 1px solid #ebeef5; border-radius: 8px; padding: 16px;
  cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;
}
.plan-item:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(201,162,39,0.1); }
.plan-item-header { display: flex; gap: 8px; margin-bottom: 12px; }
.plan-item-body { display: flex; flex-direction: column; gap: 8px; }
.plan-item-field { display: flex; gap: 8px; font-size: 13px; }
.field-label { color: var(--text-light); min-width: 70px; }
.field-value { color: var(--text); }
.field-value.code { font-family: 'SF Mono', monospace; font-size: 12px; }
</style>
