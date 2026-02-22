<template>
  <div class="exam-page">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>在线考试</span>
          <el-button @click="handleBack">返回</el-button>
        </div>
      </template>

      <!-- 考试说明 -->
      <div v-if="!examStarted && !examResult" class="exam-intro">
        <el-result icon="info" title="考试说明">
          <template #sub-title>
            <div class="exam-info" v-if="examInfo">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="培训标题">{{ examInfo.title }}</el-descriptions-item>
                <el-descriptions-item label="及格分数">
                  {{ examInfo.passingScore }} 分
                </el-descriptions-item>
                <el-descriptions-item label="最大考试次数">
                  {{ examInfo.maxAttempts }} 次
                </el-descriptions-item>
                <el-descriptions-item label="剩余考试次数">
                  <span :style="{ color: examInfo.remainingAttempts > 0 ? '#67c23a' : '#f56c6c' }">
                    {{ examInfo.remainingAttempts }} 次
                  </span>
                </el-descriptions-item>
              </el-descriptions>
              <div class="exam-notice">
                <el-alert type="warning" :closable="false">
                  <p>1. 考试时请认真作答，确保所有题目已完成后再提交</p>
                  <p>2. 提交后系统将自动评分</p>
                  <p>3. 未通过考试且有剩余次数时可重新考试</p>
                </el-alert>
              </div>
            </div>
          </template>
          <template #extra>
            <el-button
              type="primary"
              @click="handleStartExam"
              :disabled="!examInfo || examInfo.remainingAttempts <= 0"
            >
              开始考试
            </el-button>
          </template>
        </el-result>
      </div>

      <!-- 答题区域 -->
      <div v-if="examStarted && !examResult" class="exam-content">
        <div class="exam-progress">
          <el-progress
            :percentage="answeredPercentage"
            :color="answeredPercentage === 100 ? '#67c23a' : '#409eff'"
          >
            <span>已答 {{ answeredCount }}/{{ questions.length }} 题</span>
          </el-progress>
        </div>

        <div class="question-list">
          <QuestionCard
            v-for="(question, index) in questions"
            :key="question.id"
            :question="question"
            :index="index"
            v-model="answers[question.id]"
          />
        </div>

        <div class="exam-actions">
          <el-button type="primary" @click="handleSubmitExam" :loading="submitting">
            提交答卷
          </el-button>
          <el-button @click="handleCancelExam">取消考试</el-button>
        </div>
      </div>

      <!-- 考试结果 -->
      <ExamResult
        v-if="examResult"
        :result="examResult"
        @retry="handleRetry"
        @back="handleBack"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { startExam, submitExam } from '@/api/exam';
import { getTrainingProjectById } from '@/api/training';
import QuestionCard from '@/components/training/QuestionCard.vue';
import ExamResult from '@/components/training/ExamResult.vue';
import type { StartExamResponse, ExamResultResponse } from '@/types/training';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const submitting = ref(false);
const projectId = route.params.projectId as string;

const examStarted = ref(false);
const examInfo = ref<any>(null);
const questions = ref<any[]>([]);
const answers = reactive<Record<string, string>>({});
const examResult = ref<ExamResultResponse | null>(null);

const answeredCount = computed(() => {
  return Object.keys(answers).filter((key) => answers[key]).length;
});

const answeredPercentage = computed(() => {
  if (questions.value.length === 0) return 0;
  return Math.round((answeredCount.value / questions.value.length) * 100);
});

const fetchProjectInfo = async () => {
  loading.value = true;
  try {
    const project = await getTrainingProjectById(projectId);
    examInfo.value = {
      title: project.title,
      passingScore: project.passingScore,
      maxAttempts: project.maxAttempts,
      remainingAttempts: project.maxAttempts,
    };
  } catch (error: any) {
    ElMessage.error(error.message || '获取培训项目信息失败');
    router.back();
  } finally {
    loading.value = false;
  }
};

const handleStartExam = async () => {
  loading.value = true;
  try {
    // P1-4: 开始新考试前清空之前的答案
    Object.keys(answers).forEach((key) => delete answers[key]);

    const response: StartExamResponse = await startExam(projectId);
    questions.value = response.questions;
    examInfo.value = response.projectInfo;
    examStarted.value = true;
  } catch (error: any) {
    ElMessage.error(error.message || '开始考试失败');
  } finally {
    loading.value = false;
  }
};

const validateAnswers = (): boolean => {
  const unansweredCount = questions.value.length - answeredCount.value;
  if (unansweredCount > 0) {
    ElMessage.warning(`还有 ${unansweredCount} 道题未作答，请完成后再提交`);
    return false;
  }
  return true;
};

const handleSubmitExam = async () => {
  if (!validateAnswers()) return;

  try {
    await ElMessageBox.confirm('确定提交答卷吗？提交后将无法修改', '提示', {
      confirmButtonText: '确定提交',
      cancelButtonText: '继续答题',
      type: 'warning',
    });

    submitting.value = true;
    const result = await submitExam({ projectId, answers });
    examResult.value = result;
    examStarted.value = false;
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '提交答卷失败');
    }
  } finally {
    submitting.value = false;
  }
};

const handleCancelExam = async () => {
  try {
    await ElMessageBox.confirm('确定要取消考试吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    examStarted.value = false;
    questions.value = [];
    Object.keys(answers).forEach((key) => delete answers[key]);
  } catch (error) {
    // User cancelled
  }
};

const handleRetry = () => {
  examResult.value = null;
  examStarted.value = false;
  questions.value = [];
  Object.keys(answers).forEach((key) => delete answers[key]);
};

const handleBack = () => {
  router.back();
};

onMounted(() => {
  fetchProjectInfo();
});
</script>

<style scoped>
.exam-page {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exam-intro {
  padding: 20px;
}

.exam-info {
  margin-top: 20px;
}

.exam-notice {
  margin-top: 20px;
}

.exam-notice p {
  margin: 8px 0;
}

.exam-content {
  padding: 20px 0;
}

.exam-progress {
  margin-bottom: 30px;
}

.question-list {
  margin-bottom: 30px;
}

.exam-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 30px 0;
  border-top: 2px solid #e4e7ed;
}
</style>
