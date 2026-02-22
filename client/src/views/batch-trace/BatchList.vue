<template>
  <div class="batch-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" clearable placeholder="批次号/产品名" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" clearable placeholder="全部">
            <el-option value="planned" label="已计划" />
            <el-option value="in_progress" label="进行中" />
            <el-option value="completed" label="已完成" />
            <el-option value="cancelled" label="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>生产批次列表</span>
          <el-button type="primary" @click="createDialogVisible = true">
            创建批次
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="batchNumber" label="批次号" width="160" />
        <el-table-column prop="productName" label="产品名称" min-width="180" />
        <el-table-column prop="productCode" label="产品代码" width="120" />
        <el-table-column prop="quantity" label="数量" width="100">
          <template #default="{ row }">
            {{ row.quantity }} {{ row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTypeMap[row.status]" size="small">
              {{ statusTextMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/batch-trace/${row.id}`)">
              详情
            </el-button>
            <el-button link type="success" @click="router.push(`/batch-trace/${row.id}/trace`)">
              追溯
            </el-button>
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
    </el-card>

    <!-- 创建批次对话框 -->
    <el-dialog v-model="createDialogVisible" title="创建生产批次" width="600px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="产品名称" prop="productName">
          <el-input v-model="createForm.productName" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="产品代码" prop="productCode">
          <el-input v-model="createForm.productCode" placeholder="请输入产品代码" />
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="createForm.quantity" :min="1" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="createForm.unit" placeholder="如：kg, 件, 箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { productionBatchApi } from '@/api/batch';

const router = useRouter();
const loading = ref(false);
const creating = ref(false);
const createDialogVisible = ref(false);
const createFormRef = ref<FormInstance>();
const tableData = ref<any[]>([]);

const statusTextMap: Record<string, string> = {
  planned: '已计划', in_progress: '进行中', completed: '已完成', cancelled: '已取消',
};
const statusTypeMap: Record<string, string> = {
  planned: 'info', in_progress: 'primary', completed: 'success', cancelled: 'warning',
};

const filterForm = reactive({ keyword: '', status: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const createForm = reactive({ productName: '', productCode: '', quantity: 1, unit: 'kg' });
const createRules: FormRules = {
  productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  productCode: [{ required: true, message: '请输入产品代码', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await productionBatchApi.getList({
      page: pagination.page,
      limit: pagination.limit,
      status: filterForm.status || undefined,
      keyword: filterForm.keyword || undefined,
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取批次列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.keyword = ''; filterForm.status = ''; handleSearch(); };

const handleCreate = async () => {
  if (!createFormRef.value) return;
  try { await createFormRef.value.validate(); } catch { return; }
  creating.value = true;
  try {
    await productionBatchApi.create({ ...createForm });
    ElMessage.success('批次创建成功');
    createDialogVisible.value = false;
    fetchData();
  } catch (error) {
    // 错误由拦截器处理
  } finally {
    creating.value = false;
  }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
