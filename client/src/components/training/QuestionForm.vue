<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑题目' : '创建题目'"
    width="700px"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="题目类型" prop="type">
        <el-radio-group v-model="form.type" :disabled="isEdit">
          <el-radio value="choice">选择题</el-radio>
          <el-radio value="judge">判断题</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="题目内容" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="3"
          placeholder="请输入题目内容"
          maxlength="500"
        />
      </el-form-item>

      <div v-if="form.type === 'choice'">
        <el-form-item label="选项A" prop="optionA">
          <el-input v-model="form.optionA" placeholder="请输入选项A" />
        </el-form-item>
        <el-form-item label="选项B" prop="optionB">
          <el-input v-model="form.optionB" placeholder="请输入选项B" />
        </el-form-item>
        <el-form-item label="选项C" prop="optionC">
          <el-input v-model="form.optionC" placeholder="请输入选项C" />
        </el-form-item>
        <el-form-item label="选项D" prop="optionD">
          <el-input v-model="form.optionD" placeholder="请输入选项D" />
        </el-form-item>
        <el-form-item label="正确答案" prop="correctAnswer">
          <el-radio-group v-model="form.correctAnswer">
            <el-radio value="A">A</el-radio>
            <el-radio value="B">B</el-radio>
            <el-radio value="C">C</el-radio>
            <el-radio value="D">D</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <div v-else>
        <el-form-item label="正确答案" prop="correctAnswer">
          <el-radio-group v-model="form.correctAnswer">
            <el-radio value="true">正确</el-radio>
            <el-radio value="false">错误</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <el-form-item label="分值" prop="points">
        <el-input-number v-model="form.points" :min="1" :max="100" :step="1" />
        <span style="margin-left: 10px; color: #909399">分数范围: 1-100</span>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { createQuestion, updateQuestion } from '@/api/exam';
import type { TrainingQuestion, CreateQuestionDto } from '@/types/training';

interface Props {
  modelValue: boolean;
  projectId: string;
  question?: TrainingQuestion | null;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
}

const props = withDefaults(defineProps<Props>(), {
  question: null,
});

const emit = defineEmits<Emits>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isEdit = computed(() => !!props.question);

const form = reactive({
  type: 'choice' as 'choice' | 'judge',
  content: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: '',
  points: 5,
});

const choiceOptionValidator = (optionName: string) => {
  return (rule: any, value: string, callback: (error?: Error) => void) => {
    if (form.type === 'choice' && !value) {
      callback(new Error(`请输入选项${optionName}`));
    } else {
      callback();
    }
  };
};

const rules: FormRules = {
  type: [{ required: true, message: '请选择题目类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入题目内容', trigger: 'blur' }],
  optionA: [{ required: true, validator: choiceOptionValidator('A'), trigger: 'blur' }],
  optionB: [{ required: true, validator: choiceOptionValidator('B'), trigger: 'blur' }],
  optionC: [{ required: true, validator: choiceOptionValidator('C'), trigger: 'blur' }],
  optionD: [{ required: true, validator: choiceOptionValidator('D'), trigger: 'blur' }],
  correctAnswer: [{ required: true, message: '请选择正确答案', trigger: 'change' }],
  points: [{ required: true, message: '请输入分值', trigger: 'blur' }],
};

const loadQuestionData = (question: TrainingQuestion) => {
  form.type = question.type;
  form.content = question.content;
  form.correctAnswer = question.correctAnswer;
  form.points = question.points;

  if (question.type === 'choice' && question.options) {
    form.optionA = question.options[0] || '';
    form.optionB = question.options[1] || '';
    form.optionC = question.options[2] || '';
    form.optionD = question.options[3] || '';
  }
};

const resetForm = () => {
  form.type = 'choice';
  form.content = '';
  form.optionA = '';
  form.optionB = '';
  form.optionC = '';
  form.optionD = '';
  form.correctAnswer = '';
  form.points = 5;
};

watch(
  () => props.question,
  (question) => {
    if (question) {
      loadQuestionData(question);
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

const buildQuestionData = (): CreateQuestionDto => {
  const data: CreateQuestionDto = {
    projectId: props.projectId,
    type: form.type,
    content: form.content,
    correctAnswer: form.correctAnswer,
    points: form.points,
  };

  if (form.type === 'choice') {
    data.options = [form.optionA, form.optionB, form.optionC, form.optionD];
  }

  return data;
};

const handleClose = () => {
  emit('update:modelValue', false);
  resetForm();
};

const submitQuestion = async () => {
  const data = buildQuestionData();

  if (isEdit.value && props.question) {
    await updateQuestion(props.question.id, data);
  } else {
    await createQuestion(data);
  }

  ElMessage.success(isEdit.value ? '保存成功' : '创建成功');
  emit('success');
  handleClose();
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    const valid = await formRef.value.validate();
    if (!valid) return;

    submitting.value = true;
    await submitQuestion();
  } catch (error: any) {
    if (error !== false) {
      ElMessage.error(error.message || (isEdit.value ? '保存失败' : '创建失败'));
    }
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
/* Add any custom styles here */
</style>
