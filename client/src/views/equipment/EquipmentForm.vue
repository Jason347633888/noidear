<template>
  <el-dialog
    :model-value="visible"
    :title="isEdit ? '编辑设备' : '新增设备'"
    width="700px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
    @open="initForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="equipment-form">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="设备名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入设备名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="设备型号" prop="model">
            <el-input v-model="form.model" placeholder="请输入设备型号" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="设备分类" prop="category">
            <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
              <el-option label="生产设备" value="production" />
              <el-option label="检测设备" value="testing" />
              <el-option label="辅助设备" value="auxiliary" />
              <el-option label="公用设备" value="utility" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="设备位置" prop="location">
            <el-input v-model="form.location" placeholder="请输入设备位置" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="责任人" prop="responsiblePerson">
            <el-input v-model="form.responsiblePerson" placeholder="请输入责任人姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="购买日期" prop="purchaseDate">
            <el-date-picker
              v-model="form.purchaseDate"
              type="date"
              placeholder="选择购买日期"
              style="width: 100%"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="启用日期" prop="activationDate">
            <el-date-picker
              v-model="form.activationDate"
              type="date"
              placeholder="选择启用日期"
              style="width: 100%"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="保修到期" prop="warrantyExpiry">
            <el-date-picker
              v-model="form.warrantyExpiry"
              type="date"
              placeholder="选择保修到期日期"
              style="width: 100%"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="设备描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入设备描述（可选）"
        />
      </el-form-item>

      <!-- Maintenance Config -->
      <el-divider content-position="left">分级保养配置</el-divider>

      <div class="maintenance-config">
        <div
          v-for="(levelKey, index) in maintenanceLevels"
          :key="levelKey.key"
          class="config-item"
        >
          <div class="config-header">
            <el-checkbox
              v-model="form.maintenanceConfig[levelKey.key].enabled"
            >
              <el-tag :color="levelKey.color" effect="dark" size="small" class="level-tag">
                {{ levelKey.label }}
              </el-tag>
            </el-checkbox>
          </div>
          <div v-if="form.maintenanceConfig[levelKey.key].enabled" class="config-fields">
            <div class="config-field">
              <span class="field-label">周期（天）:</span>
              <el-input-number
                v-model="form.maintenanceConfig[levelKey.key].cycle"
                :min="1"
                :max="365"
                size="small"
              />
            </div>
            <div class="config-field">
              <span class="field-label">提前提醒（天）:</span>
              <el-input-number
                v-model="form.maintenanceConfig[levelKey.key].reminderDays"
                :min="0"
                :max="30"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import equipmentApi, {
  type Equipment,
  type MaintenanceConfig,
  getDefaultMaintenanceConfig,
} from '@/api/equipment';

const props = defineProps<{
  visible: boolean;
  equipment: Equipment | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'saved'): void;
}>();

const isEdit = computed(() => !!props.equipment);

const formRef = ref<FormInstance>();
const submitting = ref(false);

const maintenanceLevels = [
  { key: 'daily' as keyof MaintenanceConfig, label: '日保养', color: '#67c23a' },
  { key: 'weekly' as keyof MaintenanceConfig, label: '周保养', color: '#409eff' },
  { key: 'monthly' as keyof MaintenanceConfig, label: '月保养', color: '#e6a23c' },
  { key: 'quarterly' as keyof MaintenanceConfig, label: '季保养', color: '#f56c6c' },
  { key: 'annual' as keyof MaintenanceConfig, label: '年保养', color: '#909399' },
];

const createEmptyForm = () => ({
  name: '',
  model: '',
  category: '',
  location: '',
  responsiblePerson: '',
  purchaseDate: '',
  activationDate: '',
  warrantyExpiry: '',
  description: '',
  maintenanceConfig: getDefaultMaintenanceConfig(),
});

const form = reactive(createEmptyForm());

const rules: FormRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  model: [{ required: true, message: '请输入设备型号', trigger: 'blur' }],
  category: [{ required: true, message: '请选择设备分类', trigger: 'change' }],
  location: [{ required: true, message: '请输入设备位置', trigger: 'blur' }],
  responsiblePerson: [{ required: true, message: '请输入责任人', trigger: 'blur' }],
};

const initForm = () => {
  if (props.equipment) {
    form.name = props.equipment.name;
    form.model = props.equipment.model;
    form.category = props.equipment.category;
    form.location = props.equipment.location;
    form.responsiblePerson = props.equipment.responsiblePerson;
    form.purchaseDate = props.equipment.purchaseDate || '';
    form.activationDate = props.equipment.activationDate || '';
    form.warrantyExpiry = props.equipment.warrantyExpiry || '';
    form.description = props.equipment.description || '';
    form.maintenanceConfig = {
      ...getDefaultMaintenanceConfig(),
      ...props.equipment.maintenanceConfig,
    };
  } else {
    Object.assign(form, createEmptyForm());
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = {
      name: form.name,
      model: form.model,
      category: form.category,
      location: form.location,
      responsiblePerson: form.responsiblePerson,
      purchaseDate: form.purchaseDate || undefined,
      activationDate: form.activationDate || undefined,
      warrantyExpiry: form.warrantyExpiry || undefined,
      description: form.description || undefined,
      maintenanceConfig: form.maintenanceConfig,
    };

    if (isEdit.value && props.equipment) {
      await equipmentApi.updateEquipment(props.equipment.id, payload);
      ElMessage.success('设备更新成功');
    } else {
      await equipmentApi.createEquipment(payload);
      ElMessage.success('设备创建成功');
    }
    emit('saved');
  } catch {
    ElMessage.error(isEdit.value ? '更新失败' : '创建失败');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.equipment-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 16px;
}

.maintenance-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px;
}

.config-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 16px;
  transition: border-color 0.2s;
}

.config-item:hover {
  border-color: #c9a227;
}

.config-header {
  display: flex;
  align-items: center;
}

.level-tag {
  border: none;
  font-size: 12px;
}

.config-fields {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  padding-left: 24px;
}

.config-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}
</style>
