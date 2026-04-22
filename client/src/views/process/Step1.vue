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
        <el-form-item label="工艺形式" prop="processType"
          :rules="[{ required: true, message: '请选择工艺形式' }]">
          <el-radio-group v-model="form.processType">
            <el-radio value="戚风分蛋工艺">戚风分蛋工艺</el-radio>
            <el-radio value="全蛋工艺">全蛋工艺</el-radio>
          </el-radio-group>
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
          <p class="dept-title"><strong>1. 产品开发部</strong></p>
          <ol>
            <li>编写新产品开发材料</li>
            <li>确定配方、工艺、参数、工艺流程</li>
            <li>出具《试验记录》</li>
            <li>输出成品标准、包装标准</li>
            <li>组织设计输入评审、输出评审、变更评审</li>
            <li>牵头《新产品危害评估》（HACCP）</li>
            <li>确认过敏原、标签、保质期，稳定性方案，完成开发输出</li>
            <li>最终输出：新品放行审批表</li>
          </ol>
          <p class="dept-title"><strong>2. 制造部</strong></p>
          <ol>
            <li>配合中试，填写试产期间的生产报表、批次记录</li>
            <li>按研发给出的工艺执行，记录真实参数</li>
            <li>反馈：工艺是否可量产、设备是否匹配、操作是否可行</li>
            <li>负责现场 5S、卫生、交叉污染控制</li>
            <li>配合过敏原隔离、工器具专用</li>
            <li>参与新品放行评审，确认可量产</li>
          </ol>
          <p class="dept-title"><strong>3. 品质部</strong></p>
          <ol>
            <li>审核法规、国标、客户要求是否合规</li>
            <li>参与危害评估、HACCP 小组</li>
            <li>负责：原料检验，出具原料验收标准；过程（质检组）、成品检验，出具检验报告</li>
            <li>监督 CCP 关键控制点是否合理</li>
            <li>审核标签、过敏原、净含量合规性</li>
            <li>保质期试验、稳定性试验数据记录与判定</li>
            <li>确保计量器具在校验有效期内，提供设备清单、校准证书</li>
            <li>参与试产确认，出具质量放行意见</li>
          </ol>
          <p class="dept-title"><strong>4. 采购部</strong></p>
          <ol>
            <li>根据研发提供的原料清单寻找 / 确认供应商</li>
            <li>提供原料资质、检测报告、合规文件</li>
            <li>确保原料规格、过敏原、添加剂符合要求</li>
            <li>提供小试 / 中试所需试验原料、包装材料；购置新增设备</li>
            <li>确认食品接触材料（包装）符合 GB 4806</li>
          </ol>
          <p class="dept-title"><strong>5. 工程部</strong></p>
          <ol>
            <li>确认设备是否满足新品生产要求</li>
            <li>负责设备调试、校准、维护</li>
            <li>配合试产：设备改造；工器具定制；防护、隔离措施</li>
          </ol>
          <p class="dept-title"><strong>6. 行政人事部</strong></p>
          <ol>
            <li>负责新增人员招聘、岗前培训</li>
            <li>办理市监局要求的备案、人员健康证等</li>
            <li>协调厂区、仓库、更衣室、消毒设施等配套</li>
            <li>提供：人员档案、培训记录、健康证清单</li>
          </ol>
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
import { firstValidationMessage, validateStep1 } from '@/utils/processValidation';

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
  processType: '',
  shelfLife: '',
});

onMounted(() => {
  form.applicant = userStore.user?.name ?? '';
  if (props.modelValue) {
    const mv = props.modelValue as typeof form;
    if (mv.applicant !== undefined) form.applicant = mv.applicant;
    if (mv.flavorRequirement !== undefined) form.flavorRequirement = mv.flavorRequirement;
    if (mv.pesticideRequirement !== undefined) form.pesticideRequirement = mv.pesticideRequirement;
    if (mv.heavyMetalRequirement !== undefined) form.heavyMetalRequirement = mv.heavyMetalRequirement;
    if (mv.microbiologicalRequirement !== undefined) form.microbiologicalRequirement = mv.microbiologicalRequirement;
    if (mv.standardRequirement !== undefined) form.standardRequirement = mv.standardRequirement;
    if (mv.labelRequirement !== undefined) form.labelRequirement = mv.labelRequirement;
    if (mv.nutritionRequirement !== undefined) form.nutritionRequirement = mv.nutritionRequirement;
    if (mv.submitDate !== undefined) form.submitDate = mv.submitDate;
    if (mv.productName !== undefined) form.productName = mv.productName;
    if (mv.processType !== undefined) form.processType = mv.processType as string;
    if (mv.shelfLife !== undefined) form.shelfLife = mv.shelfLife;
  }
});

const handleSave = () => {
  emit('saved', { ...form });
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const result = validateStep1({ ...form });
  if (!result.valid) {
    ElMessage.warning(firstValidationMessage(result));
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
.static-content .dept-title { margin-top: 14px; margin-bottom: 4px; }
.static-content ol { margin: 0 0 4px 20px; padding: 0; }
.static-content ol li { line-height: 1.9; color: var(--el-text-color-regular); }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
