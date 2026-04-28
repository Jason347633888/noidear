<template>
  <div class="document-detail" v-loading="loading">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">{{ document?.title }}</span>
      </template>
    </el-page-header>

    <el-card class="info-card" v-if="document">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="文档编号">{{ document.number }}</el-descriptions-item>
        <el-descriptions-item label="文档级别">
          <el-tag>{{ document.level }}级文件</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(document.status)">
            {{ getStatusText(document.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="版本号">v{{ document.version }}</el-descriptions-item>
        <el-descriptions-item label="文件名">{{ document.fileName }}</el-descriptions-item>
        <el-descriptions-item label="文件大小">{{ formatSize(Number(document.fileSize)) }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ document.creator?.name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(document.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="审批人" v-if="document.approver">
          {{ document.approver.name }}
        </el-descriptions-item>
        <el-descriptions-item label="审批时间" v-if="document.approvedAt">
          {{ formatDate(document.approvedAt) }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 驳回原因提示 -->
      <el-alert
        v-if="document.status === 'rejected' && latestRejection?.comment"
        type="error"
        :title="`驳回原因: ${latestRejection.comment}`"
        :closable="false"
        style="margin-top: 16px"
      />

      <div class="actions-wrap">
        <el-button type="primary" @click="handlePreview" :disabled="document.status === 'inactive'">
          <el-icon><View /></el-icon>
          预览文件
        </el-button>
        <el-button type="primary" @click="handleDownload" :disabled="document.status === 'inactive'">
          <el-icon><Download /></el-icon>
          下载文件
        </el-button>
        <el-button
          type="success"
          v-if="document.status === 'draft'"
          @click="handleSubmit"
        >
          提交审批
        </el-button>
        <el-button
          type="warning"
          v-if="document.status === 'rejected'"
          @click="handleSubmit"
        >
          重新提交
        </el-button>
        <el-button
          type="warning"
          v-if="document.status === 'pending'"
          @click="handleWithdraw"
        >
          撤回
        </el-button>
        <el-button
          type="primary"
          v-if="document.status === 'draft' || document.status === 'rejected'"
          @click="$router.push(`/documents/${document.id}/edit`)"
        >
          编辑文档
        </el-button>
        <el-button
          type="danger"
          v-if="document.status === 'draft' || document.status === 'rejected'"
          @click="handleDelete"
        >
          删除文档
        </el-button>
        <el-button
          type="warning"
          v-if="isEffectiveDocument(document.status)"
          @click="handleDeactivate"
        >
          停用文档
        </el-button>
        <el-button
          type="warning"
          v-if="isEffectiveDocument(document.status) && (isCreator || isAdmin)"
          @click="showArchiveDialog"
        >
          归档
        </el-button>
        <el-button
          type="danger"
          v-if="isEffectiveDocument(document.status) && isAdmin"
          @click="showObsoleteDialog"
        >
          作废
        </el-button>
        <el-button
          type="success"
          v-if="document.status === 'archived' && isAdmin"
          @click="showRestoreDialog"
        >
          恢复
        </el-button>
        <el-button
          type="primary"
          @click="openEvidenceChain"
        >
          查看证据链
        </el-button>
      </div>
    </el-card>

    <!-- 归档/作废原因提示 -->
    <el-alert
      v-if="document?.status === 'archived' && document.archiveReason"
      type="warning"
      :title="`归档原因: ${document.archiveReason}`"
      :closable="false"
      style="margin-top: 16px;"
    />
    <el-alert
      v-if="document?.status === 'obsolete' && document.obsoleteReason"
      type="error"
      :title="`作废原因: ${document.obsoleteReason}`"
      :closable="false"
      style="margin-top: 16px;"
    />

    <el-card class="control-card" v-if="document">
      <template #header>文控信息</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="文件类型">{{ document.document_type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="来源分类">{{ document.source_folder || '-' }}</el-descriptions-item>
        <el-descriptions-item label="负责部门">{{ ownerDepartmentLabel }}</el-descriptions-item>
        <el-descriptions-item label="负责人">{{ ownerUserLabel }}</el-descriptions-item>
        <el-descriptions-item label="复审日期">{{ document.review_due_date ? formatControlDate(document.review_due_date) : '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card ref="markdownCardRef" class="markdown-card" v-if="document && document.content_md != null">
      <template #header>
        <div class="card-header">
          <span>Markdown 正文</span>
          <div v-if="canEditMarkdown" class="header-actions">
            <el-button
              v-if="!markdownEditing"
              type="primary"
              @click="startMarkdownEdit"
            >
              编辑正文
            </el-button>
            <template v-else>
              <el-button @click="cancelMarkdownEdit">取消</el-button>
              <el-button type="primary" :loading="savingMarkdown" @click="saveMarkdown">
                保存正文
              </el-button>
            </template>
          </div>
        </div>
      </template>
      <el-alert
        v-if="activeReferenceLabel"
        type="warning"
        :title="`当前定位引用: [[${activeReferenceLabel}]]`"
        :closable="false"
        style="margin-bottom: 12px"
      />
      <MarkdownEditor
        v-if="markdownEditing && canEditMarkdown"
        v-model="markdownDraft"
      />
      <MarkdownViewer
        v-else
        :content="document.content_md"
        :wikilink-status-by-target="wikilinkStatusByTarget"
        @wikilink-click="handleMarkdownWikilinkClick"
      />
    </el-card>

    <el-card class="reference-card" v-if="hasReferences">
      <template #header>引用关系</template>
      <section v-if="referenceHealth" class="reference-section">
        <h3>引用健康概览</h3>
        <div class="reference-health-summary">
          <el-tag>总引用 {{ referenceHealth.totals.total }}</el-tag>
          <el-tag type="success">正常 {{ referenceHealth.totals.healthy }}</el-tag>
          <el-tag type="warning">悬空 {{ referenceHealth.totals.dangling }}</el-tag>
          <el-tag type="danger">无效 {{ referenceHealth.totals.invalid }}</el-tag>
          <el-tag type="warning">冲突 {{ referenceHealth.totals.conflict }}</el-tag>
          <el-tag type="warning">被替代 {{ referenceHealth.totals.superseded }}</el-tag>
        </div>
        <el-table v-if="referenceHealthIssues.length" :data="referenceHealthIssues" stripe>
          <el-table-column prop="label" label="引用文本" />
          <el-table-column label="问题">
            <template #default="{ row }">
              <el-tag :type="referenceHealthTagType(row.status)">
                {{ referenceHealthStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="原因" />
          <el-table-column label="候选/替代">
            <template #default="{ row }">
              <template v-if="row.status === 'conflict' && expandedConflictReferenceId === row.referenceId">
                <el-button
                  v-for="candidate in row.candidates || []"
                  :key="candidate.id"
                  text
                  type="primary"
                  @click="router.push(`/documents/${candidate.id}`)"
                >
                  {{ candidate.number || candidate.title }}
                </el-button>
              </template>
              <el-button
                v-else-if="row.status === 'superseded' && row.supersededById"
                text
                type="primary"
                @click="router.push(`/documents/${row.supersededById}`)"
              >
                {{ row.supersededByTitle || '新版文件' }}
              </el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="{ row }">
              <el-button text type="primary" @click="handleReferenceHealthIssue(row)">
                {{ referenceHealthActionText(row.status) }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
      <section v-if="outboundReferences.length" class="reference-section">
        <h3>引用了</h3>
        <el-table :data="outboundReferences" stripe>
          <el-table-column prop="relationType" label="关系" width="150" />
          <el-table-column label="目标">
            <template #default="{ row }">
              {{ referenceTargetLabel(row) }}
            </template>
          </el-table-column>
        </el-table>
      </section>
      <section v-if="inboundReferences.length" class="reference-section">
        <h3>被引用</h3>
        <el-table :data="inboundReferences" stripe>
          <el-table-column prop="relationType" label="关系" width="150" />
          <el-table-column label="来源">
            <template #default="{ row }">
              {{ row.sourceDoc?.title || row.targetLabel || row.sourceDocId || '-' }}
            </template>
          </el-table-column>
        </el-table>
      </section>
      <section v-if="unresolvedWikilinks.length" class="reference-section">
        <h3>未解析引用</h3>
        <el-table :data="unresolvedWikilinks" stripe>
          <el-table-column prop="targetLabel" label="标签" />
        </el-table>
      </section>
      <section v-if="conflictWikilinks.length" class="reference-section">
        <h3>冲突引用</h3>
        <el-table :data="conflictWikilinks" stripe>
          <el-table-column prop="targetLabel" label="标签" />
          <el-table-column label="候选">
            <template #default="{ row }">
              {{ conflictCandidateLabel(row) }}
            </template>
          </el-table-column>
        </el-table>
      </section>
    </el-card>

    <el-card class="version-card" v-if="versionHistory.length">
      <template #header>
        <span>版本历史</span>
      </template>
      <el-table :data="versionHistory" stripe>
        <el-table-column prop="version" label="版本" width="80">
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" min-width="150" />
        <el-table-column prop="fileSize" label="大小" width="100">
          <template #default="{ row }">{{ formatSize(Number(row.fileSize)) }}</template>
        </el-table-column>
        <el-table-column prop="creator.name" label="操作人" width="100" />
        <el-table-column prop="createdAt" label="操作时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handlePreviewVersion(row)">预览版本</el-button>
            <el-button link type="primary" @click="handleDownloadVersion(row)">下载版本</el-button>
            <el-button link type="warning" @click="handleRollbackVersion(row)">回滚</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 文件预览对话框（使用 OfficePreview 支持多格式） -->
    <el-dialog
      v-model="showPreview"
      :title="`预览: ${document?.fileName || ''}`"
      width="90%"
      destroy-on-close
    >
      <div v-loading="previewLoading" class="preview-dialog-body">
        <OfficePreview
          v-if="!previewLoading"
          :filename="document?.fileName || ''"
          :preview-url="previewUrl"
          @download="handleDownload"
        />
      </div>
      <template #footer>
        <el-button type="primary" @click="handleDownload">
          <el-icon><Download /></el-icon>
          下载原文件
        </el-button>
        <el-button @click="showPreview = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 归档对话框 -->
    <el-dialog v-model="archiveDialogVisible" title="归档文档" width="500px">
      <el-form :model="archiveForm" :rules="archiveRules" ref="archiveFormRef">
        <el-form-item label="归档原因" prop="reason">
          <el-input
            v-model="archiveForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入归档原因（至少10个字符）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="archiveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleArchive" :loading="archiving">
          确认归档
        </el-button>
      </template>
    </el-dialog>

    <!-- 作废对话框 -->
    <el-dialog v-model="obsoleteDialogVisible" title="作废文档" width="500px">
      <el-form :model="obsoleteForm" :rules="obsoleteRules" ref="obsoleteFormRef">
        <el-form-item label="作废原因" prop="reason">
          <el-input
            v-model="obsoleteForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入作废原因（至少10个字符）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="obsoleteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleObsolete" :loading="obsoleting">
          确认作废
        </el-button>
      </template>
    </el-dialog>

    <!-- 恢复对话框 -->
    <el-dialog v-model="restoreDialogVisible" title="恢复归档文档" width="500px">
      <el-form :model="restoreForm" :rules="restoreRules" ref="restoreFormRef">
        <el-form-item label="恢复原因" prop="reason">
          <el-input
            v-model="restoreForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入恢复原因（至少10个字符）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="restoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRestore" :loading="restoring">
          确认恢复
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Download, View } from '@element-plus/icons-vue';
import request from '@/api/request';
import OfficePreview from '@/components/OfficePreview.vue';
import MarkdownEditor from '@/components/documents/MarkdownEditor.vue';
import MarkdownViewer from '@/components/documents/MarkdownViewer.vue';
import { useUserStore } from '@/stores/user';
import filePreviewApi from '@/api/file-preview';
import { documentManagementApi } from '@/api/document-management';
import { documentControlApi, type DocumentReferenceHealthIssue, type DocumentReferenceHealthResult, type ReferenceHealthStatus } from '@/api/document-control';

interface VersionItem {
  id: string;
  version: number;
  fileName: string;
  fileSize: string | number;
  createdAt: string;
  creator: { name: string } | null;
}

interface Approval {
  id: string;
  status: string;
  comment: string | null;
  createdAt: string;
}

interface DocumentReference {
  id: string;
  sourceDocId?: string;
  relationType: string;
  targetType?: string;
  targetDocId?: string | null;
  targetLabel?: string;
  targetRoute?: string;
  targetId?: string;
  sectionId?: string | null;
  wikilinkTarget?: string | null;
  targetDoc?: { id: string; title: string; status: string; number?: string | null; doc_code?: string | null } | null;
  sourceDoc?: { id: string; title: string; status: string; number?: string | null; doc_code?: string | null } | null;
  snapshot?: {
    candidates?: Array<{ id: string; title?: string | null; number?: string | null; doc_code?: string | null }>;
  } | null;
}

interface Document {
  id: string;
  number: string;
  level: number;
  title: string;
  fileName: string;
  fileSize: string;
  filePath: string;
  status: string;
  version: number;
  creatorId: string;
  creator: { name: string } | null;
  approver: { name: string } | null;
  approvedAt: string | null;
  createdAt: string;
  content_md?: string;
  approvals?: Approval[];
  archiveReason?: string | null;
  archivedAt?: string | null;
  obsoleteReason?: string | null;
  obsoletedAt?: string | null;
  document_type?: string;
  source_folder?: string;
  owner_department?: string;
  owner_user_id?: string | null;
  ownerDepartmentId?: string | null;
  ownerUserId?: string | null;
  ownerDepartment?: { id: string; name: string } | null;
  ownerUser?: { id: string; name: string } | null;
  review_due_date?: string;
  sourceReferences?: DocumentReference[];
  targetReferences?: DocumentReference[];
}

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const document = ref<Document | null>(null);
const versionHistory = ref<VersionItem[]>([]);
const showPreview = ref(false);
const previewLoading = ref(false);
const previewUrl = ref('');
const markdownEditing = ref(false);
const markdownDraft = ref('');
const savingMarkdown = ref(false);
const referenceHealth = ref<DocumentReferenceHealthResult | null>(null);
const activeReferenceLabel = ref('');
const expandedConflictReferenceId = ref('');
const markdownCardRef = ref<{ $el?: HTMLElement } | null>(null);

const ownerDepartmentLabel = computed(() =>
  document.value?.ownerDepartment?.name || document.value?.owner_department || '-',
);

const ownerUserLabel = computed(() =>
  document.value?.ownerUser?.name || document.value?.owner_user_id || '-',
);

// 权限判断
const isCreator = computed(() => document.value?.creatorId === userStore.user?.id);
const isAdmin = computed(() => userStore.user?.role === 'admin');
const isDirectMarkdownEditableStatus = (status: string) => ['draft', 'rejected'].includes(status);
const canEditMarkdown = computed(() => {
  if (!document.value) return false;
  return isDirectMarkdownEditableStatus(document.value.status);
});
const sourceReferences = computed(() => document.value?.sourceReferences || []);
const inboundReferences = computed(() => document.value?.targetReferences || []);
const unresolvedWikilinks = computed(() => sourceReferences.value.filter(
  ref => ref.relationType === 'WIKILINK' && ref.targetType === 'unresolved_document',
));
const conflictWikilinks = computed(() => sourceReferences.value.filter(
  ref => ref.relationType === 'WIKILINK' && ref.targetType === 'conflict_document',
));
const outboundReferences = computed(() => sourceReferences.value.filter(
  ref => !(ref.relationType === 'WIKILINK' && ['unresolved_document', 'conflict_document'].includes(ref.targetType || '')),
));
const hasReferences = computed(() => (
  outboundReferences.value.length > 0 ||
  inboundReferences.value.length > 0 ||
  unresolvedWikilinks.value.length > 0 ||
  conflictWikilinks.value.length > 0 ||
  Boolean(referenceHealth.value?.totals.total)
));
const referenceHealthIssues = computed(() => (
  referenceHealth.value?.issues.filter(issue => issue.status !== 'healthy') || []
));

// 归档/作废/恢复相关
const archiveDialogVisible = ref(false);
const obsoleteDialogVisible = ref(false);
const restoreDialogVisible = ref(false);
const archiving = ref(false);
const obsoleting = ref(false);
const restoring = ref(false);
const archiveFormRef = ref();
const obsoleteFormRef = ref();
const restoreFormRef = ref();

const archiveForm = ref({
  reason: '',
});

const obsoleteForm = ref({
  reason: '',
});

const restoreForm = ref({
  reason: '',
});

const archiveRules = {
  reason: [
    { required: true, message: '请输入归档原因', trigger: 'blur' },
    { min: 10, message: '归档原因至少10个字符', trigger: 'blur' },
  ],
};

const obsoleteRules = {
  reason: [
    { required: true, message: '请输入作废原因', trigger: 'blur' },
    { min: 10, message: '作废原因至少10个字符', trigger: 'blur' },
  ],
};

const restoreRules = {
  reason: [
    { required: true, message: '请输入恢复原因', trigger: 'blur' },
    { min: 10, message: '恢复原因至少10个字符', trigger: 'blur' },
  ],
};

// 获取最新的驳回审批记录
const latestRejection = computed(() => {
  if (!document.value?.approvals) return null;
  const rejections = document.value.approvals.filter(a => a.status === 'rejected');
  return rejections.length > 0 ? rejections[0] : null;
});

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleString('zh-CN');
};

const formatControlDate = (value: string): string => new Date(value).toLocaleDateString('zh-CN');
const isEffectiveDocument = (status: string): boolean => status === 'effective' || status === 'approved';

const referenceTargetLabel = (ref: DocumentReference): string => (
  ref.targetDoc?.title || ref.targetLabel || ref.targetRoute || ref.targetId || '-'
);

const conflictCandidateLabel = (ref: DocumentReference): string => {
  const candidates = ref.snapshot?.candidates || [];
  if (!candidates.length) return '-';
  return candidates
    .map(candidate => candidate.title || candidate.number || candidate.doc_code || candidate.id)
    .join('、');
};

const referenceHealthStatusText = (status: ReferenceHealthStatus): string => {
  const map: Record<ReferenceHealthStatus, string> = {
    healthy: '正常',
    dangling: '悬空',
    invalid: '无效',
    conflict: '冲突',
    superseded: '被替代',
  };
  return map[status];
};

const referenceHealthTagType = (status: ReferenceHealthStatus): string => {
  if (status === 'healthy') return 'success';
  if (status === 'invalid') return 'danger';
  return 'warning';
};

const referenceHealthActionText = (status: ReferenceHealthStatus): string => {
  const map: Record<ReferenceHealthStatus, string> = {
    healthy: '查看',
    dangling: '定位引用',
    invalid: '查看目标',
    conflict: '处理冲突',
    superseded: '查看新版',
  };
  return map[status];
};

const getStatusType = (status: string): string => {
  const map: Record<string, string> = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    effective: 'success',
    rejected: 'danger',
    inactive: 'info',
    archived: 'warning',
    obsolete: 'danger',
  };
  return map[status] || 'info';
};

const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    draft: '草稿',
    pending: '待审批',
    approved: '已发布',
    effective: '已发布',
    rejected: '已驳回',
    inactive: '已停用',
    archived: '已归档',
    obsolete: '已作废',
  };
  return map[status] || status;
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await request.get<Document>(`/documents/${route.params.id}`);
    document.value = res;
    markdownDraft.value = res.content_md || '';
    if (!isDirectMarkdownEditableStatus(res.status)) {
      markdownEditing.value = false;
    }
  } catch (error) {
    ElMessage.error('获取文档详情失败');
  } finally {
    loading.value = false;
  }
};

const fetchVersionHistory = async () => {
  try {
    const res = await documentManagementApi.getVersions(String(route.params.id));
    versionHistory.value = res.versions || [];
  } catch (error) {
    // 版本历史获取失败不影响主流程
  }
};

const fetchReferenceHealth = async () => {
  if (!route.params.id) return;
  try {
    referenceHealth.value = await documentControlApi.getReferenceHealth(String(route.params.id));
  } catch (error) {
    referenceHealth.value = null;
  }
};

const handlePreview = async () => {
  if (!document.value?.id) return;
  if (document.value.status === 'inactive') {
    ElMessage.warning('该文档已停用，无法预览');
    return;
  }

  showPreview.value = true;
  previewLoading.value = true;
  previewUrl.value = '';

  try {
    const result = await filePreviewApi.getPreviewInfo(document.value.id);
    previewUrl.value = result.url || '';
  } catch (error) {
    ElMessage.error('获取预览链接失败');
    showPreview.value = false;
  } finally {
    previewLoading.value = false;
  }
};

const handleDownload = () => {
  if (!document.value?.id) {
    return;
  }
  if (document.value.status === 'inactive') {
    ElMessage.warning('该文档已停用，无法下载');
    return;
  }
  window.open(`/api/v1/documents/${document.value.id}/download`, '_blank');
};

const handleDownloadVersion = (row: VersionItem) => {
  if (!document.value?.id) return;
  window.open(documentManagementApi.versionDownloadUrl(document.value.id, row.version), '_blank');
};

const handlePreviewVersion = async (row: VersionItem) => {
  if (!document.value?.id) return;
  showPreview.value = true;
  previewLoading.value = true;
  const fallbackUrl = documentManagementApi.versionDownloadUrl(document.value.id, row.version);
  try {
    const res = await request.get<{ url?: string }>(
      `/documents/${document.value.id}/versions/${row.version}/preview`,
    );
    previewUrl.value = res.url || fallbackUrl;
  } catch {
    previewUrl.value = fallbackUrl;
  } finally {
    previewLoading.value = false;
  }
};

const handleRollbackVersion = async (row: VersionItem) => {
  if (!document.value?.id) return;
  const result = await ElMessageBox.prompt(`请输入回滚到 v${row.version} 的原因`, '回滚版本', {
    inputType: 'textarea',
    inputValidator: (val) => Boolean(val && val.trim().length >= 5),
    inputErrorMessage: '回滚原因至少 5 个字符',
  }) as unknown as { value: string };
  const { value } = result;
  await documentManagementApi.rollbackVersion(document.value.id, row.version, value);
  ElMessage.success('版本回滚成功');
  await fetchData();
  await fetchVersionHistory();
};

const startMarkdownEdit = () => {
  if (!canEditMarkdown.value) return;
  markdownDraft.value = document.value?.content_md || '';
  markdownEditing.value = true;
};

const cancelMarkdownEdit = () => {
  markdownDraft.value = document.value?.content_md || '';
  markdownEditing.value = false;
};

const saveMarkdown = async () => {
  if (!document.value?.id || !canEditMarkdown.value) {
    return;
  }
  savingMarkdown.value = true;
  try {
    await documentControlApi.updateMarkdown(document.value.id, { contentMd: markdownDraft.value });
    ElMessage.success('正文保存成功');
    markdownEditing.value = false;
    await fetchData();
    await fetchReferenceHealth();
  } catch (error) {
    ElMessage.error('正文保存失败');
  } finally {
    savingMarkdown.value = false;
  }
};

const wikilinkLegacyTarget = (ref: DocumentReference): string | null => (
  ref.sectionId?.startsWith('wikilink:') ? ref.sectionId.slice('wikilink:'.length) : null
);

const wikilinkReferenceTarget = (ref: DocumentReference): string | null => (
  ref.wikilinkTarget || wikilinkLegacyTarget(ref) || ref.targetLabel || null
);

const wikilinkStatusByTarget = computed(() => {
  const statusMap: Record<string, 'resolved' | 'dangling' | 'conflict' | 'unknown'> = {};

  for (const ref of outboundReferences.value) {
    if (ref.relationType !== 'WIKILINK' || !ref.targetDocId) continue;
    const target = wikilinkReferenceTarget(ref);
    if (target) statusMap[target] = 'resolved';
  }
  for (const ref of sourceReferences.value) {
    if (ref.relationType !== 'WIKILINK') continue;
    const target = wikilinkReferenceTarget(ref);
    if (!target) continue;
    if (ref.targetType === 'unresolved_document') statusMap[target] = 'dangling';
    if (ref.targetType === 'conflict_document') statusMap[target] = 'conflict';
  }

  return statusMap;
});

const findResolvedWikilinkReference = (target: string): DocumentReference | undefined => (
  outboundReferences.value.find((ref) =>
    ref.relationType === 'WIKILINK' &&
    Boolean(ref.targetDocId) &&
    (
      ref.wikilinkTarget === target ||
      ref.sectionId === `wikilink:${target}` ||
      ref.targetLabel === target ||
      ref.targetDoc?.number === target ||
      ref.targetDoc?.doc_code === target ||
      ref.targetDoc?.title === target
    ),
  )
);

const handleMarkdownWikilinkClick = (target: string) => {
  const normalizedTarget = target.trim();
  if (!normalizedTarget) return;

  const resolved = findResolvedWikilinkReference(normalizedTarget);
  if (resolved?.targetDocId) {
    router.push(`/documents/${resolved.targetDocId}`);
    return;
  }

  const danglingRef = sourceReferences.value.find(
    (ref) => ref.relationType === 'WIKILINK' &&
             ref.targetType === 'unresolved_document' &&
             wikilinkReferenceTarget(ref) === normalizedTarget,
  );
  if (danglingRef) {
    const issue = referenceHealthIssues.value.find((i) => i.referenceId === danglingRef.id);
    if (issue) handleReferenceHealthIssue(issue);
    else activeReferenceLabel.value = normalizedTarget;
    ElMessage.warning('引用未解析，请在引用关系中处理。');
    return;
  }

  const conflictRef = sourceReferences.value.find(
    (ref) => ref.relationType === 'WIKILINK' &&
             ref.targetType === 'conflict_document' &&
             wikilinkReferenceTarget(ref) === normalizedTarget,
  );
  if (conflictRef) {
    const issue = referenceHealthIssues.value.find((i) => i.referenceId === conflictRef.id);
    if (issue) handleReferenceHealthIssue(issue);
    else expandedConflictReferenceId.value = conflictRef.id;
    ElMessage.warning('引用存在多个候选，请选择正确目标。');
    return;
  }

  ElMessage.warning('未找到该引用的解析结果，请保存正文后刷新引用关系。');
};

const handleReferenceHealthIssue = (issue: DocumentReferenceHealthIssue) => {
  if (issue.status === 'dangling') {
    activeReferenceLabel.value = issue.label;
    if (canEditMarkdown.value) {
      startMarkdownEdit();
    }
    markdownCardRef.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ElMessage.warning(`已定位到正文引用: [[${issue.label}]]`);
    return;
  }
  if (issue.status === 'conflict') {
    expandedConflictReferenceId.value = issue.referenceId;
    ElMessage.warning('已展开候选文件，请选择正确目标后更新引用');
    return;
  }
  if (issue.status === 'superseded' && issue.supersededById) {
    ElMessage.warning('目标已被新版本替代，请更新引用');
    router.push(`/documents/${issue.supersededById}`);
    return;
  }
  if (issue.targetDocId) {
    if (issue.status === 'invalid') {
      ElMessage.warning('目标文件已不可作为当前依据');
    }
    router.push(`/documents/${issue.targetDocId}`);
  }
};

const handleSubmit = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await ElMessageBox.confirm('确定要提交该文档进行审批吗？', '提示');
    await request.post(`/documents/${document.value.id}/submit`);
    ElMessage.success('提交成功');
    fetchData();
  } catch {
    // 用户取消
  }
};

const handleWithdraw = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await ElMessageBox.confirm('确定要撤回该文档吗？撤回后可重新编辑和提交。', '提示', {
      type: 'warning',
    });
    await request.post(`/documents/${document.value.id}/withdraw`);
    ElMessage.success('撤回成功');
    fetchData();
  } catch {
    // 用户取消
  }
};

const handleDelete = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await ElMessageBox.confirm('确定要删除该文档吗？此操作不可恢复。', '警告', {
      type: 'warning',
    });
    await request.delete(`/documents/${document.value.id}`);
    ElMessage.success('删除成功');
    router.back();
  } catch {
    // 用户取消
  }
};

const handleDeactivate = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await ElMessageBox.confirm('确定要停用该文档吗？停用后无法下载。', '提示');
    await request.post(`/documents/${document.value.id}/deactivate`);
    ElMessage.success('停用成功');
    fetchData();
  } catch {
    // 用户取消
  }
};

const showArchiveDialog = () => {
  archiveForm.value.reason = '';
  archiveDialogVisible.value = true;
};

const showObsoleteDialog = () => {
  obsoleteForm.value.reason = '';
  obsoleteDialogVisible.value = true;
};

const showRestoreDialog = () => {
  restoreForm.value.reason = '';
  restoreDialogVisible.value = true;
};

const handleArchive = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await archiveFormRef.value.validate();
    archiving.value = true;
    await request.post(`/documents/${document.value.id}/archive`, {
      reason: archiveForm.value.reason,
    });
    ElMessage.success('归档成功');
    archiveDialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    if (error?.message) {
      // 表单验证失败，不显示错误
    }
  } finally {
    archiving.value = false;
  }
};

const handleObsolete = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await obsoleteFormRef.value.validate();
    obsoleting.value = true;
    await request.post(`/documents/${document.value.id}/obsolete`, {
      reason: obsoleteForm.value.reason,
    });
    ElMessage.success('作废成功');
    obsoleteDialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    if (error?.message) {
      // 表单验证失败，不显示错误
    }
  } finally {
    obsoleting.value = false;
  }
};

const handleRestore = async () => {
  if (!document.value?.id) {
    return;
  }
  try {
    await restoreFormRef.value.validate();
    restoring.value = true;
    await request.post(`/documents/${document.value.id}/restore`, {
      reason: restoreForm.value.reason,
    });
    ElMessage.success('恢复成功');
    restoreDialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    if (error?.message) {
      // 表单验证失败，不显示错误
    }
  } finally {
    restoring.value = false;
  }
};

const openEvidenceChain = () => {
  if (!document.value?.id) return;
  router.push({
    path: '/documents/operations/audit-chain',
    query: {
      sourceType: 'document',
      sourceId: document.value.id,
    },
  });
};

onMounted(() => {
  fetchData();
  fetchVersionHistory();
  fetchReferenceHealth();
});
</script>

<style scoped>
.document-detail {
  padding: 0;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
}

.info-card {
  margin-top: 16px;
}

.actions-wrap {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.version-card {
  margin-top: 16px;
}

.control-card {
  margin-top: 16px;
}

.markdown-card {
  margin-top: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.reference-card {
  margin-top: 16px;
}

.reference-section {
  margin-top: 12px;
}

.reference-health-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preview-dialog-body {
  min-height: 400px;
}
</style>
