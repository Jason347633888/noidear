<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="180px" :disabled="disabled">
      <el-divider>新产品开发计划书（JL-10）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">基本信息</span></template>
        <el-form-item label="产品名称">
          <el-input :model-value="productNameFromStep1" disabled />
        </el-form-item>
        <el-form-item label="包装要求">
          <el-input v-model="form.packagingRequirement" />
        </el-form-item>
        <el-form-item label="工艺要求">
          <el-input v-model="form.processRequirement" />
        </el-form-item>
        <el-form-item label="产品特性">
          <el-input v-model="form.productCharacteristics" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">法律法规要求</span></template>
        <el-form-item label="国家标准"><el-input v-model="form.nationalStandard" /></el-form-item>
        <el-form-item label="行业标准"><el-input v-model="form.industryStandard" /></el-form-item>
        <el-form-item label="企业标准"><el-input v-model="form.enterpriseStandard" /></el-form-item>
        <el-form-item label="引入的食品安全危害">
          <el-input v-model="form.identifiedHazards" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">各部门输入意见</span></template>
        <el-form-item label="产品开发部"><el-input v-model="form.inputOpinionDev" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="品质部"><el-input v-model="form.inputOpinionQuality" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="采购部"><el-input v-model="form.inputOpinionPurchase" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="制造部"><el-input v-model="form.inputOpinionManufacture" type="textarea" :rows="2" /></el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card material-section">
        <template #header><span class="section-title">原料清单（用于后续步骤预填）</span></template>
        <el-table :data="form.rawMaterials" border size="small" style="width:100%">
          <el-table-column type="index" label="序号" width="55" />
          <el-table-column label="物料编码" prop="materialCode" width="130" />
          <el-table-column label="物料名称" prop="name" min-width="160" />
          <el-table-column label="配料说明" prop="ingredientInfo" min-width="160">
            <template #default="{ row }">
              <el-input v-if="!disabled" v-model="row.ingredientInfo" size="small" placeholder="用途/规格备注" />
              <span v-else>{{ row.ingredientInfo }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="!disabled" label="操作" width="70">
            <template #default="{ $index }">
              <el-button link type="danger" @click="removeRaw($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button v-if="!disabled" type="primary" plain style="margin-top:10px" @click="openPicker">+ 选择物料</el-button>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">审批 — 研发经理</span></template>
        <ApprovalTaskPanel
          v-if="stepStatus === 'SUBMITTED'"
          :approval-instance-id="(modelValue as any)?.approvalInstanceId"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">已获研发经理批准</el-text>
        <el-text v-else type="info" size="small">提交后等待研发经理审批</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>

    <el-dialog v-model="pickerVisible" title="选择物料" width="700px" :close-on-click-modal="false">
      <div class="picker-toolbar">
        <el-input v-model="filterKw" placeholder="搜索物料" clearable style="width:240px; margin-bottom:12px" />
      </div>
      <div style="max-height:400px; overflow-y:auto">
        <div v-for="group in filteredGroups" :key="group.category" style="margin-bottom:8px; border:1px solid var(--el-border-color-light); border-radius:6px; overflow:hidden">
          <div style="background:var(--el-fill-color-light); padding:6px 12px; font-weight:600">{{ group.category }}</div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr)">
            <div class="material-item" v-for="item in group.items" :key="item.id" style="padding:8px 12px; border-top:1px solid var(--el-border-color-lighter)">
              <el-checkbox :model-value="isAdded(item.id) || isTempSelected(item.id)" :disabled="isAdded(item.id)" @change="(v: any) => toggleTemp(item, v)">
                <span style="font-size:12px; color:var(--el-text-color-secondary)">{{ item.materialCode }}</span>
                {{ item.name }}
              </el-checkbox>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="pickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPicker">确认添加（{{ tempSelected.length }}）</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import request from '@/api/request';
import ApprovalTaskPanel from '@/components/approval/ApprovalTaskPanel.vue';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
  stepStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
  (e: 'signed'): void;
}>();

const formRef = ref<FormInstance>();

interface RawMat { id: string; materialCode: string; name: string; ingredientInfo: string }

const form = reactive({
  packagingRequirement: '充氮包装',
  processRequirement: '',
  productCharacteristics: '',
  nationalStandard: 'GB7099-2015',
  industryStandard: 'GB7099-2015',
  enterpriseStandard: 'GB7099-2015',
  identifiedHazards: '',
  inputOpinionDev: '',
  inputOpinionQuality: '',
  inputOpinionPurchase: '',
  inputOpinionManufacture: '',
  rawMaterials: [] as RawMat[],
});

const productNameFromStep1 = computed(() => {
  const s1 = props.allStepsData?.[1] as any;
  return s1?.productName ?? '-';
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach((k) => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
});

const getFormData = () => ({ ...form, rawMaterials: form.rawMaterials.map(r => ({ ...r })) });

const handleSubmit = async () => {
  if (form.rawMaterials.length === 0) { ElMessage.warning('请至少选择一种原料'); return; }
  emit('submitted', getFormData());
};

const removeRaw = (i: number) => { form.rawMaterials = form.rawMaterials.filter((_, idx) => idx !== i); };
const isAdded = (id: string) => form.rawMaterials.some(r => r.id === id);

const pickerVisible = ref(false);
const filterKw = ref('');
const allGroups = ref<{ category: string; items: any[] }[]>([]);
const tempSelected = ref<any[]>([]);

const filteredGroups = computed(() => {
  const kw = filterKw.value.toLowerCase();
  if (!kw) return allGroups.value;
  return allGroups.value.map(g => ({ ...g, items: g.items.filter((i: any) => i.name.includes(kw) || i.materialCode.toLowerCase().includes(kw)) })).filter(g => g.items.length > 0);
});

const isTempSelected = (id: string) => tempSelected.value.some(t => t.id === id);
const toggleTemp = (item: any, checked: boolean) => {
  if (checked) { if (!isTempSelected(item.id)) tempSelected.value = [...tempSelected.value, item]; }
  else { tempSelected.value = tempSelected.value.filter(t => t.id !== item.id); }
};

const openPicker = async () => {
  pickerVisible.value = true;
  tempSelected.value = [];
  if (allGroups.value.length > 0) return;
  try {
    const res = await request.get<{ data: any[] }>('/warehouse/materials', { params: { limit: 200, status: 'active' } });
    const map = new Map<string, { category: string; items: any[] }>();
    for (const m of (res.data ?? [])) {
      const cat = m.category?.name ?? '其他';
      if (!map.has(cat)) map.set(cat, { category: cat, items: [] });
      map.get(cat)!.items.push(m);
    }
    allGroups.value = Array.from(map.values());
  } catch { ElMessage.error('加载物料失败'); }
};

const confirmPicker = () => {
  for (const item of tempSelected.value) {
    if (!isAdded(item.id)) form.rawMaterials.push({ id: item.id, materialCode: item.materialCode, name: item.name, ingredientInfo: '' });
  }
  pickerVisible.value = false;
};

defineExpose({ validate: () => formRef.value?.validate() });
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
