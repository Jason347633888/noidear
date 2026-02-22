<template>
  <div class="alert-rule-list">
    <el-card class="page-header">
      <div class="header-content">
        <div>
          <h2>告警规则配置</h2>
          <p class="subtitle">管理系统告警规则</p>
        </div>
        <el-button type="primary" @click="handleCreate">新建规则</el-button>
      </div>
    </el-card>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="name" label="规则名称" min-width="150" />
        <el-table-column prop="metricName" label="指标名称" width="180" />
        <el-table-column prop="condition" label="条件" width="80" />
        <el-table-column prop="threshold" label="阈值" width="100" />
        <el-table-column prop="severity" label="严重程度" width="100" :formatter="formatSeverityColumn" />
        <el-table-column prop="enabled" label="状态" width="80" :formatter="formatEnabledColumn" />
        <el-table-column prop="notifyChannels" label="通知渠道" width="150" :formatter="formatChannelsColumn" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button link @click="handleToggle(row)">{{ row.enabled ? '禁用' : '启用' }}</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" @close="handleDialogClose">
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="指标名称" prop="metricName">
          <el-input v-model="formData.metricName" placeholder="请输入指标名称" />
        </el-form-item>
        <el-form-item label="条件" prop="condition">
          <el-select v-model="formData.condition" placeholder="请选择条件">
            <el-option label="大于" value=">" />
            <el-option label="小于" value="<" />
            <el-option label="大于等于" value=">=" />
            <el-option label="小于等于" value="<=" />
            <el-option label="等于" value="==" />
          </el-select>
        </el-form-item>
        <el-form-item label="阈值" prop="threshold">
          <el-input-number v-model="formData.threshold" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="严重程度" prop="severity">
          <el-select v-model="formData.severity" placeholder="请选择严重程度">
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="严重" value="critical" />
          </el-select>
        </el-form-item>
        <el-form-item label="通知渠道" prop="notifyChannels">
          <el-select v-model="formData.notifyChannels" multiple placeholder="请选择通知渠道">
            <el-option label="邮件" value="email" />
            <el-option label="企业微信" value="wechat" />
            <el-option label="钉钉" value="dingtalk" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import {
  queryAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  type AlertRule,
} from '@/api/monitoring';

const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref('新建告警规则');
const formRef = ref<FormInstance>();

const pagination = reactive({ page: 1, limit: 20, total: 0 });
const tableData = ref<AlertRule[]>([]);

const formData = reactive({
  id: '',
  name: '',
  metricName: '',
  condition: '>' as '>' | '<' | '>=' | '<=' | '==',
  threshold: 0,
  severity: 'info' as 'info' | 'warning' | 'critical',
  notifyChannels: [] as string[],
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  metricName: [{ required: true, message: '请输入指标名称', trigger: 'blur' }],
  condition: [{ required: true, message: '请选择条件', trigger: 'change' }],
  threshold: [{ required: true, message: '请输入阈值', trigger: 'blur' }],
  severity: [{ required: true, message: '请选择严重程度', trigger: 'change' }],
  notifyChannels: [{ required: true, message: '请选择通知渠道', trigger: 'change' }],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const { items, total } = await queryAlertRules({
      page: pagination.page,
      limit: pagination.limit,
    });
    tableData.value = items;
    pagination.total = total;
  } catch (error) {
    ElMessage.error('查询告警规则失败');
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  dialogTitle.value = '新建告警规则';
  resetForm();
  dialogVisible.value = true;
};

const handleEdit = (row: AlertRule) => {
  dialogTitle.value = '编辑告警规则';
  Object.assign(formData, row);
  dialogVisible.value = true;
};

const handleToggle = async (row: AlertRule) => {
  try {
    await toggleAlertRule(row.id, !row.enabled);
    ElMessage.success(row.enabled ? '已禁用' : '已启用');
    fetchData();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleDelete = async (row: AlertRule) => {
  try {
    await ElMessageBox.confirm('确定删除此告警规则吗？', '提示', { type: 'warning' });
    await deleteAlertRule(row.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    // User cancelled
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (formData.id) {
        await updateAlertRule(formData.id, formData);
        ElMessage.success('更新成功');
      } else {
        await createAlertRule(formData);
        ElMessage.success('创建成功');
      }
      dialogVisible.value = false;
      fetchData();
    } catch (error) {
      ElMessage.error('操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

const handleDialogClose = () => {
  formRef.value?.resetFields();
};

const resetForm = () => {
  Object.assign(formData, {
    id: '',
    name: '',
    metricName: '',
    condition: '>',
    threshold: 0,
    severity: 'info',
    notifyChannels: [],
  });
};

const formatSeverityColumn = (row: AlertRule) => {
  const map = { info: '信息', warning: '警告', critical: '严重' };
  return map[row.severity] || row.severity;
};

const formatEnabledColumn = (row: AlertRule) => (row.enabled ? '启用' : '禁用');

const formatChannelsColumn = (row: AlertRule) => {
  const map: Record<string, string> = { email: '邮件', wechat: '企业微信', dingtalk: '钉钉' };
  return row.notifyChannels.map((c) => map[c] || c).join(', ');
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.alert-rule-list {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  font-size: 24px;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
