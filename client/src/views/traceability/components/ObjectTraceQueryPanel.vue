<template>
  <el-card shadow="never">
    <h3 class="panel-title">对象查询</h3>
    <el-form :model="form" label-width="90px">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-form-item label="对象类型">
            <el-select v-model="form.objectType" style="width: 100%">
              <el-option label="原料批次" value="materialLot" />
              <el-option label="生产批次" value="productionBatch" />
              <el-option label="产品批次" value="productionBatch" />
              <el-option label="发货单" value="deliveryNote" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="追溯方向">
            <el-select v-model="form.traceMode" style="width: 100%">
              <el-option label="正向追溯" value="forward" />
              <el-option label="反向追溯" value="backward" />
              <el-option label="双向追溯" value="bidirectional" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="对象编号">
            <el-input
              v-model="form.objectId"
              placeholder="批次号 / ID"
              clearable
              @keyup.enter="handleSubmit"
            />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label=" ">
            <el-button type="primary" style="width: 100%" @click="handleSubmit">查询</el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

const form = reactive({
  objectType: 'materialLot',
  objectId: '',
  traceMode: 'forward' as 'forward' | 'backward' | 'bidirectional',
});

const emit = defineEmits<{
  submit: [payload: typeof form & { entryMode: 'object'; viewMode: 'ledger'; timeMode: 'current' }];
}>();

const handleSubmit = () => {
  emit('submit', { ...form, entryMode: 'object', viewMode: 'ledger', timeMode: 'current' });
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
