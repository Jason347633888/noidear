<template>
  <div class="management-review-list">
    <PageHeaderBlock eyebrow="质量与合规" title="管理评审" />
    <div class="list-header-actions">
      <el-button type="primary" @click="dialogVisible = true">新建年度评审</el-button>
    </div>

    <el-table :data="reviews" v-loading="loading" border>
      <el-table-column prop="year" label="年度" width="100" />
      <el-table-column prop="title" label="标题" min-width="220" />
      <el-table-column prop="status" label="状态" width="140" />
      <el-table-column prop="reviewDate" label="评审时间" width="160">
        <template #default="{ row }">{{ formatDate(row.reviewDate) }}</template>
      </el-table-column>
      <el-table-column label="输入材料" width="120">
        <template #default="{ row }">{{ row.inputs?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="改进措施" width="120">
        <template #default="{ row }">{{ row.actions?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button type="primary" link @click="router.push(`/management-reviews/${row.id}`)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新建年度管理评审" width="520px">
      <el-form :model="form" label-width="130px">
        <el-form-item label="年度" required>
          <el-input-number v-model="form.year" :min="2000" :max="2100" />
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="评审时间">
          <el-date-picker v-model="form.reviewDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="地点">
          <el-input v-model="form.location" />
        </el-form-item>
        <el-form-item label="材料截止日期">
          <el-date-picker v-model="form.materialDueDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createReview">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { managementReviewApi, type ManagementReview } from '@/api/management-review';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const reviews = ref<ManagementReview[]>([]);
const currentYear = new Date().getFullYear();
const form = reactive({
  year: currentYear,
  title: `${currentYear} 年管理评审`,
  reviewDate: '',
  location: '会议室',
  materialDueDate: '',
});

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : '-';
}

async function loadReviews() {
  loading.value = true;
  try {
    const res = await managementReviewApi.list();
    reviews.value = (res as any).data || res;
  } finally {
    loading.value = false;
  }
}

async function createReview() {
  if (!form.year || !form.title.trim()) {
    ElMessage.warning('年度和标题不能为空');
    return;
  }
  saving.value = true;
  try {
    const res = await managementReviewApi.create({ ...form });
    const review = (res as any).data || res;
    ElMessage.success('已创建管理评审');
    dialogVisible.value = false;
    router.push(`/management-reviews/${review.id}`);
  } finally {
    saving.value = false;
  }
}

onMounted(loadReviews);
</script>

<style scoped>
.management-review-list {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.list-header-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
