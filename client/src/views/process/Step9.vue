<template>
  <div class="step-view">
    <el-divider>九. 开发输出</el-divider>

    <!-- 11.1 产品配方（按区域分组） -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">产品配方（按区域分组）</span></template>

      <!-- 鸡蛋房（固定行，根据工艺形式自动生成） -->
      <div class="area-section">
        <h5>鸡蛋房</h5>
        <el-table :data="eggAreaRows" border size="small">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column label="物料名称" prop="name" width="160" />
          <el-table-column label="重量（g）" width="140">
            <template #default="{ row }">
              <el-input v-if="!disabled" v-model="row.weight" size="small" />
              <span v-else>{{ row.weight }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 其他区域（可增减行） -->
      <div v-for="area in otherAreas" :key="area.key" class="area-section">
        <h5>{{ area.label }}</h5>
        <el-table :data="form[area.key]" border size="small">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column label="物料编码" prop="code" width="140" />
          <el-table-column label="物料名称" prop="name" min-width="160" />
          <el-table-column label="重量（g）" width="120">
            <template #default="{ row }">
              <el-input v-if="!disabled" v-model="row.weight" size="small" />
              <span v-else>{{ row.weight }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="!disabled" label="操作" width="80">
            <template #default="{ $index }">
              <el-button link type="danger" @click="removeAreaRow(area.key, $index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="!disabled" class="add-row">
          <el-autocomplete
            :model-value="areaSearch[area.key]"
            @update:model-value="(v: string) => areaSearch[area.key] = v"
            :fetch-suggestions="searchMaterials"
            placeholder="搜索物料"
            value-key="name"
            @select="(item: any) => addAreaRow(area.key, item)"
            style="width: 280px"
          >
            <template #default="{ item }">
              <span>{{ item.code }} - {{ item.name }}</span>
            </template>
          </el-autocomplete>
        </div>
      </div>
    </el-card>

    <!-- 11.2 配料表 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">配料表（产品标签成分表）</span></template>
      <el-table :data="form.labelIngredients" border size="small">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column label="配料名称" min-width="200">
          <template #default="{ row }">
            <el-input v-if="!disabled" v-model="row.ingredientName" size="small" />
            <span v-else>{{ row.ingredientName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="关联物料" min-width="200">
          <template #default="{ row }">
            <el-select v-if="!disabled" v-model="row.relatedMaterial" size="small" placeholder="选择物料">
              <el-option v-for="m in allFormulaItems" :key="m.name" :label="`${m.code} - ${m.name}`" :value="m.name" />
            </el-select>
            <span v-else>{{ row.relatedMaterial }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!disabled" label="操作" width="80">
          <template #default="{ $index }">
            <el-button link type="danger" @click="form.labelIngredients.splice($index, 1)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button v-if="!disabled" size="small" @click="addLabelIngredient" style="margin-top:8px">
        + 添加配料
      </el-button>
    </el-card>

    <div v-if="!disabled" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="emit('submitted', getFormData())">提交完成</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import request from '@/api/request';

interface MaterialRow { id?: string; code: string; name: string; weight?: string; ingredientInfo?: string }

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

const otherAreas = [
  { key: 'flourRoom', label: '筛粉间' },
  { key: 'oilRoom', label: '称油间' },
  { key: 'smallMaterialRoom', label: '小料房' },
  { key: 'mixingRoom', label: '搅拌间' },
] as const;

type AreaKey = typeof otherAreas[number]['key'];

const form = reactive<{
  flourRoom: MaterialRow[];
  oilRoom: MaterialRow[];
  smallMaterialRoom: MaterialRow[];
  mixingRoom: MaterialRow[];
  labelIngredients: { ingredientName: string; relatedMaterial: string }[];
}>({
  flourRoom: [],
  oilRoom: [],
  smallMaterialRoom: [],
  mixingRoom: [],
  labelIngredients: [],
});

const areaSearch = reactive<Record<string, string>>({ flourRoom: '', oilRoom: '', smallMaterialRoom: '', mixingRoom: '' });

const isFendan = computed(() => {
  const step1 = props.allStepsData?.[1] as Record<string, unknown> | undefined;
  return ((step1?.processType as string[]) ?? []).includes('戚风分蛋工艺');
});

const eggAreaRows = computed(() => {
  if (isFendan.value) {
    return [
      { name: '全蛋液', weight: '' },
      { name: '蛋黄', weight: '' },
      { name: '蛋清', weight: '' },
    ];
  }
  return [{ name: '全蛋液', weight: '' }];
});

const allFormulaItems = computed(() => {
  const result: MaterialRow[] = [...eggAreaRows.value.map(r => ({ code: '', name: r.name }))];
  for (const area of otherAreas) {
    result.push(...(form[area.key] as MaterialRow[]));
  }
  return result;
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as Record<string, unknown>;
    if (mv.flourRoom) form.flourRoom = mv.flourRoom as MaterialRow[];
    if (mv.oilRoom) form.oilRoom = mv.oilRoom as MaterialRow[];
    if (mv.smallMaterialRoom) form.smallMaterialRoom = mv.smallMaterialRoom as MaterialRow[];
    if (mv.mixingRoom) form.mixingRoom = mv.mixingRoom as MaterialRow[];
    if (mv.labelIngredients) form.labelIngredients = mv.labelIngredients as { ingredientName: string; relatedMaterial: string }[];
  }
});

const searchMaterials = async (query: string, cb: (r: MaterialRow[]) => void) => {
  if (!query) { cb([]); return; }
  try {
    const res = await request.get<{ list: MaterialRow[] }>('/warehouse/materials', { params: { search: query, limit: 10 } });
    cb(res.list ?? []);
  } catch { cb([]); }
};

const addAreaRow = (key: AreaKey, item: MaterialRow) => {
  (form[key] as MaterialRow[]).push({ id: item.id, code: item.code, name: item.name, weight: '' });
  areaSearch[key] = '';
};

const removeAreaRow = (key: AreaKey, index: number) => {
  (form[key] as MaterialRow[]).splice(index, 1);
};

const addLabelIngredient = () => form.labelIngredients.push({ ingredientName: '', relatedMaterial: '' });

const getFormData = () => ({ ...form });
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.area-section { margin-bottom: 20px; }
.area-section h5 { font-weight: 600; margin-bottom: 8px; color: var(--el-text-color-regular); }
.add-row { margin-top: 8px; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
