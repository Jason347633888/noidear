<template>
  <div style="padding: 20px">
    <h2>管理层仪表盘</h2>

    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :xs="12" :sm="6">
        <el-card>
          <el-statistic title="本月不合格品" :value="kpis.nc_count_this_month">
            <template #suffix>
              <span style="color: #f56c6c">件</span>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card>
          <el-statistic title="超期未关闭CAPA" :value="kpis.capa_overdue_count">
            <template #suffix>
              <span
                :style="{
                  color: kpis.capa_overdue_count > 0 ? '#f56c6c' : '#67c23a',
                }"
                >项</span
              >
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card>
          <el-statistic
            title="本月CCP记录"
            :value="kpis.ccp_records_this_month"
          />
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card>
          <el-statistic title="即将过期文件" :value="kpis.docs_expiring_soon">
            <template #suffix>
              <span
                :style="{
                  color: kpis.docs_expiring_soon > 0 ? '#e6a23c' : '#67c23a',
                }"
                >份</span
              >
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :sm="12">
        <el-card header="即将过期体系文件（30天内）">
          <el-empty
            v-if="readiness.expiring_docs.length === 0"
            description="无即将过期文件"
          />
          <el-table v-else :data="readiness.expiring_docs" size="small">
            <el-table-column label="文件编号" prop="number" width="140" />
            <el-table-column label="文件名称" prop="title" />
            <el-table-column label="评审日期" width="110">
              <template #default="{ row }">
                <span
                  :style="{
                    color: isUrgent(row.review_due_date) ? '#f56c6c' : '#e6a23c',
                  }"
                >
                  {{ row.review_due_date?.slice(0, 10) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :sm="12">
        <el-card header="超期未关闭CAPA">
          <el-empty
            v-if="readiness.overdue_capas.length === 0"
            description="无超期CAPA"
          />
          <el-table v-else :data="readiness.overdue_capas" size="small">
            <el-table-column label="编号" prop="capa_no" width="120" />
            <el-table-column label="描述" prop="description" />
            <el-table-column
              label="截止"
              :formatter="(r: any) => r.due_date?.slice(0, 10)"
              width="100"
            />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/api/request'

interface Kpis {
  nc_count_this_month: number
  capa_overdue_count: number
  ccp_records_this_month: number
  docs_expiring_soon: number
}

interface ExpiringDoc {
  id: string
  title: string
  number: string
  review_due_date: string
}

interface OverdueCapa {
  id: string
  capa_no: string
  description: string
  due_date: string
}

interface BrcgsReadiness {
  expiring_docs: ExpiringDoc[]
  overdue_capas: OverdueCapa[]
}

const kpis = ref<Kpis>({
  nc_count_this_month: 0,
  capa_overdue_count: 0,
  ccp_records_this_month: 0,
  docs_expiring_soon: 0,
})

const readiness = ref<BrcgsReadiness>({ expiring_docs: [], overdue_capas: [] })

onMounted(async () => {
  try {
    const [kpisData, readinessData] = await Promise.all([
      request.get<Kpis>('/statistics/dashboard/kpis'),
      request.get<BrcgsReadiness>('/statistics/dashboard/brcgs-readiness'),
    ])
    kpis.value = kpisData
    readiness.value = readinessData
  } catch (error) {
    console.error('Failed to load management dashboard data:', error)
  }
})

function isUrgent(dateStr: string): boolean {
  return new Date(dateStr).getTime() - Date.now() < 7 * 86400000
}
</script>
