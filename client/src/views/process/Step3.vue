<template>
  <div class="step-view">
    <el-divider>三. 风险识别</el-divider>

    <!-- 3.1 致敏原表 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">3.1 产品原料致敏原信息表</span></template>
      <AllergenTable
        v-model="(form.allergenData as any[])"
        :raw-materials="(rawMaterials as any[])"
        :disabled="disabled"
      />
    </el-card>

    <!-- 3.2 其他风险识别 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">3.2 其他风险识别（内控标准）</span></template>
      <div class="static-content">
        <pre>{{ RISK_CONTENT }}</pre>
      </div>
    </el-card>

    <!-- 3.3 食品添加剂 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">3.3 食品添加剂使用情况</span></template>
      <el-form :model="form" label-width="160px" :disabled="disabled">
        <el-form-item label="符合 GB2760">
          <el-checkbox v-model="form.gb2760Compliant">符合 GB2760</el-checkbox>
        </el-form-item>
        <el-form-item label="按照其他标准">
          <el-input v-model="form.additiveOther" placeholder="可选填" />
        </el-form-item>
      </el-form>
    </el-card>

    <div v-if="!disabled" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="emit('submitted', getFormData())">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import AllergenTable from '@/components/process/AllergenTable.vue';

const RISK_CONTENT = `1 感官要求
1.1 色泽：均匀颜色或与添加的原辅料相对应的颜色，均匀一致
1.2 气味：具有该产品应有的气味，无异味
1.3 杂质：无正常视力可见外来异物

2 理化指标
2.1 水分/(g/100g)：≤35（内控标准），检验方法 GB 5009.3

3 微生物指标
3.1 菌落总数：n=5, c=2, m=10⁴, M=10⁵ CFU/g，检验方法 GB 4789.2
3.2 大肠菌群：n=5, c=2, m=10, M=10² CFU/g，检验方法 GB 4789.3
3.3 霉菌：≤150 CFU/g，检验方法 GB 4789.15

4 检验方法
4.1 组织形态、色泽、滋味与口感、杂质按目测法测定。
4.2 理化指标按 GB 5009 规定的方法测定。
4.3 微生物指标按 GB 4789 规定的方法测定。
4.4 产品要求按 GB 7099《糕点面包》规定的方法测定。
4.5 净含量：常温条件下，采用校准后的电子秤称量测定。
4.6 外观检验：
4.6.1 标签：每箱产品均有标签，标签内容应符合 GB 7718 的规定。

5 检验规则
5.1 组批：按同一班次、同一品名、同一规格的产品为一批。
5.2 抽样：
5.2.1 感官及理化指标检验样品的抽样方法按 GB 7099 规定执行，具体如下：
5.2.2 批量范围 < 300 kg 时，抽样数量为 3 kg。
5.2.3 批量范围 300 ≤ n ≤ 800 时，抽样数量为 4~6 件。
5.2.4 批量范围 800 ≤ n ≤ 1000 时，抽样数量为 5% × n。`;

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

const form = reactive({
  allergenData: [] as unknown[],
  gb2760Compliant: true,
  additiveOther: '',
});

const rawMaterials = computed(() => {
  const step2 = props.allStepsData?.[2] as Record<string, unknown> | undefined;
  return (step2?.rawMaterials as unknown[]) ?? [];
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as typeof form;
    if (mv.allergenData !== undefined) form.allergenData = mv.allergenData;
    if (mv.gb2760Compliant !== undefined) form.gb2760Compliant = mv.gb2760Compliant;
    if (mv.additiveOther !== undefined) form.additiveOther = mv.additiveOther;
  }
});

const getFormData = () => ({ ...form, allergenData: [...(form.allergenData as unknown[])] });
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.static-content pre { white-space: pre-wrap; font-family: inherit; line-height: 1.8; font-size: 14px; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
