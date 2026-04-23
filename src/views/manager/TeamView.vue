<template>
  <div class="team-view">
    <header class="team-header">
      <div class="header-info">
        <h1>Моя команда</h1>
        <div class="meta">
          <span class="badge level">{{ departmentName }}</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" class="create-btn" @click="openCreateMeetingModal">
          <el-icon><Plus /></el-icon>
          Создать встречу
        </el-button>
      </div>
    </header>

    <!-- Таблица сотрудников -->
    <section class="tab-content">
      <!-- Поиск -->
      <div class="filters-row">
        <el-input
          v-model="searchQuery"
          placeholder="Поиск по ФИО или должности"
          prefix-icon="Search"
          clearable
          class="search-input"
        />
      </div>

      <!-- Таблица сотрудников -->
      <el-table :data="filteredEmployees" class="employees-table" @row-click="openEmployeeProfile">
        <el-table-column prop="name" label="ФИО" min-width="250" />
        <el-table-column prop="position" label="Должность" min-width="200" />
        <el-table-column label="Профиль" min-width="250">
          <template #default="{ row }">
            <div class="profile-cell">
              <span v-if="row.profile" class="profile-name">{{ row.profile }}</span>
              <span v-else class="no-profile">Не назначен</span>
              <!-- Кнопка назначения профиля (только если профиль не назначен) -->
              <el-select
                v-if="!row.profile"
                v-model="row.profile"
                placeholder="Выберите профиль"
                size="small"
                class="profile-select"
                @change="assignProfile(row)"
                @click.stop
              >
                <el-option
                  v-for="prof in availableProfiles"
                  :key="prof.id"
                  :label="prof.name"
                  :value="prof.name"
                />
              </el-select>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <!-- Модалка создания встречи -->
    <el-dialog
      v-model="isCreateMeetingModalOpen"
      title="Создание встречи"
      :width="700"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="meetingForm" label-position="top" class="meeting-form">
        <el-form-item label="Участники *" prop="participants">
          <div class="participants-section">
            <div class="participant-row">
              <span class="participant-label">Аттестуемый:</span>
              <el-select
                v-model="meetingForm.attestedId"
                placeholder="Выберите аттестуемого"
                filterable
                class="participant-select"
              >
                <el-option
                  v-for="emp in subordinates"
                  :key="emp.id"
                  :label="emp.name"
                  :value="emp.id"
                />
              </el-select>
            </div>
            <div class="participant-row">
              <span class="participant-label">Аттестующий:</span>
              <el-select
                v-model="meetingForm.attestorId"
                placeholder="Выберите аттестующего"
                filterable
                class="participant-select"
              >
                <el-option
                  v-for="emp in availableAttestors"
                  :key="emp.id"
                  :label="emp.name"
                  :value="emp.id"
                  :disabled="emp.id === meetingForm.attestedId"
                />
              </el-select>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="Навык *" prop="skillId">
          <el-select
            v-model="meetingForm.skillId"
            placeholder="Выберите навык для защиты"
            filterable
            @change="onSkillChange"
          >
            <el-option
              v-for="skill in availableTopics"
              :key="skill.id"
              :label="skill.name"
              :value="skill.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Тип этапа *" prop="confirmationType">
          <el-select v-model="meetingForm.confirmationType" placeholder="Выберите тип этапа">
            <el-option label="Аттестация" value="attestation" />
            <el-option label="Практика" value="practice" />
            <el-option label="Perf. Review" value="performance" />
          </el-select>
        </el-form-item>

        <el-form-item label="Дата и время *" prop="startTime">
          <el-date-picker
            v-model="meetingForm.startTime"
            type="datetime"
            placeholder="Выберите дату и время"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="Место *" prop="location">
          <el-input v-model="meetingForm.location" placeholder="Например: Zoom, переговорная 301" />
        </el-form-item>

        <el-form-item label="Длительность (минуты) *" prop="duration">
          <el-input-number
            v-model="meetingForm.duration"
            :min="15"
            :max="180"
            :step="15"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="meetingForm.description"
            type="textarea"
            :rows="3"
            placeholder="Описание встречи, дополнительные заметки"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeCreateMeetingModal">Отмена</el-button>
        <el-button type="primary" @click="createMeeting">Создать встречу</el-button>
      </template>
    </el-dialog>

    <!-- Модалка профиля сотрудника (используем ProfileCard) -->
    <el-dialog
      v-model="isProfileModalOpen"
      :title="selectedEmployee?.name || ''"
      :width="1000"
      class="profile-dialog"
      destroy-on-close
    >
      <ProfileCard
        v-if="selectedEmployee?.profileData"
        :levels="selectedEmployee.profileData.levels"
      />
      <div v-else class="no-profile-message">
        <el-empty description="Профиль не назначен">
          <el-button type="primary" @click="assignProfileFromModal"> Назначить профиль </el-button>
        </el-empty>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ProfileCard from '@/components/common/ProfileCard.vue'

const departmentName = 'название отдела'

const searchQuery = ref('')

// Доступные профили для назначения
const availableProfiles = ref([
  { id: 'p1', name: 'Frontend Developer' },
  { id: 'p2', name: 'Backend Developer' },
  { id: 'p3', name: 'QA Engineer' },
  { id: 'p4', name: 'DevOps Engineer' },
  { id: 'p5', name: 'Fullstack Developer' },
])

// 3 сотрудника (один без профиля)
const subordinates = ref([
  {
    id: '1',
    name: 'Иванов Иван Иванович',
    position: 'Frontend Developer',
    profile: 'Frontend Developer',
    email: 'ivanov@company.ru',
    profileData: {
      levels: [
        {
          id: 1,
          name: 'Ученик',
          progress: 100,
          skills: [
            {
              id: 1,
              name: 'Разработка веб-приложений на Vue.js',
              total_progress: 100,
              stages: [
                {
                  id: 1,
                  type: 'practice',
                  description: 'Практическое задание по созданию SPA приложения',
                  materials: ['Vue.js Guide', 'Vue Router Documentation'],
                  progress: 100,
                  questions: [
                    {
                      id: 'q1',
                      text: 'Какой хук используется для реактивного состояния?',
                      answer: 'ref() или reactive()',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 2,
          name: '1 Категория',
          progress: 56,
          skills: [
            {
              id: 2,
              name: 'Оптимизация запросов',
              total_progress: 50,
              stages: [
                {
                  id: 2,
                  type: 'attestation',
                  description: 'Аттестация по оптимизации запросов',
                  materials: ['Книга: "Оптимизация БД"'],
                  progress: 50,
                  questions: [
                    {
                      id: 'q2',
                      text: 'Что такое индекс в БД?',
                      answer: 'Структура данных для ускорения поиска',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: '2',
    name: 'Петрова Анна Сергеевна',
    position: 'Backend Developer',
    profile: 'Backend Developer',
    email: 'petrova@company.ru',
    profileData: {
      levels: [
        {
          id: 1,
          name: 'Ученик',
          progress: 100,
          skills: [
            {
              id: 3,
              name: 'Проектирование схем БД',
              total_progress: 100,
              stages: [
                {
                  id: 3,
                  type: 'practice',
                  description: 'Практика по проектированию БД',
                  materials: ['Книга: "Проектирование реляционных баз данных"'],
                  progress: 100,
                  questions: [
                    {
                      id: 'q3',
                      text: 'Что такое нормализация?',
                      answer: 'Процесс организации данных для уменьшения избыточности',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  // ✅ Новый сотрудник без профиля
  {
    id: '3',
    name: 'Сидоров Дмитрий Владимирович',
    position: 'Junior Developer',
    profile: null, // ❌ Профиль не назначен
    email: 'sidorov@company.ru',
    profileData: null, // Нет данных профиля
  },
])

const availableTopics = ref([
  { id: 't1', name: 'Проектирование схем БД' },
  { id: 't2', name: 'Оптимизация запросов' },
  { id: 't3', name: 'Vue 3 Composition API' },
  { id: 't4', name: 'Микросервисная архитектура' },
  { id: 't5', name: 'KPI и метрики эффективности' },
])

const meetingForm = ref({
  skillId: null,
  skillName: '',
  confirmationType: 'attestation',
  startTime: '',
  duration: 60,
  location: '',
  attestedId: '',
  attestorId: '',
  description: '',
})

const isCreateMeetingModalOpen = ref(false)
const isProfileModalOpen = ref(false)
const selectedEmployee = ref(null)

// Фильтрация только по поиску (ФИО или должность)
const filteredEmployees = computed(() => {
  let result = [...subordinates.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (e) => e.name.toLowerCase().includes(query) || e.position.toLowerCase().includes(query),
    )
  }

  return result
})

const availableAttestors = computed(() => {
  return [{ id: 'manager', name: 'Руководитель' }, ...subordinates.value]
})

const onSkillChange = (skillId) => {
  const skill = availableTopics.value.find((s) => s.id === skillId)
  if (skill) {
    meetingForm.value.skillName = skill.name
  }
}

// ✅ Назначение профиля сотруднику
const assignProfile = (employee) => {
  if (employee.profile) {
    // Здесь можно отправить запрос на бэкенд для сохранения
    ElMessage.success(`Профиль "${employee.profile}" назначен сотруднику ${employee.name}`)

    // ✅ Если профиль назначен, загружаем данные профиля (мок-данные)
    const profileTemplates = {
      'Frontend Developer': {
        levels: [
          {
            id: 1,
            name: 'Ученик',
            progress: 100,
            skills: [
              {
                id: 1,
                name: 'Разработка веб-приложений на Vue.js',
                total_progress: 100,
                stages: [
                  {
                    id: 1,
                    type: 'practice',
                    description: 'Практическое задание по созданию SPA приложения',
                    materials: ['Vue.js Guide', 'Vue Router Documentation'],
                    progress: 100,
                    questions: [
                      {
                        id: 'q1',
                        text: 'Какой хук используется для реактивного состояния?',
                        answer: 'ref() или reactive()',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      'Backend Developer': {
        levels: [
          {
            id: 1,
            name: 'Ученик',
            progress: 100,
            skills: [
              {
                id: 3,
                name: 'Проектирование схем БД',
                total_progress: 100,
                stages: [
                  {
                    id: 3,
                    type: 'practice',
                    description: 'Практика по проектированию БД',
                    materials: ['Книга: "Проектирование реляционных баз данных"'],
                    progress: 100,
                    questions: [
                      {
                        id: 'q3',
                        text: 'Что такое нормализация?',
                        answer: 'Процесс организации данных для уменьшения избыточности',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      'QA Engineer': {
        levels: [
          {
            id: 1,
            name: 'Ученик',
            progress: 0,
            skills: [],
          },
        ],
      },
      'DevOps Engineer': {
        levels: [
          {
            id: 1,
            name: 'Ученик',
            progress: 0,
            skills: [],
          },
        ],
      },
      'Fullstack Developer': {
        levels: [
          {
            id: 1,
            name: 'Ученик',
            progress: 0,
            skills: [],
          },
        ],
      },
    }

    employee.profileData = profileTemplates[employee.profile] || null
  }
}

// Назначение профиля из модалки профиля
const assignProfileFromModal = () => {
  if (selectedEmployee.value) {
    // Открываем выбор профиля (можно показать el-dialog с выбором)
    const profileName = prompt('Введите название профиля:', '')
    if (profileName && availableProfiles.value.find((p) => p.name === profileName)) {
      selectedEmployee.value.profile = profileName
      assignProfile(selectedEmployee.value)
      ElMessage.success(`Профиль "${profileName}" назначен`)
    }
  }
}

const openCreateMeetingModal = () => {
  isCreateMeetingModalOpen.value = true
  //document.body.style.overflow = 'hidden'
}

const closeCreateMeetingModal = () => {
  isCreateMeetingModalOpen.value = false
  //document.body.style.overflow = ''
}

const openEmployeeProfile = (employee) => {
  selectedEmployee.value = employee
  isProfileModalOpen.value = true
  //document.body.style.overflow = 'hidden'
}

const closeEmployeeProfile = () => {
  isProfileModalOpen.value = false
  selectedEmployee.value = null
  //document.body.style.overflow = ''
}

const resetForm = () => {
  meetingForm.value = {
    skillId: null,
    skillName: '',
    confirmationType: 'attestation',
    startTime: '',
    duration: 60,
    location: '',
    attestedId: '',
    attestorId: '',
    description: '',
  }
  ElMessage.info('Форма очищена')
}

const createMeeting = () => {
  if (!meetingForm.value.skillId || !meetingForm.value.startTime || !meetingForm.value.location) {
    ElMessage.warning('Заполните все обязательные поля')
    return
  }
  if (!meetingForm.value.attestedId || !meetingForm.value.attestorId) {
    ElMessage.warning('Выберите аттестуемого и аттестующего')
    return
  }
  ElMessage.success('Встреча создана')
  resetForm()
  closeCreateMeetingModal()
}
</script>

<style scoped>
.team-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
  color: var(--text);
  background: var(--background);
  min-height: 100vh;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.header-info h1 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text);
}

.meta {
  display: flex;
  gap: var(--spacing-sm);
}

.create-btn {
  background: var(--secondary);
  border-color: var(--secondary);
}

.create-btn:hover {
  background: var(--primary);
  border-color: var(--primary);
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filters-row {
  margin-bottom: var(--spacing-lg);
}

.search-input {
  max-width: 400px;
}

.employees-table {
  width: 100%;
  cursor: pointer;
}

.employees-table :deep(.el-table__row) {
  cursor: pointer;
}

.employees-table :deep(.el-table__row:hover) {
  background-color: var(--background);
}

/* Ячейка профиля */
.profile-cell {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.profile-name {
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

.no-profile {
  color: var(--gray);
  font-style: italic;
}

.profile-select {
  width: 180px;
}

.meeting-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}

.participants-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.participant-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.participant-label {
  min-width: 140px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

.participant-select {
  flex: 1;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
}

.badge.level {
  background: #eef2f7;
  color: var(--text);
  border: 1px solid #ddd;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: #fff;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  position: relative;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--danger);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: #fff;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #c0392b;
}

.modal-header {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
  color: var(--primary);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.section-block h3 {
  font-size: 15px;
  color: var(--secondary);
  margin: 0 0 var(--spacing-xs) 0;
}

.section-block p {
  margin: 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.6;
}

.literature-list {
  margin: 0;
  padding-left: var(--spacing-md);
  color: var(--text);
  line-height: 1.6;
}

.literature-list li {
  margin-bottom: var(--spacing-xs);
}

.modal-footer {
  margin-top: var(--spacing-lg);
  text-align: right;
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.btn-close {
  background: var(--danger);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-close:hover {
  background: #c0392b;
}

/* Сообщение о отсутствии профиля */
.no-profile-message {
  padding: var(--spacing-lg);
  text-align: center;
}

/* Deep styles для Element Plus */
:deep(.admin-dialog .el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}

:deep(.admin-dialog .el-form-item__label) {
  font-weight: var(--font-weight-medium);
}

:deep(.profile-dialog .el-dialog__body) {
  padding: 0;
}

@media (max-width: 768px) {
  .team-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .participant-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .participant-label {
    min-width: auto;
    margin-bottom: var(--spacing-xs);
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .btn-close,
  .el-button {
    width: 100%;
  }

  .profile-cell {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }

  .profile-select {
    width: 100%;
  }
}
</style>
