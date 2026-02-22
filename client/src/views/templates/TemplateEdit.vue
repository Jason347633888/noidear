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
          <div class="field-import-actions">
            <el-button type="primary" link @click="showExcelUpload = !showExcelUpload">
              <el-icon><Upload /></el-icon>
              {{ showExcelUpload ? '隐藏' : '从Excel导入' }}
            </el-button>
          </div>

          <!-- Excel上传组件 -->
          <ExcelUpload
            v-if="showExcelUpload"
            @import="handleExcelImport"
            class="excel-upload-section"
          />

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
                class="field-row-wrapper"
              >
                <div class="field-row">
                  <el-button type="primary" link class="drag-handle">
                    <el-icon><Rank /></el-icon>
                  </el-button>
                  <el-input v-model="field.name" placeholder="字段名" class="field-input" />
                  <el-input v-model="field.label" placeholder="标签" class="field-input" />
                  <el-select v-model="field.type" class="field-type" @change="onFieldTypeChange(field)">
                    <el-option-group
                      v-for="group in FIELD_TYPE_GROUPS"
                      :key="group.label"
                      :label="group.label"
                    >
                      <el-option
                        v-for="ft in group.types"
                        :key="ft.value"
                        :value="ft.value"
                        :label="ft.label"
                      />
                    </el-option-group>
                  </el-select>
                  <el-checkbox v-model="field.required">必填</el-checkbox>
                  <el-button type="danger" link @click="removeField(index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>

                <!-- Options editor for select/radio/checkbox/cascader -->
                <div v-if="fieldTypeNeedsOptions(field.type)" class="options-editor">
                  <div class="options-label">选项列表:</div>
                  <div
                    v-for="(opt, optIdx) in (field.options || [])"
                    :key="optIdx"
                    class="option-row"
                  >
                    <el-input
                      v-model="opt.label"
                      placeholder="选项名称"
                      size="small"
                      class="option-input"
                      @input="opt.value = opt.label"
                    />
                    <el-button
                      type="danger"
                      link
                      size="small"
                      @click="removeOption(field, optIdx)"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                  <el-button
                    type="primary"
                    link
                    size="small"
                    @click="addOption(field)"
                  >
                    + 添加选项
                  </el-button>
                </div>
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
import { Delete, Plus, Rank, Upload } from '@element-plus/icons-vue';
import Sortable from 'sortablejs';
import request from '@/api/request';
import ExcelUpload from '@/components/template/ExcelUpload.vue';
import {
  FIELD_TYPE_GROUPS,
  fieldTypeNeedsOptions,
} from '@/constants/field-types';
import type { FieldTypeValue } from '@/constants/field-types';

interface FieldOption {
  label: string;
  value: string | number;
}

interface Field {
  name: string;
  label: string;
  type: FieldTypeValue;
  required: boolean;
  options?: FieldOption[];
}

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const submitting = ref(false);
const showExcelUpload = ref(false);
const formRef = ref();
const fieldsContainer = ref<HTMLElement>();
let sortableInstance: Sortable | null = null;

const isEdit = computed(() => !!route.params.id);

const form = reactive({
  level: 4,
  title: '',
  fields: [{ name: '', label: '', type: 'text', required: true }] as Field[],
});

const rules = {
  level: [{ required: true, message: '请选择模板级别', trigger: 'change' }],
  title: [{ required: true, message: '请输入模板标题', trigger: 'blur' }],
};

const addField = () => {
  form.fields.push({ name: '', label: '', type: 'text', required: true });
};

const removeField = (index: number) => {
  if (form.fields.length > 1) {
    form.fields.splice(index, 1);
  }
};

const onFieldTypeChange = (field: Field) => {
  // Initialize options array when switching to a type that needs options
  if (fieldTypeNeedsOptions(field.type) && !field.options) {
    field.options = [{ label: '', value: '' }];
  }
};

const addOption = (field: Field) => {
  if (!field.options) {
    field.options = [];
  }
  field.options.push({ label: '', value: '' });
};

const removeOption = (field: Field, optIdx: number) => {
  if (field.options && field.options.length > 1) {
    field.options.splice(optIdx, 1);
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

const handleExcelImport = (fields: Field[]) => {
  form.fields = fields;
  showExcelUpload.value = false;
  ElMessage.success(`已导入 ${fields.length} 个字段`);
  // 重新初始化拖拽功能
  nextTick(() => {
    if (sortableInstance) {
      sortableInstance.destroy();
    }
    initSortable();
  });
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

.field-import-actions {
  margin-bottom: 16px;
}

.excel-upload-section {
  margin-bottom: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
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
.fields-header span:nth-child(4) { width: 120px; }
.fields-header span:nth-child(5) { width: 60px; }
.fields-header span:nth-child(6) { width: 60px; }

.fields-list {
  min-height: 10px;
}

.field-row-wrapper {
  margin-bottom: 8px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-input {
  width: 100px;
}

.field-type {
  width: 120px;
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

.options-editor {
  margin-left: 58px;
  margin-top: 4px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.options-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.option-input {
  width: 180px;
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
