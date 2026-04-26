<template>
  <div>
    <el-table :data="lines" border size="small" style="width:100%">
      <el-table-column type="index" label="序号" width="55" />
      <el-table-column label="物料编码" prop="materialCode" width="130" />
      <el-table-column label="物料名称" prop="materialName" min-width="160" />
      <el-table-column label="用量(kg/批)" width="130">
        <template #default="{ row }">
          <el-input-number v-if="!disabled" v-model="row.qtyPerBatch" :min="0" :precision="3" controls-position="right" size="small" style="width:110px" />
          <span v-else>{{ row.qtyPerBatch }}</span>
        </template>
      </el-table-column>
      <el-table-column label="单位" width="90">
        <template #default="{ row }">
          <el-select v-if="!disabled" v-model="row.unit" size="small" style="width:70px">
            <el-option v-for="u in units" :key="u" :label="u" :value="u" />
          </el-select>
          <span v-else>{{ row.unit }}</span>
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="120">
        <template #default="{ row }">
          <el-input v-if="!disabled" v-model="row.notes" size="small" />
          <span v-else>{{ row.notes }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="!disabled" label="操作" width="70">
        <template #default="{ $index }">
          <el-button link type="danger" @click="removeLine($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-button v-if="!disabled" type="primary" plain style="margin-top:10px" @click="openPicker">
      + 选择物料
    </el-button>

    <el-dialog v-model="pickerVisible" title="选择物料" width="700px" :close-on-click-modal="false">
      <div style="display:flex; gap:16px; margin-bottom:12px">
        <el-input v-model="filterKw" placeholder="搜索物料名称或编码" clearable style="width:240px" />
      </div>
      <div style="max-height:400px; overflow-y:auto">
        <div v-for="group in filteredGroups" :key="group.category" style="margin-bottom:12px">
          <div style="font-weight:600; padding:6px 12px; background:var(--el-fill-color-light)">{{ group.category }}</div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr)">
            <div v-for="item in group.items" :key="item.id" style="padding:8px 12px; border-top:1px solid var(--el-border-color-lighter)">
              <el-checkbox
                :model-value="isAdded(item.id)"
                @change="(v: boolean) => toggleItem(item, v)"
              >{{ item.materialCode }} {{ item.name }}</el-checkbox>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import type { RecipeLine } from '@/api/process';

const props = defineProps<{
  modelValue: RecipeLine[];
  disabled?: boolean;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: RecipeLine[]): void }>();

const lines = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const units = ['kg', 'g', 'L', 'mL', '个', '包'];
const pickerVisible = ref(false);
const filterKw = ref('');
const allGroups = ref<{ category: string; items: any[] }[]>([]);

const filteredGroups = computed(() => {
  const kw = filterKw.value.toLowerCase();
  if (!kw) return allGroups.value;
  return allGroups.value
    .map(g => ({ ...g, items: g.items.filter((i: any) => i.name.includes(kw) || i.materialCode.toLowerCase().includes(kw)) }))
    .filter(g => g.items.length > 0);
});

const isAdded = (id: string) => lines.value.some(l => l.materialId === id);

const toggleItem = (item: any, checked: boolean) => {
  if (checked && !isAdded(item.id)) {
    emit('update:modelValue', [...lines.value, {
      materialId: item.id,
      materialCode: item.materialCode,
      materialName: item.name,
      qtyPerBatch: 0,
      unit: 'kg',
    }]);
  } else if (!checked) {
    emit('update:modelValue', lines.value.filter(l => l.materialId !== item.id));
  }
};

const removeLine = (index: number) => {
  emit('update:modelValue', lines.value.filter((_, i) => i !== index));
};

const openPicker = async () => {
  pickerVisible.value = true;
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
</script>
