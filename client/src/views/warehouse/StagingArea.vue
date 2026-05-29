<template>
  <div class="staging-area">
    <el-card>
      <template #header><span>配料区库存与盘点</span></template>
      <el-tabs v-model="activeTab">

        <!-- ===================== 库存 ===================== -->
        <el-tab-pane label="库存" name="stock">
          <el-table :data="stocks" v-loading="loading" stripe>
            <el-table-column prop="area.name" label="配料区" width="120" />
            <el-table-column label="物料" min-width="160">
              <template #default="{ row }">{{ row.batch?.material?.name || '-' }}</template>
            </el-table-column>
            <el-table-column label="批次号" width="150">
              <template #default="{ row }">{{ row.batch?.batchNumber || '-' }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="100" />
          </el-table>
        </el-tab-pane>

        <!-- ===================== 班后盘点（交出）shift_end ===================== -->
        <el-tab-pane label="班后盘点（交出）" name="shift_end">
          <el-form :model="shiftEndForm" label-width="100px" style="max-width: 500px">
            <el-form-item label="配料区">
              <el-select
                v-model="shiftEndForm.areaId"
                placeholder="选择配料区"
                style="width: 100%"
                @change="loadAreaBatches('shift_end')"
              >
                <el-option v-for="area in areas" :key="area.id" :label="area.name" :value="area.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="班次">
              <el-select v-model="shiftEndForm.shiftTypeId" placeholder="选择班次" style="width: 100%">
                <el-option v-for="st in shiftTypes" :key="st.id" :label="st.name" :value="st.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="工作日期">
              <el-date-picker v-model="shiftEndForm.workDate" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-form>

          <el-table
            v-if="batchRows.shift_end.length > 0"
            :data="batchRows.shift_end"
            border
            style="margin-top: 12px"
          >
            <el-table-column label="批次号" prop="batchNumber" min-width="140" />
            <el-table-column label="物料" prop="materialName" min-width="140" />
            <el-table-column label="账面数量" prop="stockQuantity" width="110" />
            <el-table-column label="实际数量" width="160">
              <template #default="{ row }">
                <el-input-number v-model="row.actualQuantity" :min="0" size="small" style="width: 130px" />
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.note" placeholder="选填" size="small" />
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else-if="shiftEndForm.areaId && batchRows.shift_end.length === 0 && !loadingBatches.shift_end" description="该配料区暂无库存批次" />

          <div style="margin-top: 12px">
            <el-button
              type="primary"
              :loading="submitting.shift_end"
              :disabled="!canSubmit('shift_end')"
              @click="submitAreaStocktake('shift_end')"
            >提交班后盘点</el-button>
          </div>
        </el-tab-pane>

        <!-- ===================== 班前盘点（接手确认）shift_start ===================== -->
        <el-tab-pane label="班前盘点（接手确认）" name="shift_start">
          <el-form :model="shiftStartForm" label-width="100px" style="max-width: 500px">
            <el-form-item label="配料区">
              <el-select
                v-model="shiftStartForm.areaId"
                placeholder="选择配料区"
                style="width: 100%"
                @change="loadAreaBatches('shift_start')"
              >
                <el-option v-for="area in areas" :key="area.id" :label="area.name" :value="area.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="班次">
              <el-select v-model="shiftStartForm.shiftTypeId" placeholder="选择班次" style="width: 100%">
                <el-option v-for="st in shiftTypes" :key="st.id" :label="st.name" :value="st.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="工作日期">
              <el-date-picker v-model="shiftStartForm.workDate" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-form>

          <el-table
            v-if="batchRows.shift_start.length > 0"
            :data="batchRows.shift_start"
            border
            style="margin-top: 12px"
          >
            <el-table-column label="批次号" prop="batchNumber" min-width="140" />
            <el-table-column label="物料" prop="materialName" min-width="140" />
            <el-table-column label="上班交出量" prop="stockQuantity" width="120" />
            <el-table-column label="实际数量" width="160">
              <template #default="{ row }">
                <el-input-number v-model="row.actualQuantity" :min="0" size="small" style="width: 130px" />
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.note" placeholder="选填" size="small" />
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else-if="shiftStartForm.areaId && batchRows.shift_start.length === 0 && !loadingBatches.shift_start" description="该配料区暂无库存批次" />

          <div style="margin-top: 12px">
            <el-button
              type="primary"
              :loading="submitting.shift_start"
              :disabled="!canSubmit('shift_start')"
              @click="submitAreaStocktake('shift_start')"
            >提交班前盘点</el-button>
          </div>
        </el-tab-pane>

      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { stagingAreaApi } from '@/api/warehouse';
import { workshopAreaApi, type WorkshopArea } from '@/api/workshop-area';
import { teamShiftApi } from '@/api/team-shift';

type StocktakeKind = 'shift_start' | 'shift_end';

interface AreaForm {
  areaId: string;
  shiftTypeId: string;
  workDate: string;
}

interface BatchRow {
  batchId: string;
  batchNumber: string;
  materialName: string;
  stockQuantity: number;
  actualQuantity: number;
  note: string;
}

const activeTab = ref('stock');
const loading = ref(false);
const stocks = ref<any[]>([]);

const areas = ref<WorkshopArea[]>([]);
const shiftTypes = ref<any[]>([]);

const shiftEndForm = ref<AreaForm>({ areaId: '', shiftTypeId: '', workDate: '' });
const shiftStartForm = ref<AreaForm>({ areaId: '', shiftTypeId: '', workDate: '' });

const batchRows = reactive<Record<StocktakeKind, BatchRow[]>>({ shift_end: [], shift_start: [] });
const loadingBatches = reactive<Record<StocktakeKind, boolean>>({ shift_end: false, shift_start: false });
const submitting = reactive<Record<StocktakeKind, boolean>>({ shift_end: false, shift_start: false });

const getForm = (kind: StocktakeKind): AreaForm =>
  kind === 'shift_end' ? shiftEndForm.value : shiftStartForm.value;

const canSubmit = (kind: StocktakeKind): boolean => {
  const form = getForm(kind);
  return !!(form.areaId && form.shiftTypeId && form.workDate && batchRows[kind].length > 0);
};

const loadAreaBatches = async (kind: StocktakeKind) => {
  const form = getForm(kind);
  batchRows[kind] = [];
  if (!form.areaId) return;
  loadingBatches[kind] = true;
  try {
    const res: any = await stagingAreaApi.getStock({ areaId: form.areaId });
    const rawList: any[] = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
      ? res.data
      : [];
    batchRows[kind] = rawList.map((s: any) => ({
      batchId: s.batchId,
      batchNumber: s.batch?.batchNumber || s.batchId,
      materialName: s.batch?.material?.name || '-',
      stockQuantity: s.quantity,
      actualQuantity: s.quantity,
      note: '',
    }));
  } catch {
    ElMessage.error('加载批次失败');
  } finally {
    loadingBatches[kind] = false;
  }
};

const fetchStocks = async () => {
  loading.value = true;
  try {
    const res: any = await stagingAreaApi.getStock();
    stocks.value = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
      ? res.data
      : [];
  } catch {
    ElMessage.error('加载库存失败');
  } finally {
    loading.value = false;
  }
};

const submitAreaStocktake = async (kind: StocktakeKind) => {
  const form = getForm(kind);
  if (!canSubmit(kind)) {
    ElMessage.error('请填写所有必填项并确保有批次数据');
    return;
  }
  submitting[kind] = true;
  try {
    await stagingAreaApi.confirmAreaStocktake({
      areaId: form.areaId,
      workDate: form.workDate,
      shiftTypeId: form.shiftTypeId,
      kind,
      items: batchRows[kind].map((r) => ({
        batchId: r.batchId,
        actualQuantity: r.actualQuantity,
        note: r.note || undefined,
      })),
    });
    ElMessage.success('盘点提交成功');
    batchRows[kind] = [];
  } catch {
    ElMessage.error('盘点提交失败');
  } finally {
    submitting[kind] = false;
  }
};

onMounted(async () => {
  await fetchStocks();
  try {
    const [areasRes, shiftRes]: [any, any] = await Promise.all([
      workshopAreaApi.getList(),
      teamShiftApi.listShiftTypes(),
    ]);
    areas.value = Array.isArray(areasRes.data) ? areasRes.data : Array.isArray(areasRes) ? areasRes : [];
    shiftTypes.value = Array.isArray(shiftRes.data) ? shiftRes.data : Array.isArray(shiftRes) ? shiftRes : [];
  } catch {
    ElMessage.error('加载基础数据失败');
  }
});
</script>
