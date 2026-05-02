<template>
  <div class="recall-detail-page" v-loading="loading">
    <div class="page-header" v-if="recall">
      <div class="header-left">
        <el-button link @click="$router.back()">← 返回</el-button>
        <span class="recall-no">{{ recall.recall_no }}</span>
        <span class="recall-title">{{ recall.title }}</span>
        <el-tag :type="statusTagType(recall.status)" size="small">{{ statusMap[recall.status] ?? recall.status }}</el-tag>
        <el-tag :type="riskTagType(recall.risk_level)" size="small" class="ml-8">{{ riskMap[recall.risk_level] ?? recall.risk_level }}</el-tag>
      </div>
      <div class="header-actions">
        <el-button v-if="recall.status === 'draft'" type="primary" @click="handleAction('submit')">提交审核</el-button>
        <el-button v-if="recall.status === 'pending_review'" type="success" @click="handleAction('approve')">批准</el-button>
        <el-button v-if="recall.status === 'pending_review'" type="warning" @click="handleAction('reject')">驳回</el-button>
        <el-button v-if="recall.status === 'in_progress'" type="success" @click="handleAction('complete')">完成召回</el-button>
        <el-button
          v-if="['draft','approved','notified','in_progress'].includes(recall.status)"
          type="danger"
          plain
          @click="handleAction('cancel')"
        >取消</el-button>
      </div>
    </div>

    <template v-if="recall">
      <el-card class="section-card">
        <template #header><span>召回信息</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="召回原因">{{ recall.reason }}</el-descriptions-item>
          <el-descriptions-item label="风险等级">{{ riskMap[recall.risk_level] ?? recall.risk_level }}</el-descriptions-item>
          <el-descriptions-item label="请求时间">{{ recall.requested_at }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ recall.completed_at ?? '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="section-card">
        <template #header><span>受影响批次 ({{ recall.batches?.length ?? 0 }})</span></template>
        <el-table :data="recall.batches ?? []" size="small">
          <el-table-column prop="batch_number_snapshot" label="批次号" />
          <el-table-column prop="product_name_snapshot" label="产品名称" />
          <el-table-column prop="affected_qty" label="受影响数量" />
          <el-table-column prop="unit" label="单位" />
          <el-table-column prop="disposition" label="处置方式" />
          <el-table-column prop="status" label="状态" />
        </el-table>
      </el-card>

      <el-card class="section-card">
        <template #header><span>客户通知 ({{ recall.notifications?.length ?? 0 }})</span></template>
        <el-table :data="recall.notifications ?? []" size="small">
          <el-table-column prop="customer_name" label="客户名称" />
          <el-table-column prop="notification_method" label="通知方式" />
          <el-table-column prop="status" label="状态">
            <template #default="{ row }">
              <el-tag :type="row.status === 'sent' ? 'success' : 'info'" size="small">
                {{ row.status === 'sent' ? '已通知' : '待通知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="notified_at" label="通知时间" />
          <el-table-column label="操作">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="primary"
                @click="markSent(row.id)"
              >标记已通知</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card class="section-card" v-if="recall.evidence?.length">
        <template #header><span>证据记录 ({{ recall.evidence.length }})</span></template>
        <el-table :data="recall.evidence" size="small">
          <el-table-column prop="title" label="标题" />
          <el-table-column prop="evidence_type" label="证据类型" />
          <el-table-column prop="notes" label="备注" />
        </el-table>
      </el-card>
    </template>

    <el-dialog v-model="actionDialog.visible" :title="actionDialog.title" width="480px">
      <el-form v-if="actionDialog.type === 'complete'" label-position="top">
        <el-form-item label="完成摘要" required>
          <el-input v-model="actionDialog.note" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <el-form v-else-if="actionDialog.type === 'cancel'" label-position="top">
        <el-form-item label="取消原因" required>
          <el-input v-model="actionDialog.note" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <el-form v-else-if="['approve','reject'].includes(actionDialog.type)" label-position="top">
        <el-form-item label="审核备注">
          <el-input v-model="actionDialog.note" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmAction">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import productRecallApi, { type ProductRecall } from '@/api/product-recall';

const route = useRoute();
const loading = ref(false);
const recall = ref<ProductRecall | null>(null);

const statusMap: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已批准',
  notified: '已通知',
  in_progress: '执行中',
  completed: '已完成',
  rejected: '已驳回',
  cancelled: '已取消',
};

const riskMap: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '极高',
};

const statusTagType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info', pending_review: 'warning', approved: 'success',
    notified: 'success', in_progress: 'primary', completed: 'success',
    rejected: 'danger', cancelled: 'info',
  };
  return (map[status] ?? 'info') as any;
};

const riskTagType = (risk: string) => {
  const map: Record<string, string> = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' };
  return (map[risk] ?? 'info') as any;
};

const actionDialog = ref({ visible: false, type: '', title: '', note: '' });

async function loadDetail() {
  loading.value = true;
  try {
    const res = await productRecallApi.getDetail(route.params.id as string);
    recall.value = (res as any).data ?? res;
  } finally {
    loading.value = false;
  }
}

function handleAction(type: string) {
  const titles: Record<string, string> = {
    submit: '提交审核', approve: '批准召回', reject: '驳回召回',
    complete: '完成召回', cancel: '取消召回',
  };
  actionDialog.value = { visible: true, type, title: titles[type] ?? type, note: '' };
  if (type === 'submit') confirmAction();
}

async function confirmAction() {
  const id = route.params.id as string;
  const { type, note } = actionDialog.value;
  try {
    if (type === 'submit') {
      await productRecallApi.submit(id);
    } else if (type === 'approve') {
      await productRecallApi.approve(id, note);
    } else if (type === 'reject') {
      await productRecallApi.reject(id, note);
    } else if (type === 'complete') {
      if (!note) { ElMessage.error('请填写完成摘要'); return; }
      await productRecallApi.complete(id, note);
    } else if (type === 'cancel') {
      if (!note) { ElMessage.error('请填写取消原因'); return; }
      await productRecallApi.cancel(id, note);
    }
    ElMessage.success('操作成功');
    actionDialog.value.visible = false;
    await loadDetail();
  } catch {
    ElMessage.error('操作失败');
  }
}

async function markSent(notificationId: string) {
  const id = route.params.id as string;
  try {
    await productRecallApi.markNotificationSent(id, notificationId);
    ElMessage.success('已标记通知');
    await loadDetail();
  } catch {
    ElMessage.error('操作失败');
  }
}

onMounted(loadDetail);
</script>

<style scoped>
.recall-detail-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.recall-no { font-weight: 600; color: #409eff; }
.recall-title { font-size: 16px; font-weight: 500; }
.section-card { margin-bottom: 16px; }
.ml-8 { margin-left: 8px; }
</style>
