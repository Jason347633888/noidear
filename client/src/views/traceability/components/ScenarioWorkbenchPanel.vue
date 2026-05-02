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
        <el-col :span="5">
          <el-form-item label="对象类型">
            <el-select v-model="form.objectType" style="width: 100%">
              <el-option label="原料批次" value="materialLot" />
              <el-option label="产品批次" value="productionBatch" />
              <el-option label="发货单" value="deliveryNote" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="对象编号">
            <el-input v-model="form.objectId" placeholder="批次号 / ID" clearable />
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
const form = reactive({
  scenario: 'forwardTrace',
  objectType: 'materialLot',
  objectId: '',
  asOfAt: '',
});

const emit = defineEmits<{ submit: [payload: Record<string, unknown>] }>();

const scenarioTraceMode = (scenario: string) => {
  if (scenario === 'backwardTrace' || scenario === 'complaintInvestigation' || scenario === 'recallAssessment') {
    return 'backward';
  }
  if (scenario === 'materialBalance') return 'bidirectional';
  return 'forward';
};

const handleSubmit = () => {
  emit('submit', {
    scenario: form.scenario,
    entryMode: 'scenario',
    traceMode: scenarioTraceMode(form.scenario),
    viewMode: 'ledger',
    timeMode: asOfEnabled.value ? 'asOf' : 'current',
    asOfAt: form.asOfAt,
    filters: {
      objectType: form.objectType,
      objectId: form.objectId,
    },
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
