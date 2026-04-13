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
        <!-- Кнопка ролей видна только админу -->
        <el-button v-if="isAdmin" @click="rolesVisible = true">
          <el-icon><Setting /></el-icon> Настройка ролей
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
    </div>

    <!-- Таблица сотрудников -->
    <el-table :data="filteredEmployees" stripe border class="data-table" @row-click="viewEmployee">
      <el-table-column prop="fullName" label="ФИО" min-width="220" />
      <el-table-column prop="position" label="Должность" width="180" />
      <el-table-column prop="departmentName" label="Отдел" width="180" />
      <el-table-column prop="profileName" label="Профиль" width="180" />
      <el-table-column label="Действия" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click.stop="viewEmployee(row)">Подробнее</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 🔹 Модальное окно: Карточка сотрудника -->
    <el-dialog v-model="detailVisible" title="Карточка сотрудника" width="850px" destroy-on-close>
      <div v-if="selectedEmployee" class="employee-detail">
        <!-- Основная информация -->
        <div class="detail-section">
          <h3 class="section-title">Основная информация</h3>
          <el-form :model="editForm" label-position="left" label-width="130px" class="info-form">
            <el-form-item label="ФИО">
              <span class="read-only-text">{{ selectedEmployee.fullName }}</span>
            </el-form-item>
            <el-form-item label="Должность">
              <span class="read-only-text">{{ selectedEmployee.position }}</span>
            </el-form-item>
            <el-form-item label="Email">
              <span class="read-only-text">{{ selectedEmployee.email }}</span>
            </el-form-item>
            <el-form-item label="Отдел">
              <el-select
                v-model="editForm.departmentId"
                placeholder="Не назначен"
                clearable
                style="width: 100%"
                @change="saveEmployeeChanges"
              >
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Профиль">
              <el-select
                v-model="editForm.profileId"
                placeholder="Не назначен"
                clearable
                style="width: 100%"
                @change="saveEmployeeChanges"
              >
                <el-option
                  v-for="prof in profiles"
                  :key="prof.id"
                  :label="prof.name"
                  :value="prof.id"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>

        <!-- Профиль: Навыки, Этапы, Вопросы -->
        <div v-if="currentProfileSkills.length > 0" class="detail-section profile-section">
          <h3 class="section-title">Профиль: {{ selectedEmployee.profileName }}</h3>
          <p class="section-hint">Нажмите на навык, чтобы увидеть материалы и вопросы</p>

          <el-collapse v-model="activeSkillIds" class="skills-collapse">
            <el-collapse-item
              v-for="skill in currentProfileSkills"
              :key="skill.id"
              :name="skill.id"
            >
              <template #title>
                <span class="skill-title">{{ skill.name }}</span>
              </template>

              <div class="skill-content">
                <!-- Материалы -->
                <div v-if="skill.materials?.length" class="materials-block">
                  <h4 class="subsection-title">Материалы для подготовки:</h4>
                  <ul class="materials-list">
                    <li v-for="(mat, i) in skill.materials" :key="i" class="material-item">
                      {{ mat }}
                    </li>
                  </ul>
                </div>

                <!-- Этапы и Вопросы -->
                <div v-if="skill.stages?.length" class="stages-block">
                  <h4 class="subsection-title">Вопросы по этапам:</h4>
                  <el-tabs v-model="activeStageIds[skill.id]" class="stage-tabs">
                    <el-tab-pane
                      v-for="stage in skill.stages"
                      :key="stage.id"
                      :label="getStageLabel(stage.type)"
                      :name="stage.id"
                    >
                      <div class="questions-list">
                        <div v-for="(q, i) in stage.questions" :key="i" class="question-item">
                          <p class="question-text"><strong>В:</strong> {{ q.text }}</p>
                          <p class="answer-text"><strong>О:</strong> {{ q.answer }}</p>
                        </div>
                        <el-empty
                          v-if="!stage.questions?.length"
                          description="Вопросов пока нет"
                          :image-size="60"
                        />
                      </div>
                    </el-tab-pane>
                  </el-tabs>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
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
          <el-form-item label="Фамилия *" prop="lastName">
            <el-input v-model="regForm.lastName" placeholder="Иванов" />
          </el-form-item>
          <el-form-item label="Имя *" prop="firstName">
            <el-input v-model="regForm.firstName" placeholder="Иван" />
          </el-form-item>
          <el-form-item label="Отчество" prop="patronymic">
            <el-input v-model="regForm.patronymic" placeholder="Иванович" />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="Должность *" prop="position">
            <el-input v-model="regForm.position" placeholder="Например: Frontend Developer" />
          </el-form-item>
          <el-form-item label="Email *" prop="email">
            <el-input v-model="regForm.email" placeholder="user@example.com" />
          </el-form-item>
        </div>

        <div class="form-row">
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
          <el-form-item label="Профиль" prop="profileId">
            <el-select
              v-model="regForm.profileId"
              placeholder="Можно назначить позже"
              clearable
              style="width: 100%"
            >
              <el-option v-for="p in profiles" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="Пароль *" prop="password">
            <el-input
              v-model="regForm.password"
              type="password"
              show-password
              placeholder="Минимум 6 символов"
            />
          </el-form-item>
          <el-form-item label="Повторите пароль *" prop="confirmPassword">
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

    <!-- 🔹 Модальное окно: Настройка ролей (Только Admin) -->
    <el-dialog
      v-model="rolesVisible"
      title="Настройка ролей сотрудников"
      width="950px"
      destroy-on-close
    >
      <p class="dialog-hint">Управление правами доступа. Изменения применяются мгновенно.</p>
      <el-table :data="employees" stripe border class="roles-table">
        <el-table-column prop="fullName" label="ФИО" min-width="200" fixed />
        <el-table-column prop="position" label="Должность" width="160" />
        <el-table-column label="Аттестуемый" width="110" align="center">
          <template #default="{ row }"
            ><el-switch v-model="row.roles.attested" @change="updateRole(row)"
          /></template>
        </el-table-column>
        <el-table-column label="Аттестующий" width="110" align="center">
          <template #default="{ row }"
            ><el-switch v-model="row.roles.attestor" @change="updateRole(row)"
          /></template>
        </el-table-column>
        <el-table-column label="Руководитель" width="110" align="center">
          <template #default="{ row }"
            ><el-switch v-model="row.roles.manager" @change="updateRole(row)"
          /></template>
        </el-table-column>
        <el-table-column label="СПО" width="80" align="center">
          <template #default="{ row }"
            ><el-switch v-model="row.roles.spo" @change="updateRole(row)"
          /></template>
        </el-table-column>
        <el-table-column label="Администратор" width="130" align="center">
          <template #default="{ row }"
            ><el-switch v-model="row.roles.admin" @change="updateRole(row)"
          /></template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="rolesVisible = false">Закрыть</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Setting } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
// Проверка роли администратора (учитываем разные варианты написания)
const isAdmin = computed(() => {
  const role = authStore.user?.role_name?.toLowerCase() || ''
  return role.includes('admin') || role.includes('администратор')
})

// === Состояние интерфейса ===
const search = ref('')
const detailVisible = ref(false)
const registerVisible = ref(false)
const rolesVisible = ref(false)
const isRegistering = ref(false)
const selectedEmployee = ref<any>(null)
const activeSkillIds = ref<number[]>([])
const activeStageIds = ref<Record<number, number>>({})
const regFormRef = ref<FormInstance>()

// === Моковые данные (замените на API) ===
const departments = ref([
  { id: 1, name: 'Отдел разработки' },
  { id: 2, name: 'Отдел тестирования' },
  { id: 3, name: 'HR и обучение' },
  { id: 4, name: 'Проектный офис' },
])

const profiles = ref([
  {
    id: 1,
    name: 'Frontend Developer',
    skills: [
      {
        id: 101,
        name: 'Vue 3 Composition API',
        materials: [
          'Официальная документация Vue 3',
          'Видеокурс: Реактивность в Vue',
          'Статья: Composition vs Options',
        ],
        stages: [
          {
            id: 1001,
            type: 'attestation',
            questions: [
              {
                text: 'Что такое реактивность?',
                answer:
                  'Способность системы автоматически отслеживать изменения данных и обновлять UI.',
              },
            ],
          },
          {
            id: 1002,
            type: 'practice',
            questions: [
              {
                text: 'Напишите пример использования ref и reactive',
                answer: 'ref для примитивов, reactive для объектов. Пример кода...',
              },
            ],
          },
        ],
      },
      {
        id: 102,
        name: 'TypeScript Basics',
        materials: ['Handbook TypeScript', 'Шпаргалка по Generics'],
        stages: [
          {
            id: 1003,
            type: 'attestation',
            questions: [
              {
                text: 'В чем разница между interface и type?',
                answer: 'interface расширяем, type более гибкий для объединений.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'QA Engineer',
    skills: [
      {
        id: 201,
        name: 'Автотестирование (Cypress)',
        materials: ['Документация Cypress', 'Best Practices E2E'],
        stages: [
          {
            id: 2001,
            type: 'practice',
            questions: [{ text: 'Как замокать API запрос?', answer: 'cy.intercept()' }],
          },
        ],
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
    roles: { attested: true, attestor: false, manager: false, spo: false, admin: false },
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
    roles: { attested: false, attestor: true, manager: true, spo: false, admin: false },
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
    roles: { attested: true, attestor: false, manager: false, spo: false, admin: false },
  },
])

// === Вычисляемые свойства ===
const filteredEmployees = computed(() => {
  if (!search.value) return employees.value
  const q = search.value.toLowerCase()
  return employees.value.filter(
    (e) =>
      `${e.lastName} ${e.firstName} ${e.patronymic || ''}`.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q),
  )
})

const currentProfileSkills = computed(() => {
  if (!selectedEmployee.value?.profileId) return []
  const prof = profiles.value.find((p) => p.id === selectedEmployee.value.profileId)
  return prof?.skills || []
})

// === Форма регистрации ===
const regForm = reactive({
  lastName: '',
  firstName: '',
  patronymic: '',
  position: '',
  email: '',
  departmentId: null as number | null,
  profileId: null as number | null,
  password: '',
  confirmPassword: '',
})

const regRules: FormRules = {
  lastName: [{ required: true, message: 'Введите фамилию', trigger: 'blur' }],
  firstName: [{ required: true, message: 'Введите имя', trigger: 'blur' }],
  position: [{ required: true, message: 'Введите должность', trigger: 'blur' }],
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Некорректный формат email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' },
    { min: 6, message: 'Минимум 6 символов', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: 'Подтвердите пароль', trigger: 'blur' },
    {
      validator: (_, value, callback) => {
        if (value !== regForm.password) callback(new Error('Пароли не совпадают'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

// === Методы ===
const viewEmployee = (row: any) => {
  selectedEmployee.value = row
  // Копируем данные для редактирования
  editForm.value = { ...row }
  activeSkillIds.value = []
  activeStageIds.value = {}
  detailVisible.value = true
}

const editForm = ref<any>({})
const saveEmployeeChanges = () => {
  const idx = employees.value.findIndex((e) => e.id === editForm.value.id)
  if (idx !== -1) {
    employees.value[idx] = {
      ...editForm.value,
      fullName:
        `${editForm.value.lastName} ${editForm.value.firstName} ${editForm.value.patronymic || ''}`.trim(),
      departmentName:
        departments.value.find((d) => d.id === editForm.value.departmentId)?.name || 'Не назначен',
      profileName:
        profiles.value.find((p) => p.id === editForm.value.profileId)?.name || 'Не назначен',
    }
    selectedEmployee.value = employees.value[idx]
  }
  ElMessage.success('Данные сотрудника обновлены')
}

const submitRegistration = async () => {
  if (!regFormRef.value) return
  await regFormRef.value.validate(async (valid) => {
    if (valid) {
      isRegistering.value = true
      try {
        // TODO: API call for registration
        await new Promise((resolve) => setTimeout(resolve, 600)) // Имитация запроса

        const newEmp = {
          id: Date.now(),
          ...regForm,
          fullName: `${regForm.lastName} ${regForm.firstName} ${regForm.patronymic || ''}`.trim(),
          departmentName:
            departments.value.find((d) => d.id === regForm.departmentId)?.name || 'Не назначен',
          profileName:
            profiles.value.find((p) => p.id === regForm.profileId)?.name || 'Не назначен',
          roles: { attested: false, attestor: false, manager: false, spo: false, admin: false },
        }
        employees.value.unshift(newEmp)
        ElMessage.success('Сотрудник успешно зарегистрирован')
        registerVisible.value = false

        // Сброс формы
        Object.assign(regForm, {
          lastName: '',
          firstName: '',
          patronymic: '',
          position: '',
          email: '',
          departmentId: null,
          profileId: null,
          password: '',
          confirmPassword: '',
        })
      } catch (err) {
        ElMessage.error('Ошибка при регистрации')
      } finally {
        isRegistering.value = false
      }
    }
  })
}

const updateRole = (row: any) => {
  // TODO: API call to update roles
  ElMessage.success(`Роли для ${row.fullName} обновлены`)
}

const getStageLabel = (type: string) =>
  ({
    attestation: 'Аттестация',
    practice: 'Практика',
    performance: 'Perf. Review',
  })[type] || type

const openRegisterModal = () => (registerVisible.value = true)
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
  color: var(--text);
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
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.data-table {
  width: 100%;
  margin-bottom: var(--spacing-md);
}

/* === Модальные окна === */
.dialog-hint {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 14px;
  color: var(--gray);
}

.reg-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

/* === Карточка сотрудника === */
.employee-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.detail-section {
  background: #fff;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid #e0e0e0;
}

.section-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
}

.section-hint {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 13px;
  color: var(--gray);
  font-style: italic;
}

.info-form {
  margin-top: var(--spacing-md);
}

.read-only-text {
  color: var(--text);
  font-weight: var(--font-weight-medium);
  display: block;
  padding: var(--spacing-xs) 0;
}

/* === Навыки и этапы === */
.skills-collapse {
  border: none;
  background: transparent;
}

.skill-title {
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  font-size: 15px;
}

.skill-content {
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-sm);
}

.subsection-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--secondary);
}

.materials-list {
  list-style: disc;
  padding-left: var(--spacing-md);
  margin: 0 0 var(--spacing-md) 0;
}

.material-item {
  font-size: 14px;
  color: var(--text);
  margin-bottom: var(--spacing-xs);
}

.stage-tabs {
  margin-top: var(--spacing-sm);
}

.questions-list {
  padding: var(--spacing-sm);
}

.question-item {
  background: #fff;
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
  margin-bottom: var(--spacing-sm);
}

.question-text {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 14px;
  color: var(--text);
}

.answer-text {
  margin: 0;
  font-size: 14px;
  color: var(--gray);
  background: var(--background);
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
}

/* === Таблица ролей === */
.roles-table {
  width: 100%;
}

.roles-table :deep(.el-switch) {
  --el-switch-on-color: var(--primary);
}

/* === Адаптивность === */
@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

/* Deep styles для Element Plus */
:deep(.el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}

:deep(.el-form-item__label) {
  font-weight: var(--font-weight-medium);
}
</style>
