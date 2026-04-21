<template>
  <view class="login-container">
    <image class="logo" src="/static/logo.png" mode="aspectFit" />
    <text class="app-name">食品安全管理系统</text>
    <text class="subtitle">港荣时尚食品</text>
    <button class="login-btn" :loading="loading" @click="handleLogin">
      微信一键登录
    </button>
    <text v-if="errorMsg" class="error-msg">{{ errorMsg }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { request } from '@/utils/request';

const loading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const loginResult = await new Promise<UniApp.LoginSuccessCallbackResult>((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject });
    });
    const res = await request<{ access_token: string; user: { id: string; name: string; role: string } }>({
      url: '/auth/wechat/miniprogram',
      method: 'POST',
      data: { code: loginResult.code },
    });
    uni.setStorageSync('token', res.access_token);
    uni.setStorageSync('user', res.user);
    uni.switchTab({ url: '/pages/index/index' });
  } catch (err: unknown) {
    errorMsg.value = '登录失败，请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 40rpx;
  background: #f5f5f5;
}
.logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 30rpx;
}
.app-name {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}
.subtitle {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 80rpx;
}
.login-btn {
  width: 80%;
  background: #07c160;
  color: white;
  border-radius: 48rpx;
  font-size: 34rpx;
  padding: 20rpx;
}
.error-msg {
  margin-top: 24rpx;
  color: #e74c3c;
  font-size: 26rpx;
}
</style>
