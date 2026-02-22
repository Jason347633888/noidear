<template>
  <view class="calendar-page">
    <!-- Month navigation -->
    <view class="calendar-page__nav">
      <view class="calendar-page__nav-btn" @tap="prevMonth">
        <text class="calendar-page__nav-text">&lt;</text>
      </view>
      <text class="calendar-page__month">{{ currentYear }}年{{ currentMonth }}月</text>
      <view class="calendar-page__nav-btn" @tap="nextMonth">
        <text class="calendar-page__nav-text">&gt;</text>
      </view>
    </view>

    <!-- Calendar grid component -->
    <CalendarView
      :year="currentYear"
      :month="currentMonth"
      :selected-date="selectedDate"
      :plan-dates="planDates"
      @select-date="onSelectDate"
    />

    <!-- Selected date plans -->
    <view class="calendar-page__plans">
      <view class="calendar-page__plans-header">
        <text class="calendar-page__plans-title">{{ selectedDateLabel }}</text>
      </view>
      <view v-if="selectedPlans.length > 0">
        <PlanCard
          v-for="plan in selectedPlans"
          :key="plan.id"
          :item="plan"
          @tap="onPlanTap"
        />
      </view>
      <EmptyState v-else title="当日无计划" icon="&#x1F4C5;" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import type { CalendarPlan } from '@/types'
import { get } from '@/utils/request'
import CalendarView from '@/components/CalendarView.vue'
import PlanCard from '@/components/PlanCard.vue'
import EmptyState from '@/components/EmptyState.vue'

const currentYear = ref(dayjs().year())
const currentMonth = ref(dayjs().month() + 1)
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const plans = ref<CalendarPlan[]>([])

const planDates = computed(() => {
  const dates = new Set<string>()
  plans.value.forEach((p) => dates.add(p.date))
  return dates
})

const selectedPlans = computed(() =>
  plans.value.filter((p) => p.date === selectedDate.value),
)

const selectedDateLabel = computed(() => {
  const d = dayjs(selectedDate.value)
  return `${d.month() + 1}月${d.date()}日 计划`
})

function prevMonth(): void {
  const d = dayjs(`${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`).subtract(1, 'month')
  currentYear.value = d.year()
  currentMonth.value = d.month() + 1
  fetchPlans()
}

function nextMonth(): void {
  const d = dayjs(`${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`).add(1, 'month')
  currentYear.value = d.year()
  currentMonth.value = d.month() + 1
  fetchPlans()
}

function onSelectDate(date: string): void {
  selectedDate.value = date
}

async function fetchPlans(): Promise<void> {
  try {
    const startDate = dayjs(`${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-01`).format('YYYY-MM-DD')
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD')

    const result = await get<CalendarPlan[]>('/equipment/tasks', {
      startDate,
      endDate,
    })
    plans.value = result || []
  } catch {
    plans.value = []
  }
}

function onPlanTap(plan: CalendarPlan): void {
  uni.navigateTo({ url: `/pages/records/detail?id=${plan.id}&type=plan` })
}

onMounted(() => {
  fetchPlans()
})
</script>

<style scoped>
.calendar-page {
  padding: 20rpx;
}

.calendar-page__nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 16rpx 16rpx 0 0;
}

.calendar-page__nav-btn {
  padding: 12rpx 24rpx;
}

.calendar-page__nav-text {
  font-size: 32rpx;
  color: #409eff;
}

.calendar-page__month {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.calendar-page__plans {
  margin-top: 24rpx;
}

.calendar-page__plans-header {
  margin-bottom: 16rpx;
}

.calendar-page__plans-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
</style>
