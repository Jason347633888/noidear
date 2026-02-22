<template>
  <div class="template-designer">
    <el-page-header @back="router.back()" content="表单设计器" />

    <div class="designer-layout">
      <!-- 左侧：字段面板 -->
      <div class="field-panel">
        <el-card>
          <template #header>
            <span>字段组件</span>
          </template>
          <div class="field-groups">
            <div class="field-group">
              <div class="group-title">基础字段</div>
              <div class="field-list">
                <div
                  v-for="field in basicFields"
                  :key="field.type"
                  class="field-item"
                  draggable="true"
                  @dragstart="handleDragStart($event, field)"
                >
                  <el-icon><component :is="field.icon" /></el-icon>
                  <span>{{ field.label }}</span>
                </div>
              </div>
            </div>
            <div class="field-group">
              <div class="group-title">高级字段</div>
              <div class="field-list">
                <div
                  v-for="field in advancedFields"
                  :key="field.type"
                  class="field-item"
                  draggable="true"
                  @dragstart="handleDragStart($event, field)"
                >
                  <el-icon><component :is="field.icon" /></el-icon>
                  <span>{{ field.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 中间：设计区域 -->
      <div class="design-area">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>表单设计区域</span>
              <div class="header-actions">
                <el-button size="small" @click="previewVisible = true">预览</el-button>
                <el-button size="small" type="primary" @click="handleSave" :loading="saving">保存</el-button>
              </div>
            </div>
          </template>

          <div
            class="drop-zone"
            @dragover.prevent
            @drop="handleDrop"
          >
            <el-empty v-if="formFields.length === 0" description="拖拽左侧字段到此区域" />
            <div
              v-for="(field, index) in formFields"
              :key="field.name"
              class="design-field"
              :class="{ selected: selectedIndex === index }"
              @click="selectedIndex = index"
            >
              <div class="design-field-header">
                <span class="field-label">{{ field.label }}</span>
                <span class="field-type">{{ field.type }}</span>
                <div class="field-actions">
                  <el-button link size="small" @click.stop="moveUp(index)" :disabled="index === 0">
                    上移
                  </el-button>
                  <el-button link size="small" @click.stop="moveDown(index)" :disabled="index === formFields.length - 1">
                    下移
                  </el-button>
                  <el-button link type="danger" size="small" @click.stop="removeField(index)">
                    删除
                  </el-button>
                </div>
              </div>
              <div class="design-field-preview">
                <el-tag v-if="field.required" type="danger" size="small">必填</el-tag>
                <span class="field-name">{{ field.name }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 右侧：属性面板 -->
      <div class="property-panel">
        <el-card>
          <template #header>
            <span>字段属性</span>
          </template>
          <template v-if="selectedField">
            <el-form label-width="80px" size="small">
              <el-form-item label="字段名">
                <el-input v-model="selectedField.name" />
              </el-form-item>
              <el-form-item label="标签">
                <el-input v-model="selectedField.label" />
              </el-form-item>
              <el-form-item label="类型">
                <el-input :model-value="selectedField.type" disabled />
              </el-form-item>
              <el-form-item label="必填">
                <el-switch v-model="selectedField.required" />
              </el-form-item>
              <el-form-item label="占位符">
                <el-input v-model="selectedField.placeholder" />
              </el-form-item>
              <el-form-item label="禁用">
                <el-switch v-model="selectedField.disabled" />
              </el-form-item>
              <template v-if="selectedField.type === 'number' || selectedField.type === 'slider'">
                <el-form-item label="最小值">
                  <el-input-number v-model="selectedField.min" />
                </el-form-item>
                <el-form-item label="最大值">
                  <el-input-number v-model="selectedField.max" />
                </el-form-item>
              </template>
              <template v-if="hasOptions(selectedField.type)">
                <el-form-item label="选项">
                  <div class="options-editor">
                    <div
                      v-for="(opt, idx) in selectedField.options"
                      :key="idx"
                      class="option-row"
                    >
                      <el-input v-model="opt.label" placeholder="标签" size="small" />
                      <el-input v-model="opt.value" placeholder="值" size="small" />
                      <el-button link type="danger" size="small" @click="removeOption(idx)">
                        删除
                      </el-button>
                    </div>
                    <el-button size="small" @click="addOption">添加选项</el-button>
                  </div>
                </el-form-item>
              </template>
            </el-form>
          </template>
          <el-empty v-else description="请选择一个字段" :image-size="60" />
        </el-card>
      </div>
    </div>

    <!-- 预览对话框 -->
    <el-dialog v-model="previewVisible" title="表单预览" width="700px">
      <el-form label-width="120px">
        <el-form-item
          v-for="field in formFields"
          :key="field.name"
          :label="field.label"
          :required="field.required"
        >
          <DynamicField :model-value="previewData[field.name]" :field="field" />
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import DynamicField from '@/components/fields/DynamicField.vue';
import {
  Edit, Document, Calendar, Clock, Select, CircleCheck,
  Upload, Picture, Stamp, Switch, Grid, Star,
} from '@element-plus/icons-vue';

interface FieldDef {
  type: string;
  label: string;
  icon: any;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  options?: { label: string; value: string }[];
  [key: string]: any;
}

const router = useRouter();
const saving = ref(false);
const previewVisible = ref(false);
const selectedIndex = ref<number | null>(null);
const formFields = reactive<FormField[]>([]);
const previewData = reactive<Record<string, any>>({});

const basicFields: FieldDef[] = [
  { type: 'text', label: '文本输入', icon: Edit },
  { type: 'textarea', label: '多行文本', icon: Document },
  { type: 'number', label: '数字输入', icon: Edit },
  { type: 'date', label: '日期选择', icon: Calendar },
  { type: 'time', label: '时间选择', icon: Clock },
  { type: 'select', label: '下拉选择', icon: Select },
  { type: 'radio', label: '单选', icon: CircleCheck },
  { type: 'checkbox', label: '多选', icon: CircleCheck },
];

const advancedFields: FieldDef[] = [
  { type: 'file', label: '文件上传', icon: Upload },
  { type: 'image', label: '图片上传', icon: Picture },
  { type: 'signature', label: '电子签名', icon: Stamp },
  { type: 'switch', label: '开关', icon: Switch },
  { type: 'cascader', label: '级联选择', icon: Grid },
  { type: 'rate', label: '评分', icon: Star },
  { type: 'slider', label: '滑块', icon: Edit },
  { type: 'color', label: '颜色选择', icon: Edit },
  { type: 'password', label: '密码输入', icon: Edit },
  { type: 'daterange', label: '日期范围', icon: Calendar },
];

const selectedField = computed(() => {
  if (selectedIndex.value === null || selectedIndex.value >= formFields.length) return null;
  return formFields[selectedIndex.value];
});

const hasOptions = (type: string): boolean => ['select', 'radio', 'checkbox'].includes(type);

let fieldCounter = 0;
const handleDragStart = (e: DragEvent, field: FieldDef) => {
  e.dataTransfer?.setData('text/plain', JSON.stringify(field));
};

const handleDrop = (e: DragEvent) => {
  const data = e.dataTransfer?.getData('text/plain');
  if (!data) return;
  try {
    const field: FieldDef = JSON.parse(data);
    fieldCounter++;
    const newField: FormField = {
      name: `field_${fieldCounter}`,
      label: field.label,
      type: field.type,
      required: false,
      placeholder: '',
    };
    if (hasOptions(field.type)) {
      newField.options = [{ label: '选项1', value: 'option1' }];
    }
    formFields.push(newField);
    selectedIndex.value = formFields.length - 1;
  } catch (error) {
    ElMessage.error('字段添加失败');
  }
};

const moveUp = (index: number) => {
  if (index <= 0) return;
  const temp = formFields[index];
  formFields[index] = formFields[index - 1];
  formFields[index - 1] = temp;
  selectedIndex.value = index - 1;
};

const moveDown = (index: number) => {
  if (index >= formFields.length - 1) return;
  const temp = formFields[index];
  formFields[index] = formFields[index + 1];
  formFields[index + 1] = temp;
  selectedIndex.value = index + 1;
};

const removeField = (index: number) => {
  formFields.splice(index, 1);
  if (selectedIndex.value === index) {
    selectedIndex.value = null;
  } else if (selectedIndex.value !== null && selectedIndex.value > index) {
    selectedIndex.value--;
  }
};

const addOption = () => {
  if (!selectedField.value) return;
  if (!selectedField.value.options) selectedField.value.options = [];
  const idx = selectedField.value.options.length + 1;
  selectedField.value.options.push({ label: `选项${idx}`, value: `option${idx}` });
};

const removeOption = (idx: number) => {
  selectedField.value?.options?.splice(idx, 1);
};

const handleSave = async () => {
  if (formFields.length === 0) {
    ElMessage.warning('请至少添加一个字段');
    return;
  }
  saving.value = true;
  try {
    // TODO: 保存到后端
    ElMessage.success('表单模板保存成功');
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.template-designer { padding: 0; }

.designer-layout {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  height: calc(100vh - 200px);
}

.field-panel { width: 220px; flex-shrink: 0; }
.design-area { flex: 1; min-width: 0; }
.property-panel { width: 300px; flex-shrink: 0; }

.field-groups { display: flex; flex-direction: column; gap: 16px; }
.group-title { font-weight: 600; color: #303133; margin-bottom: 8px; font-size: 13px; }
.field-list { display: flex; flex-wrap: wrap; gap: 8px; }

.field-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: grab;
  font-size: 13px;
  transition: all 0.2s;
  width: calc(50% - 4px);
}
.field-item:hover { border-color: #409eff; background: #ecf5ff; }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }

.drop-zone {
  min-height: 400px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 16px;
}

.design-field {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.design-field:hover { border-color: #409eff; }
.design-field.selected { border-color: #409eff; background: #ecf5ff; }

.design-field-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.field-label { font-weight: 500; }
.field-type { font-size: 12px; color: #909399; }
.field-actions { margin-left: auto; display: flex; gap: 4px; }

.design-field-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}
.field-name { font-family: monospace; }

.options-editor { width: 100%; }
.option-row { display: flex; gap: 4px; margin-bottom: 4px; align-items: center; }
</style>
