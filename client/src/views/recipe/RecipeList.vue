<template>
  <div class="recipe-list-page">
    <div class="page-header">
      <h1 class="page-title">配方管理</h1>
      <p class="page-subtitle">管理产品配方版本及物料配比</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">配方列表</span>
            <span class="card-count">共 {{ filteredList.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-select
              v-model="filterProductId"
              placeholder="按产品筛选"
              clearable
              style="width: 200px; margin-right: 12px"
            >
              <el-option
                v-for="p in productOptions"
                :key="p.id"
                :label="p.name"
                :value="p.id"
              />
            </el-select>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>新建配方
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="filteredList" v-loading="loading" stripe>
        <el-table-column label="产品名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getProductName(row.product_id) }}
          </template>
        </el-table-column>
        <el-table-column label="版本号" width="90">
          <template #default="{ row }">
            v{{ row.version }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag
              :type="getRecipeStatusType(row.status)"
              effect="light"
              size="small"
            >
              {{ getRecipeStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="配方行数" width="90">
          <template #default="{ row }">
            {{ row.lines?.length ?? 0 }} 行
          </template>
        </el-table-column>
        <el-table-column prop="version_note" label="版本说明" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.version_note || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建配方对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="新建配方"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="产品" prop="product_id">
          <el-select v-model="form.product_id" placeholder="请选择产品" style="width: 100%">
            <el-option
              v-for="p in productOptions"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="版本说明">
          <el-input
            v-model="form.version_note"
            type="textarea"
            :rows="2"
            placeholder="可选，描述本版本配方的修改内容"
          />
        </el-form-item>

        <el-divider content-position="left">物料配方行</el-divider>

        <div
          v-for="(line, index) in form.lines"
          :key="index"
          class="recipe-line"
        >
          <div class="line-number">{{ index + 1 }}</div>
          <el-input
            v-model="line.material_id"
            placeholder="物料编号"
            class="line-material"
          />
          <el-input-number
            v-model="line.qty_per_batch"
            :min="0"
            :precision="3"
            placeholder="用量"
            class="line-qty"
          />
          <el-input
            v-model="line.unit"
            placeholder="单位"
            class="line-unit"
          />
          <el-checkbox v-model="line.is_critical" class="line-critical">关键</el-checkbox>
          <el-button
            link
            type="danger"
            class="line-remove"
            @click="removeLine(index)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>

        <div class="add-line-row">
          <el-button text type="primary" @click="addLine">
            <el-icon><Plus /></el-icon>添加物料行
          </el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { recipeApi, type Recipe, getRecipeStatusText, getRecipeStatusType } from '@/api/recipe';
import { productApi, type Product } from '@/api/product';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<Recipe[]>([]);
const loading = ref(false);
const productOptions = ref<Product[]>([]);
const filterProductId = ref<string>('');

const filteredList = computed(() => {
  if (!filterProductId.value) return list.value;
  return list.value.filter((r) => r.product_id === filterProductId.value);
});

// ── Dialog ────────────────────────────────────────────────────────────────────

const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

interface LineForm {
  material_id: string;
  qty_per_batch: number | undefined;
  unit: string;
  is_critical: boolean;
}

const form = reactive({
  product_id: '',
  version_note: '',
  lines: [] as LineForm[],
});

const formRules: FormRules = {
  product_id: [{ required: true, message: '请选择产品', trigger: 'change' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getProductName(productId: string): string {
  const found = productOptions.value.find((p) => p.id === productId);
  return found ? found.name : productId;
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await recipeApi.getList();
    list.value = res as unknown as Recipe[];
  } catch {
    ElMessage.error('加载配方列表失败');
  } finally {
    loading.value = false;
  }
}

async function loadProducts() {
  try {
    const res = await productApi.getList();
    productOptions.value = res as unknown as Product[];
  } catch {
    ElMessage.error('加载产品列表失败');
  }
}

// ── Line management ───────────────────────────────────────────────────────────

function addLine() {
  form.lines = [
    ...form.lines,
    { material_id: '', qty_per_batch: undefined as unknown as number, unit: '', is_critical: false },
  ];
}

function removeLine(index: number) {
  form.lines = form.lines.filter((_, i) => i !== index);
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  form.product_id = '';
  form.version_note = '';
  form.lines = [];
  dialogVisible.value = true;
}

async function handleCreate() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await recipeApi.create({
      product_id: form.product_id,
      version_note: form.version_note || undefined,
      lines: form.lines.map((l) => ({
        material_id: l.material_id,
        qty_per_batch: l.qty_per_batch ?? 0,
        unit: l.unit,
        is_critical: l.is_critical,
      })),
    });
    ElMessage.success('新建成功');
    dialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('新建失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function handleDelete(row: Recipe) {
  const productName = getProductName(row.product_id);
  await ElMessageBox.confirm(
    `确定要删除「${productName}」v${row.version} 的配方吗？此操作不可撤销。`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    },
  );
  try {
    await recipeApi.remove(row.id);
    ElMessage.success('删除成功');
    await loadList();
  } catch {
    ElMessage.error('删除失败，请重试');
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
  loadProducts();
});
</script>

<style scoped>
.recipe-list-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-count {
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
}

.recipe-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.line-number {
  width: 24px;
  font-size: 13px;
  color: #909399;
  text-align: right;
  flex-shrink: 0;
}

.line-material {
  flex: 2;
}

.line-qty {
  flex: 1;
}

.line-unit {
  width: 70px;
  flex-shrink: 0;
}

.line-critical {
  flex-shrink: 0;
}

.line-remove {
  flex-shrink: 0;
}

.add-line-row {
  padding-left: 32px;
  margin-top: 4px;
}
</style>
