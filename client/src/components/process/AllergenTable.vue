<template>
  <el-scrollbar>
    <div style="min-width: 1400px">
      <el-table :data="rows" border size="small" :disabled="disabled">
        <el-table-column label="原料名称" prop="materialName" width="160" fixed />
        <el-table-column
          v-for="allergen in ALLERGENS"
          :key="allergen.key"
          :label="allergen.label"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-checkbox
              v-model="row.allergens[allergen.key]"
              :disabled="disabled"
              @change="emitUpdate"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const ALLERGENS = [
  { key: 'gluten', label: '含麸质谷物' },
  { key: 'crustacean', label: '甲壳类' },
  { key: 'egg', label: '蛋类' },
  { key: 'fish', label: '鱼类' },
  { key: 'peanut', label: '花生' },
  { key: 'soy', label: '大豆' },
  { key: 'milk', label: '乳制品' },
  { key: 'nut', label: '坚果' },
  { key: 'sulfite', label: '亚硫酸盐' },
] as const;

interface AllergenRow {
  materialName: string;
  allergens: Record<string, boolean>;
}

const props = defineProps<{
  rawMaterials?: Array<{ name: string; [key: string]: any }>;
  modelValue?: AllergenRow[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: AllergenRow[]): void;
}>();

const rows = ref<AllergenRow[]>([]);

const buildEmptyAllergens = () =>
  Object.fromEntries(ALLERGENS.map((a) => [a.key, false]));

watch(
  () => props.rawMaterials,
  (materials) => {
    if (!materials) return;
    const existing = Object.fromEntries((props.modelValue ?? []).map((r) => [r.materialName, r]));
    rows.value = materials.map((m) => ({
      materialName: m.name,
      allergens: { ...buildEmptyAllergens(), ...(existing[m.name]?.allergens ?? {}) },
    }));
    emitUpdate();
  },
  { immediate: true }
);

watch(
  () => props.modelValue,
  (val) => {
    if (!props.rawMaterials && Array.isArray(val)) rows.value = val;
  }
);

const emitUpdate = () => emit('update:modelValue', [...rows.value]);
</script>
