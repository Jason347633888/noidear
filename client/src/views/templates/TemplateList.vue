<template>
  <div class="template-list">
    <el-card class="filter-card">
      <el-form :model="filterForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="搜索标题或编号" clearable />
        </el-form-item>
        <el-form-item label="模板级别">
          <el-select v-model="filterForm.level" clearable placeholder="全部">
            <el-option :value="1" label="一级模板" />
            <el-option :value="2" label="二级模板" />
            <el-option :value="3" label="三级模板" />
            <el-option :value="4" label="四级模板" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" clearable placeholder="全部">
            <el-option value="active" label="启用" />
            <el-option value="inactive" label="停用" />
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
          <span>模板列表</span>
          <div class="header-actions">
            <el-button type="primary" @click="showCreateDialog = true">
              新建模板
            </el-button>
            <el-button @click="showImportDialog = true">
              Excel 导入
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="number" label="模板编号" width="150" />
        <el-table-column prop="title" label="模板标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="level" label="级别" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.level }}级</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fieldsJson" label="字段数" width="100">
          <template #default="{ row }">
            {{ Array.isArray(row.fieldsJson) ? row.fieldsJson.length : 0 }} 个字段
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80">
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" width="100">
          <template #default="{ row }">{{ row.creator?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="success" @click="handleCopy(row)">复制</el-button>
            <el-button
              link
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="handleToggle(row)"
            >
              {{ row.status === 'active' ? '停用' : '启用' }}
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

    <!-- 新建模板对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建模板" width="600px">
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="100px">
        <el-form-item label="模板级别" prop="level">
          <el-select v-model="createForm.level" placeholder="选择级别">
            <el-option :value="1" label="一级模板" />
            <el-option :value="2" label="二级模板" />
            <el-option :value="3" label="三级模板" />
            <el-option :value="4" label="四级模板" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板标题" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入模板标题" />
        </el-form-item>
        <el-form-item label="字段定义">
          <div class="fields-editor">
            <div
              v-for="(field, index) in createForm.fields"
              :key="index"
              class="field-item"
            >
              <el-input v-model="field.name" placeholder="字段名" style="width: 100px" />
              <el-input v-model="field.label" placeholder="标签" style="width: 100px" />
              <el-select v-model="field.type" style="width: 100px">
                <el-option value="text" label="文本" />
                <el-option value="textarea" label="多行文本" />
                <el-option value="number" label="数字" />
                <el-option value="date" label="日期" />
                <el-option value="select" label="选择" />
                <el-option value="boolean" label="开关" />
              </el-select>
              <el-checkbox v-model="field.required">必填</el-checkbox>
              <el-button type="danger" link @click="removeField(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" link @click="addField">
              <el-icon><Plus /></el-icon> 添加字段
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">创建</el-button>
      </template>
    </el-dialog>

    <!-- Excel 导入对话框 -->
    <el-dialog v-model="showImportDialog" title="从 Excel 导入模板" width="500px">
      <el-form :model="importForm" label-width="100px">
        <el-form-item label="模板级别">
          <el-select v-model="importForm.level">
            <el-option :value="1" label="一级模板" />
            <el-option :value="2" label="二级模板" />
            <el-option :value="3" label="三级模板" />
            <el-option :value="4" label="四级模板" />
          </el-select>
        </el-form-item>
        <el-form-item label="上传文件">
          <el-upload
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            accept=".xlsx,.xls"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 .xlsx, .xls 格式</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :loading="importing">导入</el-button>
      </template>
    </el-dialog>

    <!-- 模板详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="模板详情" width="600px">
      <el-descriptions :column="2" border v-if="currentTemplate">
        <el-descriptions-item label="模板编号">{{ currentTemplate.number }}</el-descriptions-item>
        <el-descriptions-item label="模板标题">{{ currentTemplate.title }}</el-descriptions-item>
        <el-descriptions-item label="级别">{{ currentTemplate.level }}级</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentTemplate.status === 'active' ? 'success' : 'info'">
            {{ currentTemplate.status === 'active' ? '启用' : '停用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="版本">v{{ currentTemplate.version }}</el-descriptions-item>
        <el-descriptions-item label="字段数">
          {{ Array.isArray(currentTemplate.fieldsJson) ? currentTemplate.fieldsJson.length : 0 }}
        </el-descriptions-item>
      </el-descriptions>
      <el-table :data="currentTemplate?.fieldsJson || []" v-if="currentTemplate" style="margin-top: 16px">
        <el-table-column prop="name" label="字段名" width="100" />
        <el-table-column prop="label" label="标签" width="120" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="required" label="必填" width="80">
          <template #default="{ row }">{{ row.required ? '是' : '否' }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Plus } from '@element-plus/icons-vue';
import request from '@/api/request';

interface Template {
  id: string;
  number: string;
  level: number;
  title: string;
  fieldsJson: Record<string, unknown>[];
  version: number;
  status: string;
  creator: { name: string } | null;
  createdAt: string;
}

const loading = ref(false);
const tableData = ref<Template[]>([]);
const showCreateDialog = ref(false);
const showImportDialog = ref(false);
const showDetailDialog = ref(false);
const currentTemplate = ref<Template | null>(null);
const creating = ref(false);
const importing = ref(false);
const createFormRef = ref();

const filterForm = reactive({ keyword: '', level: undefined as number | undefined, status: '' });
const pagination = reactive({ page: 1, limit: 20, total: 0 });

const createForm = reactive({
  level: 4,
  title: '',
  fields: [{ name: '', label: '', type: 'text', required: true }],
});

const importForm = reactive({ level: 4, file: null as File | null });

const createRules = {
  level: [{ required: true, message: '请选择模板级别', trigger: 'change' }],
  title: [{ required: true, message: '请输入模板标题', trigger: 'blur' }],
};

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN');

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<{ list: Template[]; total: number }>('/templates', {
      params: { ...filterForm, page: pagination.page, limit: pagination.limit },
    });
    tableData.value = res.list;
    pagination.total = res.total;
  } catch (error) {
    ElMessage.error('获取模板列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => { pagination.page = 1; fetchData(); };
const handleReset = () => { filterForm.keyword = ''; filterForm.level = undefined; filterForm.status = ''; handleSearch(); };

const handleView = (row: Template) => { currentTemplate.value = row; showDetailDialog.value = true; };
const handleEdit = (row: Template) => { router.push(`/templates/${row.id}/edit`); };
const router = useRouter();
const handleCopy = async (row: Template) => {
  try {
    await ElMessageBox.confirm('确定要复制该模板吗？', '提示');
    await request.post(`/templates/${row.id}/copy`);
    ElMessage.success('复制成功');
    fetchData();
  } catch {}
};
const handleToggle = async (row: Template) => {
  try {
    await request.post(`/templates/${row.id}/toggle`);
    ElMessage.success('操作成功');
    fetchData();
  } catch {}
};

const addField = () => createForm.fields.push({ name: '', label: '', type: 'text', required: true });
const removeField = (index: number) => createForm.fields.splice(index, 1);

const handleCreate = async () => {
  if (!createFormRef.value) return;
  await createFormRef.value.validate();
  creating.value = true;
  try {
    await request.post('/templates', { level: createForm.level, title: createForm.title, fields: createForm.fields });
    ElMessage.success('创建成功');
    showCreateDialog.value = false;
    fetchData();
  } catch {} finally { creating.value = false; }
};

const handleFileChange = (uploadFile: { raw: File }) => { importForm.file = uploadFile.raw; };
const handleImport = async () => {
  if (!importForm.file) { ElMessage.error('请选择文件'); return; }
  importing.value = true;
  try {
    const form = new FormData();
    form.append('file', importForm.file);
    await request.post('/templates/from-excel', form, { params: { level: importForm.level } });
    ElMessage.success('导入成功');
    showImportDialog.value = false;
    fetchData();
  } catch {} finally { importing.value = false; }
};

onMounted(() => fetchData());
</script>

<style scoped>
.template-list { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.fields-editor { border: 1px dashed #dcdfe6; padding: 16px; border-radius: 4px; }
.field-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
</style>
