<template>
  <div class="import-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <h2>批量导入</h2>
          <p class="subtitle">上传 Excel 文件批量导入数据，请先下载标准模板</p>
        </div>
      </template>

      <el-steps :active="currentStep" align-center class="steps">
        <el-step title="选择类型" />
        <el-step title="上传文件" />
        <el-step title="数据预览" />
        <el-step title="导入结果" />
      </el-steps>

      <div class="step-content">
        <!-- Step 0: select type -->
        <div v-if="currentStep === 0" class="step-panel">
          <el-form label-width="120px">
            <el-form-item label="导入类型" required>
              <el-radio-group v-model="importType">
                <el-radio-button label="documents">文档数据</el-radio-button>
                <el-radio-button label="users">用户数据</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="下载模板">
              <el-button :icon="Download" @click="downloadTemplate">下载 Excel 模板</el-button>
              <span class="hint">请按照模板格式填写数据</span>
            </el-form-item>
          </el-form>
          <el-button type="primary" @click="currentStep = 1">下一步</el-button>
        </div>

        <!-- Step 1: upload -->
        <div v-if="currentStep === 1" class="step-panel">
          <el-upload
            class="upload-area"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls"
            :on-change="handleFileChange"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处，或 <em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">只支持 .xlsx / .xls 格式文件</div>
            </template>
          </el-upload>
          <div class="step-actions">
            <el-button @click="currentStep = 0">上一步</el-button>
            <el-button type="primary" :disabled="!uploadFile" @click="handlePreview">预览数据</el-button>
          </div>
        </div>

        <!-- Step 2: preview -->
        <div v-if="currentStep === 2" class="step-panel">
          <div class="preview-header">
            <span>共解析到 {{ previewData.length }} 条数据</span>
          </div>
          <el-table :data="previewData.slice(0, 10)" border size="small" max-height="400">
            <el-table-column
              v-for="col in previewColumns"
              :key="col"
              :prop="col"
              :label="col"
              min-width="120"
            />
          </el-table>
          <p v-if="previewData.length > 10" class="preview-tip">仅显示前10条预览数据</p>
          <div class="step-actions">
            <el-button @click="currentStep = 1">上一步</el-button>
            <el-button type="primary" :loading="importing" @click="handleImport">
              {{ importing ? '导入中...' : '确认导入' }}
            </el-button>
          </div>
          <el-progress v-if="importing" :percentage="importProgress" style="margin-top: 16px" />
        </div>

        <!-- Step 3: result -->
        <div v-if="currentStep === 3" class="step-panel">
          <el-result
            :icon="importResult.failedCount > 0 ? 'warning' : 'success'"
            :title="importResult.failedCount > 0 ? '部分导入成功' : '导入成功'"
          >
            <template #sub-title>
              <p>成功导入 {{ importResult.successCount }} 条，失败 {{ importResult.failedCount }} 条</p>
            </template>
          </el-result>

          <div v-if="importResult.errors.length > 0" class="error-detail">
            <h4>错误详情：</h4>
            <el-table :data="importResult.errors" border size="small">
              <el-table-column label="行号" prop="row" width="80" />
              <el-table-column label="错误信息" prop="message" />
            </el-table>
          </div>

          <div class="step-actions">
            <el-button type="primary" @click="resetImport">重新导入</el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Download, UploadFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { UploadFile } from 'element-plus';
import * as XLSX from 'xlsx';

type ImportType = 'documents' | 'users';

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  successCount: number;
  failedCount: number;
  errors: ImportError[];
}

const importType = ref<ImportType>('documents');
const currentStep = ref(0);
const uploadFile = ref<File | null>(null);
const previewData = ref<Record<string, string>[]>([]);
const previewColumns = ref<string[]>([]);
const importing = ref(false);
const importProgress = ref(0);
const importResult = reactive<ImportResult>({
  successCount: 0,
  failedCount: 0,
  errors: [],
});

function downloadTemplate() {
  const headers = importType.value === 'documents'
    ? ['文档编号', '文档标题', '文档类型', '所属部门', '状态']
    : ['用户名', '姓名', '部门', '角色', '邮箱'];

  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${importType.value}_template.xlsx`);
}

function handleFileChange(file: UploadFile) {
  if (file.raw) {
    uploadFile.value = file.raw;
  }
}

async function handlePreview() {
  if (!uploadFile.value) return;
  try {
    const data = await readExcel(uploadFile.value);
    if (data.length === 0) {
      ElMessage.warning('文件中没有数据');
      return;
    }
    previewColumns.value = Object.keys(data[0]);
    previewData.value = data;
    currentStep.value = 2;
  } catch {
    ElMessage.error('文件解析失败，请确认格式正确');
  }
}

function readExcel(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function handleImport() {
  importing.value = true;
  importProgress.value = 20;
  try {
    importProgress.value = 60;
    // Simulate import - in real scenario call API
    await new Promise((r) => setTimeout(r, 800));
    importProgress.value = 100;
    importResult.successCount = previewData.value.length;
    importResult.failedCount = 0;
    importResult.errors = [];
    currentStep.value = 3;
    ElMessage.success('导入成功');
  } catch {
    ElMessage.error('导入失败，请重试');
  } finally {
    importing.value = false;
  }
}

function resetImport() {
  currentStep.value = 0;
  uploadFile.value = null;
  previewData.value = [];
  previewColumns.value = [];
  importResult.successCount = 0;
  importResult.failedCount = 0;
  importResult.errors = [];
}
</script>

<style scoped>
.import-page {
  padding: 0;
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.subtitle {
  margin: 0;
  color: #888;
  font-size: 13px;
}

.steps {
  margin: 24px 0;
}

.step-panel {
  padding: 16px 0;
}

.upload-area {
  width: 100%;
}

.step-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.hint {
  margin-left: 12px;
  color: #888;
  font-size: 12px;
}

.preview-header {
  margin-bottom: 12px;
  color: #666;
}

.preview-tip {
  margin-top: 8px;
  color: #999;
  font-size: 12px;
}

.error-detail {
  margin-top: 16px;
}

.error-detail h4 {
  margin-bottom: 8px;
  color: #e6a23c;
}
</style>
