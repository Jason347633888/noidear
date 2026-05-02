<template>
  <div class="shift-dashboard" style="padding: 20px">
    <div
      style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      "
    >
      <h2 style="margin: 0">班次看板 — {{ today }}</h2>
      <el-button type="primary" @click="openShiftDialog = true">开班</el-button>
    </div>

    <el-empty v-if="shifts.length === 0" description="今日暂无班次，点击开班" />

    <el-card v-for="shift in shifts" :key="shift.id" style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>
            <el-tag :type="shift.status === 'open' ? 'success' : 'info'">
              {{ shift.status === 'open' ? '进行中' : '已关班' }}
            </el-tag>
            &nbsp;{{ displayShiftType(shift) }}{{ displayTeam(shift) }} | {{ formatDate(shift.shift_date) }}
          </span>
          <div>
            <el-button
              v-if="shift.status === 'open'"
              size="small"
              @click="openRunFor(shift)"
            >
              + 开产
            </el-button>
            <el-button
              v-if="shift.status === 'open'"
              size="small"
              type="danger"
              plain
              style="margin-left: 8px"
              @click="closeShift(shift.id)"
            >
              关班
            </el-button>
          </div>
        </div>
      </template>

      <el-empty
        v-if="shift.production_runs.length === 0"
        description="暂无生产段"
        :image-size="60"
      />

      <el-table v-else :data="shift.production_runs" size="small">
        <el-table-column label="产线" prop="production_line" width="80" />
        <el-table-column label="产品" prop="product.name" />
        <el-table-column label="开始时间" width="140">
          <template #default="{ row }">
            {{ formatTime(row.started_at) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '生产中' : '已关产' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'active'"
              size="small"
              type="warning"
              plain
              @click="closeRun(row.id)"
            >
              关产
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <OpenShiftDialog v-model="openShiftDialog" @created="loadShifts" />
    <OpenRunDialog
      v-if="selectedShiftId"
      v-model="openRunDialog"
      :shift-instance-id="selectedShiftId"
      @created="loadShifts"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { ShiftInstanceApi, type ShiftInstance } from '@/api/shift-instance';
import { ProductionRunApi } from '@/api/production-run';
import OpenShiftDialog from './components/OpenShiftDialog.vue';
import OpenRunDialog from './components/OpenRunDialog.vue';

const shifts = ref<ShiftInstance[]>([]);
const openShiftDialog = ref(false);
const openRunDialog = ref(false);
const selectedShiftId = ref('');
const today = new Date().toISOString().slice(0, 10);

onMounted(loadShifts);

async function loadShifts() {
  shifts.value = (await ShiftInstanceApi.list(today)) as unknown as ShiftInstance[];
}

function formatDate(d: string): string {
  return d ? d.slice(0, 10) : '';
}

function formatTime(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function displayShiftType(shift: ShiftInstance): string {
  return shift.shift_type_ref?.name ?? shift.shift_type;
}

function displayTeam(shift: ShiftInstance): string {
  return shift.team?.name ? ` | ${shift.team.name}` : '';
}

function openRunFor(shift: ShiftInstance) {
  selectedShiftId.value = shift.id;
  openRunDialog.value = true;
}

async function closeShift(id: string) {
  await ElMessageBox.confirm('确认关班？', '提示', { type: 'warning' });
  await ShiftInstanceApi.close(id);
  await loadShifts();
}

async function closeRun(id: string) {
  await ElMessageBox.confirm('确认关产？', '提示', { type: 'warning' });
  await ProductionRunApi.close(id, {});
  await loadShifts();
}
</script>
