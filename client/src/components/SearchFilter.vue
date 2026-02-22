<template>
  <el-card class="search-filter">
    <el-form :model="filterForm" label-width="80px" size="default">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="文档类型">
            <el-select v-model="filterForm.type" placeholder="全部类型" clearable style="width: 100%">
              <el-option v-for="t in docTypes" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="部门">
            <el-input v-model="filterForm.department" placeholder="输入部门名称" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="排序方式">
            <el-select v-model="filterForm.sortBy" style="width: 100%">
              <el-option label="相关度" value="relevance" />
              <el-option label="时间" value="date" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="16">
          <el-form-item label="标签">
            <el-select
              v-model="filterForm.tags"
              multiple
              filterable
              placeholder="选择标签"
              style="width: 100%"
            >
              <el-option
                v-for="tag in commonTags"
                :key="tag"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="16">
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              @change="onDateChange"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item>
            <el-button @click="handleReset">重置</el-button>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

interface FilterForm {
  type: string;
  department: string;
  sortBy: 'relevance' | 'date';
  startDate: string;
  endDate: string;
  tags: string[];
}

const emit = defineEmits<{
  search: [filters: FilterForm];
  reset: [];
}>();

const docTypes = [
  { label: '一级文件', value: 'level1' },
  { label: '二级文件', value: 'level2' },
  { label: '三级文件', value: 'level3' },
  { label: '记录文件', value: 'record' },
];

const commonTags = ['质量管理', '安全规程', '设备维护', '人员培训', '审批流程'];

const dateRange = ref<[string, string] | null>(null);

const filterForm = reactive<FilterForm>({
  type: '',
  department: '',
  sortBy: 'relevance',
  startDate: '',
  endDate: '',
  tags: [],
});

function onDateChange(val: [string, string] | null) {
  if (val) {
    filterForm.startDate = val[0];
    filterForm.endDate = val[1];
  } else {
    filterForm.startDate = '';
    filterForm.endDate = '';
  }
}

function handleSearch() {
  emit('search', { ...filterForm });
}

function handleReset() {
  filterForm.type = '';
  filterForm.department = '';
  filterForm.sortBy = 'relevance';
  filterForm.startDate = '';
  filterForm.endDate = '';
  filterForm.tags = [];
  dateRange.value = null;
  emit('reset');
}
</script>

<style scoped>
.search-filter {
  margin-bottom: 16px;
}
</style>
