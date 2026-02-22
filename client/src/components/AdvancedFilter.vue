<!--
  AdvancedFilter - 可复用高级筛选组件

  使用场景:
  1. 设备列表筛选 (EquipmentList.vue) - 关键词、分类、状态
  2. 维护计划筛选 (PlanList.vue) - 设备、保养级别、状态
  3. 培训项目筛选 (ProjectList.vue) - 部门、季度、状态、关键词

  设计规范:
  - 使用Element Plus表单组件
  - 响应式布局（el-row + el-col）
  - 支持多种筛选字段类型（input, select, date, daterange）
-->
<template>
  <el-form :model="filterValues" class="advanced-filter">
    <el-row :gutter="16">
      <el-col
        v-for="field in fields"
        :key="field.prop"
        :xs="field.colXs || 24"
        :sm="field.colSm || 12"
        :md="field.colMd || 6"
        :lg="field.colLg"
        :xl="field.colXl"
      >
        <el-form-item :label="field.label">
          <!-- Input -->
          <el-input
            v-if="field.type === 'input'"
            v-model="filterValues[field.prop]"
            :placeholder="field.placeholder || `请输入${field.label}`"
            clearable
            @clear="handleFieldChange"
            @keyup.enter="handleSearch"
            :style="{ width: '100%' }"
          >
            <template #prefix v-if="field.showSearchIcon">
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <!-- Select -->
          <el-select
            v-else-if="field.type === 'select'"
            v-model="filterValues[field.prop]"
            :placeholder="field.placeholder || `请选择${field.label}`"
            clearable
            @change="handleFieldChange"
            :filterable="field.filterable"
            :style="{ width: '100%' }"
          >
            <el-option
              v-for="option in field.options"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>

          <!-- Date Picker -->
          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="filterValues[field.prop]"
            type="date"
            :placeholder="field.placeholder || `选择${field.label}`"
            clearable
            @change="handleFieldChange"
            :value-format="field.valueFormat || 'YYYY-MM-DD'"
            :style="{ width: '100%' }"
          />

          <!-- Date Range Picker -->
          <el-date-picker
            v-else-if="field.type === 'daterange'"
            v-model="filterValues[field.prop]"
            type="daterange"
            :range-separator="field.rangeSeparator || '至'"
            :start-placeholder="field.startPlaceholder || '开始日期'"
            :end-placeholder="field.endPlaceholder || '结束日期'"
            clearable
            @change="handleFieldChange"
            :value-format="field.valueFormat || 'YYYY-MM-DD'"
            :style="{ width: '100%' }"
          />
        </el-form-item>
      </el-col>

      <!-- Action Buttons -->
      <el-col :xs="24" :sm="24" :md="actionColSpan">
        <el-form-item :label="showActionLabel ? '操作' : ' '">
          <el-space :size="8">
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="handleReset">重置</el-button>
            <slot name="extra-actions"></slot>
          </el-space>
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search } from '@element-plus/icons-vue';

export interface FilterFieldOption {
  label: string;
  value: string | number;
}

export interface FilterField {
  /** 字段属性名 */
  prop: string;
  /** 字段标签 */
  label: string;
  /** 字段类型 */
  type: 'input' | 'select' | 'date' | 'daterange';
  /** 占位符 */
  placeholder?: string;
  /** 选项列表（type为select时必填） */
  options?: FilterFieldOption[];
  /** 是否可搜索（type为select时有效） */
  filterable?: boolean;
  /** 是否显示搜索图标（type为input时有效） */
  showSearchIcon?: boolean;
  /** 日期格式（type为date/daterange时有效） */
  valueFormat?: string;
  /** 日期范围分隔符（type为daterange时有效） */
  rangeSeparator?: string;
  /** 开始日期占位符（type为daterange时有效） */
  startPlaceholder?: string;
  /** 结束日期占位符（type为daterange时有效） */
  endPlaceholder?: string;
  /** 响应式布局配置 */
  colXs?: number;
  colSm?: number;
  colMd?: number;
  colLg?: number;
  colXl?: number;
}

interface AdvancedFilterProps {
  /** 筛选字段配置 */
  fields: FilterField[];
  /** v-model绑定的筛选值 */
  modelValue: Record<string, any>;
  /** 操作按钮列宽度，默认自动计算 */
  actionColSpan?: number;
  /** 是否显示操作标签，默认false */
  showActionLabel?: boolean;
  /** 字段变化时是否自动触发查询，默认false */
  autoSearch?: boolean;
}

const props = withDefaults(defineProps<AdvancedFilterProps>(), {
  actionColSpan: 24,
  showActionLabel: false,
  autoSearch: false,
});

const emit = defineEmits<{
  'update:modelValue': [values: Record<string, any>];
  search: [values: Record<string, any>];
  reset: [];
}>();

const filterValues = ref<Record<string, any>>({ ...props.modelValue });

watch(
  () => props.modelValue,
  (newVal) => {
    filterValues.value = { ...newVal };
  },
  { deep: true }
);

watch(
  filterValues,
  (newVal) => {
    emit('update:modelValue', { ...newVal });
  },
  { deep: true }
);

const handleFieldChange = () => {
  if (props.autoSearch) {
    handleSearch();
  }
};

const handleSearch = () => {
  emit('search', { ...filterValues.value });
};

const handleReset = () => {
  const resetValues: Record<string, any> = {};
  props.fields.forEach((field) => {
    resetValues[field.prop] = '';
  });
  filterValues.value = resetValues;
  emit('update:modelValue', resetValues);
  emit('reset');
};

defineExpose({
  reset: handleReset,
  search: handleSearch,
});
</script>

<style scoped>
.advanced-filter {
  margin-bottom: 16px;
}

.advanced-filter :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
