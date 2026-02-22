<template>
  <view class="calendar-view">
    <!-- Weekday headers -->
    <view class="calendar-view__weekdays">
      <text v-for="d in weekdays" :key="d" class="calendar-view__weekday">{{ d }}</text>
    </view>

    <!-- Calendar grid (42 days) -->
    <view class="calendar-view__grid">
      <view
        v-for="(day, index) in calendarDays"
        :key="index"
        class="calendar-view__day"
        :class="{
          'calendar-view__day--other': !day.isCurrentMonth,
          'calendar-view__day--today': day.isToday,
          'calendar-view__day--selected': day.date === selectedDate,
        }"
        @tap="onSelectDate(day)"
      >
        <text class="calendar-view__day-text">{{ day.day }}</text>
        <view v-if="day.hasPlan" class="calendar-view__dot"></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'

interface CalendarDay {
  day: number
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  hasPlan: boolean
}

const props = defineProps<{
  year: number
  month: number
  selectedDate: string
  planDates: Set<string>
}>()

const emit = defineEmits<{
  (e: 'select-date', date: string): void
}>()

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const calendarDays = computed<CalendarDay[]>(() => {
  const firstDay = dayjs(`${props.year}-${String(props.month).padStart(2, '0')}-01`)
  const startOfWeek = firstDay.day()
  const daysInMonth = firstDay.daysInMonth()
  const prevMonth = firstDay.subtract(1, 'month')
  const prevDays = prevMonth.daysInMonth()
  const today = dayjs().format('YYYY-MM-DD')

  const days: CalendarDay[] = []

  // Previous month days
  for (let i = startOfWeek - 1; i >= 0; i--) {
    const d = prevDays - i
    const date = prevMonth.date(d).format('YYYY-MM-DD')
    days.push({ day: d, date, isCurrentMonth: false, isToday: false, hasPlan: props.planDates.has(date) })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = firstDay.date(d).format('YYYY-MM-DD')
    days.push({ day: d, date, isCurrentMonth: true, isToday: date === today, hasPlan: props.planDates.has(date) })
  }

  // Next month days to fill grid (42 total)
  const remaining = 42 - days.length
  const nextMonth = firstDay.add(1, 'month')
  for (let d = 1; d <= remaining; d++) {
    const date = nextMonth.date(d).format('YYYY-MM-DD')
    days.push({ day: d, date, isCurrentMonth: false, isToday: false, hasPlan: props.planDates.has(date) })
  }

  return days
})

function onSelectDate(day: CalendarDay): void {
  emit('select-date', day.date)
}
</script>

<style scoped>
.calendar-view__weekdays {
  display: flex;
  background-color: #fff;
  padding: 16rpx 0;
}

.calendar-view__weekday {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  color: #999;
}

.calendar-view__grid {
  display: flex;
  flex-wrap: wrap;
  background-color: #fff;
  border-radius: 0 0 16rpx 16rpx;
  padding-bottom: 16rpx;
}

.calendar-view__day {
  width: 14.285%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0;
  position: relative;
}

.calendar-view__day--other .calendar-view__day-text {
  color: #ccc;
}

.calendar-view__day--today {
  background-color: #ecf5ff;
  border-radius: 8rpx;
}

.calendar-view__day--selected {
  background-color: #409eff;
  border-radius: 8rpx;
}

.calendar-view__day--selected .calendar-view__day-text {
  color: #fff;
}

.calendar-view__day-text {
  font-size: 28rpx;
  color: #333;
}

.calendar-view__dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background-color: #f56c6c;
  margin-top: 4rpx;
}

.calendar-view__day--selected .calendar-view__dot {
  background-color: #fff;
}
</style>
