<template>
  <div class="workshop-staging">
    <div class="page-header">
      <h2>车间暂存区</h2>
      <p class="sub">筛粉间 · 称油间 · 小料房 物料流转管理</p>
    </div>

    <el-tabs v-model="activeZone" @tab-change="loadStock" class="zone-tabs">
      <el-tab-pane v-for="zone in ZONES" :key="zone" :label="zone" :name="zone" />
    </el-tabs>

    <div class="toolbar">
      <el-button @click="loadStock">刷新</el-button>
    </div>

    <el-table :data="stockList" v-loading="loading" border stripe>
      <el-table-column label="物料名称" min-width="140">
        <template #default="{ row }">{{ row.batch?.material?.name ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="批次号" min-width="130">
        <template #default="{ row }">{{ row.batch?.batchNumber ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="当前数量" width="110" align="right">
        <template #default="{ row }">
          {{ row.quantity }} {{ row.batch?.material?.unit ?? '' }}
        </template>
      </el-table-column>
      <el-table-column label="所在区域" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small">{{ row.location }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="入区时间" width="160">
        <template #default="{ row }">{{ fmtDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openTransferDialog(row)" :disabled="row.quantity <= 0">迁移</el-button>
          <el-button size="small" type="danger" @click="openDispenseDialog(row)" :disabled="row.quantity <= 0">投料</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="limit"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @change="loadStock"
      />
    </div>

    <!-- 迁移对话框 -->
    <el-dialog v-model="transferVisible" title="区域迁移" width="420px">
      <el-form :model="transferForm" label-width="90px">
        <el-form-item label="物料">{{ transferTarget?.batch?.material?.name }}</el-form-item>
        <el-form-item label="批次号">{{ transferTarget?.batch?.batchNumber }}</el-form-item>
        <el-form-item label="当前库存">{{ transferTarget?.quantity }} {{ transferTarget?.batch?.material?.unit }}</el-form-item>
        <el-form-item label="迁移至" required>
          <el-select v-model="transferForm.toZone" style="width:100%">
            <el-option v-for="z in otherZones" :key="z" :label="z" :value="z" />
          </el-select>
        </el-form-item>
        <el-form-item label="迁移数量" required>
          <el-input-number v-model="transferForm.quantity" :min="0.01" :max="transferTarget?.quantity" :precision="2" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="transferForm.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitTransfer">确认迁移</el-button>
      </template>
    </el-dialog>

    <!-- 投料对话框 -->
    <el-dialog v-model="dispenseVisible" title="投料登记" width="400px">
      <el-form :model="dispenseForm" label-width="90px">
        <el-form-item label="物料">{{ dispenseTarget?.batch?.material?.name }}</el-form-item>
        <el-form-item label="批次号">{{ dispenseTarget?.batch?.batchNumber }}</el-form-item>
        <el-form-item label="当前库存">{{ dispenseTarget?.quantity }} {{ dispenseTarget?.batch?.material?.unit }}</el-form-item>
        <el-form-item label="投料数量" required>
          <el-input-number v-model="dispenseForm.quantity" :min="0.01" :max="dispenseTarget?.quantity" :precision="2" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispenseVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitDispense">确认投料</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';

const ZONES = ['筛粉间', '称油间', '小料房'] as const;

const activeZone = ref<string>('筛粉间');
const loading = ref(false);
const stockList = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);

const transferVisible = ref(false);
const dispenseVisible = ref(false);
const submitting = ref(false);

const transferTarget = ref<any>(null);
const transferForm = ref({ toZone: '', quantity: 1, note: '' });

const dispenseTarget = ref<any>(null);
const dispenseForm = ref({ quantity: 1 });

const otherZones = computed(() =>
  ZONES.filter((z) => z !== transferTarget.value?.location),
);

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-';

async function loadStock() {
  loading.value = true;
  try {
    const res = await request.get<any>('/warehouse/staging-area/stock', {
      params: { location: activeZone.value, page: page.value, limit: limit.value },
    });
    stockList.value = res.data ?? [];
    total.value = res.total ?? 0;
  } catch {
    ElMessage.error('加载库存失败');
  } finally {
    loading.value = false;
  }
}

function openTransferDialog(row: any) {
  transferTarget.value = row;
  transferForm.value = { toZone: '', quantity: row.quantity, note: '' };
  transferVisible.value = true;
}

async function submitTransfer() {
  if (!transferForm.value.toZone) return ElMessage.warning('请选择目标区域');
  submitting.value = true;
  try {
    await request.post('/warehouse/staging-area/transfer', {
      stockId: transferTarget.value.id,
      toZone: transferForm.value.toZone,
      quantity: transferForm.value.quantity,
      note: transferForm.value.note,
    });
    ElMessage.success('迁移成功');
    transferVisible.value = false;
    loadStock();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '迁移失败');
  } finally {
    submitting.value = false;
  }
}

function openDispenseDialog(row: any) {
  dispenseTarget.value = row;
  dispenseForm.value = { quantity: row.quantity };
  dispenseVisible.value = true;
}

async function submitDispense() {
  submitting.value = true;
  try {
    await request.post(`/warehouse/staging-area/${dispenseTarget.value.id}/dispense`, {
      quantity: dispenseForm.value.quantity,
    });
    ElMessage.success('投料成功');
    dispenseVisible.value = false;
    loadStock();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '投料失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(loadStock);
</script>

<style scoped>
.workshop-staging { padding: 24px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px; font-size: 22px; color: #1a1a2e; }
.sub { margin: 0; font-size: 13px; color: #7f8c8d; }
.zone-tabs { margin-bottom: 16px; }
.toolbar { margin-bottom: 16px; display: flex; gap: 8px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
