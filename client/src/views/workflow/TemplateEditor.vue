<template>
  <div class="template-editor">
    <el-page-header @back="router.back()" :content="isEdit ? '编辑工作流模板' : '创建工作流模板'" />

    <el-card class="editor-card" v-loading="loading">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option value="document" label="文档审批" />
            <el-option value="task" label="任务审批" />
            <el-option value="requisition" label="领料审批" />
            <el-option value="deviation" label="偏差处理" />
            <el-option value="general" label="通用流程" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>

        <el-divider content-position="left">审批步骤</el-divider>

        <div class="steps-container">
          <div
            v-for="(step, index) in form.stepsJson"
            :key="index"
            class="step-item"
          >
            <div class="step-header">
              <span class="step-number">步骤 {{ index + 1 }}</span>
              <el-button link type="danger" @click="removeStep(index)">
                删除
              </el-button>
            </div>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="步骤名称" :prop="`stepsJson.${index}.name`">
                  <el-input v-model="step.name" placeholder="如：部门主管审批" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="审批类型" :prop="`stepsJson.${index}.type`">
                  <el-select v-model="step.type" style="width: 100%">
                    <el-option value="approval" label="单人审批" />
                    <el-option value="countersign" label="会签" />
                    <el-option value="review" label="审核" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="指派方式" :prop="`stepsJson.${index}.assigneeType`">
                  <el-select v-model="step.assigneeType" style="width: 100%">
                    <el-option value="user" label="指定用户" />
                    <el-option value="role" label="指定角色" />
                    <el-option value="department" label="指定部门" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="指派对象">
              <el-input v-model="step.assigneeId" placeholder="请输入指派对象 ID" />
            </el-form-item>
          </div>

          <el-button type="dashed" style="width: 100%" @click="addStep">
            + 添加步骤
          </el-button>
        </div>
      </el-form>
    </el-card>

    <div class="actions">
      <el-button @click="router.back()">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import workflowApi, { type WorkflowStep } from '@/api/workflow';

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);
const submitting = ref(false);
const isEdit = computed(() => !!route.params.id);

const form = reactive<{
  name: string;
  category: string;
  description: string;
  stepsJson: WorkflowStep[];
}>({
  name: '',
  category: '',
  description: '',
  stepsJson: [],
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
};

const addStep = () => {
  form.stepsJson.push({
    name: '',
    type: 'approval',
    assigneeType: 'user',
    assigneeId: '',
    order: form.stepsJson.length + 1,
  });
};

const removeStep = (index: number) => {
  form.stepsJson.splice(index, 1);
  form.stepsJson.forEach((s, i) => { s.order = i + 1; });
};

const fetchTemplate = async () => {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const res: any = await workflowApi.getTemplateById(route.params.id as string);
    form.name = res.name;
    form.category = res.category;
    form.description = res.description || '';
    form.stepsJson = res.stepsJson || [];
  } catch (error) {
    ElMessage.error('获取模板详情失败');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  try { await formRef.value.validate(); } catch { return; }

  if (form.stepsJson.length === 0) {
    ElMessage.warning('请至少添加一个审批步骤');
    return;
  }

  submitting.value = true;
  try {
    if (isEdit.value) {
      await workflowApi.updateTemplate(route.params.id as string, {
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        stepsJson: form.stepsJson,
      });
      ElMessage.success('模板更新成功');
    } else {
      await workflowApi.createTemplate({
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        stepsJson: form.stepsJson,
      });
      ElMessage.success('模板创建成功');
    }
    router.push('/workflow/templates');
  } catch (error) {
    // 错误由拦截器处理
  } finally {
    submitting.value = false;
  }
};

onMounted(() => { fetchTemplate(); });
</script>

<style scoped>
.template-editor { padding: 0; }
.editor-card { margin-top: 16px; }
.steps-container { padding: 0 20px; }
.step-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: #fafafa;
}
.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.step-number { font-weight: 600; color: #303133; }
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
</style>
