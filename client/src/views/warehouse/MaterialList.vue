<template>
  <div class="material-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" clearable placeholder="物料名称/编码" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="filterForm.category" clearable placeholder="分类" />
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
          <span>物料管理</span>
          <el-button type="primary" @click="openForm(null)">新增物料</el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="code" label="物料编码" width="120" />
        <el-table-column prop="name" label="物料名称" min-width="180" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="currentStock" label="当前库存" width="100" />
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
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 物料表单对话框 -->
    <el-dialog v-model="formVisible" :title="currentItem ? '编辑物料' : '新增物料'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" :disabled="!!currentItem" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-input v-model="form.category" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="form.unit" />
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model="form.specification" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { materialApi } from '@/api/warehouse';

const loading = ref(false);
const submitting = ref(false);
const formVisible = ref(false);
const formRef = ref<FormInstance>();
const tableData = ref<any[]>([]);
const currentItem = ref<any>(null);

const filterForm = reactive({ keyword: '', category: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });
const form = reactive({ code: '', name: '', category: '', unit: '', specification: '', description: '' });

const rules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  category: [{ required: true, message: '请输入分类', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await materialApi.getList({
      page: pagination.page,
      limit: pagination.limit,
      keyword: filterForm.keyword || undefined,
      category: filterForm.category || undefined,
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取物料列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.keyword = ''; filterForm.category = ''; handleSearch(); };

const openForm = (item: any) => {
  currentItem.value = item;
  if (item) {
    Object.assign(form, { code: item.code, name: item.name, category: item.category, unit: item.unit, specification: item.specification || '', description: item.description || '' });
  } else {
    Object.assign(form, { code: '', name: '', category: '', unit: '', specification: '', description: '' });
  }
  formVisible.value = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  try { await formRef.value.validate(); } catch { return; }
  submitting.value = true;
  try {
    if (currentItem.value) {
      await materialApi.update(currentItem.value.id, { ...form });
      ElMessage.success('物料更新成功');
    } else {
      await materialApi.create({ ...form });
      ElMessage.success('物料创建成功');
    }
    formVisible.value = false;
    fetchData();
  } catch (error) {
    ElMessage.error('操作失败');
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该物料吗？', '警告', { type: 'warning' });
    await materialApi.delete(row.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) { /* 取消 */ }
};

onMounted(() => { fetchData(); });
</script>

<style scoped>
.filter-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
