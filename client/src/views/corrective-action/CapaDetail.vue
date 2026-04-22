<template>
  <div style="padding:20px">
    <el-page-header @back="$router.back()" :content="`CAPA — ${capa?.capa_no ?? ''}`" />

    <el-descriptions :column="2" border style="margin-top:16px">
      <el-descriptions-item label="状态">
        <el-tag :type="statusType(capa?.status)">{{ statusLabel(capa?.status) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="截止日期">{{ capa?.due_date?.slice(0,10) }}</el-descriptions-item>
      <el-descriptions-item label="根本原因" :span="2">{{ capa?.root_cause ?? '—' }}</el-descriptions-item>
      <el-descriptions-item label="纠正措施" :span="2">{{ capa?.corrective_action ?? '—' }}</el-descriptions-item>
    </el-descriptions>

    <div style="margin-top:16px;display:flex;gap:8px">
      <el-button v-if="capa?.status === 'open'" type="primary" @click="advance('implementing')">开始实施</el-button>
      <el-button v-if="capa?.status === 'implementing'" type="warning" @click="advance('pending_verification')">提交验证</el-button>
      <el-button v-if="capa?.status === 'pending_verification'" type="success" @click="verifyDialog = true">记录验证结果</el-button>
    </div>

    <el-divider>验证记录</el-divider>
    <el-table :data="verifications" size="small">
      <el-table-column label="验证方法" prop="verification_method" />
      <el-table-column label="结论" width="80">
        <template #default="{ row }">
          <el-tag :type="row.result === 'effective' ? 'success' : 'danger'" size="small">
            {{ row.result === 'effective' ? '有效' : '无效' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" prop="notes" />
      <el-table-column label="时间" width="100">
        <template #default="{ row }">{{ row.verified_at?.slice(0,10) }}</template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="verifyDialog" title="记录验证结果" width="420px">
      <el-form :model="verifyForm" label-width="80px">
        <el-form-item label="验证方法">
          <el-input v-model="verifyForm.verification_method" />
        </el-form-item>
        <el-form-item label="结论">
          <el-radio-group v-model="verifyForm.result">
            <el-radio value="effective">有效</el-radio>
            <el-radio value="ineffective">无效，需重新实施</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="verifyForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyDialog = false">取消</el-button>
        <el-button type="primary" :loading="verifyLoading" @click="submitVerification">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const route = useRoute()
const capaId = route.params.id as string
const capa = ref<any>(null)
const verifications = ref<any[]>([])
const verifyDialog = ref(false)
const verifyLoading = ref(false)
const verifyForm = reactive({ verification_method: '', result: 'effective', notes: '' })

onMounted(async () => {
  capa.value = await request.get(`/corrective-actions/${capaId}`)
  verifications.value = await request.get(`/corrective-actions/${capaId}/verifications`)
})

function statusLabel(s?: string) {
  return (
    { open: '待处理', implementing: '实施中', pending_verification: '待验证', closed: '已关闭' }[s ?? ''] ?? s
  )
}

function statusType(s?: string) {
  return (
    { open: 'danger', implementing: 'warning', pending_verification: 'primary', closed: 'success' }[s ?? ''] ?? ''
  )
}

async function advance(newStatus: string) {
  try {
    await request.patch(`/corrective-actions/${capaId}`, { status: newStatus })
    capa.value = await request.get(`/corrective-actions/${capaId}`)
  } catch {
    ElMessage.error('状态更新失败')
  }
}

async function submitVerification() {
  verifyLoading.value = true
  try {
    await request.post(`/corrective-actions/${capaId}/verifications`, verifyForm)
    ElMessage.success('验证记录已提交')
    verifyDialog.value = false
    capa.value = await request.get(`/corrective-actions/${capaId}`)
    verifications.value = await request.get(`/corrective-actions/${capaId}/verifications`)
  } catch {
    ElMessage.error('提交失败')
  } finally {
    verifyLoading.value = false
  }
}
</script>
