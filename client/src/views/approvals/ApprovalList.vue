<template>
  <div class="approval-list">
    <el-card class="table-card">
      <template #header>
        <span>待我审批</span>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="number" label="文档编号" width="180" />
        <el-table-column prop="title" label="文档标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">{{ row.level }}级</template>
        </el-table-column>
        <el-table-column prop="creator" label="申请人" width="100">
          <template #default="{ row }">{{ row.creator?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button link type="success" @click="handleApprove(row)">通过</el-button>
            <el-button link type="danger" @click="handleReject(row)">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showRejectDialog" title="驳回原因" width="400px">
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请输入驳回原因" />
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '@/api/request';

interface Document {
  id: string;
  number: string;
  title: string;
  level: number;
  creator: { name: string } | null;
  createdAt: string;
}

const router = useRouter();
const loading = ref(false);
const tableData = ref<Document[]>([]);
const showRejectDialog = ref(false);
const rejectReason = ref('');
const currentDoc = ref<Document | null>(null);

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<Document[]>('/documents/pending-approvals');
    tableData.value = res;
  } catch { ElMessage.error('获取待审批列表失败'); }
  finally { loading.value = false; }
};

const handleView = (row: Document) => router.push(`/documents/${row.id}`);
const handleApprove = async (row: Document) => {
  try {
    await ElMessageBox.confirm('确定要通过该文档吗？', '提示');
    await request.post(`/documents/${row.id}/approve`, { status: 'approved' });
    ElMessage.success('已通过');
    fetchData();
  } catch {}
};

const handleReject = (row: Document) => { currentDoc.value = row; rejectReason.value = ''; showRejectDialog.value = true; };
const confirmReject = async () => {
  if (!currentDoc.value) return;
  try {
    await request.post(`/documents/${currentDoc.value.id}/approve`, { status: 'rejected', comment: rejectReason.value });
    ElMessage.success('已驳回');
    showRejectDialog.value = false;
    fetchData();
  } catch {}
};

onMounted(() => fetchData());
</script>

<style scoped>
.approval-list { padding: 0; }
</style>
