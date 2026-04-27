<template>
  <div class="system-document-center">
    <el-tabs v-model="activeView">
      <el-tab-pane label="文件库" name="library">
        <SystemFileLibrary />
      </el-tab-pane>
      <el-tab-pane label="台账" name="ledger" lazy>
        <Level1List />
      </el-tab-pane>
      <el-tab-pane label="引用问题" name="referenceIssues" lazy>
        <section class="reference-issues">
          <el-table :data="referenceIssues" stripe>
            <el-table-column label="来源文件">
              <template #default="{ row }">
                {{ row.sourceTitle }}
              </template>
            </el-table-column>
            <el-table-column prop="label" label="引用文本" />
            <el-table-column label="问题类型" width="110">
              <template #default="{ row }">
                <el-tag :type="referenceIssueTagType(row.status)">
                  {{ referenceIssueStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="问题原因" />
            <el-table-column label="目标或候选">
              <template #default="{ row }">
                {{ referenceIssueTargetText(row) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template #default="{ row }">
                <el-button text type="primary" @click="openSource(row.sourceDocId)">查看来源文件</el-button>
                <el-button
                  v-if="row.targetDocId || row.supersededById"
                  text
                  type="primary"
                  @click="openTarget(row)"
                >
                  查看目标文件
                </el-button>
                <el-button
                  v-if="row.status === 'conflict'"
                  text
                  type="warning"
                  @click="openSource(row.sourceDocId)"
                >
                  处理冲突
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import SystemFileLibrary from './SystemFileLibrary.vue';
import Level1List from './Level1List.vue';
import { documentControlApi, type DocumentReferenceHealthIssue, type ReferenceHealthStatus } from '@/api/document-control';

const activeView = ref('library');
const router = useRouter();
const referenceIssues = ref<DocumentReferenceHealthIssue[]>([]);

const referenceIssueStatusText = (status: ReferenceHealthStatus): string => {
  const map: Record<ReferenceHealthStatus, string> = {
    healthy: '正常',
    dangling: '悬空',
    invalid: '无效',
    conflict: '冲突',
    superseded: '被替代',
  };
  return map[status];
};

const referenceIssueTagType = (status: ReferenceHealthStatus): string => {
  if (status === 'invalid') return 'danger';
  if (status === 'healthy') return 'success';
  return 'warning';
};

const referenceIssueTargetText = (issue: DocumentReferenceHealthIssue): string => {
  if (issue.supersededByTitle) return issue.supersededByTitle;
  if (issue.targetTitle) return issue.targetTitle;
  if (issue.candidates?.length) {
    return issue.candidates.map(candidate => candidate.title || candidate.number || candidate.id).join('、');
  }
  return '-';
};

const openSource = (sourceDocId: string) => {
  router.push(`/documents/${sourceDocId}`);
};

const openTarget = (issue: DocumentReferenceHealthIssue) => {
  router.push(`/documents/${issue.supersededById || issue.targetDocId}`);
};

const loadReferenceIssues = async () => {
  try {
    const result = await documentControlApi.listReferenceHealthIssues();
    referenceIssues.value = result.issues;
  } catch {
    referenceIssues.value = [];
  }
};

onMounted(() => {
  loadReferenceIssues();
});
</script>

<style scoped>
.system-document-center {
  min-width: 0;
}

.reference-issues {
  min-width: 0;
}
</style>
