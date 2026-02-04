<template>
  <div class="page">
    <div class="left">
      <el-icon :size="80" class="logo-icon"><Document /></el-icon>
      <h1>文档管理系统</h1>
      <p>Document Management System</p>
    </div>
    <div class="right">
      <h2>欢迎回来</h2>
      <p class="subtitle">请登录您的账户以继续</p>
      <el-form :model="form" :rules="rules" ref="formRef" @keyup.enter="handleLogin" class="form">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <div class="options">
          <span></span>
          <a href="#">忘记密码?</a>
        </div>
        <el-button type="primary" @click="handleLogin" :loading="loading" class="btn">
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>
      </el-form>
      <div class="footer">© 2024 文档管理系统</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { Document } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const formRef = ref<FormInstance>();
const loading = ref(false);
const form = reactive({ username: '', password: '' });
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码长度至少8位', trigger: 'blur' },
  ],
};

const handleLogin = async () => {
  await formRef.value?.validate();
  loading.value = true;
  try {
    const success = await userStore.login(form.username, form.password);
    if (success) {
      ElMessage.success({ message: '登录成功！', duration: 2000 });
      router.push('/');
    } else {
      ElMessage.error(userStore.error || '用户名或密码错误');
    }
  } catch {
    ElMessage.error('登录失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.page { display: flex; min-height: 100vh; }
.left { width: 400px; background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 40px; }
.logo-icon { color: #c9a227; }
.left h1 { font-size: 28px; font-weight: 600; margin: 24px 0 8px; }
.left p { font-size: 12px; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; }
.right { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
.right h2 { font-size: 32px; font-weight: 600; color: #1a1a2e; margin: 0 0 8px; }
.subtitle { font-size: 14px; color: #7f8c8d; margin: 0 0 36px; }
.form { width: 320px; display: flex; flex-direction: column; gap: 20px; }
.options { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #7f8c8d; }
.options a { color: #c9a227; text-decoration: none; }
.btn { height: 48px; background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); border: none; font-weight: 500; letter-spacing: 2px; }
.btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201, 162, 39, 0.35); }
.footer { margin-top: 48px; font-size: 12px; color: #7f8c8d; }
</style>
