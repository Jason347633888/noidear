<template>
  <div class="learning-record-table">
    <el-table :data="records" v-loading="loading" stripe>
      <el-table-column prop="user.name" label="学员姓名" width="120" />
      <el-table-column prop="user.department" label="部门" width="100" />
      <el-table-column label="考试分数" width="100" align="center">
        <template #default="{ row }">
          {{ row.examScore !== null && row.examScore !== undefined ? row.examScore : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="考试次数" width="100" align="center">
        <template #default="{ row }">{{ row.attempts }}</template>
      </el-table-column>
      <el-table-column label="通过状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.passed ? 'success' : 'info'">
            {{ row.passed ? '已通过' : '未通过' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="完成时间" width="150">
        <template #default="{ row }">
          {{ row.completedAt ? formatDate(row.completedAt) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleViewHistory(row.id)">
            考试历史
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 考试历史对话框 -->
    <el-dialog
      v-model="historyDialogVisible"
      title="考试历史记录"
      width="800px"
      destroy-on-close
    >
      <el-table :data="examRecords" v-loading="historyLoading" stripe>
        <el-table-column label="考试次数" width="100" type="index" :index="1" />
        <el-table-column prop="score" label="分数" width="100" align="center" />
        <el-table-column label="答题详情" min-width="200">
          <template #default="{ row }">
            答对 {{ getCorrectCount(row.answers) }} / {{ getTotalCount(row.answers) }} 题
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getExamRecordsHistory } from '@/api/training';
import type { LearningRecord, ExamRecord } from '@/types/training';
import dayjs from 'dayjs';

interface Props {
  records: LearningRecord[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const historyDialogVisible = ref(false);
const historyLoading = ref(false);
const examRecords = ref<ExamRecord[]>([]);

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const formatDateTime = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

const handleViewHistory = async (learningRecordId: string) => {
  historyDialogVisible.value = true;
  historyLoading.value = true;

  try {
    examRecords.value = await getExamRecordsHistory(learningRecordId);
  } catch (error: any) {
    ElMessage.error(error.message || '获取考试历史失败');
  } finally {
    historyLoading.value = false;
  }
};

// P1-9: 修复考试历史统计错误 - 正确计算答对题目数和总题目数
const getCorrectCount = (answers: any) => {
  if (!answers || typeof answers !== 'object') return 0;
  // answers 格式: { questionId: { userAnswer, correctAnswer, isCorrect } }
  return Object.values(answers).filter((a: any) => a?.isCorrect === true).length;
};

const getTotalCount = (answers: any) => {
  if (!answers || typeof answers !== 'object') return 0;
  return Object.keys(answers).length;
};
</script>

<style scoped>
.learning-record-table {
  width: 100%;
}
</style>
