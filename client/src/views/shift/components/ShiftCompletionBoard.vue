<template>
  <div>
    <div v-for="run in completions" :key="run.run_id" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span>{{ run.product_name }} — {{ run.production_line }}号线</span>
        <span>{{ run.filled }}/{{ run.total_mandatory }}</span>
      </div>
      <el-progress
        :percentage="parseFloat(run.completion_rate)"
        :status="parseFloat(run.completion_rate) === 100 ? 'success' : parseFloat(run.completion_rate) < 50 ? 'exception' : ''"
      />
      <div v-if="run.missing_templates.length > 0" style="margin-top:4px">
        <el-tag
          v-for="t in run.missing_templates"
          :key="t.code"
          type="danger"
          size="small"
          style="margin-right:4px"
        >{{ t.name }}</el-tag>
      </div>
    </div>
    <el-empty v-if="completions.length === 0" description="暂无生产段数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import request from '@/api/request'

const props = defineProps<{ shiftInstanceId: string }>()
const completions = ref<any[]>([])

async function load() {
  completions.value = await request.get(`/shift-instances/${props.shiftInstanceId}/completion`)
}

onMounted(load)
const timer = setInterval(load, 5 * 60 * 1000)
onUnmounted(() => clearInterval(timer))
</script>
