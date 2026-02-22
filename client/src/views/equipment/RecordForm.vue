<template>
  <div class="record-form-page">
    <div class="page-header">
      <el-button @click="$router.back()" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>返回
      </el-button>
      <h1 class="page-title">{{ isEdit ? '编辑维保记录' : '新建维保记录' }}</h1>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="record-form"
      v-loading="pageLoading"
    >
      <!-- Equipment Info -->
      <el-card class="form-card">
        <template #header>
          <span class="card-title">设备信息</span>
        </template>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="选择设备" prop="equipmentId">
              <el-select
                v-model="form.equipmentId"
                placeholder="请选择设备"
                filterable
                style="width: 100%"
                @change="handleEquipmentChange"
              >
                <el-option
                  v-for="eq in equipmentOptions"
                  :key="eq.id"
                  :label="`${eq.name} (${eq.code})`"
                  :value="eq.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="保养级别" prop="maintenanceLevel">
              <el-select v-model="form.maintenanceLevel" placeholder="请选择保养级别" style="width: 100%">
                <el-option label="日保养" value="daily" />
                <el-option label="周保养" value="weekly" />
                <el-option label="月保养" value="monthly" />
                <el-option label="季保养" value="quarterly" />
                <el-option label="年保养" value="annual" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="维保日期" prop="maintenanceDate">
              <el-date-picker
                v-model="form.maintenanceDate"
                type="date"
                placeholder="选择维保日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <div v-if="selectedEquipment" class="equipment-info-preview">
              <span class="info-label">设备位置:</span>
              <span>{{ selectedEquipment.location }}</span>
              <span class="info-label" style="margin-left: 16px">责任人:</span>
              <span>{{ selectedEquipment.responsiblePerson }}</span>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- Maintenance Content -->
      <el-card class="form-card">
        <template #header>
          <span class="card-title">维保内容</span>
        </template>
        <el-form-item label="维保前状态" prop="beforeStatus">
          <el-input
            v-model="form.beforeStatus"
            type="textarea"
            :rows="2"
            placeholder="请描述维保前设备状态"
          />
        </el-form-item>
        <el-form-item label="维保内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            placeholder="请详细描述维保操作内容"
          />
        </el-form-item>
        <el-form-item label="维保后状态" prop="afterStatus">
          <el-input
            v-model="form.afterStatus"
            type="textarea"
            :rows="2"
            placeholder="请描述维保后设备状态"
          />
        </el-form-item>
      </el-card>

      <!-- Photo Upload -->
      <el-card class="form-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">现场照片</span>
            <span class="card-hint">最多上传9张照片</span>
          </div>
        </template>
        <FileUploader
          v-model="form.photos"
          :uploadFn="equipmentApi.uploadPhoto"
          accept="image/*"
          :maxSize="10 * 1024 * 1024"
          :maxCount="9"
          listType="picture-card"
          :enableDrag="true"
          customTip="支持拖拽上传，单张不超过10MB"
        />
      </el-card>

      <!-- Signature -->
      <el-card class="form-card">
        <template #header>
          <span class="card-title">维保人签名</span>
        </template>
        <div class="signature-wrapper">
          <div v-if="form.operatorSignature" class="signature-preview">
            <img :src="form.operatorSignature" alt="维保人签名" class="signature-img" />
            <el-button type="danger" link @click="clearSignature">清除签名</el-button>
          </div>
          <div v-else class="signature-pad-wrapper">
            <canvas
              ref="canvasRef"
              class="signature-canvas"
              :width="canvasWidth"
              :height="canvasHeight"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart.prevent="handleTouchStart"
              @touchmove.prevent="handleTouchMove"
              @touchend.prevent="stopDrawing"
            />
            <div class="signature-actions">
              <el-button size="small" @click="clearCanvas">清除</el-button>
              <el-button size="small" type="primary" @click="confirmSignature">确认签名</el-button>
            </div>
            <div class="signature-hint">请在上方区域手写签名</div>
          </div>
        </div>
      </el-card>

      <!-- Submit Actions -->
      <div class="form-actions">
        <el-button @click="$router.back()">取消</el-button>
        <el-button type="info" @click="handleSaveDraft" :loading="saving">保存草稿</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          <el-icon><Check /></el-icon>提交审批
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { ArrowLeft, Check } from '@element-plus/icons-vue';
import equipmentApi, {
  type Equipment,
  type MaintenanceLevel,
} from '@/api/equipment';
import FileUploader from '@/components/FileUploader.vue';

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();
const pageLoading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const equipmentOptions = ref<Equipment[]>([]);
const selectedEquipment = ref<Equipment | null>(null);

const isEdit = computed(() => !!route.query.recordId);

const form = reactive({
  equipmentId: (route.query.equipmentId as string) || '',
  planId: (route.query.planId as string) || '',
  maintenanceLevel: (route.query.level as MaintenanceLevel) || '' as MaintenanceLevel | '',
  maintenanceDate: new Date().toISOString().split('T')[0],
  content: '',
  beforeStatus: '',
  afterStatus: '',
  photos: [] as string[],
  operatorSignature: '',
});

const rules: FormRules = {
  equipmentId: [{ required: true, message: '请选择设备', trigger: 'change' }],
  maintenanceLevel: [{ required: true, message: '请选择保养级别', trigger: 'change' }],
  maintenanceDate: [{ required: true, message: '请选择维保日期', trigger: 'change' }],
  content: [{ required: true, message: '请填写维保内容', trigger: 'blur' }],
  beforeStatus: [{ required: true, message: '请填写维保前状态', trigger: 'blur' }],
  afterStatus: [{ required: true, message: '请填写维保后状态', trigger: 'blur' }],
};

// --- Signature ---
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const hasDrawn = ref(false);
const canvasWidth = 500;
const canvasHeight = 200;
let ctx: CanvasRenderingContext2D | null = null;

const initCanvas = () => {
  if (!canvasRef.value) return;
  ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
};

const getCanvasPoint = (e: MouseEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

const getTouchPoint = (e: TouchEvent) => {
  const canvas = canvasRef.value;
  if (!canvas || !e.touches[0]) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
};

const startDrawing = (e: MouseEvent) => {
  if (!ctx) return;
  isDrawing.value = true;
  hasDrawn.value = true;
  const point = getCanvasPoint(e);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
};

const draw = (e: MouseEvent) => {
  if (!isDrawing.value || !ctx) return;
  const point = getCanvasPoint(e);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
};

const stopDrawing = () => { isDrawing.value = false; };

const handleTouchStart = (e: TouchEvent) => {
  if (!ctx) return;
  isDrawing.value = true;
  hasDrawn.value = true;
  const point = getTouchPoint(e);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDrawing.value || !ctx) return;
  const point = getTouchPoint(e);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
};

const clearCanvas = () => {
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  hasDrawn.value = false;
};

const confirmSignature = () => {
  if (!hasDrawn.value) {
    ElMessage.warning('请先签名');
    return;
  }
  if (!canvasRef.value) return;
  form.operatorSignature = canvasRef.value.toDataURL('image/png');
};

const clearSignature = () => {
  form.operatorSignature = '';
  hasDrawn.value = false;
  nextTick(() => initCanvas());
};

// --- Equipment ---
const handleEquipmentChange = (id: string) => {
  selectedEquipment.value = equipmentOptions.value.find((eq) => eq.id === id) || null;
};

const fetchEquipmentOptions = async () => {
  try {
    const res = await equipmentApi.getEquipmentList({ limit: 200, status: 'active' }) as any;
    equipmentOptions.value = res.list || [];
    if (form.equipmentId) {
      handleEquipmentChange(form.equipmentId);
    }
  } catch {
    // silent
  }
};

// --- Load existing record for edit ---
const loadRecord = async () => {
  const recordId = route.query.recordId as string;
  if (!recordId) return;
  pageLoading.value = true;
  try {
    const record = await equipmentApi.getRecordById(recordId) as any;
    form.equipmentId = record.equipmentId;
    form.planId = record.planId || '';
    form.maintenanceLevel = record.maintenanceLevel;
    form.maintenanceDate = record.maintenanceDate;
    form.content = record.content;
    form.beforeStatus = record.beforeStatus;
    form.afterStatus = record.afterStatus;
    form.photos = record.photos || [];
    form.operatorSignature = record.operatorSignature || '';
  } catch {
    ElMessage.error('加载记录失败');
  } finally {
    pageLoading.value = false;
  }
};

// --- Save / Submit ---
const buildPayload = () => ({
  equipmentId: form.equipmentId,
  planId: form.planId || undefined,
  maintenanceLevel: form.maintenanceLevel as MaintenanceLevel,
  maintenanceDate: form.maintenanceDate,
  content: form.content,
  beforeStatus: form.beforeStatus,
  afterStatus: form.afterStatus,
  photos: form.photos.length > 0 ? form.photos : undefined,
  operatorSignature: form.operatorSignature || undefined,
});

const handleSaveDraft = async () => {
  saving.value = true;
  try {
    const recordId = route.query.recordId as string;
    if (recordId) {
      await equipmentApi.updateRecord(recordId, buildPayload());
    } else {
      await equipmentApi.createRecord(buildPayload());
    }
    ElMessage.success('草稿已保存');
    router.push('/equipment/records');
  } catch {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  if (!form.operatorSignature) {
    ElMessage.warning('请完成维保人签名');
    return;
  }

  try {
    await ElMessageBox.confirm('确认提交维保记录进行审批？提交后将无法修改。', '确认提交');
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const recordId = route.query.recordId as string;
    let id = recordId;
    if (recordId) {
      await equipmentApi.updateRecord(recordId, buildPayload());
    } else {
      const res = await equipmentApi.createRecord(buildPayload()) as any;
      id = res.id;
    }
    await equipmentApi.submitRecord(id);
    ElMessage.success('已提交审批');
    router.push('/equipment/records');
  } catch {
    ElMessage.error('提交失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  await fetchEquipmentOptions();
  await loadRecord();
  await nextTick();
  if (!form.operatorSignature) {
    initCanvas();
  }
});
</script>

<style scoped>
.record-form-page {
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
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.card-hint {
  font-size: 12px;
  color: var(--text-light);
}

.equipment-info-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
  font-size: 13px;
  margin-top: 8px;
}

.info-label {
  color: var(--text-light);
  font-weight: 500;
}

/* Signature */
.signature-wrapper {
  padding: 0 20px;
}

.signature-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.signature-img {
  max-width: 500px;
  max-height: 200px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.signature-pad-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signature-canvas {
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  cursor: crosshair;
  touch-action: none;
}

.signature-actions {
  display: flex;
  gap: 8px;
}

.signature-hint {
  font-size: 12px;
  color: #909399;
}

/* Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 0;
}
</style>
