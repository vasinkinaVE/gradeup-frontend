<template>
  <div class="auth-container">
    <el-card class="auth-card" shadow="always">
      <template #header>
        <div class="card-header">
          <h1 class="logo">Grade<span class="logo-accent">Up</span></h1>
          <p class="subtitle">Вход в систему</p>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formValues"
        :rules="rules"
        @submit.prevent="handleSubmit"
        class="auth-form"
        size="large"
      >
        <el-form-item prop="email">
          <el-input
            v-model="formValues.email"
            type="email"
            placeholder="ivanov@dns-shop.ru"
            prefix-icon="Message"
            autocomplete="email"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="formValues.password"
            type="password"
            placeholder="••••••••"
            prefix-icon="Lock"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="authStore.isLoading"
            class="submit-btn"
          >
            Войти
          </el-button>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="card-footer">
          <span>© {{ currentYear }} ООО "ДНС-Технологии"</span>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()

const formValues = reactive({
  email: '',
  password: '',
})

const rules = reactive<FormRules>({
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Некорректный формат email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' },
    { min: 5, message: 'Минимум 5 символов', trigger: 'blur' },
  ],
})

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const result = await authStore.login(formValues.email, formValues.password)

    if (result.success) {
      ElMessage.success('Добро пожаловать!')
      router.push('/dashboard')
    } else {
      ElMessage.error(result.error || 'Ошибка авторизации')
    }
  } catch (error) {
    ElMessage.warning('Проверьте правильность заполнения полей')
  }
}

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.auth-container {
  display: grid;
  place-items: center;
  min-height: 100vh;
  background: var(--background);
  padding: var(--spacing-md);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  border-radius: var(--radius-lg);
}

.card-header {
  text-align: center;
}

.logo {
  font-size: 32px;
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--spacing-sm);
  color: var(--text);
  letter-spacing: -0.5px;
}

.logo-accent {
  color: var(--primary);
}

.subtitle {
  color: var(--el-text-color-secondary);
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-medium);
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border: none;
  border-radius: var(--radius-md);
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.submit-btn:hover {
  opacity: 0.95;
  transform: translateY(-1px);
}

.card-footer {
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
