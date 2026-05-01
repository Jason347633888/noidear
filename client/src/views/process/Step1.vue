<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="180px" :disabled="disabled">
      <el-divider>新产品开发申请书（JL-09）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">基本信息</span></template>
        <el-form-item label="申请部门">
          <el-input :model-value="'产品开发部'" disabled />
        </el-form-item>
        <el-form-item label="申请日期">
          <el-input :model-value="form.requestDate" disabled />
        </el-form-item>
        <el-form-item label="关联已有产品">
          <el-select
            v-model="form.productId"
            filterable
            clearable
            placeholder="不选择则按新产品研发"
            style="width: 100%"
            @change="handleProductChange"
          >
            <el-option
              v-for="product in products"
              :key="product.id"
              :label="`${product.code} ${product.name}`"
              :value="product.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开发产品名称" prop="productName" :rules="[{ required: true, message: '请填写产品名称' }]">
          <el-input v-model="form.productName" placeholder="如：海盐芝士味蛋糕" />
        </el-form-item>
        <el-form-item label="开发数量">
          <el-input v-model="form.developmentQuantity" placeholder="如：50kg/批" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">产品要求</span></template>
        <el-form-item label="工艺要求" prop="processRequirement" :rules="[{ required: true, message: '请填写工艺要求' }]">
          <el-input v-model="form.processRequirement" type="textarea" :rows="2" placeholder="如：戚风分蛋工艺" />
        </el-form-item>
        <el-form-item label="产品特性">
          <el-input v-model="form.productCharacteristics" type="textarea" :rows="2" placeholder="口感、外观、风味特征" />
        </el-form-item>
        <el-form-item label="包装要求">
          <el-input v-model="form.packagingRequirement" placeholder="默认：充氮包装" />
        </el-form-item>
        <el-form-item label="法律法规要求">
          <el-input v-model="form.regulatoryRequirement" placeholder="默认：GB7099-2015" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">食品安全</span></template>
        <el-form-item label="引入的食品安全危害">
          <el-input v-model="form.identifiedHazards" type="textarea" :rows="3"
            placeholder="含过敏原：鸡蛋、小麦、乳制品；微生物：沙门氏菌风险（通过烘烤CCP控制）" />
        </el-form-item>
        <el-form-item label="可行性分析">
          <el-input v-model="form.feasibilityAnalysis" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="结论">
          <el-input v-model="form.applicationConclusion" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">审批 — 总经理</span></template>
        <ApprovalTaskPanel
          v-if="stepStatus === 'SUBMITTED'"
          :approval-instance-id="(modelValue as any)?.approvalInstanceId"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">已获总经理批准</el-text>
        <el-text v-else type="info" size="small">提交后等待总经理审批</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="handleSave">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交申请</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import dayjs from 'dayjs';
import ApprovalTaskPanel from '@/components/approval/ApprovalTaskPanel.vue';
import { productApi, type Product } from '@/api/product';

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
const products = ref<Product[]>([]);

const form = reactive({
  requestDate: dayjs().format('YYYY-MM-DD'),
  productId: '',
  productName: '',
  developmentQuantity: '',
  processRequirement: '',
  productCharacteristics: '',
  packagingRequirement: '充氮包装',
  regulatoryRequirement: 'GB7099-2015',
  identifiedHazards: '',
  feasibilityAnalysis: '',
  applicationConclusion: '',
});

onMounted(async () => {
  try {
    const res = await productApi.getList();
    products.value = (res as any)?.data ?? (Array.isArray(res) ? res : []);
  } catch {
    products.value = [];
  }

  if (props.modelValue) {
    const mv = props.modelValue as typeof form;
    Object.keys(form).forEach((k) => {
      if (mv[k as keyof typeof form] !== undefined) {
        (form as any)[k] = mv[k as keyof typeof form];
      }
    });
  }
});

const handleSave = () => emit('saved', { ...form });

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  if (!form.productName.trim()) {
    ElMessage.warning('请填写开发产品名称');
    return;
  }
  emit('submitted', { ...form });
};

const handleProductChange = (productId: string) => {
  const product = products.value.find((p) => p.id === productId);
  if (product) {
    form.productName = product.name;
  }
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
