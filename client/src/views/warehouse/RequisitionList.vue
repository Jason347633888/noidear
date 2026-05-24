<template>
  <div class="requisition-list">
    <PageHeaderBlock eyebrow="生产执行" title="领料管理">
      <template #actions>
        <el-button type="primary" @click="openCreateDialog">创建领料单</el-button>
      </template>
    </PageHeaderBlock>

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel--padded">
        <el-form :model="filterForm" inline>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" clearable placeholder="全部">
              <el-option value="draft" label="草稿" />
              <el-option value="pending" label="已提交" />
              <el-option value="approved" label="已批准" />
              <el-option value="rejected" label="已驳回" />
              <el-option value="completed" label="已完成" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">领料单管理</h3>
      </div>
      <div class="app-panel--padded">
        <el-table :data="tableData" v-loading="loading" stripe>
          <el-table-column prop="number" label="单号" width="160" />
          <el-table-column label="申请人" width="120">
            <template #default="{ row }">{{ row.requester?.name || '-' }}</template>
          </el-table-column>
          <el-table-column label="部门" width="120">
            <template #default="{ row }">{{ row.department?.name || '-' }}</template>
          </el-table-column>
          <el-table-column label="类型" width="110">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ reqTypeText(row.requisitionType || 'production') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="设备" min-width="160">
            <template #default="{ row }">
              <span v-if="row.equipment">{{ row.equipment.code }} / {{ row.equipment.name }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="目标区域" width="110">
            <template #default="{ row }">
              <el-tag v-if="row.targetZone" size="small" type="info">{{ row.targetZone }}</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="reqStatusType(row.status)" size="small">{{ reqStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
          </el-table-column>
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'draft'"
                link type="primary" @click="handleSubmit(row)"
              >提交</el-button>
              <el-button
                v-if="row.status === 'pending'"
                link type="success" @click="handleApprove(row, 'approved')"
              >批准</el-button>
              <el-button
                v-if="row.status === 'pending'"
                link type="danger" @click="handleApprove(row, 'rejected')"
              >驳回</el-button>
              <el-button
                v-if="row.status === 'approved'"
                link type="warning" @click="handleDispatch(row)"
              >发放</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSearch"
            @current-change="handleSearch"
          />
        </div>
      </div>
    </div>

    <!-- 创建领料单对话框 -->
    <el-dialog v-model="createVisible" title="创建领料单" width="480px">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="90px">
        <el-form-item label="领料类型" prop="requisitionType">
          <el-select v-model="createForm.requisitionType" placeholder="请选择领料类型" style="width:100%">
            <el-option value="production" label="生产领料" />
            <el-option value="maintenance" label="维修领料" />
            <el-option value="other" label="其他领料" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="createForm.requisitionType === 'maintenance'" label="设备" prop="equipmentId">
          <el-select v-model="createForm.equipmentId" placeholder="请选择设备" filterable clearable style="width:100%">
            <el-option
              v-for="equipment in equipmentOptions"
              :key="equipment.id"
              :value="equipment.id"
              :label="`${equipment.code} / ${equipment.name}`"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标区域" prop="targetZone">
          <el-select v-model="createForm.targetZone" placeholder="请选择目标区域" style="width:100%">
            <el-option value="筛粉间" label="筛粉间" />
            <el-option value="称油间" label="称油间" />
            <el-option value="小料房" label="小料房" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">确认创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { requisitionApi } from '@/api/warehouse';
import equipmentApi, { type Equipment } from '@/api/equipment';
import request from '@/api/request';

const loading = ref(false);
const tableData = ref<any[]>([]);
const filterForm = reactive({ status: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const createVisible = ref(false);
const creating = ref(false);
const createFormRef = ref();
const equipmentOptions = ref<Equipment[]>([]);
const createForm = reactive({
  requisitionType: 'production' as 'production' | 'maintenance' | 'other',
  equipmentId: '',
  targetZone: '',
});
const createRules = {
  requisitionType: [{ required: true, message: '请选择领料类型', trigger: 'change' }],
  equipmentId: [{
    validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
      if (createForm.requisitionType === 'maintenance' && !value) {
        callback(new Error('维修领料必须选择设备'));
        return;
      }
      callback();
    },
    trigger: 'change',
  }],
  targetZone: [{ required: true, message: '请选择目标区域', trigger: 'change' }],
};

const reqStatusText = (s: string) => ({ draft: '草稿', pending: '已提交', approved: '已批准', rejected: '已驳回', completed: '已完成' }[s] || s);
const reqTypeText = (s: string) => ({ production: '生产领料', maintenance: '维修领料', other: '其他领料' }[s] || s);
const reqStatusType = (s: string) => ({ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger', completed: 'primary' }[s] || 'info') as 'info' | 'warning' | 'success' | 'danger' | 'primary';

const fetchEquipmentOptions = async () => {
  try {
    const res: any = await equipmentApi.getEquipmentList({ limit: 500, status: 'active' });
    equipmentOptions.value = res.data ?? res.list ?? [];
  } catch {
    equipmentOptions.value = [];
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await requisitionApi.getList({
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status || undefined,
    });
    tableData.value = res.data ?? res.list ?? [];
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取领料单列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.status = ''; handleSearch(); };

const openCreateDialog = async () => {
  createForm.requisitionType = 'production';
  createForm.equipmentId = '';
  createForm.targetZone = '';
  createFormRef.value?.resetFields();
  await fetchEquipmentOptions();
  createVisible.value = true;
};

const submitCreate = async () => {
  await createFormRef.value?.validate();
  creating.value = true;
  try {
    await requisitionApi.create({
      requisitionType: createForm.requisitionType,
      equipmentId: createForm.requisitionType === 'maintenance' ? createForm.equipmentId : undefined,
      targetZone: createForm.targetZone,
      items: [],
    });
    ElMessage.success('领料单已创建');
    createVisible.value = false;
    fetchData();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '创建失败');
  } finally {
    creating.value = false;
  }
};

const handleSubmit = async (row: any) => {
  try {
    await requisitionApi.submit(row.id);
    ElMessage.success('提交成功');
    fetchData();
  } catch (error) {
    ElMessage.error('提交失败');
  }
};

const handleApprove = (_row: any, _action: 'approved' | 'rejected') => {
  ElMessage.info('请在"审批任务"入口处理领料单审批');
};

const handleDispatch = async (row: any) => {
  try {
    await request.post(`/warehouse/requisitions/${row.id}/complete`);
    ElMessage.success('发放成功，物料已入库至' + row.targetZone);
    fetchData();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '发放失败');
  }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.requisition-list { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
