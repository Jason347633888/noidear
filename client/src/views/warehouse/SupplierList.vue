<template>
  <div class="supplier-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="filterForm.keyword"
            clearable
            placeholder="供应商名称/编码"
            maxlength="100"
          />
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
          <span>供应商管理</span>
          <el-button type="primary" @click="openForm(null)">新增供应商</el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="contactPerson" label="联系人" width="120" />
        <el-table-column prop="phone" label="电话" width="140" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <el-dialog v-model="formVisible" :title="currentItem ? '编辑供应商' : '新增供应商'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="编码" prop="code"><el-input v-model="form.code" :disabled="!!currentItem" /></el-form-item>
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="form.contactPerson" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleFormSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { supplierApi, type Supplier } from '@/api/warehouse';

const loading = ref(false);
const submitting = ref(false);
const formVisible = ref(false);
const formRef = ref<FormInstance>();
const tableData = ref<Supplier[]>([]);
const currentItem = ref<Supplier | null>(null);
const filterForm = reactive({ keyword: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const EMPTY = { code: '', name: '', contactPerson: '', phone: '', email: '', address: '' };
const form = reactive({ ...EMPTY });
const rules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await supplierApi.getList({ page: pagination.page, limit: pagination.limit, keyword: filterForm.keyword || undefined });
    tableData.value = res?.list ?? [];
    pagination.total = res?.total ?? 0;
  } catch { ElMessage.error('获取供应商列表失败'); }
  finally { loading.value = false; }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.keyword = ''; handleSearch(); };

const openForm = (item: Supplier | null) => {
  currentItem.value = item;
  Object.assign(form, item ? { code: item.code, name: item.name, contactPerson: item.contactPerson ?? '', phone: item.phone ?? '', email: item.email ?? '', address: item.address ?? '' } : EMPTY);
  formVisible.value = true;
};

const saveToApi = () => currentItem.value
  ? supplierApi.update(currentItem.value.id, { ...form })
  : supplierApi.create({ ...form });

const handleFormSubmit = async () => {
  if (!formRef.value) return;
  try { await formRef.value.validate(); } catch { return; }
  submitting.value = true;
  try {
    await saveToApi();
    ElMessage.success(currentItem.value ? '更新成功' : '创建成功');
    formVisible.value = false;
    fetchData();
  } catch { ElMessage.error('操作失败'); }
  finally { submitting.value = false; }
};

const handleDelete = async (row: Supplier) => {
  try {
    await ElMessageBox.confirm('确定要删除该供应商吗？', '警告', { type: 'warning' });
    await supplierApi.delete(row.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch { /* user cancelled or error handled by interceptor */ }
};

onMounted(fetchData);
</script>

<style scoped>
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
