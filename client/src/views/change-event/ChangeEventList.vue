<template>
  <div class="change-event-page">
    <div class="page-header">
      <h1 class="page-title">变更管理</h1>
      <p class="page-subtitle">记录并追踪变更事件的合规评估、验证与审批全流程</p>
    </div>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-title-wrap">
            <span class="card-title">变更事件列表</span>
            <span class="card-count">共 {{ list.length }} 条记录</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>发起变更
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="change_no" label="变更编号" width="180" />
        <el-table-column label="变更类型" width="120">
          <template #default="{ row }">
            <el-tag type="primary" effect="light" size="small">
              {{ getChangeTypeText(row.change_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="light" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetailDialog(row)">
              查看详情
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ── 新建变更对话框 ── -->
    <el-dialog
      v-model="createDialogVisible"
      title="发起变更"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item label="变更类型" prop="change_type">
          <el-select v-model="createForm.change_type" placeholder="请选择" style="width: 100%">
            <el-option label="配方变更" value="recipe" />
            <el-option label="工艺变更" value="process" />
            <el-option label="供应商变更" value="supplier" />
            <el-option label="设备变更" value="equipment" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入变更标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="4"
            placeholder="请描述变更内容及原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确认发起</el-button>
      </template>
    </el-dialog>

    <!-- ── 变更详情对话框 ── -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`变更详情 — ${currentEvent?.change_no ?? ''}`"
      width="780px"
      :close-on-click-modal="false"
      class="detail-dialog"
    >
      <div v-if="currentEvent" class="detail-body">
        <!-- 基本信息 -->
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="变更编号">{{ currentEvent.change_no }}</el-descriptions-item>
            <el-descriptions-item label="变更类型">
              <el-tag type="primary" effect="light" size="small">
                {{ getChangeTypeText(currentEvent.change_type) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="标题" :span="2">{{ currentEvent.title }}</el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">{{ currentEvent.description }}</el-descriptions-item>
            <el-descriptions-item label="当前状态">
              <el-tag :type="getStatusType(currentEvent.status)" effect="light" size="small">
                {{ getStatusText(currentEvent.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDate(currentEvent.created_at) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 合规评估记录 -->
        <div class="detail-section">
          <div class="section-header">
            <div class="section-title">合规评估记录</div>
            <el-button size="small" type="primary" @click="openComplianceDialog">
              <el-icon><Plus /></el-icon>添加评估
            </el-button>
          </div>
          <div v-if="detailLoading" class="loading-hint">加载中...</div>
          <div v-else-if="complianceRecords.length === 0" class="empty-hint">暂无合规评估记录</div>
          <el-table v-else :data="complianceRecords" size="small" stripe>
            <el-table-column label="风险等级" width="90">
              <template #default="{ row }">
                <el-tag :type="getRiskType(row.risk_level)" effect="light" size="small">
                  {{ getRiskText(row.risk_level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="法规合规" width="90">
              <template #default="{ row }">
                <el-tag
                  :type="row.legal_compliance ? 'success' : 'danger'"
                  effect="light"
                  size="small"
                >
                  {{ row.legal_compliance === null ? '-' : row.legal_compliance ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="safety_impact" label="安全影响" show-overflow-tooltip>
              <template #default="{ row }">{{ row.safety_impact ?? '-' }}</template>
            </el-table-column>
            <el-table-column prop="conclusion" label="结论" show-overflow-tooltip>
              <template #default="{ row }">{{ row.conclusion ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="70" fixed="right">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="handleDeleteCompliance(row.id)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 验证记录 -->
        <div class="detail-section">
          <div class="section-header">
            <div class="section-title">验证记录</div>
            <el-button size="small" type="primary" @click="openVerificationDialog">
              <el-icon><Plus /></el-icon>添加验证
            </el-button>
          </div>
          <div v-if="detailLoading" class="loading-hint">加载中...</div>
          <div v-else-if="verificationRecords.length === 0" class="empty-hint">暂无验证记录</div>
          <el-table v-else :data="verificationRecords" size="small" stripe>
            <el-table-column prop="verification_method" label="验证方式" show-overflow-tooltip>
              <template #default="{ row }">{{ row.verification_method ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="验证结果" width="120">
              <template #default="{ row }">
                <el-tag
                  :type="getVerificationResultType(row.result)"
                  effect="light"
                  size="small"
                >
                  {{ getVerificationResultText(row.result) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="findings" label="发现问题" show-overflow-tooltip>
              <template #default="{ row }">{{ row.findings ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="70" fixed="right">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="handleDeleteVerification(row.id)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 审批记录 -->
        <div class="detail-section">
          <div class="section-header">
            <div class="section-title">审批记录</div>
            <el-button size="small" type="primary" @click="openApprovalDialog">
              <el-icon><Plus /></el-icon>添加审批
            </el-button>
          </div>
          <div v-if="detailLoading" class="loading-hint">加载中...</div>
          <div v-else-if="approvalRecords.length === 0" class="empty-hint">暂无审批记录</div>
          <el-table v-else :data="approvalRecords" size="small" stripe>
            <el-table-column label="审批决定" width="100">
              <template #default="{ row }">
                <el-tag :type="getDecisionType(row.decision)" effect="light" size="small">
                  {{ getDecisionText(row.decision) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="comments" label="备注" show-overflow-tooltip>
              <template #default="{ row }">{{ row.comments ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="审批时间" width="130">
              <template #default="{ row }">
                {{ row.approved_at ? formatDate(row.approved_at) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" fixed="right">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="handleDeleteApproval(row.id)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ── 添加合规评估记录对话框 ── -->
    <el-dialog
      v-model="complianceDialogVisible"
      title="添加合规评估记录"
      width="520px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form
        ref="complianceFormRef"
        :model="complianceForm"
        label-width="100px"
      >
        <el-form-item label="风险等级">
          <el-select v-model="complianceForm.risk_level" placeholder="请选择" clearable style="width: 100%">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
          </el-select>
        </el-form-item>
        <el-form-item label="法规合规">
          <el-select v-model="complianceForm.legal_compliance_str" placeholder="请选择" clearable style="width: 100%">
            <el-option label="是" value="true" />
            <el-option label="否" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="安全影响">
          <el-input
            v-model="complianceForm.safety_impact"
            type="textarea"
            :rows="2"
            placeholder="描述对食品安全的影响（选填）"
          />
        </el-form-item>
        <el-form-item label="评估结论">
          <el-input
            v-model="complianceForm.conclusion"
            type="textarea"
            :rows="2"
            placeholder="填写评估结论（选填）"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="complianceForm.notes" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="complianceDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingSubRecord" @click="handleCreateCompliance">
          提交
        </el-button>
      </template>
    </el-dialog>

    <!-- ── 添加验证记录对话框 ── -->
    <el-dialog
      v-model="verificationDialogVisible"
      title="添加验证记录"
      width="520px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form
        ref="verificationFormRef"
        :model="verificationForm"
        label-width="100px"
      >
        <el-form-item label="验证方式">
          <el-input v-model="verificationForm.verification_method" placeholder="如：试验验证、文件审查（选填）" />
        </el-form-item>
        <el-form-item label="验证结果">
          <el-select v-model="verificationForm.result" placeholder="请选择" clearable style="width: 100%">
            <el-option label="通过" value="pass" />
            <el-option label="失败" value="fail" />
            <el-option label="有条件通过" value="conditional_pass" />
          </el-select>
        </el-form-item>
        <el-form-item label="发现问题">
          <el-input
            v-model="verificationForm.findings"
            type="textarea"
            :rows="2"
            placeholder="描述验证中发现的问题（选填）"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="verificationForm.notes" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verificationDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingSubRecord" @click="handleCreateVerification">
          提交
        </el-button>
      </template>
    </el-dialog>

    <!-- ── 添加审批记录对话框 ── -->
    <el-dialog
      v-model="approvalDialogVisible"
      title="添加审批记录"
      width="520px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form
        ref="approvalFormRef"
        :model="approvalForm"
        label-width="100px"
      >
        <el-form-item label="审批决定">
          <el-select v-model="approvalForm.decision" placeholder="请选择" clearable style="width: 100%">
            <el-option label="批准" value="approved" />
            <el-option label="拒绝" value="rejected" />
            <el-option label="待定" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input
            v-model="approvalForm.comments"
            type="textarea"
            :rows="3"
            placeholder="填写审批意见（选填）"
          />
        </el-form-item>
        <el-form-item label="审批时间">
          <el-date-picker
            v-model="approvalForm.approved_at"
            type="date"
            placeholder="请选择审批时间"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approvalDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingSubRecord" @click="handleCreateApproval">
          提交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import changeEventApi, {
  type ChangeEvent,
  getChangeTypeText,
  getStatusText,
  getStatusType,
} from '@/api/change-event';
import changeComplianceRecordApi, {
  type ChangeComplianceRecord,
  getRiskText,
  getRiskType,
} from '@/api/change-compliance-record';
import changeVerificationRecordApi, {
  type ChangeVerificationRecord,
  getVerificationResultText,
  getVerificationResultType,
} from '@/api/change-verification-record';
import changeApprovalApi, {
  type ChangeApproval,
  getDecisionText,
  getDecisionType,
} from '@/api/change-approval';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<ChangeEvent[]>([]);
const loading = ref(false);

// ── Create dialog ─────────────────────────────────────────────────────────────

const createDialogVisible = ref(false);
const submitting = ref(false);
const createFormRef = ref<FormInstance>();

const createForm = reactive({
  change_type: '',
  title: '',
  description: '',
});

const createRules: FormRules = {
  change_type: [{ required: true, message: '请选择变更类型', trigger: 'change' }],
  title: [{ required: true, message: '请填写变更标题', trigger: 'blur' }],
  description: [{ required: true, message: '请填写变更描述', trigger: 'blur' }],
};

// ── Detail dialog ─────────────────────────────────────────────────────────────

const detailDialogVisible = ref(false);
const currentEvent = ref<ChangeEvent | null>(null);
const detailLoading = ref(false);

const complianceRecords = ref<ChangeComplianceRecord[]>([]);
const verificationRecords = ref<ChangeVerificationRecord[]>([]);
const approvalRecords = ref<ChangeApproval[]>([]);

// ── Compliance sub-dialog ─────────────────────────────────────────────────────

const complianceDialogVisible = ref(false);
const complianceFormRef = ref<FormInstance>();
const complianceForm = reactive({
  risk_level: '',
  legal_compliance_str: '', // 'true' | 'false' | ''
  safety_impact: '',
  conclusion: '',
  notes: '',
});

// ── Verification sub-dialog ───────────────────────────────────────────────────

const verificationDialogVisible = ref(false);
const verificationFormRef = ref<FormInstance>();
const verificationForm = reactive({
  verification_method: '',
  result: '',
  findings: '',
  notes: '',
});

// ── Approval sub-dialog ───────────────────────────────────────────────────────

const approvalDialogVisible = ref(false);
const approvalFormRef = ref<FormInstance>();
const approvalForm = reactive({
  decision: '',
  comments: '',
  approved_at: '',
});

const submittingSubRecord = ref(false);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await changeEventApi.getList();
    list.value = res as unknown as ChangeEvent[];
  } catch {
    ElMessage.error('加载变更列表失败');
  } finally {
    loading.value = false;
  }
}

async function loadSubRecords(eventId: string) {
  detailLoading.value = true;
  try {
    const [cr, vr, ar] = await Promise.all([
      changeComplianceRecordApi.getByEvent(eventId),
      changeVerificationRecordApi.getByEvent(eventId),
      changeApprovalApi.getByEvent(eventId),
    ]);
    complianceRecords.value = cr as unknown as ChangeComplianceRecord[];
    verificationRecords.value = vr as unknown as ChangeVerificationRecord[];
    approvalRecords.value = ar as unknown as ChangeApproval[];
  } catch {
    ElMessage.error('加载子记录失败');
  } finally {
    detailLoading.value = false;
  }
}

// ── Create event ──────────────────────────────────────────────────────────────

function openCreateDialog() {
  createForm.change_type = '';
  createForm.title = '';
  createForm.description = '';
  createDialogVisible.value = true;
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await changeEventApi.create({
      change_type: createForm.change_type,
      title: createForm.title,
      description: createForm.description,
    });
    ElMessage.success('变更发起成功');
    createDialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('发起失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Detail ────────────────────────────────────────────────────────────────────

async function openDetailDialog(event: ChangeEvent) {
  currentEvent.value = event;
  complianceRecords.value = [];
  verificationRecords.value = [];
  approvalRecords.value = [];
  detailDialogVisible.value = true;
  await loadSubRecords(event.id);
}

// ── Delete event ──────────────────────────────────────────────────────────────

async function handleDelete(event: ChangeEvent) {
  try {
    await ElMessageBox.confirm(
      `确认删除变更「${event.title}」？此操作不可撤销。`,
      '删除确认',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' },
    );
    await changeEventApi.remove(event.id);
    ElMessage.success('删除成功');
    await loadList();
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败，请重试');
    }
  }
}

// ── Compliance record ─────────────────────────────────────────────────────────

function openComplianceDialog() {
  complianceForm.risk_level = '';
  complianceForm.legal_compliance_str = '';
  complianceForm.safety_impact = '';
  complianceForm.conclusion = '';
  complianceForm.notes = '';
  complianceDialogVisible.value = true;
}

async function handleCreateCompliance() {
  if (!currentEvent.value) return;
  submittingSubRecord.value = true;
  try {
    const legalCompliance =
      complianceForm.legal_compliance_str === 'true'
        ? true
        : complianceForm.legal_compliance_str === 'false'
          ? false
          : undefined;
    await changeComplianceRecordApi.create({
      change_event_id: currentEvent.value.id,
      risk_level: complianceForm.risk_level || undefined,
      legal_compliance: legalCompliance,
      safety_impact: complianceForm.safety_impact || undefined,
      conclusion: complianceForm.conclusion || undefined,
      notes: complianceForm.notes || undefined,
    });
    ElMessage.success('合规评估记录已添加');
    complianceDialogVisible.value = false;
    await loadSubRecords(currentEvent.value.id);
  } catch {
    ElMessage.error('添加失败，请重试');
  } finally {
    submittingSubRecord.value = false;
  }
}

async function handleDeleteCompliance(id: string) {
  if (!currentEvent.value) return;
  try {
    await ElMessageBox.confirm('确认删除该合规评估记录？', '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await changeComplianceRecordApi.remove(id);
    ElMessage.success('删除成功');
    await loadSubRecords(currentEvent.value.id);
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败，请重试');
    }
  }
}

// ── Verification record ───────────────────────────────────────────────────────

function openVerificationDialog() {
  verificationForm.verification_method = '';
  verificationForm.result = '';
  verificationForm.findings = '';
  verificationForm.notes = '';
  verificationDialogVisible.value = true;
}

async function handleCreateVerification() {
  if (!currentEvent.value) return;
  submittingSubRecord.value = true;
  try {
    await changeVerificationRecordApi.create({
      change_event_id: currentEvent.value.id,
      verification_method: verificationForm.verification_method || undefined,
      result: verificationForm.result || undefined,
      findings: verificationForm.findings || undefined,
      notes: verificationForm.notes || undefined,
    });
    ElMessage.success('验证记录已添加');
    verificationDialogVisible.value = false;
    await loadSubRecords(currentEvent.value.id);
  } catch {
    ElMessage.error('添加失败，请重试');
  } finally {
    submittingSubRecord.value = false;
  }
}

async function handleDeleteVerification(id: string) {
  if (!currentEvent.value) return;
  try {
    await ElMessageBox.confirm('确认删除该验证记录？', '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await changeVerificationRecordApi.remove(id);
    ElMessage.success('删除成功');
    await loadSubRecords(currentEvent.value.id);
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败，请重试');
    }
  }
}

// ── Approval record ───────────────────────────────────────────────────────────

function openApprovalDialog() {
  approvalForm.decision = '';
  approvalForm.comments = '';
  approvalForm.approved_at = '';
  approvalDialogVisible.value = true;
}

async function handleCreateApproval() {
  if (!currentEvent.value) return;
  submittingSubRecord.value = true;
  try {
    await changeApprovalApi.create({
      change_event_id: currentEvent.value.id,
      decision: approvalForm.decision || undefined,
      comments: approvalForm.comments || undefined,
      approved_at: approvalForm.approved_at || undefined,
    });
    ElMessage.success('审批记录已添加');
    approvalDialogVisible.value = false;
    await loadSubRecords(currentEvent.value.id);
  } catch {
    ElMessage.error('添加失败，请重试');
  } finally {
    submittingSubRecord.value = false;
  }
}

async function handleDeleteApproval(id: string) {
  if (!currentEvent.value) return;
  try {
    await ElMessageBox.confirm('确认删除该审批记录？', '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await changeApprovalApi.remove(id);
    ElMessage.success('删除成功');
    await loadSubRecords(currentEvent.value.id);
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败，请重试');
    }
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.change-event-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-count {
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  align-items: center;
}

/* Detail dialog */
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.empty-hint {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 16px 0;
}

.loading-hint {
  font-size: 13px;
  color: #909399;
  text-align: center;
  padding: 16px 0;
}
</style>
