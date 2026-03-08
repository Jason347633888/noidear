<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="160px" :disabled="disabled">
      <el-divider>二. 设计输入</el-divider>

      <el-form-item label="工艺形式（只读）">
        <el-input :model-value="processTypeDisplay" disabled />
      </el-form-item>

      <el-form-item label="原料清单">
        <div class="material-table">
          <el-table :data="form.rawMaterials" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="物料编码" prop="code" width="140" />
            <el-table-column label="物料名称" prop="name" min-width="160" />
            <el-table-column label="配料信息" prop="ingredientInfo" min-width="200" />
            <el-table-column v-if="!disabled" label="操作" width="80">
              <template #default="{ $index }">
                <el-button link type="danger" @click="removeRow($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="!disabled" class="add-row">
            <el-autocomplete
              v-model="searchKeyword"
              :fetch-suggestions="searchMaterials"
              placeholder="搜索物料编码或名称"
              value-key="name"
              @select="onMaterialSelect"
              style="width: 300px"
            >
              <template #default="{ item }">
                <span>{{ item.code }} - {{ item.name }}</span>
              </template>
            </el-autocomplete>
          </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
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

interface Material { id: string; code: string; name: string; ingredientInfo?: string }

const searchKeyword = ref('');
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
  if (props.modelValue) Object.assign(form, props.modelValue);
});

const searchMaterials = async (query: string, cb: (results: Material[]) => void) => {
  if (!query) { cb([]); return; }
  try {
    const res = await request.get<{ list: Material[] }>('/warehouse/materials', {
      params: { search: query, limit: 10 },
    });
    cb(res.list ?? []);
  } catch {
    cb([]);
  }
};

const onMaterialSelect = (item: Material) => {
  form.rawMaterials.push({ id: item.id, code: item.code, name: item.name, ingredientInfo: item.ingredientInfo ?? '' });
  searchKeyword.value = '';
};

const removeRow = (index: number) => {
  form.rawMaterials.splice(index, 1);
};

const getFormData = () => ({ ...form, rawMaterials: [...form.rawMaterials] });

const handleSubmit = () => {
  if (!form.rawMaterials.length) {
    ElMessage.warning('请至少添加一种原料');
    return;
  }
  emit('submitted', getFormData());
};
</script>

<style scoped>
.step-view { padding: 16px; }
.material-table { width: 100%; }
.add-row { margin-top: 8px; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
