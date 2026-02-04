<template>
  <div class="template-edit" v-loading="loading">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">{{ isEdit ? '编辑模板' : '新建模板' }}</span>
      </template>
    </el-page-header>

    <el-card class="form-card">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="模板级别" prop="level">
          <el-select v-model="form.level" :disabled="isEdit" placeholder="选择级别">
            <el-option :value="1" label="一级模板" />
            <el-option :value="2" label="二级模板" />
            <el-option :value="3" label="三级模板" />
            <el-option :value="4" label="四级模板" />
          </el-select>
        </el-form-item>

        <el-form-item label="模板标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入模板标题" />
        </el-form-item>

        <el-form-item label="字段定义">
          <div class="fields-editor">
            <div class="fields-header">
              <span>拖拽</span>
              <span>字段名</span>
              <span>标签</span>
              <span>类型</span>
              <span>必填</span>
              <span>操作</span>
            </div>

            <div ref="fieldsContainer" class="fields-list">
              <div
                v-for="(field, index) in form.fields"
                :key="index"
                class="field-row"
              >
                <el-button type="primary" link class="drag-handle">
                  <el-icon><Rank /></el-icon>
                </el-button>
                <el-input v-model="field.name" placeholder="字段名" class="field-input" />
                <el-input v-model="field.label" placeholder="标签" class="field-input" />
                <el-select v-model="field.type" class="field-type">
                  <el-option value="text" label="文本" />
                  <el-option value="textarea" label="多行文本" />
                  <el-option value="number" label="数字" />
                  <el-option value="date" label="日期" />
                  <el-option value="select" label="选择" />
                  <el-option value="boolean" label="开关" />
                </el-select>
                <el-checkbox v-model="field.required">必填</el-checkbox>
                <el-button type="danger" link @click="removeField(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>

            <el-button type="primary" link @click="addField" class="add-field-btn">
              <el-icon><Plus /></el-icon> 添加字段
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <div class="actions">
        <el-button @click="$router.back()">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '保存修改' : '创建模板' }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Delete, Plus, Rank } from '@element-plus/icons-vue';
import Sortable from 'sortablejs';
import request from '@/api/request';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
}

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const submitting = ref(false);
const formRef = ref();
const fieldsContainer = ref<HTMLElement>();
let sortableInstance: Sortable | null = null;

const isEdit = computed(() => !!route.params.id);

const form = reactive({
  level: 4,
  title: '',
  fields: [{ name: '', label: '', type: 'text' as const, required: true }] as Field[],
});

const rules = {
  level: [{ required: true, message: '请选择模板级别', trigger: 'change' }],
  title: [{ required: true, message: '请输入模板标题', trigger: 'blur' }],
};

const addField = () => {
  form.fields.push({ name: '', label: '', type: 'text' as const, required: true });
};

const removeField = (index: number) => {
  if (form.fields.length > 1) {
    form.fields.splice(index, 1);
  }
};

const initSortable = () => {
  if (!fieldsContainer.value) return;

  sortableInstance = Sortable.create(fieldsContainer.value, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: (evt) => {
      const fields = [...form.fields];
      const [moved] = fields.splice(evt.oldIndex!, 1);
      fields.splice(evt.newIndex!, 0, moved);
      form.fields = fields;
    },
  });
};

const fetchTemplate = async () => {
  if (!isEdit.value) {
    nextTick(() => initSortable());
    return;
  }

  loading.value = true;
  try {
    const res = await request.get<any>(`/templates/${route.params.id}`);
    form.level = res.level;
    form.title = res.title;
    form.fields = Array.isArray(res.fieldsJson) ? res.fieldsJson : [];
    nextTick(() => initSortable());
  } catch {
    ElMessage.error('获取模板信息失败');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate();

  submitting.value = true;
  try {
    if (isEdit.value) {
      await request.put(`/templates/${route.params.id}`, {
        title: form.title,
        fields: form.fields,
      });
      ElMessage.success('保存成功');
    } else {
      await request.post('/templates', {
        level: form.level,
        title: form.title,
        fields: form.fields,
      });
      ElMessage.success('创建成功');
    }
    router.push('/templates');
  } catch {
    // Error handled by interceptor
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchTemplate();
});
</script>

<style scoped>
.template-edit {
  padding: 0;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
}

.form-card {
  margin-top: 16px;
}

.fields-editor {
  border: 1px dashed #dcdfe6;
  padding: 16px;
  border-radius: 4px;
  width: 100%;
}

.fields-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #909399;
  font-size: 14px;
  padding: 0 8px;
}

.fields-header span:nth-child(1) { width: 50px; }
.fields-header span:nth-child(2) { width: 100px; }
.fields-header span:nth-child(3) { width: 100px; }
.fields-header span:nth-child(4) { width: 100px; }
.fields-header span:nth-child(5) { width: 60px; }
.fields-header span:nth-child(6) { width: 60px; }

.fields-list {
  min-height: 10px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.field-input {
  width: 100px;
}

.field-type {
  width: 100px;
}

.drag-handle {
  cursor: move;
  color: #909399;
}

.drag-handle:hover {
  color: #409eff;
}

.sortable-ghost {
  opacity: 0.5;
  background: #f5f7fa;
}

.add-field-btn {
  margin-top: 8px;
}

.actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
