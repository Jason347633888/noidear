<template>
  <el-drawer :model-value="modelValue" title="历史产品建档" size="720px" @close="emit('update:modelValue', false)">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="产品名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入产品名称" />
      </el-form-item>
      <el-table :data="form.lines" border>
        <el-table-column label="物料" min-width="210">
          <template #default="{ row }">
            <el-select v-model="row.material_id" filterable placeholder="选择物料" style="width: 100%" @change="syncMaterialUnit(row)">
              <el-option v-for="m in materials" :key="m.id" :label="`${m.materialCode} ${m.name}`" :value="m.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="用量" width="130">
          <template #default="{ row }">
            <el-input-number v-model="row.qty_per_batch" :min="0.0001" :precision="4" controls-position="right" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="单位" width="100">
          <template #default="{ row }">
            <el-input v-model="row.unit" />
          </template>
        </el-table-column>
        <el-table-column label="配料区域" width="150">
          <template #default="{ row }">
            <el-select v-model="row.area_id" placeholder="选择区域" style="width: 100%">
              <el-option v-for="a in areas" :key="a.id" :label="a.name" :value="a.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="关键" width="72" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.is_critical" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" @click="removeLine($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="line-actions">
        <el-button @click="addLine">添加配方行</el-button>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">保存建档</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { productApi } from '@/api/product';
import { workshopAreaApi, type WorkshopArea } from '@/api/workshop-area';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'created'): void }>();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const materials = ref<{ id: string; materialCode: string; name: string; unit?: string }[]>([]);
const areas = ref<WorkshopArea[]>([]);

const form = reactive({
  name: '',
  lines: [{ material_id: '', qty_per_batch: 1, unit: 'kg', area_id: '', is_critical: false, notes: '' }],
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
};

watch(() => props.modelValue, async (open) => {
  if (!open) return;
  const areaList = await workshopAreaApi.getList();
  areas.value = (areaList as unknown as WorkshopArea[]) ?? [];
});

function addLine() {
  form.lines = [
    ...form.lines,
    { material_id: '', qty_per_batch: 1, unit: 'kg', area_id: '', is_critical: false, notes: '' },
  ];
}

function removeLine(index: number) {
  form.lines = form.lines.filter((_, i) => i !== index);
}

function syncMaterialUnit(row: { material_id: string; unit: string }) {
  const material = materials.value.find((item) => item.id === row.material_id);
  if (material?.unit) row.unit = material.unit;
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  if (form.lines.length === 0) {
    ElMessage.warning('至少添加一条配方行');
    return;
  }
  if (form.lines.some((line) => !line.material_id || !line.area_id || !line.qty_per_batch || !line.unit)) {
    ElMessage.warning('请完整填写物料、用量、单位和配料区域');
    return;
  }
  submitting.value = true;
  try {
    await productApi.createLegacy({
      name: form.name,
      lines: form.lines,
    });
    ElMessage.success('历史产品建档成功');
    emit('update:modelValue', false);
    emit('created');
  } catch {
    ElMessage.error('建档失败，请重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.line-actions {
  margin-top: 12px;
}
</style>
