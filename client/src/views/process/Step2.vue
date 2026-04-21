<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="160px" :disabled="disabled">
      <el-divider>二. 设计输入</el-divider>

      <el-form-item label="工艺形式（只读）">
        <el-input :model-value="processTypeDisplay" disabled />
      </el-form-item>

      <el-form-item label="原料清单">
        <div class="material-section">
          <el-table :data="form.rawMaterials" border size="small" style="width:100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="物料编码" prop="materialCode" width="140" />
            <el-table-column label="物料名称" prop="name" min-width="160" />
            <el-table-column label="配料信息" prop="ingredientInfo" min-width="200">
              <template #default="{ row }">
                <el-input v-if="!disabled" v-model="row.ingredientInfo" size="small" placeholder="可填写配料用途" />
                <span v-else>{{ row.ingredientInfo }}</span>
              </template>
            </el-table-column>
            <el-table-column v-if="!disabled" label="操作" width="80">
              <template #default="{ $index }">
                <el-button link type="danger" @click="removeRow($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button v-if="!disabled" type="primary" plain style="margin-top:10px" @click="openPicker">
            + 选择物料
          </el-button>
        </div>
      </el-form-item>

      <el-form-item label="包装形式">
        <el-input v-model="form.packagingForm" />
      </el-form-item>

      <el-form-item label="储存条件">
        <el-input v-model="form.storageCondition" />
      </el-form-item>

      <el-form-item label="适用标准">
        <el-radio-group v-model="form.standard">
          <el-radio value="国标 GB7099">国标 GB7099</el-radio>
          <el-radio value="其他">其他</el-radio>
        </el-radio-group>
        <el-input v-if="form.standard === '其他'" v-model="form.standardOther"
          placeholder="请填写标准编号" style="margin-top:8px" />
      </el-form-item>
    </el-form>

    <div v-if="!disabled" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>

    <!-- 物料选择弹窗 -->
    <el-dialog v-model="pickerVisible" title="选择物料" width="700px" :close-on-click-modal="false">
      <div class="picker-toolbar">
        <el-input v-model="filterKeyword" placeholder="搜索物料名称或编码" clearable style="width:240px" prefix-icon="Search" />
        <span class="selected-hint">已选 {{ tempSelected.length }} 种</span>
      </div>

      <div v-if="loadingMaterials" class="picker-loading">
        <el-icon class="is-loading"><Loading /></el-icon> 加载中...
      </div>

      <div v-else class="picker-body">
        <div v-for="group in filteredGroups" :key="group.category" class="category-group">
          <div class="category-header">
            <el-checkbox
              :model-value="isGroupAllChecked(group)"
              :indeterminate="isGroupIndeterminate(group)"
              @change="toggleGroup(group, $event)"
            >{{ group.category }}（{{ group.items.length }} 种）</el-checkbox>
          </div>
          <div class="material-grid">
            <div v-for="item in group.items" :key="item.id" class="material-item">
              <el-checkbox
                :model-value="tempSelected.some(s => s.id === item.id)"
                :disabled="isAlreadyAdded(item.id)"
                @change="toggleItem(item, $event)"
              >
                <span class="item-code">{{ item.materialCode }}</span>
                <span class="item-name">{{ item.name }}</span>
              </el-checkbox>
              <span v-if="isAlreadyAdded(item.id)" class="added-tag">已添加</span>
            </div>
          </div>
        </div>
        <el-empty v-if="filteredGroups.length === 0" description="未找到匹配物料" />
      </div>

      <template #footer>
        <el-button @click="pickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPicker" :disabled="tempSelected.length === 0">
          确认添加（{{ tempSelected.length }}）
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import request from '@/api/request';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
}>();

interface Material {
  id: string;
  materialCode: string;
  name: string;
  ingredientInfo?: string;
  category?: { name: string };
}

interface MaterialGroup {
  category: string;
  items: Material[];
}

const form = reactive({
  rawMaterials: [] as Material[],
  packagingForm: '产品采用独立小包装，外包装使用瓦楞纸箱包装',
  storageCondition: '常温保存',
  standard: '国标 GB7099',
  standardOther: '',
});

const processTypeDisplay = computed(() => {
  const step1 = props.allStepsData?.[1] as Record<string, unknown> | undefined;
  const pt = step1?.processType;
  return Array.isArray(pt) ? pt.join('、') : (typeof pt === 'string' ? pt : '-');
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as typeof form;
    if (mv.rawMaterials !== undefined) form.rawMaterials = mv.rawMaterials;
    if (mv.packagingForm !== undefined) form.packagingForm = mv.packagingForm;
    if (mv.storageCondition !== undefined) form.storageCondition = mv.storageCondition;
    if (mv.standard !== undefined) form.standard = mv.standard;
    if (mv.standardOther !== undefined) form.standardOther = mv.standardOther;
  }
});

// ---- 物料选择弹窗 ----
const pickerVisible = ref(false);
const loadingMaterials = ref(false);
const allGroups = ref<MaterialGroup[]>([]);
const tempSelected = ref<Material[]>([]);
const filterKeyword = ref('');

const filteredGroups = computed(() => {
  const kw = filterKeyword.value.trim().toLowerCase();
  if (!kw) return allGroups.value;
  return allGroups.value
    .map(g => ({ ...g, items: g.items.filter(i => i.name.includes(kw) || i.materialCode.toLowerCase().includes(kw)) }))
    .filter(g => g.items.length > 0);
});

const isAlreadyAdded = (id: string) => form.rawMaterials.some(m => m.id === id);
const isGroupAllChecked = (g: MaterialGroup) => g.items.every(i => isAlreadyAdded(i.id) || tempSelected.value.some(s => s.id === i.id));
const isGroupIndeterminate = (g: MaterialGroup) => !isGroupAllChecked(g) && g.items.some(i => tempSelected.value.some(s => s.id === i.id));

const toggleItem = (item: Material, checked: boolean | string | number) => {
  if (checked) {
    if (!tempSelected.value.some(s => s.id === item.id)) {
      tempSelected.value = [...tempSelected.value, item];
    }
  } else {
    tempSelected.value = tempSelected.value.filter(s => s.id !== item.id);
  }
};

const toggleGroup = (group: MaterialGroup, checked: boolean | string | number) => {
  const eligible = group.items.filter(i => !isAlreadyAdded(i.id));
  if (checked) {
    const toAdd = eligible.filter(i => !tempSelected.value.some(s => s.id === i.id));
    tempSelected.value = [...tempSelected.value, ...toAdd];
  } else {
    const ids = new Set(eligible.map(i => i.id));
    tempSelected.value = tempSelected.value.filter(s => !ids.has(s.id));
  }
};

const openPicker = async () => {
  pickerVisible.value = true;
  tempSelected.value = [];
  filterKeyword.value = '';
  if (allGroups.value.length > 0) return;
  loadingMaterials.value = true;
  try {
    const res = await request.get<{ data: Material[] }>('/warehouse/materials', {
      params: { limit: 200, status: 'active' },
    });
    const map = new Map<string, MaterialGroup>();
    for (const m of (res.data ?? [])) {
      const cat = m.category?.name ?? '其他';
      if (!map.has(cat)) map.set(cat, { category: cat, items: [] });
      map.get(cat)!.items.push(m);
    }
    allGroups.value = Array.from(map.values());
  } catch {
    ElMessage.error('加载物料失败');
  } finally {
    loadingMaterials.value = false;
  }
};

const confirmPicker = () => {
  for (const item of tempSelected.value) {
    form.rawMaterials.push({ id: item.id, materialCode: item.materialCode, name: item.name, ingredientInfo: '' });
  }
  pickerVisible.value = false;
};

const removeRow = (index: number) => {
  form.rawMaterials = form.rawMaterials.filter((_, i) => i !== index);
};

const getFormData = () => ({ ...form, rawMaterials: [...form.rawMaterials] });

const handleSubmit = () => {
  if (!form.rawMaterials.length) { ElMessage.warning('请至少添加一种原料'); return; }
  emit('submitted', getFormData());
};
</script>

<style scoped>
.step-view { padding: 16px; }
.material-section { width: 100%; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }

.picker-toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.selected-hint { color: var(--el-color-primary); font-size: 13px; }
.picker-loading { text-align: center; padding: 40px; color: var(--el-text-color-secondary); }
.picker-body { max-height: 440px; overflow-y: auto; }

.category-group { margin-bottom: 16px; border: 1px solid var(--el-border-color-light); border-radius: 6px; overflow: hidden; }
.category-header { background: var(--el-fill-color-light); padding: 8px 14px; font-weight: 600; }
.material-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
.material-item { display: flex; align-items: center; padding: 8px 14px; border-top: 1px solid var(--el-border-color-lighter); gap: 6px; }
.material-item:nth-child(n+4) { border-top: 1px solid var(--el-border-color-lighter); }
.item-code { color: var(--el-text-color-secondary); font-size: 12px; margin-right: 4px; }
.item-name { font-size: 13px; }
.added-tag { font-size: 11px; color: var(--el-color-success); margin-left: auto; white-space: nowrap; }
</style>
