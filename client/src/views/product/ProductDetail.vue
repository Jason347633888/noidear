<template>
  <div class="product-detail-page" v-loading="loading">
    <div class="page-header">
      <el-button link @click="goBack">← 返回产品列表</el-button>
      <h1 class="page-title">{{ workbench?.product?.name || '产品详情' }}</h1>
    </div>

    <template v-if="workbench">
      <!-- 产品基础信息 -->
      <section class="section-card">
        <div class="section-header">
          <h2>产品基础信息</h2>
          <el-button type="primary" link @click="openStatusDialog">编辑产品状态</el-button>
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="产品编号">{{ workbench.product.code }}</el-descriptions-item>
          <el-descriptions-item label="产品名称">{{ workbench.product.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ getProductStatusText(workbench.product.status) }}
          </el-descriptions-item>
          <el-descriptions-item label="来源">{{ sourceText(workbench.product.source) }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <!-- 执行失败 -->
      <section v-if="workbench.failureTodos?.length" class="section-card">
        <h2>执行失败</h2>
        <el-alert type="error" :closable="false" show-icon>
          审批通过但自动落库未成功。请检查错误原因后重试。
        </el-alert>
        <el-table :data="workbench.failureTodos" stripe style="margin-top: 12px">
          <el-table-column prop="createdAt" label="失败时间" min-width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="description" label="错误消息" min-width="280" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                data-test="retry-failure"
                @click="handleRetry(row.relatedId)"
              >
                重试
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <!-- 当前正式数据 -->
      <section class="section-card">
        <h2>当前正式数据</h2>
        <p class="muted">以下为生产正式依据数据，由审批通过后自动同步。</p>

        <div class="subsection">
          <h3>当前配方</h3>
          <div v-if="!workbench.currentRecipe" class="empty-hint">暂无在用配方</div>
          <template v-else>
            <p class="muted">
              版本 v{{ recipeVersion(workbench.currentRecipe) }}
              <span v-if="recipeApprovedAt(workbench.currentRecipe)">
                · 生效时间：{{ formatDate(recipeApprovedAt(workbench.currentRecipe)) }}
              </span>
            </p>
            <el-table
              v-if="recipeLines(workbench.currentRecipe).length"
              :data="recipeLines(workbench.currentRecipe)"
              size="small"
              stripe
            >
              <el-table-column prop="material_id" label="物料 ID" min-width="160" />
              <el-table-column prop="qty_per_batch" label="单批用量" width="120" />
              <el-table-column prop="unit" label="单位" width="80" />
              <el-table-column prop="area_name_snapshot" label="配料区" min-width="120" />
              <el-table-column prop="is_critical" label="关键" width="80">
                <template #default="{ row }">{{ row.is_critical ? '是' : '否' }}</template>
              </el-table-column>
            </el-table>
            <div v-else class="empty-hint">该配方暂无明细</div>
          </template>
        </div>

        <div class="subsection">
          <h3>当前工艺步骤</h3>
          <div v-if="!workbench.processSteps.length" class="empty-hint">暂无工艺步骤</div>
          <el-table v-else :data="workbench.processSteps" size="small" stripe>
            <el-table-column prop="step_no" label="序号" width="80" />
            <el-table-column prop="step_name" label="步骤名称" min-width="160" />
            <el-table-column prop="is_ccp" label="CCP" width="80">
              <template #default="{ row }">{{ row.is_ccp ? '是' : '否' }}</template>
            </el-table-column>
            <el-table-column prop="critical_limit" label="关键限值" min-width="160" />
            <el-table-column prop="responsible_person" label="负责人" min-width="120" />
          </el-table>
        </div>

        <div class="subsection">
          <h3>CCP 控制点</h3>
          <div v-if="!workbench.ccpPoints?.length" class="empty-hint">暂无 CCP 控制点</div>
          <el-table v-else :data="workbench.ccpPoints" stripe>
            <el-table-column prop="ccp_no" label="CCP 编号" width="120" />
            <el-table-column prop="hazard_type" label="危害类型" width="120" />
            <el-table-column prop="control_measure" label="控制措施" />
            <el-table-column prop="critical_limit" label="临界值" width="160" />
          </el-table>
        </div>
      </section>

      <!-- 进行中变更方案 -->
      <section v-if="workbench.activePlan" class="section-card">
        <h2>进行中的产品工艺变更方案</h2>
        <el-alert
          title="未生效，不能作为生产依据"
          type="warning"
          show-icon
          :closable="false"
        />
        <el-descriptions class="plan-meta" :column="2" border>
          <el-descriptions-item label="状态">
            {{ planStatusText(workbench.activePlan.status) }}
          </el-descriptions-item>
          <el-descriptions-item label="变更范围">
            {{ planScopes(workbench.activePlan).join('、') || '—' }}
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <!-- 历史版本 -->
      <section class="section-card">
        <h2>历史版本</h2>

        <div class="subsection">
          <h3>历史配方版本</h3>
          <div v-if="!workbench.archivedRecipes.length" class="empty-hint">暂无归档配方</div>
          <el-table v-else :data="workbench.archivedRecipes" size="small" stripe>
            <el-table-column label="版本" width="100">
              <template #default="{ row }">v{{ row.version }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column prop="changeEventId" label="关联变更事件" min-width="200" />
            <el-table-column label="归档时间" min-width="180">
              <template #default="{ row }">{{ formatDate(row.updated_at) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div class="subsection">
          <h3>停用工艺步骤</h3>
          <div v-if="!workbench.archivedProcessSteps.length" class="empty-hint">
            暂无停用工艺步骤
          </div>
          <el-table v-else :data="workbench.archivedProcessSteps" size="small" stripe>
            <el-table-column prop="step_no" label="序号" width="80" />
            <el-table-column prop="step_name" label="步骤名称" min-width="160" />
            <el-table-column label="停用时间" min-width="180">
              <template #default="{ row }">{{ formatDate(row.deleted_at) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div class="subsection" v-if="workbench.archivedCcpPoints?.length">
          <h3>已归档 CCP 控制点</h3>
          <el-table :data="workbench.archivedCcpPoints" stripe>
            <el-table-column prop="ccp_no" label="CCP 编号" width="120" />
            <el-table-column prop="hazard_type" label="危害类型" width="120" />
            <el-table-column prop="deleted_at" label="归档时间" width="180">
              <template #default="{ row }">{{ formatDate(row.deleted_at) }}</template>
            </el-table-column>
            <el-table-column prop="control_measure" label="控制措施" />
          </el-table>
        </div>
      </section>

      <!-- 关联变更事件 -->
      <section class="section-card">
        <h2>关联变更事件</h2>
        <div v-if="!workbench.relatedChanges.length" class="empty-hint">暂无关联变更事件</div>
        <el-table v-else :data="workbench.relatedChanges" size="small" stripe>
          <el-table-column prop="change_no" label="变更编号" min-width="160" />
          <el-table-column prop="change_type" label="类型" width="120" />
          <el-table-column prop="status" label="状态" width="120" />
          <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
          <el-table-column label="创建时间" min-width="180">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </section>
    </template>

    <!-- 状态编辑对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="编辑产品状态"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form label-width="100px">
        <el-form-item label="产品名称">
          <el-input v-model="statusForm.name" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="statusForm.status" style="width: 100%">
            <el-option label="在产" value="active" />
            <el-option label="停产" value="inactive" />
            <el-option label="淘汰" value="discontinued" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleStatusSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  productApi,
  getProductStatusText,
  type ProductWorkbench,
  type RecipeSummary,
  type RecipeLineSummary,
  type ProductProcessChangePlanSummary,
} from '@/api/product';
import { productProcessChangeApi } from '@/api/product-process-change';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const workbench = ref<ProductWorkbench | null>(null);

const statusDialogVisible = ref(false);
const submitting = ref(false);
const statusForm = reactive({
  name: '',
  status: 'active',
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function recipeVersion(recipe: RecipeSummary | null): number | string {
  if (!recipe) return '—';
  return recipe.version ?? '—';
}

function recipeApprovedAt(recipe: RecipeSummary | null): string | null {
  if (!recipe) return null;
  return typeof recipe.approved_at === 'string' ? recipe.approved_at : null;
}

function recipeLines(recipe: RecipeSummary | null): RecipeLineSummary[] {
  if (!recipe) return [];
  return Array.isArray(recipe.lines) ? recipe.lines : [];
}

function planScopes(plan: ProductProcessChangePlanSummary | null): string[] {
  if (!plan) return [];
  return Array.isArray(plan.scopes) ? plan.scopes : [];
}

function planStatusText(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    pending_approval: '审批中',
    approved_executing: '审批通过待执行',
    execution_failed: '执行失败',
    executed: '已执行',
  };
  return map[status] ?? status;
}

function sourceText(source?: string | null): string {
  if (!source) return '—';
  const map: Record<string, string> = {
    rd_process: '研发流程',
    legacy_import: '历史建档',
    manual_admin: '手工录入',
  };
  return map[source] ?? source;
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  if (typeof value !== 'string' && !(value instanceof Date)) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', { hour12: false });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadWorkbench() {
  const id = route.params.id as string;
  if (!id) return;
  loading.value = true;
  try {
    workbench.value = await productApi.getWorkbench(id);
  } catch {
    ElMessage.error('加载产品详情失败');
  } finally {
    loading.value = false;
  }
}

// ── Status edit ───────────────────────────────────────────────────────────────

function openStatusDialog() {
  if (!workbench.value) return;
  statusForm.name = workbench.value.product.name;
  statusForm.status = workbench.value.product.status;
  statusDialogVisible.value = true;
}

async function handleStatusSave() {
  if (!workbench.value) return;
  submitting.value = true;
  try {
    await productApi.update(workbench.value.product.id, {
      name: statusForm.name,
      status: statusForm.status,
    });
    ElMessage.success('保存成功');
    statusDialogVisible.value = false;
    await loadWorkbench();
  } catch {
    ElMessage.error('保存失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Failure retry ─────────────────────────────────────────────────────────────

async function handleRetry(planId: string) {
  try {
    await ElMessageBox.confirm(
      '重试将把该变更重新置为草稿状态，需要重新提交审批。继续？',
      '确认重试',
      { type: 'warning' },
    );
    await productProcessChangeApi.retry(planId);
    ElMessage.success('已重置为草稿，请到"进行中变更方案"区块继续提交');
    await loadWorkbench();
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return;
    ElMessage.error(err?.message ?? '重试失败');
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────

function goBack() {
  router.push('/products');
}

onMounted(() => {
  loadWorkbench();
});
</script>

<style scoped>
.product-detail-page {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 16px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

.section-card {
  background: #fff;
  border-radius: 4px;
  padding: 20px 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.section-card h2 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subsection {
  margin-top: 16px;
}

.subsection h3 {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin: 0 0 8px;
}

.muted {
  color: #909399;
  font-size: 13px;
  margin: 0 0 8px;
}

.empty-hint {
  color: #909399;
  font-size: 13px;
  padding: 12px 0;
}

.plan-meta {
  margin-top: 12px;
}
</style>
