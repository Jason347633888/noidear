<template>
  <div class="qi-workbench">
    <PageHeaderBlock
      eyebrow="质量与合规"
      title="质量检验工作台"
      description="按日期查看并执行各类质量检验任务"
    >
      <template #actions>
        <el-date-picker
          v-model="workDate"
          type="date"
          placeholder="选择工作日期"
          value-format="YYYY-MM-DD"
          style="margin-right: 12px"
          @change="loadTasks"
        />
        <el-select
          v-model="statusFilter"
          placeholder="任务状态"
          clearable
          style="width: 120px; margin-right: 12px"
          @change="loadTasks"
        >
          <el-option label="待执行" value="pending" />
          <el-option label="已完成" value="done" />
          <el-option label="已跳过" value="skipped" />
        </el-select>
      </template>
    </PageHeaderBlock>

    <div v-if="loading" class="qi-workbench__loading">
      <el-skeleton :rows="6" animated />
    </div>

    <template v-else>
      <!-- 水质检验 -->
      <TaskSection
        title="水质检验"
        icon="water"
        :tasks="sectionTasks('water_quality')"
        @complete="openCompleteDialog"
        @skip="confirmSkip"
      />

      <!-- 环境微生物采样 -->
      <TaskSection
        title="环境微生物采样"
        icon="biology"
        :tasks="sectionTasks('env_microbiology_sampling')"
        @complete="openCompleteDialog"
        @skip="confirmSkip"
      />

      <!-- 环境微生物结果 -->
      <TaskSection
        title="环境微生物结果录入"
        icon="science"
        :tasks="sectionTasks('env_microbiology_result')"
        @complete="openCompleteDialog"
        @skip="confirmSkip"
      />

      <!-- 虫害控制 -->
      <TaskSection
        title="虫害控制检查"
        icon="pest"
        :tasks="sectionTasks('pest_control')"
        @complete="openCompleteDialog"
        @skip="confirmSkip"
      />

      <!-- 卫生检查 -->
      <TaskSection
        title="卫生巡检"
        icon="hygiene"
        :tasks="sectionTasks('hygiene_inspection')"
        @complete="openCompleteDialog"
        @skip="confirmSkip"
      />

      <!-- 车辆卫生 -->
      <TaskSection
        title="车辆卫生检查"
        icon="vehicle"
        :tasks="sectionTasks('vehicle_sanitation')"
        @complete="openCompleteDialog"
        @skip="confirmSkip"
      />

      <!-- 过敏原检测 -->
      <TaskSection
        title="过敏原检测"
        icon="allergen"
        :tasks="sectionTasks('allergen_test')"
        @complete="openCompleteDialog"
        @skip="confirmSkip"
      />
    </template>

    <!-- 完成任务 — 录入链接 -->
    <el-dialog
      v-model="completeDialogVisible"
      title="完成检验任务"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-alert
        title="请先在对应的检验记录页面录入实际结果，再将记录 ID 填入下方以完成任务。"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      />
      <el-form
        ref="completeFormRef"
        :model="completeForm"
        :rules="completeRules"
        label-width="130px"
      >
        <el-form-item label="完成记录类型" prop="completed_resource_type">
          <el-select
            v-model="completeForm.completed_resource_type"
            placeholder="请选择"
            style="width: 100%"
          >
            <el-option label="检验记录 (InspectionRecord)" value="inspection_record" />
            <el-option label="环境记录 (EnvironmentRecord)" value="environment_record" />
            <el-option label="消毒剂浓度检查 (SanitizerCheck)" value="sanitizer_concentration_check" />
          </el-select>
        </el-form-item>
        <el-form-item label="完成记录 ID" prop="completed_resource_id">
          <el-input
            v-model="completeForm.completed_resource_id"
            placeholder="请输入对应记录的 ID"
            clearable
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitComplete">
          确认完成
        </el-button>
      </template>
    </el-dialog>

    <!-- 跳过任务 -->
    <el-dialog
      v-model="skipDialogVisible"
      title="跳过检验任务"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="skipFormRef"
        :model="skipForm"
        label-width="90px"
      >
        <el-form-item label="跳过原因">
          <el-input
            v-model="skipForm.skipped_reason"
            type="textarea"
            :rows="3"
            placeholder="请填写跳过原因（可选）"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="skipDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="submitting" @click="submitSkip">
          确认跳过
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineComponent, h } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface QualityInspectionTask {
  id: string;
  company_id: string;
  work_date: string;
  shift_type?: string;
  area_point_id?: string;
  production_batch_id?: string;
  task_type: string;
  target_resource_type: string;
  target_resource_id?: string;
  standard_id?: string;
  assignee_role?: string;
  assignee_user_id?: string;
  due_at?: string;
  status: 'pending' | 'done' | 'skipped';
  completed_resource_type?: string;
  completed_resource_id?: string;
  skipped_reason?: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Inline TaskSection component — keeps the file self-contained while keeping
// the main template readable (avoids proliferating single-use file stubs)
// ---------------------------------------------------------------------------
const TaskSection = defineComponent({
  name: 'TaskSection',
  props: {
    title: { type: String, required: true },
    icon: { type: String, required: true },
    tasks: { type: Array as () => QualityInspectionTask[], required: true },
  },
  emits: ['complete', 'skip'],
  setup(props, { emit }) {
    const STATUS_LABEL: Record<string, string> = {
      pending: '待执行',
      done: '已完成',
      skipped: '已跳过',
    };
    const STATUS_TYPE: Record<string, string> = {
      pending: 'warning',
      done: 'success',
      skipped: 'info',
    };

    return () =>
      h('div', { class: 'qi-workbench__section app-panel', style: 'margin-bottom: 16px' }, [
        h('div', { class: 'app-panel-header' }, [
          h('h3', { class: 'app-panel-header__title' }, [
            props.title,
            h(
              'span',
              { class: 'card-count' },
              `共 ${props.tasks.length} 项`,
            ),
          ]),
        ]),
        h('div', { class: 'app-panel--padded' }, [
          props.tasks.length === 0
            ? h('div', { class: 'qi-workbench__empty', style: 'color: #909399; padding: 12px 0' }, '今日暂无此类任务')
            : h(
                'table',
                { style: 'width: 100%; border-collapse: collapse' },
                [
                  h('thead', {}, [
                    h('tr', {}, [
                      h('th', { style: 'text-align: left; padding: 8px 12px; font-weight: 600; font-size: 13px; border-bottom: 1px solid #ebeef5' }, '目标资源类型'),
                      h('th', { style: 'text-align: left; padding: 8px 12px; font-weight: 600; font-size: 13px; border-bottom: 1px solid #ebeef5' }, '负责人'),
                      h('th', { style: 'text-align: left; padding: 8px 12px; font-weight: 600; font-size: 13px; border-bottom: 1px solid #ebeef5' }, '截止时间'),
                      h('th', { style: 'text-align: left; padding: 8px 12px; font-weight: 600; font-size: 13px; border-bottom: 1px solid #ebeef5' }, '状态'),
                      h('th', { style: 'text-align: left; padding: 8px 12px; font-weight: 600; font-size: 13px; border-bottom: 1px solid #ebeef5' }, '操作'),
                    ]),
                  ]),
                  h(
                    'tbody',
                    {},
                    props.tasks.map((task) =>
                      h('tr', { key: task.id, style: 'border-bottom: 1px solid #f2f6fc' }, [
                        h('td', { style: 'padding: 10px 12px; font-size: 13px' }, task.target_resource_type),
                        h('td', { style: 'padding: 10px 12px; font-size: 13px' }, task.assignee_user_id ?? '-'),
                        h('td', { style: 'padding: 10px 12px; font-size: 13px' }, task.due_at ? new Date(task.due_at).toLocaleString('zh-CN') : '-'),
                        h('td', { style: 'padding: 10px 12px' }, [
                          h(
                            'span',
                            {
                              class: `el-tag el-tag--${STATUS_TYPE[task.status] ?? 'info'} el-tag--light el-tag--small`,
                            },
                            STATUS_LABEL[task.status] ?? task.status,
                          ),
                        ]),
                        h('td', { style: 'padding: 10px 12px' }, [
                          task.status === 'pending'
                            ? h('span', {}, [
                                h(
                                  'button',
                                  {
                                    class: 'el-button el-button--primary el-button--small is-link',
                                    onClick: () => emit('complete', task),
                                  },
                                  '完成',
                                ),
                                h(
                                  'button',
                                  {
                                    class: 'el-button el-button--warning el-button--small is-link',
                                    style: 'margin-left: 8px',
                                    onClick: () => emit('skip', task),
                                  },
                                  '跳过',
                                ),
                              ])
                            : h('span', { style: 'color: #909399; font-size: 12px' }, task.status === 'done' ? `→ ${task.completed_resource_type ?? ''}` : task.skipped_reason ?? '—'),
                        ]),
                      ]),
                    ),
                  ),
                ],
              ),
        ]),
      ]);
  },
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const workDate = ref<string>(new Date().toISOString().slice(0, 10));
const statusFilter = ref<string>('');
const loading = ref(false);
const submitting = ref(false);
const tasks = ref<QualityInspectionTask[]>([]);

const completeDialogVisible = ref(false);
const skipDialogVisible = ref(false);

const completeFormRef = ref<FormInstance>();
const skipFormRef = ref<FormInstance>();

const activeTask = ref<QualityInspectionTask | null>(null);

const completeForm = ref({
  completed_resource_type: '',
  completed_resource_id: '',
});

const skipForm = ref({
  skipped_reason: '',
});

const completeRules: FormRules = {
  completed_resource_type: [{ required: true, message: '请选择完成记录类型', trigger: 'change' }],
  completed_resource_id: [{ required: true, message: '请输入完成记录 ID', trigger: 'blur' }],
};

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
const sectionTasks = (taskType: string): QualityInspectionTask[] =>
  tasks.value.filter((t) => t.task_type === taskType);

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function loadTasks() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ work_date: workDate.value });
    if (statusFilter.value) params.set('status', statusFilter.value);

    const res = await fetch(`/api/quality-inspection-tasks?${params.toString()}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    tasks.value = (await res.json()) as QualityInspectionTask[];
  } catch (err) {
    ElMessage.error('加载任务列表失败，请稍后重试');
    tasks.value = [];
  } finally {
    loading.value = false;
  }
}

async function submitComplete() {
  if (!completeFormRef.value || !activeTask.value) return;
  await completeFormRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const res = await fetch(`/api/quality-inspection-tasks/${activeTask.value!.id}/complete`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeForm.value),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ElMessage.success('任务已标记为完成');
      completeDialogVisible.value = false;
      await loadTasks();
    } catch {
      ElMessage.error('操作失败，请稍后重试');
    } finally {
      submitting.value = false;
    }
  });
}

async function submitSkip() {
  if (!activeTask.value) return;
  submitting.value = true;
  try {
    const res = await fetch(`/api/quality-inspection-tasks/${activeTask.value.id}/skip`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skipForm.value),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ElMessage.success('任务已跳过');
    skipDialogVisible.value = false;
    await loadTasks();
  } catch {
    ElMessage.error('操作失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}

// ---------------------------------------------------------------------------
// Dialog openers
// ---------------------------------------------------------------------------
function openCompleteDialog(task: QualityInspectionTask) {
  activeTask.value = task;
  completeForm.value = { completed_resource_type: '', completed_resource_id: '' };
  completeFormRef.value?.resetFields();
  completeDialogVisible.value = true;
}

function confirmSkip(task: QualityInspectionTask) {
  activeTask.value = task;
  skipForm.value = { skipped_reason: '' };
  skipFormRef.value?.resetFields();
  skipDialogVisible.value = true;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
onMounted(() => {
  loadTasks();
});
</script>

<style scoped>
.qi-workbench {
  padding: 0 0 32px;
}

.qi-workbench__loading {
  padding: 32px 0;
}

.qi-workbench__section {
  margin-bottom: 16px;
}
</style>
