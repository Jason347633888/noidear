<template>
  <div class="question-manage">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>考试题目管理</span>
          <div>
            <el-button type="primary" @click="handleCreate">创建题目</el-button>
            <el-button @click="handleBack">返回</el-button>
          </div>
        </div>
      </template>

      <div v-if="project" class="project-info">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="培训标题">{{ project.title }}</el-descriptions-item>
          <el-descriptions-item label="题目数量">{{ questions.length }} 题</el-descriptions-item>
          <el-descriptions-item label="总分">{{ totalPoints }} 分</el-descriptions-item>
        </el-descriptions>
      </div>

      <el-alert
        v-if="project && project.status !== 'planned'"
        type="warning"
        :closable="false"
        style="margin: 20px 0"
      >
        该培训项目已开始，无法修改题目
      </el-alert>

      <div ref="questionListRef" class="question-list" v-loading="loading">
        <div
          v-for="(question, index) in questions"
          :key="question.id"
          :data-id="question.id"
          class="question-item"
        >
          <div class="question-header">
            <span class="question-number">第 {{ index + 1 }} 题</span>
            <el-tag :type="question.type === 'choice' ? 'primary' : 'success'" size="small">
              {{ question.type === 'choice' ? '选择题' : '判断题' }}
            </el-tag>
            <span class="question-points">{{ question.points }} 分</span>
            <div class="question-actions">
              <el-button
                link
                type="primary"
                size="small"
                @click="handleEdit(question)"
                :disabled="project && project.status !== 'planned'"
              >
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                @click="handleDelete(question.id)"
                :disabled="project && project.status !== 'planned'"
              >
                删除
              </el-button>
            </div>
          </div>

          <div class="question-content">{{ question.content }}</div>

          <div v-if="question.type === 'choice'" class="question-options">
            <div v-for="(option, idx) in question.options" :key="idx" class="option-item">
              <span
                :class="[
                  'option-label',
                  question.correctAnswer === ['A', 'B', 'C', 'D'][idx] ? 'correct' : '',
                ]"
              >
                {{ ['A', 'B', 'C', 'D'][idx] }}.
              </span>
              {{ option }}
            </div>
          </div>

          <div v-else class="question-answer">
            正确答案：
            <el-tag :type="question.correctAnswer === 'true' ? 'success' : 'danger'" size="small">
              {{ question.correctAnswer === 'true' ? '正确' : '错误' }}
            </el-tag>
          </div>
        </div>

        <el-empty v-if="questions.length === 0" description="暂无题目，请创建题目" />
      </div>
    </el-card>

    <QuestionForm
      v-model="formVisible"
      :project-id="projectId"
      :question="currentQuestion"
      @success="fetchQuestions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import Sortable from 'sortablejs';
import { getQuestions, deleteQuestion, updateQuestionOrder } from '@/api/exam';
import { getTrainingProjectById } from '@/api/training';
import QuestionForm from '@/components/training/QuestionForm.vue';
import type { TrainingQuestion, TrainingProject } from '@/types/training';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const projectId = route.params.id as string;
const project = ref<TrainingProject | null>(null);
const questions = ref<TrainingQuestion[]>([]);
const formVisible = ref(false);
const currentQuestion = ref<TrainingQuestion | null>(null);
const questionListRef = ref<HTMLElement | null>(null);

const totalPoints = computed(() => {
  return questions.value.reduce((sum, q) => sum + q.points, 0);
});

const fetchProject = async () => {
  try {
    project.value = await getTrainingProjectById(projectId);
  } catch (error: any) {
    ElMessage.error(error.message || '获取培训项目失败');
  }
};

const fetchQuestions = async () => {
  loading.value = true;
  try {
    questions.value = await getQuestions({ projectId });
  } catch (error: any) {
    ElMessage.error(error.message || '获取题目列表失败');
  } finally {
    loading.value = false;
  }
};

const initSortable = () => {
  // P1-3: 只有计划中(planned)和草稿(draft)状态才允许拖拽排序
  if (!questionListRef.value || !project.value) {
    return;
  }

  if (project.value.status !== 'planned' && project.value.status !== 'draft') {
    return;
  }

  Sortable.create(questionListRef.value, {
    animation: 150,
    handle: '.question-item',
    onEnd: handleSortEnd,
  });
};

const handleSortEnd = async (evt: any) => {
  if (evt.oldIndex === undefined || evt.newIndex === undefined) return;

  const movedQuestion = questions.value.splice(evt.oldIndex, 1)[0];
  questions.value.splice(evt.newIndex, 0, movedQuestion);

  const updatedOrder = questions.value.map((q, index) => ({
    id: q.id,
    order: index + 1,
  }));

  try {
    await updateQuestionOrder(updatedOrder);
    ElMessage.success('题目顺序已更新');
  } catch (error: any) {
    ElMessage.error(error.message || '更新顺序失败');
    await fetchQuestions();
  }
};

const handleCreate = () => {
  currentQuestion.value = null;
  formVisible.value = true;
};

const handleEdit = (question: TrainingQuestion) => {
  currentQuestion.value = question;
  formVisible.value = true;
};

const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除该题目吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await deleteQuestion(id);
    ElMessage.success('删除成功');
    await fetchQuestions();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

const handleBack = () => {
  router.back();
};

onMounted(async () => {
  await Promise.all([fetchProject(), fetchQuestions()]);
  await nextTick();
  initSortable();
});
</script>

<style scoped>
.question-manage {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-info {
  margin-bottom: 20px;
}

.question-list {
  margin-top: 20px;
}

.question-item {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #fff;
  cursor: move;
  transition: all 0.3s;
}

.question-item:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.question-number {
  font-weight: bold;
  font-size: 16px;
}

.question-points {
  color: #409eff;
  font-weight: bold;
}

.question-actions {
  margin-left: auto;
}

.question-content {
  font-size: 15px;
  margin: 15px 0;
  line-height: 1.6;
}

.question-options {
  margin-top: 10px;
}

.option-item {
  padding: 8px 0;
  display: flex;
  align-items: flex-start;
}

.option-label {
  font-weight: bold;
  margin-right: 8px;
  min-width: 25px;
}

.option-label.correct {
  color: #67c23a;
}

.question-answer {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}
</style>
