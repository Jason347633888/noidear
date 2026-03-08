<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="180px" :disabled="disabled">
      <el-divider>一. 产品研发与立项申请</el-divider>

      <!-- 3.1 研发申请内容 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">1. 研发申请内容</span></template>
        <el-form-item label="申请人">
          <el-input :model-value="form.applicant" disabled placeholder="自动填入" />
        </el-form-item>
        <el-form-item label="客户/风味需求">
          <el-input v-model="form.flavorRequirement" type="textarea" :rows="3"
            placeholder="留空写产品特性" />
        </el-form-item>
        <el-form-item label="农残要求">
          <el-input v-model="form.pesticideRequirement" />
        </el-form-item>
        <el-form-item label="重金属要求">
          <el-input v-model="form.heavyMetalRequirement" />
        </el-form-item>
        <el-form-item label="微生物要求">
          <el-input v-model="form.microbiologicalRequirement" />
        </el-form-item>
        <el-form-item label="标准要求">
          <el-input v-model="form.standardRequirement" />
        </el-form-item>
        <el-form-item label="标签要求">
          <el-input v-model="form.labelRequirement" />
        </el-form-item>
        <el-form-item label="营养成分">
          <el-input v-model="form.nutritionRequirement" />
        </el-form-item>
        <el-form-item label="提交日期">
          <el-input :model-value="form.submitDate" disabled />
        </el-form-item>
      </el-card>

      <!-- 3.2 立项内容 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">2. 立项内容</span></template>
        <el-form-item label="开发产品名称" prop="productName"
          :rules="[{ required: true, message: '请填写产品名称' }]">
          <el-input v-model="form.productName" placeholder="举例：海盐芝士味蛋糕" />
        </el-form-item>
        <el-form-item label="产品规格">
          <el-input v-model="form.productSpec" placeholder="举例：2KG" />
        </el-form-item>
        <el-form-item label="工艺形式" prop="processType"
          :rules="[{ required: true, message: '请选择工艺形式', type: 'array', min: 1 }]">
          <el-checkbox-group v-model="form.processType">
            <el-checkbox value="戚风分蛋工艺">戚风分蛋工艺</el-checkbox>
            <el-checkbox value="全蛋工艺">全蛋工艺</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="预期保质期">
          <el-select v-model="form.shelfLife" placeholder="请选择">
            <el-option v-for="d in shelfLifeOptions" :key="d" :label="d" :value="d" />
          </el-select>
        </el-form-item>
      </el-card>

      <!-- 3.3 协作部门分工 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">3. 协作部门分工与职责</span></template>
        <div class="static-content">
          <p><strong>产品开发部</strong>：负责产品研发、配方制定、工艺设计</p>
          <p><strong>制造部</strong>：负责试验生产、中试验证、工艺参数确认</p>
          <p><strong>品质部</strong>：负责品质标准制定、检验验证、HACCP 评估</p>
          <p><strong>采购部</strong>：负责原料采购可行性评估、供应商管理</p>
          <p><strong>工程部</strong>：负责设备、设施及工艺能力评估</p>
          <p><strong>行政人事部</strong>：负责人员培训计划协调</p>
        </div>
      </el-card>
    </el-form>

    <div v-if="!disabled" class="action-bar">
      <el-button @click="handleSave">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import dayjs from 'dayjs';
import { useUserStore } from '@/stores/user';

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

const formRef = ref<FormInstance>();
const userStore = useUserStore();

const shelfLifeOptions = ['7天', '14天', '30天', '60天', '90天', '120天'];

const form = reactive({
  applicant: '',
  flavorRequirement: '',
  pesticideRequirement: '符合GB2763',
  heavyMetalRequirement: '符合GB5009',
  microbiologicalRequirement: '符合GB4789',
  standardRequirement: '符合GB2760/2762/29921/7099等',
  labelRequirement: '符合GB7718',
  nutritionRequirement: '符合GB28050',
  submitDate: dayjs().format('YYYY-MM-DD'),
  productName: '',
  productSpec: '',
  processType: [] as string[],
  shelfLife: '',
});

onMounted(() => {
  form.applicant = userStore.user?.name ?? '';
  if (props.modelValue) {
    Object.assign(form, props.modelValue);
  }
});

const handleSave = () => {
  emit('saved', { ...form });
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  if (!form.processType.length) {
    ElMessage.warning('请选择工艺形式');
    return;
  }
  emit('submitted', { ...form });
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.static-content p { margin: 8px 0; line-height: 1.8; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
