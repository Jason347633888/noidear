<template>
  <el-card shadow="never">
    <h3 class="panel-title">场景工作台</h3>
    <el-form :model="form" label-width="90px">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-form-item label="分析场景">
            <el-select v-model="form.scenario" style="width: 100%">
              <el-option label="正追查询" value="forwardTrace" />
              <el-option label="反追查询" value="backwardTrace" />
              <el-option label="物料平衡" value="materialBalance" />
              <el-option label="投诉调查" value="complaintInvestigation" />
              <el-option label="召回评估" value="recallAssessment" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="历史模式">
            <el-switch v-model="asOfEnabled" />
          </el-form-item>
        </el-col>
        <el-col v-if="asOfEnabled" :span="8">
          <el-form-item label="历史时点">
            <el-date-picker
              v-model="form.asOfAt"
              type="datetime"
              placeholder="选择时点"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label=" ">
            <el-button type="primary" style="width: 100%" @click="handleSubmit">开始分析</el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';

const asOfEnabled = ref(false);
const form = reactive({ scenario: 'forwardTrace', asOfAt: '' });

const emit = defineEmits<{ submit: [payload: Record<string, unknown>] }>();

const handleSubmit = () => {
  emit('submit', {
    ...form,
    entryMode: 'scenario',
    traceMode: 'forward',
    viewMode: 'ledger',
    timeMode: asOfEnabled.value ? 'asOf' : 'current',
  });
};
</script>

<style scoped>
.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 16px;
}
</style>
