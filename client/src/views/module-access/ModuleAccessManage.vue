<template>
  <div class="module-access-manage">
    <h2>模块开关</h2>
    <p class="hint">勾选表示对应角色可以看到该模块。管理员永远可见，不在表中。</p>
    <el-table :data="rows" border>
      <el-table-column prop="moduleLabel" label="模块" min-width="160" />
      <el-table-column label="主管 (leader)" width="160">
        <template #default="{ row }">
          <el-switch v-model="row.leader" />
        </template>
      </el-table-column>
      <el-table-column label="员工 (user)" width="160">
        <template #default="{ row }">
          <el-switch v-model="row.user" />
        </template>
      </el-table-column>
    </el-table>
    <div class="actions">
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { moduleAccessApi, type MatrixRow } from '@/api/module-access';
import { useModuleAccessStore } from '@/stores/moduleAccess';

const rows = ref<MatrixRow[]>([]);
const saving = ref(false);
const moduleAccess = useModuleAccessStore();

onMounted(async () => {
  const r = await moduleAccessApi.listMatrix();
  rows.value = r.modules;
});

async function save() {
  saving.value = true;
  try {
    await moduleAccessApi.saveMatrix(
      rows.value.map((r) => ({ moduleKey: r.moduleKey, leader: r.leader, user: r.user })),
    );
    ElMessage.success('保存成功');
    await moduleAccess.refresh();
  } catch {
    ElMessage.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.module-access-manage {
  max-width: 700px;
  margin: 0 auto;
  padding: 24px;
}

h2 {
  margin-bottom: 8px;
}

.hint {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 16px;
}

.actions {
  margin-top: 16px;
}
</style>
