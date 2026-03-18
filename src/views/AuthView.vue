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

        <div class="form-actions">
          <el-link type="primary" :underline="false" @click="handleForgotPassword">
            Забыли пароль?
          </el-link>
        </div>

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

// Простая реактивная форма (без vee-validate для начала)
const formValues = reactive({
  email: '',
  password: '',
})

// Правила валидации для Element Plus
const rules = reactive<FormRules>({
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Некорректный формат email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' },
    { min: 8, message: 'Минимум 8 символов', trigger: 'blur' },
  ],
})

// Обработчик отправки
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const result = await authStore.login(formValues.email, formValues.password)

    if (result.success) {
      ElMessage.success('Добро пожаловать!')
      router.push('/dashboard')
    } else {
      ElMessage.error('Ошибка авторизации')
    }
  } catch (error) {
    // Валидация не прошла
    ElMessage.warning('Проверьте правильность заполнения полей')
  }
}

const handleForgotPassword = () => {
  ElMessage.info('Функция восстановления пароля будет доступна в следующей версии')
}

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--background);
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  border-radius: 16px;
}

.card-header {
  text-align: center;
}

.logo {
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 8px;
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
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border: none;
  border-radius: 12px;
}

.submit-btn:hover {
  opacity: 0.95;
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.card-footer {
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
