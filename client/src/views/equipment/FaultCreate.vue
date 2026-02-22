<template>
  <div class="fault-create-page">
    <div class="page-header">
      <el-button @click="$router.back()" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>返回
      </el-button>
      <h1 class="page-title">设备报修</h1>
    </div>

    <el-card class="form-card">
      <el-steps :active="currentStep" finish-status="success" class="steps-bar">
        <el-step title="选择设备" />
        <el-step title="描述故障" />
        <el-step title="确认提交" />
      </el-steps>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="fault-form">
        <!-- Step 1: Select Equipment -->
        <div v-show="currentStep === 0" class="step-content">
          <el-form-item label="设备位置" prop="location">
            <el-select
              v-model="form.location"
              placeholder="请选择设备所在区域"
              filterable
              style="width: 100%"
              @change="handleLocationChange"
            >
              <el-option v-for="loc in locationOptions" :key="loc" :label="loc" :value="loc" />
            </el-select>
          </el-form-item>

          <el-form-item label="选择设备" prop="equipmentId">
            <el-select
              v-model="form.equipmentId"
              placeholder="请选择设备"
              filterable
              style="width: 100%"
              :disabled="!form.location"
            >
              <el-option
                v-for="eq in filteredEquipment"
                :key="eq.id"
                :label="`${eq.name} (${eq.code})`"
                :value="eq.id"
              />
            </el-select>
          </el-form-item>

          <div v-if="selectedEquipment" class="equipment-preview">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="设备编号">{{ selectedEquipment.code }}</el-descriptions-item>
              <el-descriptions-item label="设备名称">{{ selectedEquipment.name }}</el-descriptions-item>
              <el-descriptions-item label="设备型号">{{ selectedEquipment.model }}</el-descriptions-item>
              <el-descriptions-item label="责任人">{{ selectedEquipment.responsiblePerson }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- Step 2: Describe Fault -->
        <div v-show="currentStep === 1" class="step-content">
          <el-form-item label="故障描述" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="5" placeholder="请详细描述设备故障情况" />
          </el-form-item>

          <el-form-item label="紧急程度" prop="urgencyLevel">
            <el-radio-group v-model="form.urgencyLevel">
              <el-radio-button value="">
                <span style="color: #909399; font-weight: 500">不填</span>
              </el-radio-button>
              <el-radio-button value="urgent">
                <span style="color: #f56c6c; font-weight: 500">紧急</span>
              </el-radio-button>
              <el-radio-button value="normal">
                <span style="color: #e6a23c; font-weight: 500">普通</span>
              </el-radio-button>
              <el-radio-button value="low">
                <span style="color: #909399; font-weight: 500">低</span>
              </el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="故障照片">
            <FileUploader
              v-model="form.photos"
              :uploadFn="equipmentApi.uploadPhoto"
              accept="image/*"
              :maxSize="10 * 1024 * 1024"
              :maxCount="9"
              listType="picture-card"
              customTip="最多9张，单张不超过10MB"
            />
          </el-form-item>
        </div>

        <!-- Step 3: Confirm -->
        <div v-show="currentStep === 2" class="step-content">
          <el-descriptions title="报修信息确认" :column="2" border>
            <el-descriptions-item label="设备名称">{{ selectedEquipment?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="设备编号">{{ selectedEquipment?.code || '-' }}</el-descriptions-item>
            <el-descriptions-item label="设备位置">{{ form.location }}</el-descriptions-item>
            <el-descriptions-item label="紧急程度">
              <el-tag v-if="form.urgencyLevel" :type="getUrgencyType(form.urgencyLevel as FaultUrgency)" effect="light">
                {{ getUrgencyText(form.urgencyLevel as FaultUrgency) }}
              </el-tag>
              <span v-else class="empty-text">未填写</span>
            </el-descriptions-item>
            <el-descriptions-item label="故障描述" :span="2">{{ form.description }}</el-descriptions-item>
            <el-descriptions-item label="照片数量" :span="2">{{ form.photos.length }} 张</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- Navigation -->
        <div class="step-actions">
          <el-button v-if="currentStep > 0" @click="currentStep--">上一步</el-button>
          <el-button v-if="currentStep < 2" type="primary" @click="handleNext">下一步</el-button>
          <el-button v-if="currentStep === 2" type="primary" @click="handleSubmit" :loading="submitting">
            <el-icon><Check /></el-icon>确认提交
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { ArrowLeft, Check } from '@element-plus/icons-vue';
import equipmentApi, {
  type Equipment,
  type FaultUrgency,
  getUrgencyText,
  getUrgencyType,
} from '@/api/equipment';
import FileUploader from '@/components/FileUploader.vue';

const router = useRouter();
const formRef = ref<FormInstance>();
const currentStep = ref(0);
const submitting = ref(false);
const equipmentOptions = ref<Equipment[]>([]);

const form = reactive({
  location: '',
  equipmentId: '',
  description: '',
  urgencyLevel: '' as FaultUrgency | '',
  photos: [] as string[],
});

const rules: FormRules = {
  location: [{ required: true, message: '请选择设备所在区域', trigger: 'change' }],
  equipmentId: [{ required: true, message: '请选择设备', trigger: 'change' }],
  description: [{ required: true, message: '请描述故障情况', trigger: 'blur' }],
  urgencyLevel: [],
};

const locationOptions = computed(() => {
  const locations = new Set(equipmentOptions.value.map((eq) => eq.location));
  return Array.from(locations).sort();
});

const filteredEquipment = computed(() => {
  if (!form.location) return [];
  return equipmentOptions.value.filter((eq) => eq.location === form.location && eq.status === 'active');
});

const selectedEquipment = computed(() => {
  return equipmentOptions.value.find((eq) => eq.id === form.equipmentId) || null;
});

const handleLocationChange = () => {
  form.equipmentId = '';
};

const handleNext = () => {
  if (currentStep.value === 0 && !form.equipmentId) {
    ElMessage.warning('请先选择设备');
    return;
  }
  if (currentStep.value === 1 && !form.description.trim()) {
    ElMessage.warning('请填写故障描述');
    return;
  }
  currentStep.value++;
};

const handleSubmit = async () => {
  try {
    await ElMessageBox.confirm('确认提交报修单？', '确认提交');
  } catch {
    return;
  }

  submitting.value = true;
  try {
    await equipmentApi.createFault({
      equipmentId: form.equipmentId,
      description: form.description,
      ...(form.urgencyLevel ? { urgencyLevel: form.urgencyLevel as FaultUrgency } : {}),
      photos: form.photos.length > 0 ? form.photos : undefined,
    });
    ElMessage.success('报修单已提交');
    router.push('/equipment/faults');
  } catch {
    ElMessage.error('提交失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  try {
    const res = await equipmentApi.getEquipmentList({ limit: 500 }) as any;
    equipmentOptions.value = res.list || [];
  } catch {
    ElMessage.error('获取设备列表失败');
  }
});
</script>

<style scoped>
.fault-create-page {
  --primary: #1a1a2e;
  --accent: #c9a227;
  --text: #2c3e50;
  --text-light: #7f8c8d;
  font-family: 'Inter', sans-serif;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn { border-radius: 8px; }

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
  margin: 0;
}

.form-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
  padding: 24px;
}

.steps-bar { margin-bottom: 32px; }

.step-content { min-height: 300px; padding: 0 40px; }

.equipment-preview {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.upload-tip {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 8px;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 40px;
  border-top: 1px solid #f0f0f0;
  margin-top: 24px;
}
</style>
