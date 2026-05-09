<template>
  <div class="assignment-list">
    <PageHeaderBlock eyebrow="生产执行" title="任务配置">
      <template #actions>
        <el-button type="primary" @click="openCreateDialog">新建任务</el-button>
      </template>
    </PageHeaderBlock>

    <div class="app-panel" style="margin-bottom: 16px">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">任务配置列表</h3>
      </div>
      <div class="app-panel--padded">
        <el-table :data="tableData" v-loading="loading" stripe>
          <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
          <el-table-column label="关联模板" width="160">
            <template #default="{ row }">{{ row.template?.name || '-' }}</template>
          </el-table-column>
          <el-table-column label="目标部门" width="140">
            <template #default="{ row }">{{ row.department?.name || '-' }}</template>
          </el-table-column>
          <el-table-column label="是否周期" width="90">
            <template #default="{ row }">
              <el-tag :type="row.isPeriodic ? 'primary' : 'info'" size="small">
                {{ row.isPeriodic ? '周期' : '一次' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="周期类型" width="100">
            <template #default="{ row }">
              {{ periodTypeTextMap[row.periodType] || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="assignStatusTypeMap[row.status]" size="small">
                {{ assignStatusTextMap[row.status] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'active'"
                link
                type="warning"
                @click="handlePause(row.id)"
              >
                暂停
              </el-button>
              <el-button
                v-if="row.status === 'paused'"
                link
                type="success"
                @click="handleResume(row.id)"
              >
                恢复
              </el-button>
              <el-button
                v-if="row.status !== 'closed'"
                link
                type="danger"
                @click="handleClose(row.id)"
              >
                关闭
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
            @size-change="fetchData"
            @current-change="fetchData"
          />
        </div>
      </div>
    </div>

    <!-- 新建任务对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="新建任务配置"
      width="560px"
      :close-on-click-modal="false"
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="选择模板" prop="templateId">
          <el-select
            v-model="form.templateId"
            placeholder="请选择模板"
            style="width: 100%"
          >
            <el-option
              v-for="tpl in templates"
              :key="tpl.id"
              :label="tpl.name"
              :value="tpl.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择部门" prop="departmentId">
          <el-select
            v-model="form.departmentId"
            placeholder="请选择部门"
            style="width: 100%"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="是否周期">
          <el-switch v-model="form.isPeriodic" />
        </el-form-item>
        <template v-if="form.isPeriodic">
          <el-form-item label="周期类型" prop="periodType">
            <el-select v-model="form.periodType" placeholder="请选择" style="width: 100%">
              <el-option label="每日" value="daily" />
              <el-option label="每周" value="weekly" />
              <el-option label="每月" value="monthly" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.periodType === 'weekly'" label="星期几" prop="weekday">
            <el-select v-model="form.weekday" placeholder="请选择" style="width: 100%">
              <el-option v-for="d in weekdayOptions" :key="d.value" :label="d.label" :value="d.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.periodType === 'monthly'" label="每月几号" prop="monthDay">
            <el-input-number v-model="form.monthDay" :min="1" :max="31" />
          </el-form-item>
        </template>
        <el-form-item v-if="!form.isPeriodic" label="截止日期" prop="deadline">
          <el-date-picker
            v-model="form.deadline"
            type="datetime"
            placeholder="请选择截止日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { assignmentApi } from '@/api/record-task';
import { recordTemplateApi } from '@/api/record-template';
import { getDepartments } from '@/api/department';

const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const tableData = ref<any[]>([]);
const templates = ref<any[]>([]);
const departments = ref<any[]>([]);
const formRef = ref<FormInstance>();

const pagination = reactive({ page: 1, limit: 20, total: 0 });

const periodTypeTextMap: Record<string, string> = {
  daily: '每日', weekly: '每周', monthly: '每月',
};
const assignStatusTextMap: Record<string, string> = {
  active: '进行中', paused: '已暂停', closed: '已关闭',
};
const assignStatusTypeMap: Record<string, string> = {
  active: 'success', paused: 'warning', closed: 'info',
};
const weekdayOptions = [
  { label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 },
  { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 },
  { label: '周日', value: 7 },
];

const createEmptyForm = () => ({
  title: '',
  templateId: '',
  departmentId: '',
  isPeriodic: false,
  periodType: '' as 'daily' | 'weekly' | 'monthly' | '',
  weekday: undefined as number | undefined,
  monthDay: undefined as number | undefined,
  deadline: undefined as Date | undefined,
});

const form = reactive(createEmptyForm());

const formRules: FormRules = {
  title: [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
  templateId: [{ required: true, message: '请选择模板', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择部门', trigger: 'change' }],
  periodType: [
    {
      validator: (_rule, _value, callback) => {
        if (form.isPeriodic && !form.periodType) {
          callback(new Error('请选择周期类型'));
        } else {
          callback();
        }
      },
      trigger: 'change',
    },
  ],
  deadline: [
    {
      validator: (_rule, _value, callback) => {
        if (!form.isPeriodic && !form.deadline) {
          callback(new Error('请选择截止日期'));
        } else {
          callback();
        }
      },
      trigger: 'change',
    },
  ],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res: any = await assignmentApi.getList({
      page: pagination.page,
      limit: pagination.limit,
    });
    tableData.value = res.list || [];
    pagination.total = res.total || 0;
  } catch {
    ElMessage.error('获取任务配置失败');
  } finally {
    loading.value = false;
  }
};

const fetchTemplates = async () => {
  try {
    const res: any = await recordTemplateApi.getList({ limit: 100 });
    templates.value = res.list || [];
  } catch {
    ElMessage.error('获取模板列表失败');
  }
};

const fetchDepartments = async () => {
  try {
    const res: any = await getDepartments({ limit: 100 });
    departments.value = res.list || [];
  } catch {
    ElMessage.error('获取部门列表失败');
  }
};

const openCreateDialog = () => {
  dialogVisible.value = true;
};

const resetForm = () => {
  Object.assign(form, createEmptyForm());
  formRef.value?.clearValidate();
};

const buildPeriodConfig = () => {
  if (form.periodType === 'weekly' && form.weekday) {
    return { weekday: form.weekday };
  }
  if (form.periodType === 'monthly' && form.monthDay) {
    return { day: form.monthDay };
  }
  return undefined;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload: any = {
      title: form.title,
      templateId: form.templateId,
      departmentId: form.departmentId,
      isPeriodic: form.isPeriodic,
    };

    if (form.isPeriodic && form.periodType) {
      payload.periodType = form.periodType;
      const config = buildPeriodConfig();
      if (config) payload.periodConfig = config;
    }

    if (!form.isPeriodic && form.deadline) {
      payload.deadline = (form.deadline as Date).toISOString();
    }

    await assignmentApi.create(payload);
    ElMessage.success('创建成功');
    dialogVisible.value = false;
    fetchData();
  } catch {
    ElMessage.error('创建失败');
  } finally {
    submitting.value = false;
  }
};

const handlePause = async (id: string) => {
  await ElMessageBox.confirm('确认暂停该任务配置？', '提示', { type: 'warning' });
  try {
    await assignmentApi.pause(id);
    ElMessage.success('已暂停');
    fetchData();
  } catch {
    ElMessage.error('操作失败');
  }
};

const handleResume = async (id: string) => {
  await ElMessageBox.confirm('确认恢复该任务配置？', '提示', { type: 'warning' });
  try {
    await assignmentApi.resume(id);
    ElMessage.success('已恢复');
    fetchData();
  } catch {
    ElMessage.error('操作失败');
  }
};

const handleClose = async (id: string) => {
  await ElMessageBox.confirm('确认关闭该任务配置？关闭后不可恢复。', '警告', { type: 'warning' });
  try {
    await assignmentApi.close(id);
    ElMessage.success('已关闭');
    fetchData();
  } catch {
    ElMessage.error('操作失败');
  }
};

onMounted(() => {
  fetchData();
  fetchTemplates();
  fetchDepartments();
});
</script>

<style scoped>
.assignment-list { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
</style>
