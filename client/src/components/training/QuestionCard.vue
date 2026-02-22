<template>
  <div class="question-card">
    <div class="question-header">
      <span class="question-number">第 {{ index + 1 }} 题</span>
      <el-tag :type="question.type === 'choice' ? 'primary' : 'success'" size="small">
        {{ question.type === 'choice' ? '选择题' : '判断题' }}
      </el-tag>
      <span class="question-points">{{ question.points }} 分</span>
    </div>

    <div class="question-content">{{ question.content }}</div>

    <div v-if="question.type === 'choice'" class="question-options">
      <el-radio-group v-model="answer" @change="handleAnswerChange">
        <el-radio v-for="(option, idx) in question.options" :key="idx" :value="['A', 'B', 'C', 'D'][idx]" class="option-radio">
          <span class="option-label">{{ ['A', 'B', 'C', 'D'][idx] }}.</span>
          {{ option }}
        </el-radio>
      </el-radio-group>
    </div>

    <div v-else class="question-options">
      <el-radio-group v-model="answer" @change="handleAnswerChange">
        <el-radio value="true" class="option-radio">正确</el-radio>
        <el-radio value="false" class="option-radio">错误</el-radio>
      </el-radio-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Question {
  id: string;
  type: 'choice' | 'judge';
  content: string;
  options?: string[];
  points: number;
  order: number;
}

interface Props {
  question: Question;
  index: number;
  modelValue?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const answer = ref(props.modelValue || '');

watch(
  () => props.modelValue,
  (newValue) => {
    answer.value = newValue || '';
  }
);

const handleAnswerChange = (value: string) => {
  emit('update:modelValue', value);
};
</script>

<style scoped>
.question-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  background-color: #fff;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.question-number {
  font-weight: bold;
  font-size: 16px;
  color: #303133;
}

.question-points {
  margin-left: auto;
  color: #409eff;
  font-weight: bold;
}

.question-content {
  font-size: 15px;
  line-height: 1.8;
  margin-bottom: 20px;
  color: #606266;
}

.question-options {
  padding-left: 10px;
}

.option-radio {
  display: block;
  padding: 12px 0;
  margin: 0;
  width: 100%;
}

.option-radio:hover {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding-left: 8px;
}

.option-label {
  font-weight: bold;
  margin-right: 8px;
  color: #409eff;
}
</style>
