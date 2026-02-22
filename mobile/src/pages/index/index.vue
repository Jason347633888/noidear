<template>
  <view class="home-page">
    <!-- User header -->
    <view class="home-page__header">
      <view class="home-page__user">
        <view class="home-page__avatar">
          <text class="home-page__avatar-text">{{ avatarText }}</text>
        </view>
        <view class="home-page__user-info">
          <text class="home-page__name">{{ userStore.userInfo?.realName || '未登录' }}</text>
          <text class="home-page__dept">{{ userStore.userInfo?.department || '' }}</text>
        </view>
      </view>
      <view class="home-page__sync" v-if="offlineStore.pendingCount > 0">
        <text class="home-page__sync-text">{{ offlineStore.pendingCount }}条待同步</text>
      </view>
    </view>

    <!-- Quick actions -->
    <view class="home-page__actions">
      <view class="home-page__action" @tap="navigateTo('/pages/todo/list')">
        <view class="home-page__action-icon home-page__action-icon--todo">
          <text class="home-page__icon-text">&#x2611;</text>
        </view>
        <text class="home-page__action-label">待办</text>
      </view>
      <view class="home-page__action" @tap="navigateTo('/pages/records/list')">
        <view class="home-page__action-icon home-page__action-icon--record">
          <text class="home-page__icon-text">&#x1F4CB;</text>
        </view>
        <text class="home-page__action-label">记录</text>
      </view>
      <view class="home-page__action" @tap="navigateTo('/pages/calendar/index')">
        <view class="home-page__action-icon home-page__action-icon--calendar">
          <text class="home-page__icon-text">&#x1F4C5;</text>
        </view>
        <text class="home-page__action-label">日历</text>
      </view>
      <view class="home-page__action" @tap="navigateTo('/pages/equipment/list')">
        <view class="home-page__action-icon home-page__action-icon--equip">
          <text class="home-page__icon-text">&#x2699;</text>
        </view>
        <text class="home-page__action-label">设备</text>
      </view>
    </view>

    <!-- Recent todos -->
    <view class="home-page__section">
      <view class="home-page__section-header">
        <text class="home-page__section-title">最近待办</text>
        <text class="home-page__section-more" @tap="navigateTo('/pages/todo/list')">查看全部</text>
      </view>
      <view v-if="recentTodos.length > 0">
        <TodoCard
          v-for="item in recentTodos"
          :key="item.id"
          :item="item"
          @tap="onTodoTap"
        />
      </view>
      <EmptyState v-else title="暂无待办" icon="&#x2705;" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useOfflineStore } from '@/stores/offline'
import { useTodoStore } from '@/stores/todo'
import type { TodoItem } from '@/types'
import TodoCard from '@/components/TodoCard.vue'
import EmptyState from '@/components/EmptyState.vue'

const userStore = useUserStore()
const offlineStore = useOfflineStore()
const todoStore = useTodoStore()
const recentTodos = ref<TodoItem[]>([])

const avatarText = computed(() => {
  const name = userStore.userInfo?.realName || ''
  return name.charAt(0) || '?'
})

onShow(async () => {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  await loadRecentTodos()
})

onPullDownRefresh(async () => {
  await loadRecentTodos()
  uni.stopPullDownRefresh()
})

async function loadRecentTodos(): Promise<void> {
  recentTodos.value = await todoStore.fetchRecentTodos(5)
}

function navigateTo(url: string): void {
  // tabBar pages use switchTab, others use navigateTo
  const tabPages = ['/pages/index/index', '/pages/todo/list', '/pages/records/list', '/pages/user/index']
  if (tabPages.includes(url)) {
    uni.switchTab({ url })
  } else {
    uni.navigateTo({ url })
  }
}

function onTodoTap(item: TodoItem): void {
  uni.navigateTo({ url: `/pages/records/detail?id=${item.id}&type=todo` })
}
</script>

<style scoped>
.home-page {
  padding: 20rpx;
  padding-bottom: 40rpx;
}

.home-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background-color: #409eff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.home-page__user {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.home-page__avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-page__avatar-text {
  font-size: 36rpx;
  color: #fff;
  font-weight: bold;
}

.home-page__name {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
  display: block;
}

.home-page__dept {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.home-page__sync {
  padding: 8rpx 16rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
}

.home-page__sync-text {
  font-size: 22rpx;
  color: #fff;
}

.home-page__actions {
  display: flex;
  justify-content: space-around;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.home-page__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.home-page__action-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-page__action-icon--todo { background-color: #ecf5ff; }
.home-page__action-icon--record { background-color: #f0f9eb; }
.home-page__action-icon--calendar { background-color: #fdf6ec; }
.home-page__action-icon--equip { background-color: #fef0f0; }

.home-page__icon-text {
  font-size: 44rpx;
}

.home-page__action-label {
  font-size: 24rpx;
  color: #666;
}

.home-page__section {
  margin-bottom: 24rpx;
}

.home-page__section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.home-page__section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.home-page__section-more {
  font-size: 24rpx;
  color: #409eff;
}
</style>
