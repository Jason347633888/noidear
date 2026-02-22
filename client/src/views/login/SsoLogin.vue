<template>
  <div class="sso-login-page">
    <el-card class="sso-card">
      <div class="login-logo">
        <el-icon :size="40"><Document /></el-icon>
        <h2 class="login-title">SSO 单点登录</h2>
        <p class="login-subtitle">质量管理系统</p>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="LDAP 登录" name="ldap">
          <el-form
            ref="ldapFormRef"
            :model="ldapForm"
            :rules="ldapRules"
            label-width="0"
            @submit.prevent="handleLdapLogin"
          >
            <el-form-item prop="username">
              <el-input
                v-model="ldapForm.username"
                size="large"
                :prefix-icon="User"
                placeholder="LDAP 用户名"
                autocomplete="username"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="ldapForm.password"
                size="large"
                type="password"
                :prefix-icon="Lock"
                placeholder="LDAP 密码"
                show-password
                autocomplete="current-password"
                @keyup.enter="handleLdapLogin"
              />
            </el-form-item>
            <el-button
              type="primary"
              size="large"
              style="width: 100%"
              :loading="loading"
              @click="handleLdapLogin"
            >
              LDAP 登录
            </el-button>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="OAuth2 登录" name="oauth2">
          <div class="oauth-buttons">
            <el-button size="large" style="width: 100%; margin-bottom: 12px" @click="handleOAuth2('google')">
              Google 登录
            </el-button>
            <el-button size="large" style="width: 100%; margin-bottom: 12px" @click="handleOAuth2('github')">
              GitHub 登录
            </el-button>
            <el-button size="large" style="width: 100%" type="success" @click="handleOAuth2('wechat')">
              企业微信 登录
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="back-link">
        <el-button link @click="goToNormalLogin">返回普通登录</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { User, Lock, Document } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import ssoApi from '@/api/sso';

const router = useRouter();
const activeTab = ref('ldap');
const loading = ref(false);
const ldapFormRef = ref<FormInstance | null>(null);

const ldapForm = reactive({
  username: '',
  password: '',
});

const ldapRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleLdapLogin() {
  const valid = await ldapFormRef.value?.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    const res = await ssoApi.ldapLogin({
      username: ldapForm.username,
      password: ldapForm.password,
    });
    localStorage.setItem('token', res.token);
    ElMessage.success('LDAP 登录成功');
    router.push('/dashboard');
  } catch {
    ElMessage.error('LDAP 登录失败，请检查用户名和密码');
  } finally {
    loading.value = false;
  }
}

function handleOAuth2(provider: string) {
  const redirectUrl = ssoApi.getOAuth2RedirectUrl(provider);
  window.location.href = redirectUrl;
}

function goToNormalLogin() {
  router.push('/login');
}
</script>

<style scoped>
.sso-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.sso-card {
  width: 400px;
  padding: 20px;
}

.login-logo {
  text-align: center;
  margin-bottom: 24px;
}

.login-title {
  margin: 12px 0 4px;
  font-size: 22px;
  font-weight: 600;
}

.login-subtitle {
  margin: 0;
  color: #888;
  font-size: 14px;
}

.oauth-buttons {
  padding: 8px 0;
}

.back-link {
  text-align: center;
  margin-top: 16px;
}
</style>
