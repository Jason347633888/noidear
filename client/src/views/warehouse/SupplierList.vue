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
            <el-button link type="primary" @click="openDocuments(row)">证照/报告</el-button>
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

    <el-dialog v-model="documentsVisible" :title="`${currentDocumentSupplier?.name || ''} 证照/报告`" width="820px">
      <el-table :data="supplierDocuments" v-loading="documentsLoading" stripe>
        <el-table-column prop="documentKind" label="文件类型" width="150" />
        <el-table-column prop="docNo" label="证书编号" width="150" />
        <el-table-column label="有效期" width="140">
          <template #default="{ row }">{{ row.expiresAt ? formatDate(row.expiresAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="documentStatusType(row.status)" size="small">
              {{ documentStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件" min-width="160" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="previewDocument(row)">预览</el-button>
            <el-button link type="primary" @click="prepareReplace(row)">换版</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="documentsVisible = false">关闭</el-button>
      </template>
      <input
        ref="replaceFileInputRef"
        class="hidden-file-input"
        type="file"
        accept="application/pdf"
        @change="handleReplaceFileChange"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { supplierApi, type Supplier, type SupplierControlledDocument } from '@/api/warehouse';
import filePreviewApi from '@/api/file-preview';

const loading = ref(false);
const submitting = ref(false);
const formVisible = ref(false);
const formRef = ref<FormInstance>();
const tableData = ref<Supplier[]>([]);
const currentItem = ref<Supplier | null>(null);
const documentsVisible = ref(false);
const documentsLoading = ref(false);
const currentDocumentSupplier = ref<Supplier | null>(null);
const supplierDocuments = ref<SupplierControlledDocument[]>([]);
const replaceTarget = ref<SupplierControlledDocument | null>(null);
const replaceFileInputRef = ref<HTMLInputElement>();
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

const openDocuments = async (row: Supplier) => {
  currentDocumentSupplier.value = row;
  documentsVisible.value = true;
  documentsLoading.value = true;
  try {
    supplierDocuments.value = await supplierApi.getDocuments(row.id);
  } catch {
    ElMessage.error('获取供应商证照失败');
  } finally {
    documentsLoading.value = false;
  }
};

const previewDocument = async (row: SupplierControlledDocument) => {
  try {
    const preview = await filePreviewApi.getPreviewInfo(row.documentId);
    if (preview.url) {
      window.open(preview.url, '_blank');
      return;
    }
    ElMessage.info(preview.message || '该文件暂不支持在线预览');
  } catch {
    ElMessage.error('获取预览失败');
  }
};

const prepareReplace = (row: SupplierControlledDocument) => {
  replaceTarget.value = row;
  replaceFileInputRef.value?.click();
};

const handleReplaceFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const supplier = currentDocumentSupplier.value;
  const target = replaceTarget.value;
  input.value = '';
  if (!file || !supplier || !target) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentKind', target.documentKind);
  formData.append('docName', target.documentTitle || target.fileName);
  if (target.docNo) formData.append('docNo', target.docNo);
  if (target.expiresAt) formData.append('expiresAt', target.expiresAt);

  documentsLoading.value = true;
  try {
    await supplierApi.replaceDocument(supplier.id, target.id, formData);
    ElMessage.success('换版成功');
    supplierDocuments.value = await supplierApi.getDocuments(supplier.id);
  } catch {
    ElMessage.error('换版失败');
  } finally {
    documentsLoading.value = false;
    replaceTarget.value = null;
  }
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('zh-CN');

const documentStatusText = (status: SupplierControlledDocument['status']) => {
  const map = { valid: '有效', expiring_soon: '即将到期', expired: '已过期' };
  return map[status] || status;
};

const documentStatusType = (status: SupplierControlledDocument['status']) => {
  if (status === 'valid') return 'success';
  if (status === 'expired') return 'danger';
  return 'warning';
};

onMounted(fetchData);
</script>

<style scoped>
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.hidden-file-input { display: none; }
</style>
