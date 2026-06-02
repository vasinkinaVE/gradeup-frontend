<template>
  <el-dialog
    v-model="visible"
    title="Регистрация нового сотрудника"
    width="90%"
    :style="{ maxWidth: '650px' }"
    destroy-on-close
    :close-on-click-modal="false"
    class="registration-dialog"
    align-center
  >
    <el-form
      :model="form"
      :rules="rules"
      ref="formRef"
      label-position="top"
      class="reg-form"
      autocomplete="off"
    >
      <div class="form-row">
        <el-form-item label="Фамилия" prop="lastName">
          <el-input v-model="form.lastName" autocomplete="family-name" placeholder="Иванов" />
        </el-form-item>
        <el-form-item label="Имя" prop="firstName">
          <el-input v-model="form.firstName" autocomplete="given-name" placeholder="Иван" />
        </el-form-item>
      </div>
      <div class="form-row">
        <el-form-item label="Отчество" prop="patronymic">
          <el-input
            v-model="form.patronymic"
            autocomplete="additional-name"
            placeholder="Иванович"
          />
        </el-form-item>
        <el-form-item label="Email" prop="email">
          <el-input
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="user@example.com"
          />
        </el-form-item>
      </div>
      <div class="form-row">
        <el-form-item label="Должность" prop="position">
          <el-input
            v-model="form.position"
            autocomplete="organization-title"
            placeholder="Например: Frontend Developer"
          />
        </el-form-item>
        <el-form-item label="Отдел" prop="departmentId">
          <el-select
            v-model="form.departmentId"
            placeholder="Можно назначить позже"
            clearable
            style="width: 100%"
          >
            <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
      </div>
      <div class="form-row">
        <el-form-item label="Пароль" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            show-password
            placeholder="Минимум 6 символов"
          />
        </el-form-item>
        <el-form-item label="Повторите пароль" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            autocomplete="off"
            show-password
            placeholder="Повторите пароль"
          />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button class="btn-cancel" @click="handleCancel">Отмена</el-button>
      <el-button
        class="btn-register"
        type="primary"
        :loading="isRegistering"
        @click="submitRegistration"
      >
        Зарегистрировать
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

interface Department {
  id: number
  name: string
}

interface RegistrationPayload {
  email: string
  first_name: string
  last_name: string
  patronymic?: string | null
  position: string
  password: string
  confirm_password: string
  department_id?: number
}

interface ApiErrorDetail {
  loc?: (string | number)[]
  msg?: string
  type?: string
}

interface ApiErrorResponse {
  detail?: string | ApiErrorDetail[] | Record<string, any>
  message?: string
  error?: string | Record<string, any>
}

const props = defineProps<{
  visible: boolean
  departments: Department[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'registered'): void
}>()

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const formRef = ref<FormInstance>()
const isRegistering = ref(false)

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const form = reactive({
  lastName: '',
  firstName: '',
  patronymic: '',
  position: '',
  email: '',
  departmentId: null as number | null,
  password: '',
  confirmPassword: '',
})

const rules: FormRules = {
  lastName: [{ required: true, message: 'Введите фамилию', trigger: 'blur' }],
  firstName: [{ required: true, message: 'Введите имя', trigger: 'blur' }],
  position: [{ required: true, message: 'Введите должность', trigger: 'blur' }],
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Некорректный формат', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' },
    { min: 6, message: 'Минимум 6 символов', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: 'Подтвердите пароль', trigger: 'blur' },
    {
      validator: (_, value: string, callback: any) => {
        if (value !== form.password) {
          callback(new Error('Пароли не совпадают'))
        } else {
          callback()
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
}

const formatErrorMessage = (data: ApiErrorResponse): string => {
  if (data.detail) {
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d: ApiErrorDetail) => {
          const field = d.loc?.[1] || d.loc?.[0] || 'Поле'
          const msg = d.msg || 'Ошибка валидации'
          return `${field}: ${msg}`
        })
        .join('; ')
    } else if (typeof data.detail === 'string') {
      return data.detail
    } else if (typeof data.detail === 'object') {
      return Object.entries(data.detail)
        .map(([field, errors]: [string, any]) => {
          const errorMsg = Array.isArray(errors) ? errors.join(', ') : errors
          return `${field}: ${errorMsg}`
        })
        .join('\n')
    }
  }
  if (data.message) return data.message
  if (data.error) {
    return typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
  }
  return 'Ошибка регистрации'
}

const handleCancel = () => {
  visible.value = false
  formRef.value?.resetFields()
}

const submitRegistration = async () => {
  if (!formRef.value) {
    console.error('❌ formRef не инициализирован')
    ElMessage.error('Ошибка формы')
    return
  }

  isRegistering.value = true

  try {
    await formRef.value.validate()

    const payload: RegistrationPayload = {
      email: form.email,
      first_name: form.firstName,
      last_name: form.lastName,
      patronymic: form.patronymic || null,
      position: form.position,
      password: form.password,
      confirm_password: form.confirmPassword,
    }

    if (form.departmentId != null) {
      payload.department_id = form.departmentId
    }

    const url = `${API_BASE}/auth/registration`

    if (import.meta.env.DEV) {
      console.log('📤 Registration request:', { url, payload })
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseText = await res.text()

    if (import.meta.env.DEV) {
      console.log('📥 Registration response:', {
        status: res.status,
        ok: res.ok,
        body: responseText.substring(0, 500),
      })
    }

    let data: ApiErrorResponse | Record<string, any> = {}
    try {
      data = responseText ? JSON.parse(responseText) : {}
    } catch {
      data = { raw: responseText }
    }

    if (!res.ok) {
      console.error('❌ Registration failed:', data)
      throw new Error(formatErrorMessage(data as ApiErrorResponse))
    }

    console.log('✅ Registration successful:', data)

    emit('registered')
    visible.value = false

    formRef.value?.resetFields()

    ElMessage.success('Сотрудник успешно зарегистрирован')
  } catch (err: any) {
    if (err?.errors) {
      return
    }

    console.error('💥 Error in submitRegistration:', err)

    ElMessage.error({
      message: (err.message || 'Ошибка регистрации').replace(/\n/g, '<br>'),
      dangerouslyUseHTMLString: true,
      duration: 5000,
    })
  } finally {
    isRegistering.value = false
  }
}
</script>

<style scoped>
.reg-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm, 8px);
}
.form-row {
  display: flex;
  gap: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-sm, 8px);
  width: 100%;
}
.form-row :deep(.el-form-item) {
  flex: 1;
  margin-bottom: 0;
}

@media (max-width: 650px) {
  .form-row {
    flex-direction: column;
  }
}

:deep(.registration-dialog) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
:deep(.registration-dialog .el-dialog) {
  margin: 0 auto !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
:deep(.registration-dialog .el-dialog__body) {
  padding: var(--spacing-md);
  overflow-y: auto;
  flex: 1;
}
:deep(.registration-dialog .el-dialog__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  flex-shrink: 0;
}
:deep(.registration-dialog .el-dialog__footer) {
  padding: var(--spacing-md) var(--spacing-lg);
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 480px) {
  :deep(.registration-dialog .el-dialog__header),
  :deep(.registration-dialog .el-dialog__body),
  :deep(.registration-dialog .el-dialog__footer) {
    padding: var(--spacing-sm);
  }
  :deep(.registration-dialog .el-dialog__title) {
    font-size: 16px;
  }
}
</style>
<style>
.registration-dialog .btn-register.el-button--primary {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #fff !important;
}
.registration-dialog .btn-register.el-button--primary:hover {
  background-color: #5daf34 !important;
  border-color: #5daf34 !important;
}
.registration-dialog .btn-register.el-button--primary:active {
  background-color: #53a32f !important;
  border-color: #53a32f !important;
}

.registration-dialog .btn-cancel.el-button {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
.registration-dialog .btn-cancel.el-button:hover {
  background-color: #c5c5c5 !important;
  border-color: #909399 !important;
  color: #fff !important;
}
</style>
