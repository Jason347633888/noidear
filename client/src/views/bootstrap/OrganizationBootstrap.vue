<template>
  <div class="bootstrap-page">
    <el-alert title="组织与权限初始化未完成" type="warning" :closable="false" />
    <el-steps :active="activeStep" class="bootstrap-steps">
      <el-step title="系统角色基线" />
      <el-step title="部门" />
      <el-step title="部门负责人" />
      <el-step title="业务用户归属" />
    </el-steps>
    <el-card class="bootstrap-card">
      <p>{{ stepDescription }}</p>
      <el-button v-if="step === 'departments'" @click="go('/departments?from=bootstrap')">去部门管理</el-button>
      <el-button v-if="step === 'department_manager'" @click="go('/departments?from=bootstrap')">去设置负责人</el-button>
      <el-button v-if="step === 'department_members'" @click="go('/users?from=bootstrap')">去用户管理</el-button>
      <el-button @click="refresh">重新检查</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useBootstrapStore } from '@/stores/bootstrap';

const bootstrapStore = useBootstrapStore();
const router = useRouter();

const step = computed(() => bootstrapStore.step);

const activeStep = computed(() => {
  const stepMap: Record<string, number> = {
    system_role_baseline: 0,
    departments: 1,
    department_manager: 2,
    department_members: 3,
    completed: 4,
  };
  return stepMap[step.value] ?? 0;
});

const stepDescriptions: Record<string, string> = {
  system_role_baseline: '正在建立系统角色基线（admin/leader/user），请稍等或联系管理员。',
  departments: '请先创建至少一个部门。',
  department_manager: '请为部门设置负责人（leader 角色）。',
  department_members: '请至少创建一个业务用户并归属到部门。',
  completed: '初始化已完成。',
};

const stepDescription = computed(() => stepDescriptions[step.value] ?? '');

function go(path: string) {
  router.push(path);
}

async function refresh() {
  await bootstrapStore.refresh();
}
</script>

<style scoped>
.bootstrap-page {
  max-width: 800px;
  margin: 40px auto;
  padding: 0 20px;
}
.bootstrap-steps {
  margin: 24px 0;
}
.bootstrap-card {
  margin-top: 16px;
}
</style>
