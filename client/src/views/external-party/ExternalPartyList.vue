<template>
  <div class="ep-list-page">
    <PageHeaderBlock eyebrow="设备与现场" title="外部方档案" description="管理客户、承运商、废弃物收运单位等外部方信息" />

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="card-header-left">
            <div class="card-title-wrap">
              <span class="card-title">外部方列表</span>
              <span class="card-count">共 {{ list.length }} 条记录</span>
            </div>
            <el-select
              v-model="filterPartyType"
              placeholder="全部类型"
              clearable
              style="width: 160px; margin-left: 16px"
              @change="loadList"
            >
              <el-option label="客户" value="customer" />
              <el-option label="承运商" value="carrier" />
              <el-option label="废弃物收运单位" value="waste_collector" />
            </el-select>
          </div>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>新建外部方
          </el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="类型" width="130">
          <template #default="{ row }">
            <el-tag
              :type="getPartyTypeTagType(row.party_type)"
              effect="light"
              size="small"
            >
              {{ getPartyTypeText(row.party_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="140" show-overflow-tooltip />
        <el-table-column label="编号" width="120">
          <template #default="{ row }">{{ row.code || '-' }}</template>
        </el-table-column>
        <el-table-column label="联系人" width="100">
          <template #default="{ row }">{{ row.contact_name || '-' }}</template>
        </el-table-column>
        <el-table-column label="联系电话" width="130">
          <template #default="{ row }">{{ row.contact_phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="地址" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.address || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'active' ? 'success' : 'info'"
              effect="light"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.notes || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确认删除该外部方？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑外部方' : '新建外部方'"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="110px"
      >
        <el-form-item label="类型" prop="party_type">
          <el-select v-model="form.party_type" placeholder="请选择类型" style="width: 100%">
            <el-option label="客户" value="customer" />
            <el-option label="承运商" value="carrier" />
            <el-option label="废弃物收运单位" value="waste_collector" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="编号">
          <el-input v-model="form.code" placeholder="可选" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact_name" placeholder="可选" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contact_phone" placeholder="可选" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="可选" />
        </el-form-item>
        <el-form-item label="许可证号">
          <el-input v-model="form.license_no" placeholder="可选" />
        </el-form-item>
        <el-form-item label="批准项目">
          <el-input v-model="form.approved_items" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingId ? '保存修改' : '确认新建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import externalPartyApi, {
  type ExternalParty,
  type PartyType,
  type PartyStatus,
  getPartyTypeText,
  getStatusText,
} from '@/api/external-party';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

// ── State ─────────────────────────────────────────────────────────────────────

const list = ref<ExternalParty[]>([]);
const loading = ref(false);
const filterPartyType = ref('');

// ── Dialog ────────────────────────────────────────────────────────────────────

const dialogVisible = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const form = reactive({
  party_type: '' as PartyType | '',
  name: '',
  code: '',
  contact_name: '',
  contact_phone: '',
  address: '',
  license_no: '',
  approved_items: '',
  status: 'active' as PartyStatus,
  notes: '',
});

const formRules: FormRules = {
  party_type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPartyTypeTagType(partyType: string): 'primary' | 'success' | 'warning' {
  if (partyType === 'customer') return 'primary';
  if (partyType === 'carrier') return 'success';
  return 'warning';
}

function resetForm() {
  form.party_type = '';
  form.name = '';
  form.code = '';
  form.contact_name = '';
  form.contact_phone = '';
  form.address = '';
  form.license_no = '';
  form.approved_items = '';
  form.status = 'active';
  form.notes = '';
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadList() {
  loading.value = true;
  try {
    const res = await externalPartyApi.getList(filterPartyType.value || undefined);
    list.value = res as unknown as ExternalParty[];
  } catch {
    ElMessage.error('加载外部方档案失败');
  } finally {
    loading.value = false;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

function openCreateDialog() {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

// ── Edit ──────────────────────────────────────────────────────────────────────

function openEditDialog(row: ExternalParty) {
  editingId.value = row.id;
  form.party_type = row.party_type;
  form.name = row.name;
  form.code = row.code ?? '';
  form.contact_name = row.contact_name ?? '';
  form.contact_phone = row.contact_phone ?? '';
  form.address = row.address ?? '';
  form.license_no = row.license_no ?? '';
  form.approved_items = row.approved_items ?? '';
  form.status = row.status;
  form.notes = row.notes ?? '';
  dialogVisible.value = true;
}

// ── Submit ────────────────────────────────────────────────────────────────────

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const payload = {
      party_type: form.party_type as PartyType,
      name: form.name,
      code: form.code || undefined,
      contact_name: form.contact_name || undefined,
      contact_phone: form.contact_phone || undefined,
      address: form.address || undefined,
      license_no: form.license_no || undefined,
      approved_items: form.approved_items || undefined,
      status: form.status,
      notes: form.notes || undefined,
    };
    if (editingId.value) {
      await externalPartyApi.update(editingId.value, payload);
      ElMessage.success('修改成功');
    } else {
      await externalPartyApi.create(payload);
      ElMessage.success('新建成功');
    }
    dialogVisible.value = false;
    await loadList();
  } catch {
    ElMessage.error('操作失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function handleDelete(id: string) {
  try {
    await externalPartyApi.remove(id);
    ElMessage.success('删除成功');
    list.value = list.value.filter((item) => item.id !== id);
  } catch {
    ElMessage.error('删除失败，请重试');
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadList();
});
</script>

<style scoped>
.ep-list-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header-left {
  display: flex;
  align-items: center;
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
</style>
