<template>
  <div class="traceability-query">
    <div class="page-header">
      <h1 class="page-title">追溯查询</h1>
      <p class="page-subtitle">正向追溯、反向追溯与物料平衡查询</p>
    </div>

    <el-card class="query-card">
      <el-tabs v-model="activeTab">
        <!-- 正向追溯 -->
        <el-tab-pane label="正向追溯（原料→成品）" name="forward">
          <el-row :gutter="12" class="search-bar">
            <el-col :span="18">
              <el-input
                v-model="forwardId"
                placeholder="输入原料批次 ID"
                clearable
                @keyup.enter="doForwardTrace"
              />
            </el-col>
            <el-col :span="6">
              <el-button
                type="primary"
                :loading="forwardLoading"
                @click="doForwardTrace"
                class="query-btn"
              >
                查询
              </el-button>
            </el-col>
          </el-row>

          <div v-if="forwardResult" class="result-area">
            <el-descriptions title="原料批次信息" :column="2" border class="desc-block">
              <el-descriptions-item label="批次 ID">
                {{ forwardResult.material_batch?.id ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="批次号">
                {{ forwardResult.material_batch?.batch_no ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="物料名称">
                {{ forwardResult.material_batch?.material?.name ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="物料编号">
                {{ forwardResult.material_batch?.material?.code ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="入库数量">
                {{ forwardResult.material_batch?.quantity ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="供应商">
                {{ forwardResult.material_batch?.supplier?.name ?? '-' }}
              </el-descriptions-item>
            </el-descriptions>

            <template v-if="forwardResult.production_batches?.length">
              <div class="section-title">关联生产批次</div>
              <el-table
                :data="forwardResult.production_batches"
                border
                stripe
                class="result-table"
              >
                <el-table-column prop="id" label="批次 ID" width="200" />
                <el-table-column prop="batch_no" label="批次号" />
                <el-table-column prop="product_name" label="产品名称" />
                <el-table-column prop="quantity" label="产量" width="100" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag size="small" effect="light">{{ row.status }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </template>

            <el-empty v-else description="该原料批次暂无关联生产批次" class="empty-block" />
          </div>

          <el-empty v-else-if="forwardQueried" description="未找到相关追溯数据" class="empty-block" />
        </el-tab-pane>

        <!-- 反向追溯 -->
        <el-tab-pane label="反向追溯（成品→原料）" name="backward">
          <el-row :gutter="12" class="search-bar">
            <el-col :span="18">
              <el-input
                v-model="backwardId"
                placeholder="输入生产批次 ID"
                clearable
                @keyup.enter="doBackwardTrace"
              />
            </el-col>
            <el-col :span="6">
              <el-button
                type="primary"
                :loading="backwardLoading"
                @click="doBackwardTrace"
                class="query-btn"
              >
                查询
              </el-button>
            </el-col>
          </el-row>

          <div v-if="backwardResult" class="result-area">
            <el-descriptions title="生产批次信息" :column="2" border class="desc-block">
              <el-descriptions-item label="批次 ID">
                {{ backwardResult.production_batch?.id ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="批次号">
                {{ backwardResult.production_batch?.batch_no ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="产品名称">
                {{ backwardResult.production_batch?.product_name ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="产量">
                {{ backwardResult.production_batch?.quantity ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="生产日期">
                {{ backwardResult.production_batch?.production_date ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                {{ backwardResult.production_batch?.status ?? '-' }}
              </el-descriptions-item>
            </el-descriptions>

            <template v-if="backwardResult.material_batches?.length">
              <div class="section-title">使用的原料批次</div>
              <el-table
                :data="backwardResult.material_batches"
                border
                stripe
                class="result-table"
              >
                <el-table-column prop="id" label="批次 ID" width="200" />
                <el-table-column prop="batch_no" label="批次号" />
                <el-table-column label="物料名称">
                  <template #default="{ row }">
                    {{ row.material?.name ?? '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="quantity" label="使用量" width="100" />
                <el-table-column label="供应商">
                  <template #default="{ row }">
                    {{ row.supplier?.name ?? '-' }}
                  </template>
                </el-table-column>
              </el-table>
            </template>

            <el-empty v-else description="该生产批次暂无关联原料批次" class="empty-block" />
          </div>

          <el-empty v-else-if="backwardQueried" description="未找到相关追溯数据" class="empty-block" />
        </el-tab-pane>

        <!-- 物料平衡 -->
        <el-tab-pane label="物料平衡" name="balance">
          <el-row :gutter="12" class="search-bar">
            <el-col :span="18">
              <el-input
                v-model="balanceId"
                placeholder="输入生产批次 ID"
                clearable
                @keyup.enter="doMaterialBalance"
              />
            </el-col>
            <el-col :span="6">
              <el-button
                type="primary"
                :loading="balanceLoading"
                @click="doMaterialBalance"
                class="query-btn"
              >
                查询
              </el-button>
            </el-col>
          </el-row>

          <div v-if="balanceResult" class="result-area">
            <el-descriptions title="投入产出概览" :column="3" border class="desc-block">
              <el-descriptions-item label="生产批次">
                {{ balanceResult.batch_no ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="总投入量">
                {{ balanceResult.total_input ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="总产出量">
                {{ balanceResult.total_output ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="损耗量">
                {{ balanceResult.loss ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="损耗率">
                <el-tag
                  :type="getLossRateType(balanceResult.loss_rate)"
                  effect="light"
                  size="small"
                >
                  {{ balanceResult.loss_rate != null ? `${balanceResult.loss_rate}%` : '-' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="平衡状态">
                <el-tag
                  :type="balanceResult.balanced ? 'success' : 'danger'"
                  effect="light"
                  size="small"
                >
                  {{ balanceResult.balanced ? '平衡' : '不平衡' }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>

            <template v-if="balanceResult.details?.length">
              <div class="section-title">明细数据</div>
              <el-table
                :data="balanceResult.details"
                border
                stripe
                class="result-table"
              >
                <el-table-column prop="material_name" label="物料名称" />
                <el-table-column prop="input_quantity" label="投入量" width="120" />
                <el-table-column prop="output_quantity" label="产出量" width="120" />
                <el-table-column prop="loss_quantity" label="损耗量" width="120" />
                <el-table-column prop="unit" label="单位" width="80" />
                <el-table-column label="损耗率" width="100">
                  <template #default="{ row }">
                    {{ row.loss_rate != null ? `${row.loss_rate}%` : '-' }}
                  </template>
                </el-table-column>
              </el-table>
            </template>
          </div>

          <el-empty v-else-if="balanceQueried" description="未找到相关物料平衡数据" class="empty-block" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { traceabilityApi } from '@/api/traceability';

const activeTab = ref('forward');

// ---- Forward trace state ----
const forwardId = ref('');
const forwardLoading = ref(false);
const forwardResult = ref<Record<string, any> | null>(null);
const forwardQueried = ref(false);

// ---- Backward trace state ----
const backwardId = ref('');
const backwardLoading = ref(false);
const backwardResult = ref<Record<string, any> | null>(null);
const backwardQueried = ref(false);

// ---- Material balance state ----
const balanceId = ref('');
const balanceLoading = ref(false);
const balanceResult = ref<Record<string, any> | null>(null);
const balanceQueried = ref(false);

const getLossRateType = (rate: number | null | undefined): string => {
  if (rate == null) return 'info';
  if (rate <= 3) return 'success';
  if (rate <= 8) return 'warning';
  return 'danger';
};

const doForwardTrace = async () => {
  const id = forwardId.value.trim();
  if (!id) {
    ElMessage.warning('请输入原料批次 ID');
    return;
  }
  forwardLoading.value = true;
  forwardResult.value = null;
  forwardQueried.value = false;
  try {
    const data = await traceabilityApi.forwardTrace(id) as Record<string, any>;
    forwardResult.value = data ?? null;
    forwardQueried.value = true;
  } catch {
    ElMessage.error('正向追溯查询失败，请检查批次 ID 是否正确');
    forwardQueried.value = true;
  } finally {
    forwardLoading.value = false;
  }
};

const doBackwardTrace = async () => {
  const id = backwardId.value.trim();
  if (!id) {
    ElMessage.warning('请输入生产批次 ID');
    return;
  }
  backwardLoading.value = true;
  backwardResult.value = null;
  backwardQueried.value = false;
  try {
    const data = await traceabilityApi.backwardTrace(id) as Record<string, any>;
    backwardResult.value = data ?? null;
    backwardQueried.value = true;
  } catch {
    ElMessage.error('反向追溯查询失败，请检查批次 ID 是否正确');
    backwardQueried.value = true;
  } finally {
    backwardLoading.value = false;
  }
};

const doMaterialBalance = async () => {
  const id = balanceId.value.trim();
  if (!id) {
    ElMessage.warning('请输入生产批次 ID');
    return;
  }
  balanceLoading.value = true;
  balanceResult.value = null;
  balanceQueried.value = false;
  try {
    const data = await traceabilityApi.materialBalance(id) as Record<string, any>;
    balanceResult.value = data ?? null;
    balanceQueried.value = true;
  } catch {
    ElMessage.error('物料平衡查询失败，请检查批次 ID 是否正确');
    balanceQueried.value = true;
  } finally {
    balanceLoading.value = false;
  }
};
</script>

<style scoped>
.traceability-query {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text-light: #7f8c8d;
  font-family: 'Inter', sans-serif;
}

.page-header {
  margin-bottom: 24px;
}

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

.query-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
}

.search-bar {
  margin-bottom: 20px;
}

.query-btn {
  width: 100%;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, #d4af37 100%);
  border: none;
  font-weight: 500;
}

.result-area {
  margin-top: 8px;
}

.desc-block {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--accent);
}

.result-table {
  --el-table-border-color: #f0f0f0;
  --el-table-row-hover-bg-color: #fafafa;
}

.result-table :deep(th) {
  background: #fafafa;
  font-weight: 500;
  color: var(--text-light);
  font-size: 12px;
}

.empty-block {
  margin: 40px 0;
}
</style>
