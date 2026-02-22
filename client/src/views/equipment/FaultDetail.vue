<template>
  <div class="fault-detail-page" v-loading="loading">
    <div class="page-header">
      <el-button @click="$router.back()" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>返回
      </el-button>
      <h1 class="page-title">报修单详情</h1>
      <el-tag v-if="fault" :type="getFaultStatusType(fault.status)" effect="light" size="large">
        {{ getFaultStatusText(fault.status) }}
      </el-tag>
      <el-tag v-if="fault && fault.urgencyLevel === 'urgent'" type="danger" effect="dark" size="large">
        紧急
      </el-tag>
    </div>

    <template v-if="fault">
      <el-card class="info-card">
        <template #header>
          <span class="card-title">报修信息</span>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="报修单号">
            <span class="code-text">{{ fault.faultCode }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="设备名称">
            <el-link type="primary" @click="$router.push(`/equipment/${fault.equipmentId}`)">
              {{ fault.equipment?.name || '-' }}
            </el-link>
          </el-descriptions-item>
          <el-descriptions-item label="紧急程度">
            <el-tag :type="getUrgencyType(fault.urgencyLevel)" effect="light">
              {{ getUrgencyText(fault.urgencyLevel) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="报修人">{{ fault.reporter?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="报修时间">{{ formatDateTime(fault.reportTime) }}</el-descriptions-item>
          <el-descriptions-item label="接单时间">
            {{ fault.acceptTime ? formatDateTime(fault.acceptTime) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="处理人">{{ fault.assignee?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">
            {{ fault.completeTime ? formatDateTime(fault.completeTime) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">{{ responseTime }}</el-descriptions-item>
          <el-descriptions-item label="故障描述" :span="3">{{ fault.description }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card v-if="fault.photos && fault.photos.length > 0" class="info-card">
        <template #header>
          <span class="card-title">故障照片</span>
        </template>
        <div class="photo-gallery">
          <el-image
            v-for="(photo, index) in fault.photos"
            :key="index"
            :src="photo"
            :preview-src-list="fault.photos"
            :initial-index="index"
            fit="cover"
            class="photo-item"
          />
        </div>
      </el-card>

      <el-card v-if="fault.faultCause || fault.repairAction" class="info-card">
        <template #header>
          <span class="card-title">维修记录</span>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="故障原因">{{ fault.faultCause || '-' }}</el-descriptions-item>
          <el-descriptions-item label="处理措施">{{ fault.repairAction || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="fault.repairSignature" class="repair-signature">
          <h4>维修人签名</h4>
          <img :src="fault.repairSignature" alt="维修人签名" class="signature-img" />
        </div>
      </el-card>

      <el-card v-if="fault.status === 'pending' || fault.status === 'in_progress'" class="info-card">
        <template #header>
          <span class="card-title">操作</span>
        </template>
        <div class="action-bar">
          <el-button v-if="fault.status === 'pending'" type="success" @click="handleAccept" :loading="processing">
            接单处理
          </el-button>
          <el-button v-if="fault.status === 'in_progress'" type="primary" @click="showCompleteDialog = true">
            完成维修
          </el-button>
          <el-button v-if="fault.status === 'pending'" @click="handleCancel" :loading="processing">
            取消报修
          </el-button>
        </div>
      </el-card>
    </template>

    <el-dialog v-model="showCompleteDialog" title="完成维修" width="600px" destroy-on-close>
      <el-form ref="completeFormRef" :model="completeForm" :rules="completeRules" label-width="100px">
        <el-form-item label="故障原因" prop="faultCause">
          <el-input v-model="completeForm.faultCause" type="textarea" :rows="3" placeholder="请描述故障原因" />
        </el-form-item>
        <el-form-item label="处理措施" prop="repairAction">
          <el-input v-model="completeForm.repairAction" type="textarea" :rows="3" placeholder="请描述处理措施" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCompleteDialog = false">取消</el-button>
        <el-button type="primary" @click="handleComplete" :loading="processing">确认完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import equipmentApi, {
  type EquipmentFault,
  getFaultStatusText,
  getFaultStatusType,
  getUrgencyText,
  getUrgencyType,
} from '@/api/equipment';

const route = useRoute();
const loading = ref(false);
const processing = ref(false);
const fault = ref<EquipmentFault | null>(null);
const showCompleteDialog = ref(false);
const completeFormRef = ref<FormInstance>();

const completeForm = reactive({
  faultCause: '',
  repairAction: '',
});

const completeRules: FormRules = {
  faultCause: [{ required: true, message: '请描述故障原因', trigger: 'blur' }],
  repairAction: [{ required: true, message: '请描述处理措施', trigger: 'blur' }],
};

const formatDateTime = (date: string) => new Date(date).toLocaleString('zh-CN');

const responseTime = computed(() => {
  if (!fault.value?.reportTime || !fault.value?.acceptTime) return '-';
  const diffMs = new Date(fault.value.acceptTime).getTime() - new Date(fault.value.reportTime).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes} 分钟`;
  return `${Math.floor(diffMinutes / 60)} 小时 ${diffMinutes % 60} 分钟`;
});

const fetchFault = async () => {
  const id = route.params.id as string;
  if (!id) return;
  loading.value = true;
  try {
    fault.value = await equipmentApi.getFaultById(id) as unknown as EquipmentFault;
  } catch {
    ElMessage.error('获取报修单详情失败');
  } finally {
    loading.value = false;
  }
};

const handleAccept = async () => {
  if (!fault.value) return;
  try {
    await ElMessageBox.confirm('确定要接单处理此报修吗？', '确认接单');
    processing.value = true;
    await equipmentApi.acceptFault(fault.value.id);
    ElMessage.success('已接单');
    fetchFault();
  } catch {
    // cancelled or error
  } finally {
    processing.value = false;
  }
};

const handleComplete = async () => {
  if (!fault.value || !completeFormRef.value) return;
  const valid = await completeFormRef.value.validate().catch(() => false);
  if (!valid) return;
  processing.value = true;
  try {
    await equipmentApi.completeFault(fault.value.id, {
      faultCause: completeForm.faultCause,
      repairAction: completeForm.repairAction,
    });
    ElMessage.success('维修完成');
    showCompleteDialog.value = false;
    fetchFault();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    processing.value = false;
  }
};

const handleCancel = async () => {
  if (!fault.value) return;
  try {
    await ElMessageBox.confirm('确定要取消此报修吗？', '确认取消', { type: 'warning' });
    processing.value = true;
    await equipmentApi.cancelFault(fault.value.id);
    ElMessage.success('已取消');
    fetchFault();
  } catch {
    // cancelled or error
  } finally {
    processing.value = false;
  }
};

onMounted(() => {
  fetchFault();
});
</script>

<style scoped>
.fault-detail-page {
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

.info-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
  margin-bottom: 20px;
}

.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.code-text {
  font-family: 'SF Mono', monospace;
  color: var(--text-light);
}

.photo-gallery { display: flex; flex-wrap: wrap; gap: 12px; }

.photo-item {
  width: 160px;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}

.repair-signature { margin-top: 20px; text-align: center; }
.repair-signature h4 { color: var(--text-light); margin-bottom: 12px; }

.signature-img {
  max-width: 400px;
  max-height: 200px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.action-bar { display: flex; gap: 12px; }
</style>
