<template>
  <div class="login-page">
    <!-- ───── Left Panel ───── -->
    <div class="left-panel">
      <div class="brand">
        <div class="brand-icon"><el-icon :size="22"><Document /></el-icon></div>
        <span class="brand-name">质量管理系统</span>
      </div>

      <!-- background decoration circles -->
      <div class="deco deco-a"></div>
      <div class="deco deco-b"></div>
      <div class="deco deco-c"></div>
      <div class="deco deco-d"></div>

      <!-- illustration + title -->
      <div class="illus-section">
        <div class="illus-float">
          <svg class="illus-svg" viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#818cf8"/>
              </linearGradient>
              <linearGradient id="cardG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="100%" stop-color="#f8faff"/>
              </linearGradient>
              <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#6366f1" flood-opacity="0.12"/>
              </filter>
              <filter id="floatShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#6366f1" flood-opacity="0.08"/>
              </filter>
            </defs>

            <!-- ground shadow -->
            <ellipse cx="240" cy="346" rx="155" ry="14" fill="rgba(99,102,241,0.10)"/>

            <!-- ── main dashboard card ── -->
            <rect x="72" y="44" width="336" height="232" rx="18" fill="url(#cardG)" filter="url(#cardShadow)"/>

            <!-- top bar -->
            <rect x="72" y="44" width="336" height="46" rx="18" fill="#6366f1" opacity="0.08"/>
            <rect x="72" y="72" width="336" height="18" fill="#6366f1" opacity="0.08"/>
            <!-- traffic lights -->
            <circle cx="96"  cy="67" r="5.5" fill="#ef4444" opacity="0.65"/>
            <circle cx="113" cy="67" r="5.5" fill="#fbbf24" opacity="0.65"/>
            <circle cx="130" cy="67" r="5.5" fill="#34d399" opacity="0.65"/>
            <!-- tab pills -->
            <rect x="155" y="59" width="52" height="16" rx="8" fill="#6366f1" opacity="0.18"/>
            <rect x="213" y="59" width="40" height="16" rx="8" fill="#6366f1" opacity="0.08"/>

            <!-- grid lines -->
            <line x1="88"  y1="245" x2="392" y2="245" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="88"  y1="215" x2="392" y2="215" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4 4"/>
            <line x1="88"  y1="185" x2="392" y2="185" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4 4"/>
            <line x1="88"  y1="155" x2="392" y2="155" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4 4"/>
            <line x1="88"  y1="125" x2="392" y2="125" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4 4"/>

            <!-- bar chart -->
            <rect x="100" y="195" width="26" height="50"  rx="5" fill="url(#barG)" opacity="0.45"/>
            <rect x="138" y="168" width="26" height="77"  rx="5" fill="url(#barG)" opacity="0.60"/>
            <rect x="176" y="180" width="26" height="65"  rx="5" fill="url(#barG)" opacity="0.52"/>
            <rect x="214" y="140" width="26" height="105" rx="5" fill="url(#barG)" opacity="0.85"/>
            <rect x="252" y="158" width="26" height="87"  rx="5" fill="url(#barG)" opacity="0.70"/>
            <rect x="290" y="148" width="26" height="97"  rx="5" fill="url(#barG)" opacity="0.78"/>
            <rect x="328" y="162" width="26" height="83"  rx="5" fill="url(#barG)" opacity="0.65"/>
            <rect x="366" y="152" width="26" height="93"  rx="5" fill="url(#barG)" opacity="0.72"/>

            <!-- gold trend line -->
            <polyline
              points="113,188 151,162 189,172 227,132 265,148 303,136 341,150 379,140"
              stroke="#c9a227" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
            <circle cx="113" cy="188" r="4" fill="#c9a227" stroke="white" stroke-width="2"/>
            <circle cx="151" cy="162" r="4" fill="#c9a227" stroke="white" stroke-width="2"/>
            <circle cx="189" cy="172" r="4" fill="#c9a227" stroke="white" stroke-width="2"/>
            <circle cx="227" cy="132" r="4" fill="#c9a227" stroke="white" stroke-width="2"/>
            <circle cx="265" cy="148" r="4" fill="#c9a227" stroke="white" stroke-width="2"/>
            <circle cx="303" cy="136" r="4" fill="#c9a227" stroke="white" stroke-width="2"/>

            <!-- ── floating card: top-right (合格率) ── -->
            <rect x="340" y="14" width="128" height="68" rx="14" fill="white" filter="url(#floatShadow)"/>
            <circle cx="360" cy="38" r="12" fill="rgba(16,185,129,0.15)"/>
            <rect x="352" y="30" width="16" height="16" rx="8" fill="#10b981" opacity="0.0"/>
            <!-- checkmark -->
            <polyline points="354,38 358,42 367,33" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <rect x="378" y="30" width="78" height="8" rx="4" fill="#e5e7eb"/>
            <rect x="378" y="30" width="52" height="8" rx="4" fill="#10b981" opacity="0.5"/>
            <rect x="352" y="52" width="50" height="6" rx="3" fill="#e5e7eb"/>
            <rect x="352" y="62" width="35" height="6" rx="3" fill="#10b981" opacity="0.3"/>
            <rect x="378" y="52" width="36" height="18" rx="5" fill="rgba(16,185,129,0.12)"/>
            <!-- 98.5% text replaced with bar -->
            <rect x="352" y="52" width="115" height="8"  rx="4" fill="#f3f4f6"/>
            <rect x="352" y="52" width="98"  height="8"  rx="4" fill="#10b981" opacity="0.4"/>
            <rect x="352" y="62" width="115" height="6"  rx="3" fill="#f3f4f6"/>
            <rect x="352" y="62" width="72"  height="6"  rx="3" fill="#6366f1" opacity="0.25"/>

            <!-- ── floating card: bottom-left (待审批) ── -->
            <rect x="6" y="230" width="112" height="72" rx="14" fill="white" filter="url(#floatShadow)"/>
            <rect x="20" y="244" width="55" height="7"  rx="3.5" fill="#e5e7eb"/>
            <rect x="20" y="255" width="40" height="7"  rx="3.5" fill="#e5e7eb"/>
            <rect x="20" y="270" width="72" height="14" rx="4"   fill="rgba(99,102,241,0.12)"/>
            <rect x="28" y="274" width="56" height="6"  rx="3"   fill="#6366f1" opacity="0.5"/>
            <circle cx="97" cy="252" r="14" fill="rgba(99,102,241,0.10)"/>
            <rect x="91" y="247" width="12" height="10" rx="2" fill="#6366f1" opacity="0.4"/>
            <rect x="91" y="259" width="12" height="4"  rx="2" fill="#6366f1" opacity="0.3"/>

            <!-- ── floating card: top-left (文档总数) ── -->
            <rect x="6" y="48" width="112" height="68" rx="14" fill="white" filter="url(#floatShadow)"/>
            <rect x="20" y="62" width="50" height="7"  rx="3.5" fill="#e5e7eb"/>
            <rect x="20" y="73" width="36" height="7"  rx="3.5" fill="#e5e7eb"/>
            <rect x="20" y="86" width="80" height="12" rx="4"   fill="rgba(201,162,39,0.15)"/>
            <rect x="28" y="90" width="64" height="4"  rx="2"   fill="#c9a227" opacity="0.6"/>
            <circle cx="96" cy="72" r="14" fill="rgba(201,162,39,0.12)"/>
            <rect x="90" y="65" width="12" height="15" rx="2" fill="#c9a227" opacity="0.4"/>
            <rect x="90" y="82" width="12" height="4"  rx="2" fill="#c9a227" opacity="0.3"/>
          </svg>
        </div>

        <h2 class="left-title">质量管理系统</h2>
        <p class="left-sub">Quality Management System</p>
      </div>
    </div>

    <!-- ───── Right Panel ───── -->
    <div class="right-panel">
      <div class="form-box">
        <h1 class="welcome">欢迎回来 👋</h1>
        <p class="welcome-sub">请输入您的账户信息以开始管理</p>

        <el-form ref="formRef" :model="form" :rules="rules" class="form" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              size="large"
              placeholder="用户名"
              :prefix-icon="User"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              size="large"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <div class="form-row">
            <el-checkbox v-model="rememberMe">记住账号</el-checkbox>
            <a class="forgot" href="#">忘记密码?</a>
          </div>

          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form>

        <p class="copyright">Copyright © 2024 质量管理系统</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { Document, User, Lock } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const formRef = ref<FormInstance>();
const loading = ref(false);
const rememberMe = ref(false);
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
/* ── keyframes ── */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-18px); }
}

@keyframes floatSlow {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-12px) scale(1.04); }
}

@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ── layout ── */
.login-page {
  display: flex;
  min-height: 100vh;
  overflow: hidden;
}

/* ── left panel ── */
.left-panel {
  flex: 0 0 60%;
  position: relative;
  background: linear-gradient(135deg, #e4edf8 0%, #d8e6f4 30%, #c9d9ef 60%, #bdd0ea 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeInLeft 0.6s ease both;
}

/* brand top-left */
.brand {
  position: absolute;
  top: 28px;
  left: 32px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 2;
}

.brand-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
}

.brand-name {
  font-size: 17px;
  font-weight: 700;
  color: #1e3a5f;
  letter-spacing: 0.5px;
}

/* background decoration circles */
.deco {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.deco-a {
  width: 420px;
  height: 420px;
  top: -140px;
  left: -120px;
  background: radial-gradient(circle, rgba(100, 149, 210, 0.18) 0%, transparent 65%);
  animation: floatSlow 9s ease-in-out infinite;
}

.deco-b {
  width: 300px;
  height: 300px;
  bottom: -80px;
  right: 40px;
  background: radial-gradient(circle, rgba(80, 130, 200, 0.14) 0%, transparent 65%);
  animation: floatSlow 7s ease-in-out infinite reverse;
}

.deco-c {
  width: 180px;
  height: 180px;
  top: 36%;
  left: 8%;
  background: radial-gradient(circle, rgba(120, 170, 220, 0.12) 0%, transparent 65%);
  animation: floatSlow 11s ease-in-out infinite 1.5s;
}

.deco-d {
  width: 120px;
  height: 120px;
  top: 16%;
  right: 10%;
  background: radial-gradient(circle, rgba(100, 150, 210, 0.10) 0%, transparent 65%);
  animation: floatSlow 8s ease-in-out infinite 3s;
}

/* illustration section */
.illus-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  padding: 80px 40px 48px;
}

.illus-float {
  width: 100%;
  max-width: 460px;
  animation: float 5s ease-in-out infinite;
  filter: drop-shadow(0 24px 40px rgba(99, 102, 241, 0.15));
}

.illus-svg {
  width: 100%;
  height: auto;
}

.left-title {
  margin: 28px 0 10px;
  font-size: 28px;
  font-weight: 700;
  color: #1e3a5f;
  text-align: center;
  letter-spacing: 1px;
}

.left-sub {
  font-size: 13px;
  color: #4a7ab5;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  text-align: center;
  opacity: 0.85;
}

/* ── right panel ── */
.right-panel {
  flex: 0 0 40%;
  background: #ffffff;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 56px;
  animation: fadeInRight 0.6s ease both;
}

.form-box {
  width: 100%;
  max-width: 380px;
  padding-top: 18vh;
}

.welcome {
  font-size: 36px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 10px;
  line-height: 1.2;
}

.welcome-sub {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 40px;
  line-height: 1.6;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 0 14px;
  box-shadow: 0 0 0 1px #e5e7eb;
  transition: box-shadow 0.2s;
}

.form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a5b4fc;
}

.form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 4px 0 20px;
  font-size: 13px;
}

.form-row :deep(.el-checkbox__label) {
  font-size: 13px;
  color: #374151;
}

.form-row :deep(.el-checkbox__inner) {
  border-radius: 4px;
}

.forgot {
  color: #6366f1;
  text-decoration: none;
  font-size: 13px;
  transition: color 0.2s;
}

.forgot:hover {
  color: #4f46e5;
}

.login-btn {
  width: 100%;
  height: 48px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%);
  border: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(201, 162, 39, 0.35);
}

.login-btn:active {
  transform: translateY(0);
}

.copyright {
  margin-top: 48px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

/* responsive */
@media (max-width: 900px) {
  .left-panel { display: none; }
  .right-panel { flex: 1; }
}
</style>
