<template>
  <div class="number-rule-center">
    <PageHeaderBlock eyebrow="文控与审批" title="编号规则">
      <template #actions>
        <el-button type="primary" @click="openCreate">新建规则</el-button>
      </template>
    </PageHeaderBlock>

    <div class="app-panel">
      <el-table :data="rules" border>
        <el-table-column prop="scope" label="适用对象" width="130" />
        <el-table-column prop="sourceFolder" label="分类" width="100" />
        <el-table-column prop="prefix" label="固定前缀" width="120" />
        <el-table-column prop="categoryCode" label="分类代码" width="120" />
        <el-table-column prop="format" label="格式模板" min-width="260" />
        <el-table-column prop="sequencePadding" label="序号位数" width="100" />
        <el-table-column prop="usedCount" label="已使用" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button link type="danger" :disabled="!row.isActive" @click="deactivate(row)">停用</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" title="编号规则" width="640px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="适用对象">
          <el-select v-model="form.scope">
            <el-option label="体系文件" value="document" />
            <el-option label="记录表单模板" value="record_template" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件分类">
          <el-select v-model="form.sourceFolder">
            <el-option label="01 管理手册" value="01" />
            <el-option label="02 程序文件" value="02" />
            <el-option label="03 作业指导书" value="03" />
            <el-option label="04 记录表单" value="04" />
            <el-option label="05 公司文件" value="05" />
            <el-option label="06 外来文件" value="06" />
          </el-select>
        </el-form-item>
        <el-form-item label="固定前缀"><el-input v-model="form.prefix" /></el-form-item>
        <el-form-item label="分类代码"><el-input v-model="form.categoryCode" /></el-form-item>
        <el-form-item label="格式模板"><el-input v-model="form.format" placeholder="{prefix}-{departmentCode}-{categoryCode}-{sequence}" /></el-form-item>
        <el-form-item label="序号位数"><el-input-number v-model="form.sequencePadding" :min="1" :max="8" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { documentControlApi } from '@/api/document-control';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

const rules = ref<any[]>([]);
const dialogVisible = ref(false);
const form = reactive({
  scope: 'document',
  level: 3,
  departmentId: '',
  sourceFolder: '03',
  prefix: 'GRSS',
  categoryCode: 'ZD',
  format: '{prefix}-{departmentCode}-{categoryCode}-{sequence}',
  sequencePadding: 2,
  separator: '-',
  resetPolicy: 'none',
});

async function loadRules() {
  try {
    const res = await documentControlApi.listNumberRules();
    rules.value = (res as any).data ?? res;
  } catch (error) {
    console.error('Failed to load number rules:', error);
    ElMessage.error('加载编号规则失败');
  }
}

function openCreate() {
  dialogVisible.value = true;
}

async function save() {
  try {
    await documentControlApi.upsertNumberRule({ ...form });
    ElMessage.success('编号规则已保存');
    dialogVisible.value = false;
    await loadRules();
  } catch (error) {
    console.error('Failed to save number rule:', error);
    ElMessage.error('保存编号规则失败');
  }
}

async function deactivate(row: any) {
  try {
    await documentControlApi.deactivateNumberRule(row.id);
    ElMessage.success('编号规则已停用');
    await loadRules();
  } catch (error) {
    console.error('Failed to deactivate number rule:', error);
    ElMessage.error('停用编号规则失败');
  }
}

onMounted(loadRules);
</script>

<style scoped>
.number-rule-center {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
</style>
