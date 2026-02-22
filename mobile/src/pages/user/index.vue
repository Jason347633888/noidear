<template>
  <view class="user-page">
    <!-- User info card -->
    <view class="user-page__card">
      <view class="user-page__avatar">
        <text class="user-page__avatar-text">{{ avatarText }}</text>
      </view>
      <view class="user-page__info">
        <text class="user-page__name">{{ userStore.userInfo?.realName || '未登录' }}</text>
        <text class="user-page__dept">{{ userStore.userInfo?.department || '' }}</text>
        <text class="user-page__position">{{ userStore.userInfo?.position || '' }}</text>
      </view>
    </view>

    <!-- Menu items -->
    <view class="user-page__menu">
      <MenuItem
        icon="&#x1F511;"
        title="修改密码"
        :arrow="true"
        @tap="showPasswordDialog = true"
      />
      <MenuItem
        icon="&#x1F504;"
        title="同步状态"
        :arrow="true"
        @tap="onSyncStatus"
      >
        <template #badge>
          <view v-if="offlineStore.pendingCount > 0" class="user-page__menu-badge">
            <text class="user-page__menu-badge-text">{{ offlineStore.pendingCount }}</text>
          </view>
        </template>
      </MenuItem>
      <MenuItem
        icon="&#x2139;"
        title="关于我们"
        :arrow="true"
        @tap="showAbout = true"
      />
    </view>

    <!-- Logout -->
    <view class="user-page__logout" @tap="handleLogout">
      <text class="user-page__logout-text">退出登录</text>
    </view>

    <!-- Password dialog -->
    <view v-if="showPasswordDialog" class="user-page__dialog-mask" @tap="showPasswordDialog = false">
      <view class="user-page__dialog" @tap.stop>
        <text class="user-page__dialog-title">修改密码</text>
        <view class="user-page__dialog-field">
          <input
            class="user-page__dialog-input"
            type="password"
            v-model="passwordForm.oldPassword"
            placeholder="请输入旧密码"
          />
        </view>
        <view class="user-page__dialog-field">
          <input
            class="user-page__dialog-input"
            type="password"
            v-model="passwordForm.newPassword"
            placeholder="请输入新密码(6-20位)"
          />
        </view>
        <view class="user-page__dialog-field">
          <input
            class="user-page__dialog-input"
            type="password"
            v-model="passwordForm.confirmPassword"
            placeholder="请确认新密码"
          />
        </view>
        <view class="user-page__dialog-actions">
          <view class="user-page__dialog-btn user-page__dialog-btn--cancel" @tap="showPasswordDialog = false">
            <text class="user-page__dialog-btn-text">取消</text>
          </view>
          <view class="user-page__dialog-btn user-page__dialog-btn--confirm" @tap="handleChangePassword">
            <text class="user-page__dialog-btn-text user-page__dialog-btn-text--confirm">确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- About dialog -->
    <view v-if="showAbout" class="user-page__dialog-mask" @tap="showAbout = false">
      <view class="user-page__dialog" @tap.stop>
        <text class="user-page__dialog-title">关于我们</text>
        <view class="user-page__about-content">
          <text class="user-page__about-name">文档管理系统</text>
          <text class="user-page__about-version">版本: v1.0.0</text>
          <text class="user-page__about-desc">移动端 - 现场人员核心工具</text>
        </view>
        <view class="user-page__dialog-actions">
          <view class="user-page__dialog-btn user-page__dialog-btn--confirm" @tap="showAbout = false">
            <text class="user-page__dialog-btn-text user-page__dialog-btn-text--confirm">知道了</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useOfflineStore } from '@/stores/offline'
import MenuItem from '@/components/MenuItem.vue'

const userStore = useUserStore()
const offlineStore = useOfflineStore()

const showPasswordDialog = ref(false)
const showAbout = ref(false)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const avatarText = computed(() => {
  const name = userStore.userInfo?.realName || ''
  return name.charAt(0) || '?'
})

async function handleChangePassword(): Promise<void> {
  if (!passwordForm.oldPassword) {
    uni.showToast({ title: '请输入旧密码', icon: 'none' })
    return
  }
  if (!passwordForm.newPassword || passwordForm.newPassword.length < 6 || passwordForm.newPassword.length > 20) {
    uni.showToast({ title: '新密码长度需为6-20位', icon: 'none' })
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  try {
    await userStore.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    uni.showToast({ title: '密码修改成功', icon: 'success' })
    showPasswordDialog.value = false
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : '修改失败'
    uni.showToast({ title: msg, icon: 'none' })
  }
}

function onSyncStatus(): void {
  if (offlineStore.pendingCount > 0) {
    uni.showModal({
      title: '同步状态',
      content: `待同步: ${offlineStore.pendingCount}条\n同步失败: ${offlineStore.failedItems.length}条`,
      confirmText: '立即同步',
      success: (res) => {
        if (res.confirm) {
          offlineStore.syncAll()
          uni.showToast({ title: '开始同步', icon: 'none' })
        }
      },
    })
  } else {
    uni.showToast({ title: '所有数据已同步', icon: 'success' })
  }
}

function handleLogout(): void {
  uni.showModal({
    title: '提示',
    content: '确定退出登录?',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
      }
    },
  })
}
</script>

<style scoped>
.user-page {
  padding: 20rpx;
}

.user-page__card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background-color: #409eff;
  border-radius: 16rpx;
  padding: 40rpx 24rpx;
  margin-bottom: 24rpx;
}

.user-page__avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-page__avatar-text {
  font-size: 48rpx;
  color: #fff;
  font-weight: bold;
}

.user-page__name {
  font-size: 36rpx;
  color: #fff;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.user-page__dept {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-bottom: 4rpx;
}

.user-page__position {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}

.user-page__menu {
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.user-page__menu-badge {
  background-color: #f56c6c;
  border-radius: 20rpx;
  padding: 2rpx 12rpx;
  margin-right: 12rpx;
}

.user-page__menu-badge-text {
  font-size: 22rpx;
  color: #fff;
}

.user-page__logout {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: center;
}

.user-page__logout-text {
  font-size: 30rpx;
  color: #f56c6c;
}

/* Dialog styles */
.user-page__dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.user-page__dialog {
  width: 80%;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}

.user-page__dialog-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}

.user-page__dialog-field {
  margin-bottom: 20rpx;
}

.user-page__dialog-input {
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.user-page__dialog-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.user-page__dialog-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
}

.user-page__dialog-btn--cancel {
  background-color: #f5f5f5;
}

.user-page__dialog-btn--confirm {
  background-color: #409eff;
}

.user-page__dialog-btn-text {
  font-size: 28rpx;
  color: #666;
}

.user-page__dialog-btn-text--confirm {
  color: #fff;
}

.user-page__about-content {
  text-align: center;
  padding: 20rpx 0;
}

.user-page__about-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.user-page__about-version {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.user-page__about-desc {
  font-size: 24rpx;
  color: #999;
  display: block;
}
</style>
