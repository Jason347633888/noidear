<template>
  <div class="record-form-landing-index">
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索表单编号或名称" clearable @keyup.enter="fetchRows" />
      <el-button type="primary" @click="fetchRows">搜索</el-button>
    </div>

    <el-table :data="rows" v-loading="loading" stripe>
      <el-table-column prop="code" label="源编号" width="150" />
      <el-table-column prop="formName" label="表单名" min-width="220" show-overflow-tooltip />
      <el-table-column prop="department" label="部门" width="120" />
      <el-table-column prop="chain" label="链路定位" width="130" />
      <el-table-column label="目标入口" min-width="220">
        <template #default="{ row }">
          <el-link v-if="row.landingEntry?.targetRoute" type="primary" @click="openRoute(row.landingEntry.targetRoute)">
            {{ row.landingEntry.targetModule || row.landingEntry.targetRoute }}
          </el-link>
          <el-tag v-else type="warning">待补齐入口</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button :data-test="`edit-landing-${row.code}`" link type="primary" @click="openEdit(row)">维护</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="editVisible" title="维护表单入口" width="640px">
      <el-form label-width="120px">
        <el-form-item label="目标模块">
          <el-input v-model="editForm.targetModule" />
        </el-form-item>
        <el-form-item label="目标模型">
          <el-input v-model="editForm.targetModel" />
        </el-form-item>
        <el-form-item label="目标路由">
          <el-input data-test="target-route-input" v-model="editForm.targetRoute" />
        </el-form-item>
        <el-form-item label="模板 ID">
          <el-input v-model="editForm.targetTemplateId" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button data-test="save-landing" type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { documentControlApi, type RecordFormLandingEntry } from '@/api/document-control';

const router = useRouter();
const keyword = ref('');
const loading = ref(false);
const rows = ref<RecordFormLandingEntry[]>([]);
const editVisible = ref(false);
const editingCode = ref('');
const editForm = ref({
  targetModule: '',
  targetModel: '',
  targetRoute: '',
  targetTemplateId: '',
  landingStrategy: 'route',
  relatedDocIds: [] as string[],
  notes: '',
});

const fetchRows = async () => {
  loading.value = true;
  try {
    rows.value = await documentControlApi.listRecordFormIndex({
      keyword: keyword.value || undefined,
    });
  } catch {
    ElMessage.error('获取记录表单索引失败');
  } finally {
    loading.value = false;
  }
};

const openRoute = (route: string) => {
  if (!route.startsWith('/')) return;
  router.push(route);
};

const openEdit = (row: RecordFormLandingEntry) => {
  editingCode.value = row.code;
  editForm.value = {
    targetModule: row.landingEntry?.targetModule || '',
    targetModel: row.landingEntry?.targetModel || '',
    targetRoute: row.landingEntry?.targetRoute || '',
    targetTemplateId: row.landingEntry?.targetTemplateId || '',
    landingStrategy: row.landingEntry?.landingStrategy || 'route',
    relatedDocIds: row.landingEntry?.relatedDocIds || [],
    notes: row.landingEntry?.notes || '',
  };
  editVisible.value = true;
};

const saveEdit = async () => {
  try {
    await documentControlApi.updateRecordFormIndex(editingCode.value, editForm.value);
    ElMessage.success('表单入口已保存');
    editVisible.value = false;
    await fetchRows();
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '保存落地入口失败');
  }
};

onMounted(fetchRows);
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}
</style>
