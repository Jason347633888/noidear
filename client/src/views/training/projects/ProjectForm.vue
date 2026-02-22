<template>
  <div class="project-form">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑培训项目' : '创建培训项目' }}</span>
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
        <el-form-item label="年度计划" prop="planId">
          <el-select v-model="form.planId" placeholder="请选择年度培训计划" style="width: 100%">
            <el-option
              v-for="plan in plans"
              :key="plan.id"
              :label="`${plan.year}年 - ${plan.title}`"
              :value="plan.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="培训标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入培训标题" maxlength="100" />
        </el-form-item>

        <el-form-item label="培训描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入培训描述"
            maxlength="500"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="部门" prop="department">
              <el-select v-model="form.department" placeholder="请选择部门" style="width: 100%">
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="季度" prop="quarter">
              <el-select v-model="form.quarter" placeholder="请选择季度" style="width: 100%">
                <el-option label="第一季度" :value="1" />
                <el-option label="第二季度" :value="2" />
                <el-option label="第三季度" :value="3" />
                <el-option label="第四季度" :value="4" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="培训讲师" prop="trainerId">
          <el-select
            v-model="form.trainerId"
            placeholder="请选择培训讲师"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="`${user.name} (${user.username})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="培训学员" prop="trainees">
          <el-select
            v-model="form.trainees"
            multiple
            placeholder="请选择培训学员（1-100人）"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="`${user.name} (${user.department || '未分配'})`"
              :value="user.id"
            />
          </el-select>
          <div class="form-hint">已选择 {{ form.trainees.length }} 人</div>
        </el-form-item>

        <el-form-item label="培训资料" prop="documentIds">
          <el-select
            v-model="form.documentIds"
            multiple
            placeholder="请选择培训资料（只能引用已发布文档）"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="doc in documents"
              :key="doc.id"
              :label="`[${doc.code}] ${doc.title}`"
              :value="doc.id"
            />
          </el-select>
          <div class="form-hint">已选择 {{ form.documentIds.length }} 份文档</div>
        </el-form-item>

        <el-form-item label="计划日期" prop="scheduledDate">
          <el-date-picker
            v-model="form.scheduledDate"
            type="date"
            placeholder="请选择计划培训日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="及格分数" prop="passingScore">
              <el-input-number
                v-model="form.passingScore"
                :min="0"
                :max="100"
                :step="1"
                style="width: 100%"
              />
              <div class="form-hint">分数范围: 0-100</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大考试次数" prop="maxAttempts">
              <el-input-number
                v-model="form.maxAttempts"
                :min="1"
                :max="10"
                :step="1"
                style="width: 100%"
              />
              <div class="form-hint">次数范围: 1-10</div>
            </el-form-item>
          </el-col>
        </el-row>

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
  createTrainingProject,
  updateTrainingProject,
  getTrainingProjectById,
  getTrainingPlans,
} from '@/api/training';
import { getDepartments, type Department } from '@/api/department';
import request from '@/api/request';
import type { CreateTrainingProjectDto, TrainingPlan } from '@/types/training';

const router = useRouter();
const route = useRoute();
const formRef = ref<FormInstance>();
const loading = ref(false);
const submitting = ref(false);

const isEdit = computed(() => !!route.params.id);

const form = reactive<CreateTrainingProjectDto>({
  planId: '',
  title: '',
  description: '',
  department: '',
  quarter: 1,
  trainerId: '',
  trainees: [],
  scheduledDate: '',
  documentIds: [],
  passingScore: 60,
  maxAttempts: 3,
});

const rules: FormRules = {
  planId: [{ required: true, message: '请选择年度培训计划', trigger: 'change' }],
  title: [{ required: true, message: '请输入培训标题', trigger: 'blur' }],
  department: [{ required: true, message: '请选择部门', trigger: 'change' }],
  quarter: [{ required: true, message: '请选择季度', trigger: 'change' }],
  trainerId: [{ required: true, message: '请选择培训讲师', trigger: 'change' }],
  trainees: [
    {
      type: 'array',
      required: true,
      min: 1,
      max: 100,
      message: '请选择1-100名培训学员',
      trigger: 'change',
    },
  ],
  passingScore: [{ required: true, message: '请输入及格分数', trigger: 'blur' }],
  maxAttempts: [{ required: true, message: '请输入最大考试次数', trigger: 'blur' }],
};

const plans = ref<TrainingPlan[]>([]);
const users = ref<any[]>([]);
const documents = ref<any[]>([]);
const departments = ref<Department[]>([]);

const fetchDepartments = async () => {
  try {
    const res = await getDepartments({ limit: 100 });
    departments.value = res.list;
  } catch (error) {
    ElMessage.error('获取部门列表失败');
  }
};

const fetchPlans = async () => {
  try {
    const res = await getTrainingPlans({ status: 'approved', limit: 100 });
    plans.value = res.items;
  } catch (error: any) {
    ElMessage.error(error.message || '获取培训计划失败');
  }
};

const fetchUsers = async () => {
  try {
    const res = await request.get<{ list: any[]; total: number }>('/users', {
      params: { limit: 1000 },
    });
    users.value = res.list || [];
  } catch (error) {
    ElMessage.error('获取用户列表失败');
  }
};

const fetchDocuments = async () => {
  try {
    const res = await request.get<{ items: any[]; total: number }>('/documents', {
      params: { status: 'published', limit: 1000 },
    });
    documents.value = res.items || [];
  } catch (error) {
    ElMessage.error('获取文档列表失败');
  }
};

const fetchProject = async () => {
  if (!isEdit.value) return;

  loading.value = true;
  try {
    const project = await getTrainingProjectById(route.params.id as string);
    Object.assign(form, {
      planId: project.planId,
      title: project.title,
      description: project.description || '',
      department: project.department,
      quarter: project.quarter,
      trainerId: project.trainerId,
      trainees: project.trainees,
      scheduledDate: project.scheduledDate || '',
      documentIds: project.documentIds || [],
      passingScore: project.passingScore,
      maxAttempts: project.maxAttempts,
    });
  } catch (error: any) {
    ElMessage.error(error.message || '获取培训项目失败');
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
        await updateTrainingProject(route.params.id as string, form);
        ElMessage.success('更新成功');
      } else {
        await createTrainingProject(form);
        ElMessage.success('创建成功');
      }
      router.push('/training/projects');
    } catch (error: any) {
      ElMessage.error(error.message || (isEdit.value ? '更新失败' : '创建失败'));
    } finally {
      submitting.value = false;
    }
  });
};

const handleBack = () => {
  router.back();
};

onMounted(async () => {
  await Promise.all([fetchDepartments(), fetchPlans(), fetchUsers(), fetchDocuments()]);
  if (isEdit.value) {
    await fetchProject();
  }
});
</script>

<style scoped>
.project-form {
  padding: 20px;
}

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
</style>
