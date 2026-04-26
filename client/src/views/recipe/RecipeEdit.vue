<template>
  <div class="recipe-edit-page" v-loading="loading">
    <div class="page-header">
      <el-button @click="$router.back()" :icon="ArrowLeft" class="back-btn">返回</el-button>
      <div class="header-center">
        <h1 class="page-title">修改配方</h1>
        <span class="product-name" v-if="original">{{ productName }} · 当前 v{{ original.version }} → 新版本 v{{ original.version + 1 }}</span>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave" :disabled="!hasChanges">
        保存为新版本
      </el-button>
    </div>

    <div class="compare-container" v-if="original">
      <!-- 版本说明 -->
      <el-card class="note-card">
        <el-form-item label="修改说明" label-width="80px">
          <el-input
            v-model="versionNote"
            placeholder="请描述本次修改内容（如：调整A物料用量，增加B防腐剂）"
            clearable
          />
        </el-form-item>
      </el-card>

      <!-- 对比区域 -->
      <div class="compare-grid">
        <!-- 左栏：原始配方 -->
        <el-card class="compare-col original-col">
          <template #header>
            <div class="col-header">
              <span class="col-title">原始配方</span>
              <el-tag type="info" size="small">v{{ original.version }}（只读）</el-tag>
            </div>
          </template>
          <div class="lines-header">
            <span class="lh-seq">序号</span>
            <span class="lh-material">物料编号</span>
            <span class="lh-qty">用量/批次</span>
            <span class="lh-unit">单位</span>
            <span class="lh-critical">关键</span>
          </div>
          <div v-if="original.lines.length === 0" class="empty-tip">暂无物料行</div>
          <div
            v-for="(line, idx) in original.lines"
            :key="line.id"
            class="recipe-row"
            :class="getOriginalRowClass(idx)"
          >
            <span class="lh-seq">{{ idx + 1 }}</span>
            <span class="lh-material mono">{{ line.material_id }}</span>
            <span class="lh-qty mono">{{ line.qty_per_batch }}</span>
            <span class="lh-unit">{{ line.unit }}</span>
            <span class="lh-critical">
              <el-tag v-if="line.is_critical" type="danger" size="small" effect="plain">关键</el-tag>
            </span>
          </div>
          <!-- 对应右边新增的行，左边留空占位 -->
          <div
            v-for="n in addedCount"
            :key="`placeholder-${n}`"
            class="recipe-row placeholder-row"
          >
            <span class="lh-seq">—</span>
            <span class="lh-material"></span>
            <span class="lh-qty"></span>
            <span class="lh-unit"></span>
            <span class="lh-critical"></span>
          </div>
        </el-card>

        <!-- 右栏：修改后配方 -->
        <el-card class="compare-col edited-col">
          <template #header>
            <div class="col-header">
              <span class="col-title">修改后配方</span>
              <el-tag type="warning" size="small">v{{ original.version + 1 }}（编辑中）</el-tag>
            </div>
          </template>
          <div class="lines-header">
            <span class="lh-seq">序号</span>
            <span class="lh-material">物料编号</span>
            <span class="lh-qty">用量/批次</span>
            <span class="lh-unit">单位</span>
            <span class="lh-critical">关键</span>
            <span class="lh-action"></span>
          </div>
          <div v-if="editLines.length === 0" class="empty-tip">请添加物料行</div>
          <div
            v-for="(line, idx) in editLines"
            :key="idx"
            class="recipe-row"
            :class="getEditedRowClass(idx)"
          >
            <span class="lh-seq">{{ idx + 1 }}</span>
            <el-input
              v-model="line.material_id"
              class="lh-material"
              size="small"
              placeholder="物料编号"
              @input="markDirty"
            />
            <el-input-number
              v-model="line.qty_per_batch"
              class="lh-qty"
              size="small"
              :min="0"
              :precision="3"
              controls-position="right"
              @change="markDirty"
            />
            <el-input
              v-model="line.unit"
              class="lh-unit-input"
              size="small"
              placeholder="单位"
              @input="markDirty"
            />
            <el-checkbox v-model="line.is_critical" class="lh-critical" @change="markDirty" />
            <el-button
              link type="danger" size="small" class="lh-action"
              @click="removeLine(idx)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <div class="add-line-row">
            <el-button text type="primary" size="small" @click="addLine">
              <el-icon><Plus /></el-icon>添加物料行
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 变更摘要 -->
      <el-card v-if="hasChanges" class="summary-card">
        <template #header><span class="col-title">变更摘要</span></template>
        <div class="summary-list">
          <div v-for="(item, idx) in changeSummary" :key="idx" class="summary-item" :class="item.type">
            <el-tag :type="item.tagType" size="small" effect="light">{{ item.label }}</el-tag>
            <span class="summary-text">{{ item.text }}</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Plus, Delete } from '@element-plus/icons-vue';
import { recipeApi, type Recipe, type RecipeLine } from '@/api/recipe';
import { productApi, type Product } from '@/api/product';

const route = useRoute();
const router = useRouter();

// ── State ─────────────────────────────────────────────────────────────────────

const loading = ref(false);
const saving = ref(false);
const dirty = ref(false);
const original = ref<Recipe | null>(null);
const products = ref<Product[]>([]);
const versionNote = ref('');

interface EditLine {
  material_id: string;
  qty_per_batch: number;
  unit: string;
  is_critical: boolean;
  isNew: boolean; // true = 新增行（不在原始配方里）
}

const editLines = ref<EditLine[]>([]);

// ── Computed ──────────────────────────────────────────────────────────────────

const productName = computed(() => {
  if (!original.value) return '';
  const p = products.value.find((p) => p.id === original.value!.product_id);
  return p?.name ?? original.value.product_id;
});

const addedCount = computed(() => {
  return Math.max(0, editLines.value.length - (original.value?.lines.length ?? 0));
});

const hasChanges = computed(() => dirty.value);

// 逐行对比：原始行 vs 编辑行
function isLineChanged(idx: number): boolean {
  const orig = original.value?.lines[idx];
  const edit = editLines.value[idx];
  if (!orig || !edit) return false;
  return (
    orig.material_id !== edit.material_id ||
    orig.qty_per_batch !== edit.qty_per_batch ||
    orig.unit !== edit.unit ||
    (orig.is_critical ?? false) !== edit.is_critical
  );
}

function getOriginalRowClass(idx: number) {
  const edit = editLines.value[idx];
  if (!edit) return 'row-deleted'; // 原始有但编辑后被删除
  if (isLineChanged(idx)) return 'row-changed';
  return '';
}

function getEditedRowClass(idx: number) {
  const orig = original.value?.lines[idx];
  if (!orig) return 'row-added'; // 新增行
  if (isLineChanged(idx)) return 'row-changed';
  return '';
}

// 变更摘要
const changeSummary = computed(() => {
  const items: Array<{ type: string; tagType: 'warning' | 'success' | 'danger'; label: string; text: string }> = [];
  const origLines = original.value?.lines ?? [];

  editLines.value.forEach((edit, idx) => {
    const orig = origLines[idx];
    if (!orig) {
      items.push({ type: 'added', tagType: 'success', label: '新增', text: `第 ${idx + 1} 行：${edit.material_id} ${edit.qty_per_batch} ${edit.unit}` });
    } else if (isLineChanged(idx)) {
      items.push({ type: 'changed', tagType: 'warning', label: '修改', text: `第 ${idx + 1} 行（${orig.material_id}）：${orig.qty_per_batch}${orig.unit} → ${edit.qty_per_batch}${edit.unit}` });
    }
  });

  const deletedCount = origLines.length - editLines.value.length;
  if (deletedCount > 0) {
    origLines.slice(editLines.value.length).forEach((orig, i) => {
      items.push({ type: 'deleted', tagType: 'danger', label: '删除', text: `第 ${editLines.value.length + i + 1} 行：${orig.material_id} ${orig.qty_per_batch} ${orig.unit}` });
    });
  }

  return items;
});

// ── Actions ───────────────────────────────────────────────────────────────────

function markDirty() {
  dirty.value = true;
}

function addLine() {
  editLines.value = [...editLines.value, { material_id: '', qty_per_batch: 0, unit: '', is_critical: false, isNew: true }];
  markDirty();
}

function removeLine(idx: number) {
  editLines.value = editLines.value.filter((_, i) => i !== idx);
  markDirty();
}

async function handleSave() {
  saving.value = true;
  try {
    await recipeApi.create({
      product_id: original.value!.product_id,
      version_note: versionNote.value || undefined,
      lines: editLines.value.map((l) => ({
        material_id: l.material_id,
        qty_per_batch: l.qty_per_batch ?? 0,
        unit: l.unit,
        is_critical: l.is_critical,
      })),
    });
    ElMessage.success('已保存为新版本，旧版本自动归档');
    router.push('/recipes');
  } catch {
    ElMessage.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  loading.value = true;
  try {
    const id = route.params.id as string;
    const [recipe, prods] = await Promise.all([
      recipeApi.getOne(id) as unknown as Promise<Recipe>,
      productApi.getList() as unknown as Promise<Product[]>,
    ]);
    original.value = recipe;
    products.value = prods;
    editLines.value = (recipe.lines ?? []).map((l) => ({
      material_id: l.material_id,
      qty_per_batch: l.qty_per_batch,
      unit: l.unit,
      is_critical: l.is_critical ?? false,
      isNew: false,
    }));
  } catch {
    ElMessage.error('加载配方失败');
    router.back();
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.recipe-edit-page {
  padding: 24px;
  min-height: 100vh;
  background: #f5f6fa;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.back-btn { margin-right: 12px; }

.header-center {
  flex: 1;
  text-align: center;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 2px;
}

.product-name {
  font-size: 13px;
  color: #909399;
}

.note-card {
  margin-bottom: 16px;
}

.note-card :deep(.el-card__body) {
  padding: 12px 20px;
}

.compare-container { }

.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.compare-col :deep(.el-card__body) {
  padding: 0;
}

.col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.col-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.lines-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.recipe-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;
  min-height: 44px;
}

.recipe-row:last-child { border-bottom: none; }

/* 高亮样式 */
.row-changed { background: #fffbe6; }
.row-changed:hover { background: #fff3cc; }
.row-added { background: #f0fff4; }
.row-added:hover { background: #dcffe8; }
.row-deleted { background: #fff0f0; text-decoration: line-through; color: #aaa; }

.placeholder-row { background: #fafafa; border-bottom: 1px dashed #e8e8e8; }

/* 列宽 */
.lh-seq    { width: 36px; flex-shrink: 0; font-size: 12px; color: #bbb; }
.lh-material { flex: 2; min-width: 0; margin-right: 8px; font-size: 13px; }
.lh-qty    { width: 90px; flex-shrink: 0; margin-right: 8px; font-size: 13px; }
.lh-unit   { width: 56px; flex-shrink: 0; font-size: 13px; }
.lh-unit-input { width: 56px; flex-shrink: 0; margin-right: 8px; }
.lh-critical { width: 48px; flex-shrink: 0; font-size: 12px; }
.lh-action { width: 28px; flex-shrink: 0; }

.mono { font-family: 'SF Mono', monospace; font-size: 13px; }

.empty-tip {
  padding: 24px;
  text-align: center;
  color: #c0c4cc;
  font-size: 13px;
}

.add-line-row {
  padding: 8px 12px;
}

/* 变更摘要 */
.summary-card { margin-top: 0; }

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.summary-text { color: #606266; }

.summary-item.changed .summary-text { color: #b8860b; }
.summary-item.added   .summary-text { color: #389e0d; }
.summary-item.deleted .summary-text { color: #cf1322; }
</style>
