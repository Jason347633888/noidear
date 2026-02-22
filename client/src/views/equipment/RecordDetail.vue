<template>
  <div class="record-detail-page" v-loading="loading">
    <div class="page-header">
      <el-button @click="$router.back()" class="back-btn">
        <el-icon><ArrowLeft /></el-icon>返回
      </el-button>
      <h1 class="page-title">维保记录详情</h1>
      <el-tag v-if="record" :type="getRecordStatusType(record.status)" effect="light" size="large">
        {{ getRecordStatusText(record.status) }}
      </el-tag>
    </div>

    <template v-if="record">
      <!-- Basic Info -->
      <el-card class="info-card">
        <template #header>
          <span class="card-title">基本信息</span>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="记录编号">
            <span class="code-text">{{ record.recordCode }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="设备名称">
            <el-link type="primary" @click="$router.push(`/equipment/${record.equipmentId}`)">
              {{ record.equipment?.name || '-' }}
            </el-link>
          </el-descriptions-item>
          <el-descriptions-item label="保养级别">
            <el-tag
              :color="getLevelColor(record.maintenanceLevel)"
              effect="dark"
              size="small"
              style="border: none"
            >
              {{ getLevelText(record.maintenanceLevel) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="维保日期">
            {{ formatDate(record.maintenanceDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="维保人员">
            {{ record.operator?.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="审核人">
            {{ record.reviewer?.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="维保前状态" :span="3">
            {{ record.beforeStatus || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="维保后状态" :span="3">
            {{ record.afterStatus || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="维保内容" :span="3">
            {{ record.content || '-' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="record.comment" label="审批意见" :span="3">
            {{ record.comment }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Photos -->
      <el-card v-if="record.photos && record.photos.length > 0" class="info-card">
        <template #header>
          <span class="card-title">现场照片</span>
        </template>
        <div class="photo-gallery">
          <el-image
            v-for="(photo, index) in record.photos"
            :key="index"
            :src="photo"
            :preview-src-list="record.photos"
            :initial-index="index"
            fit="cover"
            class="photo-item"
          />
        </div>
      </el-card>

      <!-- Signatures -->
      <el-card class="info-card">
        <template #header>
          <span class="card-title">电子签名</span>
        </template>
        <el-row :gutter="40">
          <el-col :span="12">
            <div class="signature-section">
              <h4 class="signature-label">维保人签名</h4>
              <div v-if="record.operatorSignature" class="signature-preview">
                <img :src="record.operatorSignature" alt="维保人签名" class="signature-img" />
              </div>
              <div v-else class="signature-empty">暂无签名</div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="signature-section">
              <h4 class="signature-label">审核人签名</h4>
              <div v-if="record.reviewerSignature" class="signature-preview">
                <img :src="record.reviewerSignature" alt="审核人签名" class="signature-img" />
              </div>
              <div v-else class="signature-empty">暂无签名</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- Actions -->
      <el-card v-if="record.status === 'draft' || record.status === 'submitted'" class="info-card">
        <template #header>
          <span class="card-title">操作</span>
        </template>
        <div class="action-bar">
          <el-button
            v-if="record.status === 'draft'"
            type="primary"
            @click="handleSubmit"
            :loading="submitting"
          >
            提交审批
          </el-button>
          <el-button
            v-if="record.status === 'submitted'"
            type="success"
            @click="showApproveDialog = true"
          >
            审批通过
          </el-button>
          <el-button
            v-if="record.status === 'submitted'"
            type="danger"
            @click="showRejectDialog = true"
          >
            审批驳回
          </el-button>
        </div>
      </el-card>
    </template>

    <!-- Approve Dialog -->
    <el-dialog v-model="showApproveDialog" title="审批通过" width="500px">
      <el-form :model="approvalForm" label-width="100px">
        <el-form-item label="审批意见">
          <el-input
            v-model="approvalForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入审批意见（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApproveDialog = false">取消</el-button>
        <el-button type="success" @click="handleApprove" :loading="approving">确认通过</el-button>
      </template>
    </el-dialog>

    <!-- Reject Dialog -->
    <el-dialog v-model="showRejectDialog" title="审批驳回" width="500px">
      <el-form :model="approvalForm" label-width="100px">
        <el-form-item label="驳回原因" required>
          <el-input
            v-model="approvalForm.comment"
            type="textarea"
            :rows="3"
            placeholder="请输入驳回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" @click="handleReject" :loading="approving">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import equipmentApi, {
  type MaintenanceRecord,
  getRecordStatusText,
  getRecordStatusType,
  getLevelText,
  getLevelColor,
} from '@/api/equipment';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const record = ref<MaintenanceRecord | null>(null);
const submitting = ref(false);
const approving = ref(false);
const showApproveDialog = ref(false);
const showRejectDialog = ref(false);

const approvalForm = reactive({ comment: '' });

const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN');

const fetchRecord = async () => {
  const id = route.params.id as string;
  if (!id) return;
  loading.value = true;
  try {
    record.value = await equipmentApi.getRecordById(id) as unknown as MaintenanceRecord;
  } catch {
    ElMessage.error('获取记录详情失败');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  if (!record.value) return;
  submitting.value = true;
  try {
    await equipmentApi.submitRecord(record.value.id);
    ElMessage.success('已提交审批');
    fetchRecord();
  } catch {
    ElMessage.error('提交失败');
  } finally {
    submitting.value = false;
  }
};

const handleApprove = async () => {
  if (!record.value) return;
  approving.value = true;
  try {
    await equipmentApi.approveRecord(record.value.id, approvalForm.comment || undefined);
    ElMessage.success('审批通过');
    showApproveDialog.value = false;
    approvalForm.comment = '';
    fetchRecord();
  } catch {
    ElMessage.error('审批失败');
  } finally {
    approving.value = false;
  }
};

const handleReject = async () => {
  if (!record.value) return;
  if (!approvalForm.comment.trim()) {
    ElMessage.warning('请输入驳回原因');
    return;
  }
  approving.value = true;
  try {
    await equipmentApi.rejectRecord(record.value.id, approvalForm.comment);
    ElMessage.success('已驳回');
    showRejectDialog.value = false;
    approvalForm.comment = '';
    fetchRecord();
  } catch {
    ElMessage.error('驳回失败');
  } finally {
    approving.value = false;
  }
};

onMounted(() => {
  fetchRecord();
});
</script>

<style scoped>
.record-detail-page {
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

.photo-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.photo-item {
  width: 160px;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}

.signature-section {
  text-align: center;
}

.signature-label {
  font-size: 14px;
  color: var(--text-light);
  margin: 0 0 12px;
}

.signature-preview {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.signature-img {
  max-width: 300px;
  max-height: 150px;
}

.signature-empty {
  padding: 40px;
  color: #c0c4cc;
  font-size: 14px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
}

.action-bar {
  display: flex;
  gap: 12px;
}
</style>
