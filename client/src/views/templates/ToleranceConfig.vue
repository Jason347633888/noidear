<template>
  <div class="tolerance-config" v-loading="loading">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">公差配置</span>
      </template>
    </el-page-header>

    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>模板：{{ template?.title }}</span>
          <el-tag size="small">{{ getLevelText(template?.level) }}</el-tag>
        </div>
      </template>

      <el-alert
        v-if="numberFields.length === 0"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px;"
      >
        当前模板中没有数字类型字段，无法配置公差
      </el-alert>

      <el-table v-else :data="configData" stripe border>
        <el-table-column prop="fieldName" label="字段名" width="150" />
        <el-table-column prop="fieldLabel" label="字段标签" width="150" />
        <el-table-column label="公差类型" width="150">
          <template #default="{ row }">
            <el-select v-model="row.toleranceType" placeholder="请选择">
              <el-option value="range" label="范围公差 (±值)" />
              <el-option value="percentage" label="百分比公差 (±%)" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="最小值" width="180">
          <template #default="{ row }">
            <el-input-number
              v-model="row.toleranceMin"
              :min="0"
              :step="row.toleranceType === 'percentage' ? 1 : 0.1"
              :precision="row.toleranceType === 'percentage' ? 0 : 2"
              :max="row.toleranceType === 'percentage' ? 100 : undefined"
              controls-position="right"
              placeholder="最小值"
            />
          </template>
        </el-table-column>
        <el-table-column label="最大值" width="180">
          <template #default="{ row }">
            <el-input-number
              v-model="row.toleranceMax"
              :min="0"
              :step="row.toleranceType === 'percentage' ? 1 : 0.1"
              :precision="row.toleranceType === 'percentage' ? 0 : 2"
              :max="row.toleranceType === 'percentage' ? 100 : undefined"
              controls-position="right"
              placeholder="最大值"
            />
          </template>
        </el-table-column>
        <el-table-column label="示例" min-width="200">
          <template #default="{ row }">
            <span v-if="row.toleranceType === 'range' && row.toleranceMin !== null && row.toleranceMax !== null">
              标准值 ± {{ row.toleranceMin }} ~ {{ row.toleranceMax }}
            </span>
            <span v-else-if="row.toleranceType === 'percentage' && row.toleranceMin !== null && row.toleranceMax !== null">
              标准值 × (1 - {{ row.toleranceMin }}%) ~ (1 + {{ row.toleranceMax }}%)
            </span>
            <span v-else class="placeholder-text">请输入公差范围</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="actions">
        <el-button @click="$router.back()">取消</el-button>
        <el-button
          type="primary"
          @click="handleSubmit"
          :loading="submitting"
          :disabled="!hasChanges"
        >
          保存配置
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import deviationApi, { type ToleranceFieldConfig } from '@/api/deviation';
import type { TemplateField } from '@/components/FormBuilder.vue';

interface Template {
  id: string;
  title: string;
  level: number;
  fieldsJson: TemplateField[];
}

interface ConfigRow extends ToleranceFieldConfig {
  fieldLabel: string;
}

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const submitting = ref(false);
const template = ref<Template | null>(null);
const configData = reactive<ConfigRow[]>([]);
const originalConfig = ref<string>('');
const hasChanges = computed(() => {
  return JSON.stringify(configData) !== originalConfig.value;
});

const numberFields = computed(() => {
  return template.value?.fieldsJson?.filter(f => f.type === 'number') || [];
});

const getLevelText = (level?: number) => {
  const map: Record<number, string> = {
    1: '一级模板',
    2: '二级模板',
    3: '三级模板',
    4: '四级模板',
  };
  return level ? map[level] : '';
};

const fetchTemplate = async () => {
  loading.value = true;
  try {
    const res = await request.get<Template>(`/templates/${route.params.id}`);
    template.value = res;
    await fetchToleranceConfig();
  } catch {
    ElMessage.error('获取模板信息失败');
  } finally {
    loading.value = false;
  }
};

const fetchToleranceConfig = async () => {
  try {
    const res = await deviationApi.getToleranceConfig(route.params.id as string);
    const existingConfig: Record<string, ToleranceFieldConfig> = {};
    res.fields?.forEach(f => {
      existingConfig[f.fieldName] = f;
    });

    configData.length = 0;
    numberFields.value.forEach(field => {
      const existing = existingConfig[field.name];
      configData.push({
        fieldName: field.name,
        fieldLabel: field.label,
        toleranceType: existing?.toleranceType || 'range',
        toleranceMin: existing?.toleranceMin ?? null,
        toleranceMax: existing?.toleranceMax ?? null,
      } as ConfigRow);
    });

    originalConfig.value = JSON.stringify(configData);
  } catch (error: any) {
    // 404 表示还没有配置，使用默认值
    if (error?.response?.status !== 404) {
      ElMessage.error('获取公差配置失败');
    }
  }
};

const validateConfig = (): boolean => {
  for (const row of configData) {
    if (row.toleranceMin === null || row.toleranceMax === null) {
      continue; // 允许不配置
    }

    if (row.toleranceMin < 0 || row.toleranceMax < 0) {
      ElMessage.error(`字段 ${row.fieldLabel} 的公差值不能为负数`);
      return false;
    }

    if (row.toleranceType === 'percentage') {
      if (row.toleranceMin > 100 || row.toleranceMax > 100) {
        ElMessage.error(`字段 ${row.fieldLabel} 的百分比公差不能超过100%`);
        return false;
      }
    }

    if (row.toleranceMin > row.toleranceMax) {
      ElMessage.error(`字段 ${row.fieldLabel} 的最小公差不能大于最大公差`);
      return false;
    }
  }
  return true;
};

const handleSubmit = async () => {
  if (!validateConfig()) {
    return;
  }

  submitting.value = true;
  try {
    const fields = configData
      .filter(row => row.toleranceMin !== null && row.toleranceMax !== null)
      .map(row => ({
        fieldName: row.fieldName,
        toleranceType: row.toleranceType,
        toleranceMin: row.toleranceMin,
        toleranceMax: row.toleranceMax,
      }));

    await deviationApi.updateToleranceConfig(route.params.id as string, { fields });
    ElMessage.success('公差配置已保存');
    originalConfig.value = JSON.stringify(configData);
    router.back();
  } catch {
    // Error handled by interceptor
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  fetchTemplate();
});
</script>

<style scoped>
.tolerance-config {
  padding: 0;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
}

.config-card {
  margin-top: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.placeholder-text {
  color: #c0c4cc;
  font-size: 13px;
}

.actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
