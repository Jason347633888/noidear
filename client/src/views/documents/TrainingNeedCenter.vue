<template>
  <div class="training-need-center">
    <el-alert
      class="page-note"
      type="info"
      show-icon
      :closable="false"
      title="这里是文控派生培训需求，不是培训项目台账。接受后应关联到培训项目，由培训模块承接计划、签到、考试和档案。"
    />
    <div class="toolbar">
      <el-select v-model="status" clearable placeholder="状态" @change="load">
        <el-option value="suggested" label="待评估" />
        <el-option value="accepted" label="已接受" />
        <el-option value="dismissed" label="已驳回" />
        <el-option value="linked" label="已关联培训" />
      </el-select>
      <el-button type="primary" @click="load">刷新</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="document.title" label="文件" min-width="220" show-overflow-tooltip />
      <el-table-column prop="targetDepartment" label="目标部门" width="140" />
      <el-table-column prop="status" label="状态" width="110" />
      <el-table-column prop="reason" label="原因" min-width="260" show-overflow-tooltip />
      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <el-button link type="primary" @click="accept(row.id)">接受</el-button>
          <el-button link type="danger" @click="dismiss(row.id)">驳回</el-button>
          <el-button
            v-if="row.status === 'accepted'"
            link
            type="success"
            @click="openLinkDialog(row)"
          >
            关联培训项目
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="linkDialog.visible" title="关联培训项目" width="420px">
      <el-form label-width="100px">
        <el-form-item label="培训项目ID">
          <el-input v-model="linkDialog.projectId" placeholder="输入已有培训项目ID" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="linkDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="linkDialog.loading" @click="submitLink">确认关联</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { documentOperationsApi } from '@/api/document-operations';

const status = ref('');
const rows = ref<any[]>([]);
const loading = ref(false);

const linkDialog = reactive({
  visible: false,
  loading: false,
  needId: '',
  projectId: '',
});

const load = async () => {
  loading.value = true;
  try {
    rows.value = await documentOperationsApi.listTrainingNeeds(status.value || undefined) as any[];
  } catch {
    ElMessage.error('获取培训需求失败');
  } finally {
    loading.value = false;
  }
};

const accept = async (id: string) => {
  await documentOperationsApi.acceptTrainingNeed(id);
  await load();
};

const dismiss = async (id: string) => {
  try {
    const { value, action } = await ElMessageBox.prompt('请输入驳回原因', '驳回培训需求', {
      confirmButtonText: '确认驳回',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '驳回原因不能为空',
    }) as any;
    if (action !== 'confirm') return;
    await documentOperationsApi.dismissTrainingNeed(id, value);
    await load();
  } catch {
    // user cancelled
  }
};

const openLinkDialog = (row: any) => {
  linkDialog.needId = row.id;
  linkDialog.projectId = row.linkedTrainingProjectId || '';
  linkDialog.visible = true;
};

const submitLink = async () => {
  if (!linkDialog.projectId.trim()) {
    ElMessage.warning('请输入培训项目ID');
    return;
  }
  linkDialog.loading = true;
  try {
    await documentOperationsApi.linkTrainingNeed(linkDialog.needId, linkDialog.projectId.trim());
    ElMessage.success('已关联培训项目');
    linkDialog.visible = false;
    load();
  } finally {
    linkDialog.loading = false;
  }
};

onMounted(load);
</script>

<style scoped>
.page-note {
  margin-bottom: 12px;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
