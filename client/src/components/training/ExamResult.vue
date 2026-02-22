<template>
  <div class="exam-result">
    <el-result
      :icon="result.passed ? 'success' : 'warning'"
      :title="result.passed ? '恭喜您通过考试！' : '很遗憾，未通过考试'"
    >
      <template #sub-title>
        <div class="result-details">
          <div class="score-display">
            <span class="score-label">考试分数:</span>
            <span class="score-value" :class="{ passed: result.passed }">
              {{ result.score }} 分
            </span>
          </div>
          <div class="stats">
            <el-statistic title="答对题数" :value="result.correctCount" />
            <el-statistic title="总题数" :value="result.totalCount" />
            <el-statistic
              title="剩余考试次数"
              :value="result.remainingAttempts"
              :value-style="{ color: result.remainingAttempts > 0 ? '#67c23a' : '#f56c6c' }"
            />
          </div>
        </div>
      </template>
      <template #extra>
        <el-button
          v-if="!result.passed && result.remainingAttempts > 0"
          type="primary"
          @click="handleRetry"
        >
          重新考试
        </el-button>
        <el-button @click="handleBack">返回</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import type { ExamResultResponse } from '@/types/training';

interface Props {
  result: ExamResultResponse;
}

interface Emits {
  (e: 'retry'): void;
  (e: 'back'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const handleRetry = () => {
  emit('retry');
};

const handleBack = () => {
  emit('back');
};
</script>

<style scoped>
.exam-result {
  padding: 40px 20px;
}

.result-details {
  margin-top: 20px;
}

.score-display {
  font-size: 24px;
  margin-bottom: 30px;
}

.score-label {
  color: #909399;
  margin-right: 10px;
}

.score-value {
  font-weight: bold;
  font-size: 36px;
  color: #f56c6c;
}

.score-value.passed {
  color: #67c23a;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 60px;
  margin-top: 20px;
}
</style>
