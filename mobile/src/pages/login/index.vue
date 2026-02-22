<template>
  <view class="login-page">
    <view class="login-page__header">
      <text class="login-page__title">文档管理系统</text>
      <text class="login-page__subtitle">移动端登录</text>
    </view>

    <view class="login-page__form">
      <view class="login-page__field">
        <input
          class="login-page__input"
          v-model="form.username"
          placeholder="请输入用户名"
          :maxlength="50"
        />
      </view>
      <view class="login-page__field">
        <input
          class="login-page__input"
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
          :maxlength="20"
          @confirm="handleLogin"
        />
      </view>
      <view
        class="login-page__btn"
        :class="{ 'login-page__btn--disabled': loading }"
        @tap="handleLogin"
      >
        <text class="login-page__btn-text">{{ loading ? '登录中...' : '登 录' }}</text>
      </view>
    </view>

    <view class="login-page__footer">
      <text class="login-page__version">v1.0.0</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

async function handleLogin(): Promise<void> {
  if (loading.value) return

  if (!form.username.trim()) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return
  }
  if (!form.password) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    await userStore.login({
      username: form.username.trim(),
      password: form.password,
    })
    uni.switchTab({ url: '/pages/index/index' })
  } catch (err) {
    const message = err instanceof Error ? err.message : '登录失败'
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60rpx 40rpx;
  background: linear-gradient(180deg, #409eff 0%, #79bbff 100%);
}

.login-page__header {
  text-align: center;
  margin-bottom: 80rpx;
}

.login-page__title {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 16rpx;
}

.login-page__subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.login-page__form {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.login-page__field {
  margin-bottom: 32rpx;
}

.login-page__input {
  height: 88rpx;
  padding: 0 24rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.login-page__btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #409eff;
  border-radius: 12rpx;
  margin-top: 16rpx;
}

.login-page__btn--disabled {
  opacity: 0.6;
}

.login-page__btn-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 500;
}

.login-page__footer {
  text-align: center;
  margin-top: 60rpx;
}

.login-page__version {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}
</style>
