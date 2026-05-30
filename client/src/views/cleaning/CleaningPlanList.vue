<template>
  <div class="cleaning-plan-page">
    <PageHeaderBlock eyebrow="设备与现场" title="清洁计划管理" description="管理区域清洁计划模板与执行计划，确保每个区域仅有一个激活计划" />

    <div class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">
          激活计划列表
          <span class="card-count">共 {{ activePlans.length }} 个激活计划</span>
        </h3>
        <div class="app-panel-header__actions">
          <el-select
            v-model="selectedAreaPointId"
            placeholder="全部区域"
            clearable
            filterable
            style="width: 200px; margin-right: 12px"
            @change="loadActivePlans"
          >
            <el-option
              v-for="area in workshopAreas"
              :key="area.id"
              :label="area.name"
              :value="area.id"
            />
          </el-select>
          <el-button @click="openTemplateDialog">
            <el-icon><DocumentAdd /></el-icon>新建模板
          </el-button>
          <el-button type="primary" @click="openCloneDialog">
            <el-icon><Plus /></el-icon>从模板创建计划
          </el-button>
        </div>
      </div>

      <div class="app-panel--padded">
        <el-table :data="activePlans" v-loading="loading" stripe>
          <el-table-column label="区域" width="160">
            <template #default="{ row }">
              {{ row.area_point?.name ?? row.area_point_id }}
            </template>
          </el-table-column>
          <el-table-column prop="version" label="版本" width="100" />
          <el-table-column prop="frequency" label="频率" width="100">
            <template #default="{ row }">
              {{ getFrequencyText(row.frequency) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" effect="light" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="生效日期" width="160">
            <template #default="{ row }">{{ formatDate(row.effective_from) }}</template>
          </el-table-column>
          <el-table-column label="清洁项目数" width="120" align="center">
            <template #default="{ row }">{{ row.items?.length ?? 0 }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewItems(row)">查看项目</el-button>
              <el-button
                v-if="row.status !== 'active'"
                link
                type="success"
                size="small"
                @click="handleActivate(row)"
              >激活</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 计划项目详情 -->
    <div v-if="selectedPlan" class="app-panel">
      <div class="app-panel-header">
        <h3 class="app-panel-header__title">
          计划项目 — {{ selectedPlan.area_point?.name }}
          <el-tag :type="getStatusTagType(selectedPlan.status)" effect="light" size="small" style="margin-left: 8px">
            {{ getStatusText(selectedPlan.status) }}
          </el-tag>
        </h3>
      </div>
      <div class="app-panel--padded">
        <el-table :data="selectedPlan.items" stripe>
          <el-table-column prop="sequence" label="序号" width="70" align="center" />
          <el-table-column prop="target_name" label="清洁对象" width="160" />
          <el-table-column prop="target_type" label="对象类型" width="120" />
          <el-table-column prop="method" label="清洁方法" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.method ?? '-' }}</template>
          </el-table-column>
          <el-table-column label="需消毒" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.requires_disinfection ? 'warning' : 'info'" size="small" effect="plain">
                {{ row.requires_disinfection ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="disinfectant" label="消毒剂" width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.disinfectant ?? '-' }}</template>
          </el-table-column>
          <el-table-column label="必须项" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.is_mandatory ? 'danger' : 'info'" size="small" effect="plain">
                {{ row.is_mandatory ? '必须' : '可选' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="需验证" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.requires_verification ? 'primary' : 'info'" size="small" effect="plain">
                {{ row.requires_verification ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 新建模板对话框 -->
    <el-dialog v-model="templateDialogVisible" title="新建清洁计划模板" width="640px" :close-on-click-modal="false">
      <el-form ref="templateFormRef" :model="templateForm" :rules="templateRules" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="templateForm.name" placeholder="例如：灌装间标准清洁" />
        </el-form-item>
        <el-form-item label="区域类型" prop="area_type">
          <el-input v-model="templateForm.area_type" placeholder="例如：filling, packaging" />
        </el-form-item>
        <el-form-item label="版本号" prop="version">
          <el-input v-model="templateForm.version" placeholder="例如：v1" />
        </el-form-item>
        <el-form-item label="清洁项目">
          <div v-for="(item, idx) in templateForm.items" :key="idx" class="template-item-row">
            <el-input v-model="item.target_name" placeholder="对象名称" style="width: 160px; margin-right: 8px" />
            <el-input v-model="item.target_type" placeholder="类型" style="width: 100px; margin-right: 8px" />
            <el-input v-model="item.method" placeholder="方法（可选）" style="width: 140px; margin-right: 8px" />
            <el-checkbox v-model="item.requires_disinfection">需消毒</el-checkbox>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="templateForm.items.length === 1"
              style="margin-left: 8px"
              @click="removeTemplateItem(idx)"
            >删除</el-button>
          </div>
          <el-button link type="primary" size="small" style="margin-top: 8px" @click="addTemplateItem">
            + 添加项目
          </el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreateTemplate">确认新建</el-button>
      </template>
    </el-dialog>

    <!-- 从模板克隆计划对话框 -->
    <el-dialog v-model="cloneDialogVisible" title="从模板创建计划" width="520px" :close-on-click-modal="false">
      <el-form ref="cloneFormRef" :model="cloneForm" :rules="cloneRules" label-width="100px">
        <el-form-item label="模板" prop="template_id">
          <el-select v-model="cloneForm.template_id" placeholder="请选择模板" style="width: 100%">
            <el-option
              v-for="tmpl in templates"
              :key="tmpl.id"
              :label="`${tmpl.name} (${tmpl.version})`"
              :value="tmpl.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="区域点位" prop="area_point_id">
          <el-select v-model="cloneForm.area_point_id" placeholder="请选择区域" filterable style="width: 100%">
            <el-option
              v-for="area in workshopAreas"
              :key="area.id"
              :label="area.name"
              :value="area.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="版本号" prop="version">
          <el-input v-model="cloneForm.version" placeholder="例如：v1" />
        </el-form-item>
        <el-form-item label="生效日期" prop="effective_from">
          <el-date-picker
            v-model="cloneForm.effective_from"
            type="date"
            placeholder="选择生效日期"
            style="width: 100%"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cloneDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleClone">确认创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, DocumentAdd } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { cleaningPlanApi, type CleaningPlan, type CleaningPlanTemplate } from '@/api/cleaning-plan';
import { workshopAreaApi, type WorkshopArea } from '@/api/workshop-area';
import { toList } from '@/utils/apiResponse';
import PageHeaderBlock from '@/components/layout/PageHeaderBlock.vue';

// ── State ─────────────────────────────────────────────────────────────────────

const activePlans = ref<CleaningPlan[]>([]);
const templates = ref<CleaningPlanTemplate[]>([]);
const workshopAreas = ref<WorkshopArea[]>([]);
const selectedAreaPointId = ref('');
const selectedPlan = ref<CleaningPlan | null>(null);
const loading = ref(false);
const submitting = ref(false);

// ── Template dialog ───────────────────────────────────────────────────────────

const templateDialogVisible = ref(false);
const templateFormRef = ref<FormInstance>();

const templateForm = reactive({
  name: '',
  area_type: '',
  version: 'v1',
  items: [{ target_name: '', target_type: 'equipment', method: '', requires_disinfection: false }],
});

const templateRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  area_type: [{ required: true, message: '请输入区域类型', trigger: 'blur' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
};

// ── Clone dialog ──────────────────────────────────────────────────────────────

const cloneDialogVisible = ref(false);
const cloneFormRef = ref<FormInstance>();

const cloneForm = reactive({
  template_id: '',
  area_point_id: '',
  version: 'v1',
  effective_from: '',
});

const cloneRules: FormRules = {
  template_id: [{ required: true, message: '请选择模板', trigger: 'change' }],
  area_point_id: [{ required: true, message: '请选择区域', trigger: 'change' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  effective_from: [{ required: true, message: '请选择生效日期', trigger: 'change' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFrequencyText(frequency: string): string {
  const map: Record<string, string> = {
    daily: '每日',
    weekly: '每周',
    monthly: '每月',
    per_batch: '每批次',
  };
  return map[frequency] ?? frequency;
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    active: '已激活',
    retired: '已停用',
  };
  return map[status] ?? status;
}

function getStatusTagType(status: string): 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
    draft: 'info',
    active: 'success',
    retired: 'warning',
  };
  return map[status] ?? 'info';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadActivePlans() {
  loading.value = true;
  try {
    const res = await cleaningPlanApi.listActivePlans(selectedAreaPointId.value || undefined);
    activePlans.value = toList<CleaningPlan>(res);
    if (selectedPlan.value) {
      const updated = activePlans.value.find((p) => p.id === selectedPlan.value!.id);
      selectedPlan.value = updated ?? null;
    }
  } catch {
    ElMessage.error('加载激活计划失败');
  } finally {
    loading.value = false;
  }
}

async function loadTemplates() {
  try {
    const res = await cleaningPlanApi.listTemplates();
    templates.value = toList<CleaningPlanTemplate>(res);
  } catch {
    ElMessage.error('加载模板失败');
  }
}

async function loadWorkshopAreas() {
  try {
    const res = await workshopAreaApi.getList();
    workshopAreas.value = toList<WorkshopArea>(res);
  } catch {
    ElMessage.error('加载区域列表失败');
  }
}

// ── Template operations ───────────────────────────────────────────────────────

function openTemplateDialog() {
  templateForm.name = '';
  templateForm.area_type = '';
  templateForm.version = 'v1';
  templateForm.items = [{ target_name: '', target_type: 'equipment', method: '', requires_disinfection: false }];
  templateDialogVisible.value = true;
}

function addTemplateItem() {
  templateForm.items.push({ target_name: '', target_type: 'equipment', method: '', requires_disinfection: false });
}

function removeTemplateItem(index: number) {
  templateForm.items.splice(index, 1);
}

async function handleCreateTemplate() {
  await templateFormRef.value?.validate();
  submitting.value = true;
  try {
    await cleaningPlanApi.createTemplate({
      name: templateForm.name,
      area_type: templateForm.area_type,
      version: templateForm.version,
      items: templateForm.items.map((item) => ({
        target_name: item.target_name,
        target_type: item.target_type,
        method: item.method || undefined,
        requires_disinfection: item.requires_disinfection,
      })),
    });
    ElMessage.success('模板新建成功');
    templateDialogVisible.value = false;
    await loadTemplates();
  } catch {
    ElMessage.error('新建模板失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Clone operations ──────────────────────────────────────────────────────────

function openCloneDialog() {
  cloneForm.template_id = '';
  cloneForm.area_point_id = '';
  cloneForm.version = 'v1';
  cloneForm.effective_from = '';
  cloneDialogVisible.value = true;
}

async function handleClone() {
  await cloneFormRef.value?.validate();
  submitting.value = true;
  try {
    await cleaningPlanApi.cloneTemplateToArea({
      template_id: cloneForm.template_id,
      area_point_id: cloneForm.area_point_id,
      version: cloneForm.version,
      effective_from: cloneForm.effective_from,
    });
    ElMessage.success('计划创建成功');
    cloneDialogVisible.value = false;
    await loadActivePlans();
  } catch {
    ElMessage.error('创建计划失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Plan operations ───────────────────────────────────────────────────────────

function viewItems(plan: CleaningPlan) {
  selectedPlan.value = plan;
}

async function handleActivate(plan: CleaningPlan) {
  try {
    await ElMessageBox.confirm(`确认激活 ${plan.area_point?.name ?? plan.area_point_id} 的清洁计划吗？同区域现有激活计划将被自动停用。`, '激活确认', {
      type: 'warning',
      confirmButtonText: '确认激活',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  submitting.value = true;
  try {
    await cleaningPlanApi.activatePlan(plan.id);
    ElMessage.success('计划已激活');
    await loadActivePlans();
  } catch {
    ElMessage.error('激活失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([loadActivePlans(), loadTemplates(), loadWorkshopAreas()]);
});
</script>

<style scoped>
.cleaning-plan-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-count {
  font-size: 13px;
  color: #909399;
  margin-left: 8px;
}

.template-item-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
