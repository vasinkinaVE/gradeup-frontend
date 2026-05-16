<!-- src/views/EmployeesView.vue -->
<template>
  <div class="employees-view">
    <!-- Шапка -->
    <header class="view-header">
      <h1>Управление сотрудниками</h1>
      <div class="header-actions">
        <el-button type="primary" @click="openRegisterModal">
          <el-icon><Plus /></el-icon> Зарегистрировать сотрудника
        </el-button>
      </div>
    </header>

    <!-- Фильтры -->
    <div class="filters-row">
      <el-input
        v-model="search"
        placeholder="Поиск по ФИО или должности"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select
        v-model="filterDepartmentId"
        placeholder="Все отделы"
        clearable
        class="department-filter"
      >
        <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
      </el-select>
    </div>

    <!-- Таблица сотрудников -->
    <el-table
      :data="filteredEmployees"
      stripe
      border
      class="data-table"
      @row-click="viewEmployee"
      style="cursor: pointer"
    >
      <el-table-column prop="fullName" label="ФИО" min-width="220" />
      <el-table-column prop="position" label="Должность" width="180" />
      <el-table-column prop="departmentName" label="Отдел" width="180" />

      <!-- Колонка Профиль -->
      <el-table-column label="Профиль" min-width="240">
        <template #default="{ row }">
          <div class="profile-cell">
            <div class="profile-name">
              {{ row.profileName || 'Не назначен' }}
              <span v-if="row.profileLevel" class="profile-level">({{ row.profileLevel }})</span>
            </div>
            <!-- Процент слева от линии -->
            <div class="progress-wrapper">
              <span class="progress-percent">{{ row.profileProgress ?? 0 }}%</span>
              <el-progress
                v-if="row.profileProgress !== null && row.profileProgress !== undefined"
                :percentage="row.profileProgress"
                :show-text="false"
                :stroke-width="6"
                class="profile-progress"
              />
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- Колонка Роль -->
      <el-table-column prop="roleName" label="Роль" width="150" />
    </el-table>

    <!-- 🔹 Модальное окно: Карточка сотрудника -->
    <el-dialog v-model="detailVisible" title="Карточка сотрудника" width="750px" destroy-on-close>
      <div v-if="selectedEmployee" class="employee-detail">
        <!-- Основная информация (режим просмотра / редактирования в одном блоке) -->
        <div class="detail-section">
          <h3 class="section-title">Основная информация</h3>
          <div class="info-grid">
            <!-- ФИО -->
            <div class="info-item">
              <span class="info-label">ФИО:</span>
              <span v-if="!isEditMode" class="info-value">{{ selectedEmployee.fullName }}</span>
              <div v-else class="info-edit-row">
                <el-input v-model="editForm.lastName" placeholder="Фамилия" class="edit-input" />
                <el-input v-model="editForm.firstName" placeholder="Имя" class="edit-input" />
                <el-input v-model="editForm.patronymic" placeholder="Отчество" class="edit-input" />
              </div>
            </div>
            <!-- Должность -->
            <div class="info-item">
              <span class="info-label">Должность:</span>
              <span v-if="!isEditMode" class="info-value">{{ selectedEmployee.position }}</span>
              <el-input
                v-else
                v-model="editForm.position"
                placeholder="Должность"
                class="edit-input-full"
              />
            </div>
            <!-- Email -->
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span v-if="!isEditMode" class="info-value">{{ selectedEmployee.email }}</span>
              <el-input
                v-else
                v-model="editForm.email"
                placeholder="Email"
                class="edit-input-full"
              />
            </div>
            <!-- Отдел -->
            <div class="info-item">
              <span class="info-label">Отдел:</span>
              <span v-if="!isEditMode" class="info-value">{{
                selectedEmployee.departmentName || 'Не назначен'
              }}</span>
              <el-select
                v-else
                v-model="editForm.departmentId"
                placeholder="Не назначен"
                clearable
                class="edit-select-full"
              >
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
            </div>
            <!-- Роль -->
            <div class="info-item">
              <span class="info-label">Роль:</span>
              <span v-if="!isEditMode" class="info-value">{{
                selectedEmployee.roleName || 'Не назначена'
              }}</span>
              <el-select
                v-else-if="isAdmin"
                v-model="editForm.roleId"
                placeholder="Не назначена"
                clearable
                class="edit-select-full"
              >
                <el-option
                  v-for="role in availableRoles"
                  :key="role.id"
                  :label="role.name"
                  :value="role.id"
                />
              </el-select>
              <span v-else class="info-value">{{ getRoleNameById(editForm.roleId) }}</span>
            </div>
          </div>
          <!-- Кнопки управления -->
          <div class="detail-actions">
            <el-button v-if="!isEditMode" type="primary" @click="enableEditMode"
              >Редактировать</el-button
            >
            <template v-else>
              <el-button @click="cancelEdit">Отмена</el-button>
              <el-button type="primary" @click="saveEmployeeChanges">Сохранить</el-button>
            </template>
          </div>
        </div>

        <!-- Профиль (всегда виден, только просмотр) -->
        <div v-if="selectedProfileData" class="detail-section profile-section">
          <h3 class="section-title">Профиль</h3>
          <!-- Подгрузка внешней формы профиля -->
          <ProfileCard :profile="selectedProfileData" />
        </div>
        <el-empty v-else description="Профиль не назначен" :image-size="80" />
      </div>
    </el-dialog>

    <!-- 🔹 Модальное окно: Регистрация сотрудника -->
    <el-dialog
      v-model="registerVisible"
      title="Регистрация нового сотрудника"
      width="650px"
      destroy-on-close
    >
      <el-form
        :model="regForm"
        :rules="regRules"
        ref="regFormRef"
        label-position="top"
        class="reg-form"
      >
        <div class="form-row">
          <el-form-item label="Фамилия" prop="lastName"
            ><el-input v-model="regForm.lastName" placeholder="Иванов"
          /></el-form-item>
          <el-form-item label="Имя" prop="firstName"
            ><el-input v-model="regForm.firstName" placeholder="Иван"
          /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="Отчество" prop="patronymic"
            ><el-input v-model="regForm.patronymic" placeholder="Иванович"
          /></el-form-item>
          <el-form-item label="Email" prop="email"
            ><el-input v-model="regForm.email" placeholder="user@example.com"
          /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="Должность" prop="position"
            ><el-input v-model="regForm.position" placeholder="Например: Frontend Developer"
          /></el-form-item>
          <el-form-item label="Отдел" prop="departmentId">
            <el-select
              v-model="regForm.departmentId"
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
              v-model="regForm.password"
              type="password"
              show-password
              placeholder="Минимум 6 символов"
            />
          </el-form-item>
          <el-form-item label="Повторите пароль" prop="confirmPassword">
            <el-input
              v-model="regForm.confirmPassword"
              type="password"
              show-password
              placeholder="Повторите пароль"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="registerVisible = false">Отмена</el-button>
        <el-button type="primary" :loading="isRegistering" @click="submitRegistration"
          >Зарегистрировать</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
// Импорт внешней карточки профиля
import ProfileCard from '@/components/common/ProfileCard.vue'

const authStore = useAuthStore()
const isAdmin = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('admin') || role.includes('администратор')
})

// === Состояние ===
const search = ref('')
const filterDepartmentId = ref<number | null>(null)
const detailVisible = ref(false)
const registerVisible = ref(false)
const isRegistering = ref(false)
const isEditMode = ref(false)
const selectedEmployee = ref<any>(null)
const regFormRef = ref<FormInstance>()
const editForm = ref<any>({})

// === Данные ===
const departments = ref([
  { id: 1, name: 'Отдел разработки' },
  { id: 2, name: 'Отдел тестирования' },
  { id: 3, name: 'HR и обучение' },
  { id: 4, name: 'Проектный офис' },
])

const availableRoles = ref([
  { id: 1, name: 'Сотрудник' },
  { id: 2, name: 'Руководитель' },
  { id: 3, name: 'СПО' },
  { id: 4, name: 'Администратор' },
])

const profiles = ref([
  {
    id: 1,
    name: 'Frontend Developer',
    description:
      'Разработка интерфейсов, работа с Vue 3, TypeScript и современными инструментами сборки.',
    skills: [
      { id: 101, name: 'Vue 3 Composition API', materials: ['Документация Vue 3'], stages: [] },
    ],
  },
  {
    id: 2,
    name: 'QA Engineer',
    description:
      'Ручное и автоматизированное тестирование, написание E2E и API тестов, составление тест-планов.',
    skills: [
      {
        id: 201,
        name: 'Автотестирование (Cypress)',
        materials: ['Документация Cypress'],
        stages: [],
      },
    ],
  },
])

const employees = ref([
  {
    id: 1,
    lastName: 'Иванов',
    firstName: 'Иван',
    patronymic: 'Иванович',
    position: 'Frontend Developer',
    email: 'ivanov@company.ru',
    departmentId: 1,
    departmentName: 'Отдел разработки',
    profileId: 1,
    profileName: 'Frontend Developer',
    profileLevel: '2 уровень',
    profileProgress: 65,
    roleId: 1,
    roleName: 'Сотрудник',
  },
  {
    id: 2,
    lastName: 'Петрова',
    firstName: 'Анна',
    patronymic: 'Сергеевна',
    position: 'Тимлид',
    email: 'petrova@company.ru',
    departmentId: 1,
    departmentName: 'Отдел разработки',
    profileId: null,
    profileName: 'Не назначен',
    profileLevel: null,
    profileProgress: null,
    roleId: 2,
    roleName: 'Руководитель',
  },
  {
    id: 3,
    lastName: 'Сидоров',
    firstName: 'Алексей',
    patronymic: null,
    position: 'QA Engineer',
    email: 'sidorov@company.ru',
    departmentId: 2,
    departmentName: 'Отдел тестирования',
    profileId: 2,
    profileName: 'QA Engineer',
    profileLevel: 'Ученик',
    profileProgress: 25,
    roleId: 1,
    roleName: 'Сотрудник',
  },
])

// === Вычисляемые ===
const filteredEmployees = computed(() => {
  let result = employees.value
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(
      (e) =>
        `${e.lastName} ${e.firstName} ${e.patronymic || ''}`.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q),
    )
  }
  if (filterDepartmentId.value) {
    result = result.filter((e) => e.departmentId === filterDepartmentId.value)
  }
  return result
})

const selectedProfileData = computed(() => {
  if (!selectedEmployee.value?.profileId) return null
  return profiles.value.find((p) => p.id === selectedEmployee.value.profileId) || null
})

// === Форма регистрации ===
const regForm = reactive({
  lastName: '',
  firstName: '',
  patronymic: '',
  position: '',
  email: '',
  departmentId: null as number | null,
  password: '',
  confirmPassword: '',
})

const regRules: FormRules = {
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
        if (value !== regForm.password) callback(new Error('Пароли не совпадают'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

// === Методы ===
const getRoleNameById = (roleId: number | null) => {
  if (!roleId) return 'Не назначена'
  return availableRoles.value.find((r) => r.id === roleId)?.name || 'Не назначена'
}

const viewEmployee = (row: any) => {
  selectedEmployee.value = { ...row }
  editForm.value = { ...row }
  isEditMode.value = false
  detailVisible.value = true
}

const enableEditMode = () => {
  isEditMode.value = true
}
const cancelEdit = () => {
  isEditMode.value = false
  editForm.value = { ...selectedEmployee.value }
}

const saveEmployeeChanges = () => {
  const idx = employees.value.findIndex((e: any) => e.id === editForm.value.id)
  if (idx !== -1) {
    employees.value[idx] = {
      ...editForm.value,
      fullName:
        `${editForm.value.lastName} ${editForm.value.firstName} ${editForm.value.patronymic || ''}`.trim(),
      departmentName:
        departments.value.find((d: any) => d.id === editForm.value.departmentId)?.name ||
        'Не назначен',
      roleName: getRoleNameById(editForm.value.roleId),
    }
    selectedEmployee.value = { ...employees.value[idx] }
  }
  isEditMode.value = false
  ElMessage.success('Данные обновлены')
}

const submitRegistration = async () => {
  if (!regFormRef.value) return
  await regFormRef.value.validate(async (valid) => {
    if (!valid) return
    isRegistering.value = true
    try {
      await new Promise((res) => setTimeout(res, 600))
      const newEmp = {
        id: Date.now(),
        ...regForm,
        fullName: `${regForm.lastName} ${regForm.firstName} ${regForm.patronymic || ''}`.trim(),
        departmentName:
          departments.value.find((d: any) => d.id === regForm.departmentId)?.name || 'Не назначен',
        roleName: 'Сотрудник',
        roleId: 1,
        profileName: 'Не назначен',
        profileLevel: null,
        profileProgress: null,
      }
      employees.value.unshift(newEmp)
      ElMessage.success('Сотрудник зарегистрирован')
      registerVisible.value = false
      Object.assign(regForm, {
        lastName: '',
        firstName: '',
        patronymic: '',
        position: '',
        email: '',
        departmentId: null,
        password: '',
        confirmPassword: '',
      })
    } catch {
      ElMessage.error('Ошибка регистрации')
    } finally {
      isRegistering.value = false
    }
  })
}

const openRegisterModal = () => {
  registerVisible.value = true
}
</script>

<style scoped>
/* === Основные стили === */
.employees-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
  color: var(--text);
}
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.view-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: #000;
}
.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}
.filters-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
  align-items: center;
}
.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}
.department-filter {
  width: 200px;
}
.data-table {
  width: 100%;
  margin-bottom: var(--spacing-md);
}

/* Таблица: обычный шрифт для всех ячеек */
:deep(.el-table .cell) {
  font-weight: 400 !important;
}

/* Профиль в таблице */
.profile-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.profile-name {
  font-weight: normal;
  color: #000;
  font-size: 14px;
}
.profile-level {
  font-size: 14px;
  color: #666;
}

/* Обёртка: процент слева, линия справа */
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.progress-percent {
  font-size: 14px !important;
  color: #666;
  white-space: nowrap;
  min-width: 38px;
  text-align: left;
  font-variant-numeric: tabular-nums;
  font-weight: 400;
}
.profile-progress {
  flex: 1;
  min-width: 0;
}
:deep(.profile-progress .el-progress__text) {
  font-size: 14px !important;
  font-weight: 400;
}

/* Карточка сотрудника */
.employee-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.detail-section {
  background: #fff;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid #e0e0e0;
}
.section-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  color: #000;
}
.info-grid {
  display: grid;
  gap: var(--spacing-xs);
}
.info-item {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  align-items: center;
}
.info-label {
  font-weight: var(--font-weight-medium);
  color: #000;
  min-width: 100px;
}
.info-value {
  color: #000;
  flex: 1;
  font-size: 14px;
}

/* Редактируемые поля в карточке - нормальный шрифт */
.info-edit-row {
  display: flex;
  gap: var(--spacing-xs);
  flex: 1;
}
.edit-input {
  flex: 1;
  min-width: 0;
}
.edit-input-full {
  width: 100%;
}
.edit-select-full {
  width: 100%;
}
:deep(.info-item .el-input__inner),
:deep(.info-item .el-select__input) {
  font-size: 14px !important;
  color: #000;
}
:deep(.info-item .el-input),
:deep(.info-item .el-select) {
  font-size: 14px;
}

.detail-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  justify-content: flex-end;
}

/* Форма регистрации */
.reg-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}
.form-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  width: 100%;
}
.form-row :deep(.el-form-item) {
  flex: 1;
  margin-bottom: 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  .department-filter {
    width: 100%;
  }
  .form-row {
    flex-direction: column;
  }
  .info-edit-row {
    flex-direction: column;
  }
}

/* Deep styles */
:deep(.el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}
:deep(.el-form-item__label) {
  font-weight: var(--font-weight-medium);
  color: #000;
}
:deep(.el-progress-bar__inner) {
  background-color: var(--secondary);
}
</style>
