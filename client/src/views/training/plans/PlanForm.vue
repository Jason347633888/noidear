<template>
  <div class="plan-form">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑培训计划' : '创建培训计划' }}</span>
          <el-button @click="handleBack">返回</el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        v-loading="loading"
      >
        <el-form-item label="年度" prop="year">
          <el-select
            v-model="form.year"
            placeholder="请选择年度"
            style="width: 100%"
            :disabled="isEdit"
          >
            <el-option
              v-for="year in yearOptions"
              :key="year"
              :label="`${year}年`"
              :value="year"
            />
          </el-select>
          <div class="form-hint" v-if="isEdit">编辑模式下年度不可修改</div>
        </el-form-item>

        <el-form-item label="计划标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入计划标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存' : '创建' }}
          </el-button>
          <el-button @click="handleBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import {
  createTrainingPlan,
  updateTrainingPlan,
  getTrainingPlanById,
  getTrainingPlans,
} from '@/api/training';
import type { CreateTrainingPlanDto } from '@/types/training';

const router = useRouter();
const route = useRoute();
const formRef = ref<FormInstance>();
const loading = ref(false);
const submitting = ref(false);

const isEdit = computed(() => !!route.params.id);

// Generate year options (2020-2030)
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = 2020; year <= 2030; year++) {
    years.push(year);
  }
  return years;
});

const form = reactive<CreateTrainingPlanDto>({
  year: new Date().getFullYear(),
  title: '',
});

// Year uniqueness validator (BR-091)
const validateYearUnique = async (_rule: any, value: number, callback: any) => {
  if (!value) {
    return callback();
  }

  // Skip validation in edit mode (year is disabled anyway)
  if (isEdit.value) {
    return callback();
  }

  try {
    // Check if a plan for this year already exists
    const res = await getTrainingPlans({ year: value, limit: 1 });
    if (res.items && res.items.length > 0) {
      return callback(new Error(`${value}年的培训计划已存在`));
    }
    return callback();
  } catch (error) {
    // If API fails, allow submission (don't block user)
    console.error('Year validation failed:', error);
    return callback();
  }
};

const rules: FormRules = {
  year: [
    { required: true, message: '请选择年度', trigger: 'change' },
    { validator: validateYearUnique, trigger: 'change' },
  ],
  title: [
    { required: true, message: '请输入计划标题', trigger: 'blur' },
    { max: 100, message: '标题最多100个字符', trigger: 'blur' },
  ],
};

const fetchPlan = async () => {
  if (!isEdit.value) return;

  loading.value = true;
  try {
    const plan = await getTrainingPlanById(route.params.id as string);
    form.year = plan.year;
    form.title = plan.title;
  } catch (error: any) {
    ElMessage.error(error.message || '获取培训计划失败');
    router.back();
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (isEdit.value) {
        await updateTrainingPlan(route.params.id as string, form);
        ElMessage.success('培训计划更新成功');
      } else {
        await createTrainingPlan(form);
        ElMessage.success('培训计划创建成功');
      }
      router.push('/training/plans');
    } catch (error: any) {
      ElMessage.error(error.message || `培训计划${isEdit.value ? '更新' : '创建'}失败`);
    } finally {
      submitting.value = false;
    }
  });
};

const handleBack = () => {
  router.back();
};

onMounted(() => {
  fetchPlan();
});
</script>

<style scoped lang="scss">
.plan-form {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .form-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
</style>
