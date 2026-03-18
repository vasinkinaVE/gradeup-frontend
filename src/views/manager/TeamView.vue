<template>
  <div class="team-view">
    <header class="team-header">
      <div class="header-info">
        <h1>Моя команда</h1>
        <div class="meta">
          <span class="badge level">{{ departmentName }}</span>
          <span class="badge level">Количество сотрудников: {{ subordinates.length }}</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" class="create-btn" @click="openCreateMeetingModal">
          <el-icon><Plus /></el-icon>
          Создать аттестационную встречу
        </el-button>
      </div>
    </header>

    <div class="team-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <section v-if="activeTab === 'employees'" class="tab-content">
      <div class="filters-row">
        <el-input
          v-model="searchQuery"
          placeholder="Поиск сотрудника"
          prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-select
          v-model="filterPosition"
          placeholder="Все должности"
          class="filter-select"
          clearable
        >
          <el-option label="Все должности" value="" />
          <el-option v-for="pos in uniquePositions" :key="pos" :label="pos" :value="pos" />
        </el-select>
      </div>

      <div class="employees-list">
        <div
          v-for="employee in filteredEmployees"
          :key="employee.id"
          class="employee-item"
          @click="openEmployeeProfile(employee)"
        >
          <div class="employee-avatar">
            <span>{{ getInitials(employee.name) }}</span>
          </div>
          <div class="employee-info">
            <h3 class="employee-name">{{ employee.name }}</h3>
            <p class="employee-position">{{ employee.position }}</p>
            <div class="employee-meta">
              <span class="badge category">{{ employee.category }}</span>
            </div>
          </div>
          <div class="employee-progress">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: employee.progress + '%' }"></div>
            </div>
            <span class="progress-percent">{{ employee.progress }}%</span>
          </div>
          <div class="employee-stats">
            <span>Тем: {{ employee.closedTopics }}/{{ employee.totalTopics }}</span>
            <span v-if="employee.nextAttestation" class="next-attestation">
              След: {{ employee.nextAttestation }}
            </span>
          </div>
          <el-icon class="arrow-icon"><ArrowRight /></el-icon>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'questions'" class="tab-content">
      <div class="questions-header">
        <el-input
          v-model="questionSearch"
          placeholder="Поиск вопроса"
          prefix-icon="Search"
          clearable
          class="search-input"
        />
        <el-select
          v-model="questionPosition"
          placeholder="Все должности"
          class="filter-select"
          clearable
        >
          <el-option label="Все должности" value="" />
          <el-option v-for="pos in uniquePositions" :key="pos" :label="pos" :value="pos" />
        </el-select>
      </div>

      <div class="questions-list">
        <div
          v-for="question in filteredQuestions"
          :key="question.id"
          class="question-card"
          @click="openQuestionModal(question)"
        >
          <div class="question-content">
            <h4 class="question-text">{{ question.text }}</h4>
            <div class="question-meta">
              <span class="badge type" :class="getTypeClass(question.type)">
                {{ getTypeLabel(question.type) }}
              </span>
              <span class="question-category">{{ question.category }}</span>
            </div>
          </div>
          <div class="question-answer-preview">
            <span class="answer-label">Ответ:</span>
            <p class="answer-text">{{ question.answer }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Модальное окно создания встречи -->
    <div
      v-if="isCreateMeetingModalOpen"
      class="modal-overlay"
      @click.self="closeCreateMeetingModal"
    >
      <div class="modal-content modal-large">
        <button class="close-btn" @click="closeCreateMeetingModal">&times;</button>
        <div class="modal-header">
          <h2>Создание аттестационной встречи</h2>
        </div>

        <div class="modal-body">
          <el-form :model="meetingForm" label-position="top" class="meeting-form">
            <div class="form-row">
              <el-form-item label="Тема аттестации" prop="topic">
                <el-select v-model="meetingForm.topic" placeholder="Выберите тему" filterable>
                  <el-option
                    v-for="topic in availableTopics"
                    :key="topic.id"
                    :label="topic.name"
                    :value="topic.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="Тип подтверждения" prop="confirmationType">
                <el-radio-group v-model="meetingForm.confirmationType">
                  <el-radio label="attestation">Аттестация</el-radio>
                  <el-radio label="practice">Практика</el-radio>
                  <el-radio label="performance">Perf. Review</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>

            <div class="form-row">
              <el-form-item label="Дата и время" prop="startTime">
                <el-date-picker
                  v-model="meetingForm.startTime"
                  type="datetime"
                  placeholder="Выберите дату и время"
                  format="DD.MM.YYYY HH:mm"
                  value-format="YYYY-MM-DDTHH:mm:ss"
                />
              </el-form-item>

              <el-form-item label="Длительность (мин)" prop="duration">
                <el-select v-model="meetingForm.duration" placeholder="Выберите">
                  <el-option label="30 минут" :value="30" />
                  <el-option label="45 минут" :value="45" />
                  <el-option label="60 минут" :value="60" />
                  <el-option label="90 минут" :value="90" />
                </el-select>
              </el-form-item>
            </div>

            <el-form-item label="Место проведения" prop="location">
              <el-input
                v-model="meetingForm.location"
                placeholder="Например: Zoom, Переговорная А"
              />
            </el-form-item>

            <div class="form-row">
              <el-form-item label="Аттестуемый" prop="attestedId">
                <el-select
                  v-model="meetingForm.attestedId"
                  placeholder="Выберите сотрудника"
                  filterable
                >
                  <el-option
                    v-for="emp in subordinates"
                    :key="emp.id"
                    :label="emp.name"
                    :value="emp.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="Аттестующий" prop="attestorId">
                <el-select
                  v-model="meetingForm.attestorId"
                  placeholder="Выберите аттестующего"
                  filterable
                >
                  <el-option
                    v-for="emp in availableAttestors"
                    :key="emp.id"
                    :label="emp.name"
                    :value="emp.id"
                  />
                </el-select>
              </el-form-item>
            </div>

            <div class="form-actions">
              <el-button @click="resetForm">Очистить</el-button>
              <el-button type="primary" @click="createMeeting">Создать встречу</el-button>
            </div>
          </el-form>
        </div>
      </div>
    </div>

    <!-- Модальное окно профиля сотрудника -->
    <div v-if="isProfileModalOpen" class="modal-overlay" @click.self="closeEmployeeProfile">
      <div class="modal-content modal-profile">
        <button class="close-btn" @click="closeEmployeeProfile">&times;</button>
        <div v-if="selectedEmployee">
          <div class="modal-header">
            <div class="modal-employee-info">
              <div class="modal-avatar">{{ getInitials(selectedEmployee.name) }}</div>
              <div>
                <h2>{{ selectedEmployee.name }}</h2>
                <p>{{ selectedEmployee.position }}</p>
                <span class="badge category">{{ selectedEmployee.category }}</span>
              </div>
            </div>
          </div>

          <div class="modal-body">
            <!-- Категории -->
            <div class="categories-section">
              <div
                v-for="cat in employeeProfile.categories"
                :key="cat.id"
                class="category-row"
                :class="{ active: cat.isCurrent }"
              >
                <div class="category-info">
                  <span class="category-name">{{ cat.name }}</span>
                  <span v-if="cat.isCurrent" class="badge current">Текущая</span>
                  <span v-else-if="cat.completed" class="badge completed">✓ Завершена</span>
                </div>
                <div class="category-progress">
                  <span class="progress-value">{{ cat.progress }}%</span>
                  <div class="progress-bar-bg">
                    <div class="progress-bar-fill" :style="{ width: cat.progress + '%' }"></div>
                  </div>
                  <el-icon class="expand-icon"
                    ><ArrowUp v-if="cat.isCurrent" /><ArrowDown v-else
                  /></el-icon>
                </div>
              </div>
            </div>

            <!-- Темы по категориям -->
            <div v-if="employeeProfile.categories.find((c) => c.isCurrent)" class="topics-section">
              <div
                v-for="category in employeeProfile.categories.filter((c) => c.isCurrent)"
                :key="category.id"
                class="category-block"
              >
                <div v-for="section in category.sections" :key="section.id" class="topic-section">
                  <h4 class="section-title">{{ section.name }}</h4>
                  <div class="topics-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Название темы</th>
                          <th>Тип закрытия</th>
                          <th>Прогресс</th>
                          <th>Этапы</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="topic in section.topics" :key="topic.id">
                          <td class="topic-name">{{ topic.title }}</td>
                          <td>
                            <span class="badge type" :class="getTypeClass(topic.type)">
                              {{ getTypeLabel(topic.type) }}
                            </span>
                          </td>
                          <td>
                            <div class="topic-progress">
                              <span class="progress-percent">{{ topic.progress }}%</span>
                              <div class="progress-bar-bg">
                                <div
                                  class="progress-bar-fill"
                                  :style="{ width: topic.progress + '%' }"
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td class="stages">
                            {{ topic.stagesCompleted }} / {{ topic.totalStages }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div class="section-block">
              <h3>Ближайшая аттестация</h3>
              <p>{{ selectedEmployee.nextAttestation || 'Не назначена' }}</p>
            </div>

            <div class="section-block">
              <h3>Контакты</h3>
              <p>Email: {{ selectedEmployee.email }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <el-button @click="assignAttestation(selectedEmployee)">Назначить аттестацию</el-button>
            <el-button class="btn-close" @click="closeEmployeeProfile">Закрыть</el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isQuestionModalOpen" class="modal-overlay" @click.self="closeQuestionModal">
      <div class="modal-content">
        <button class="close-btn" @click="closeQuestionModal">&times;</button>
        <div v-if="selectedQuestion">
          <div class="modal-header">
            <h2>Вопрос</h2>
            <span class="badge type" :class="getTypeClass(selectedQuestion.type)">
              {{ getTypeLabel(selectedQuestion.type) }}
            </span>
          </div>

          <div class="modal-body">
            <div class="section-block">
              <h3>Текст вопроса</h3>
              <p>{{ selectedQuestion.text }}</p>
            </div>

            <div class="section-block">
              <h3>Эталонный ответ</h3>
              <p>{{ selectedQuestion.answer }}</p>
            </div>

            <div class="section-block">
              <h3>Категория</h3>
              <p>{{ selectedQuestion.category }}</p>
            </div>

            <div class="section-block" v-if="selectedQuestion.literature?.length">
              <h3>Литература</h3>
              <ul class="literature-list">
                <li v-for="(item, index) in selectedQuestion.literature" :key="index">
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>

          <div class="modal-footer">
            <el-button class="btn-close" @click="closeQuestionModal">Закрыть</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Search, ArrowRight, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const departmentName = 'Отдел разработки'

const tabs = [
  { id: 'employees', label: 'Сотрудники' },
  { id: 'questions', label: 'Вопросы и ответы' },
]

const activeTab = ref('employees')
const searchQuery = ref('')
const filterPosition = ref('')
const questionSearch = ref('')
const questionPosition = ref('')

const subordinates = ref([
  {
    id: '1',
    name: 'Иванов Иван Иванович',
    position: 'Frontend Developer',
    category: '3 Категория',
    progress: 56,
    closedTopics: 14,
    totalTopics: 25,
    nextAttestation: '17.03.2026',
    email: 'ivanov@company.ru',
  },
  {
    id: '2',
    name: 'Петрова Анна Сергеевна',
    position: 'Backend Developer',
    category: '3 Категория',
    progress: 78,
    closedTopics: 21,
    totalTopics: 27,
    nextAttestation: '22.03.2026',
    email: 'petrova@company.ru',
  },
  {
    id: '3',
    name: 'Сидоров Дмитрий Владимирович',
    position: 'QA Engineer',
    category: '2 Категория',
    progress: 34,
    closedTopics: 8,
    totalTopics: 24,
    nextAttestation: '05.04.2026',
    email: 'sidorov@company.ru',
  },
  {
    id: '4',
    name: 'Козлова Елена Андреевна',
    position: 'DevOps Engineer',
    category: '1 Категория',
    progress: 92,
    closedTopics: 23,
    totalTopics: 25,
    nextAttestation: null,
    email: 'kozlova@company.ru',
  },
])

const questionsBank = ref([
  {
    id: 'q1',
    text: 'Что такое нормализация и зачем она нужна?',
    answer:
      'Нормализация — процесс организации данных для уменьшения избыточности и улучшения целостности',
    type: 'attestation',
    category: 'Базы данных',
    position: 'Backend Developer',
    literature: ['Книга: "Проектирование реляционных баз данных"'],
  },
  {
    id: 'q2',
    text: 'Как работает reactivity в Vue 3?',
    answer: 'На основе Proxy для отслеживания изменений реактивных данных',
    type: 'practice',
    category: 'Frontend',
    position: 'Frontend Developer',
  },
  {
    id: 'q3',
    text: 'Принципы микросервисной архитектуры',
    answer: 'Независимое развертывание, слабая связность, отдельная база данных на сервис',
    type: 'attestation',
    category: 'Архитектура',
    position: 'Backend Developer',
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
  topic: '',
  confirmationType: 'attestation',
  startTime: '',
  duration: 60,
  location: '',
  attestedId: '',
  attestorId: '',
})

const isCreateMeetingModalOpen = ref(false)
const isProfileModalOpen = ref(false)
const isQuestionModalOpen = ref(false)
const selectedEmployee = ref(null)
const selectedQuestion = ref(null)

// Профиль сотрудника с детальной информацией
const employeeProfile = ref({
  categories: [
    {
      id: 1,
      name: 'Ученик',
      progress: 100,
      completed: true,
      isCurrent: false,
      sections: [
        {
          id: 101,
          name: 'Базы данных',
          topics: [
            {
              id: 1001,
              title: 'Проектирование схем БД',
              type: 'attestation',
              progress: 100,
              stagesCompleted: 2,
              totalStages: 2,
            },
          ],
        },
      ],
    },
    {
      id: 2,
      name: '1 Категория',
      progress: 100,
      completed: true,
      isCurrent: false,
      sections: [
        {
          id: 201,
          name: 'Frontend Разработка',
          topics: [
            {
              id: 2001,
              title: 'Работа с состоянием (Vue)',
              type: 'practice',
              progress: 100,
              stagesCompleted: 4,
              totalStages: 4,
            },
          ],
        },
      ],
    },
    {
      id: 3,
      name: '2 Категория',
      progress: 100,
      completed: true,
      isCurrent: false,
      sections: [
        {
          id: 301,
          name: 'Базы данных',
          topics: [
            {
              id: 3001,
              title: 'Оптимизация запросов',
              type: 'practice',
              progress: 100,
              stagesCompleted: 1,
              totalStages: 1,
            },
          ],
        },
      ],
    },
    {
      id: 4,
      name: '3 Категория',
      progress: 56,
      completed: false,
      isCurrent: true,
      sections: [
        {
          id: 401,
          name: 'Базы данных',
          topics: [
            {
              id: 4001,
              title: 'Проектирование схем БД',
              type: 'attestation',
              progress: 50,
              stagesCompleted: 1,
              totalStages: 2,
            },
            {
              id: 4002,
              title: 'Оптимизация запросов',
              type: 'practice',
              progress: 0,
              stagesCompleted: 0,
              totalStages: 1,
            },
          ],
        },
        {
          id: 402,
          name: 'Frontend Разработка',
          topics: [
            {
              id: 4003,
              title: 'Работа с состоянием (Vue)',
              type: 'practice',
              progress: 75,
              stagesCompleted: 3,
              totalStages: 4,
            },
            {
              id: 4004,
              title: 'Performance Review Q3',
              type: 'performance',
              progress: 100,
              stagesCompleted: 1,
              totalStages: 1,
            },
          ],
        },
      ],
    },
  ],
})

const uniquePositions = computed(() => {
  const positions = new Set(subordinates.value.map((e) => e.position))
  return Array.from(positions)
})

const filteredEmployees = computed(() => {
  let result = [...subordinates.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (e) => e.name.toLowerCase().includes(query) || e.position.toLowerCase().includes(query),
    )
  }

  if (filterPosition.value) {
    result = result.filter((e) => e.position === filterPosition.value)
  }

  return result
})

const filteredQuestions = computed(() => {
  let result = [...questionsBank.value]

  if (questionSearch.value) {
    const query = questionSearch.value.toLowerCase()
    result = result.filter(
      (q) => q.text.toLowerCase().includes(query) || q.answer.toLowerCase().includes(query),
    )
  }

  if (questionPosition.value) {
    result = result.filter((q) => q.position === questionPosition.value)
  }

  return result
})

const availableAttestors = computed(() => {
  return [
    { id: 'manager', name: 'Руководитель' },
    ...subordinates.value.filter((s) => s.category !== 'Ученик'),
  ]
})

const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getTypeLabel = (type) => {
  const map = {
    attestation: 'Аттестация',
    practice: 'Практика',
    performance: 'Perf. Review',
  }
  return map[type] || type
}

const getTypeClass = (type) => {
  return `type-${type}`
}

const openCreateMeetingModal = () => {
  isCreateMeetingModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeCreateMeetingModal = () => {
  isCreateMeetingModalOpen.value = false
  document.body.style.overflow = ''
}

const openEmployeeProfile = (employee) => {
  selectedEmployee.value = employee
  isProfileModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeEmployeeProfile = () => {
  isProfileModalOpen.value = false
  selectedEmployee.value = null
  document.body.style.overflow = ''
}

const openQuestionModal = (question) => {
  selectedQuestion.value = question
  isQuestionModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeQuestionModal = () => {
  isQuestionModalOpen.value = false
  selectedQuestion.value = null
  document.body.style.overflow = ''
}

const assignAttestation = (employee) => {
  meetingForm.value.attestedId = employee.id
  closeEmployeeProfile()
  openCreateMeetingModal()
  ElMessage.success(`Выбран сотрудник: ${employee.name}`)
}

const resetForm = () => {
  meetingForm.value = {
    topic: '',
    confirmationType: 'attestation',
    startTime: '',
    duration: 60,
    location: '',
    attestedId: '',
    attestorId: '',
  }
  ElMessage.info('Форма очищена')
}

const createMeeting = () => {
  if (!meetingForm.value.topic || !meetingForm.value.startTime || !meetingForm.value.attestedId) {
    ElMessage.warning('Заполните обязательные поля')
    return
  }
  ElMessage.success('Аттестационная встреча создана')
  resetForm()
  closeCreateMeetingModal()
}
</script>

<style scoped>
.team-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
  gap: 20px;
}

.header-info h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
}

.meta {
  display: flex;
  gap: 10px;
}

.create-btn {
  background: #6a4c8d;
  border-color: #6a4c8d;
}

.create-btn:hover {
  background: #4a2c6d;
  border-color: #4a2c6d;
}

.team-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 8px;
  width: fit-content;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  background: #6a4c8d;
  color: #fff;
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
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.filter-select {
  width: 220px;
}

.employees-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.employee-item {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  align-items: center;
  gap: 20px;
}

.employee-item:hover {
  box-shadow: 0 4px 12px rgba(74, 44, 109, 0.15);
  border-color: #6a4c8d;
  transform: translateX(4px);
}

.employee-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #6a4c8d;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.employee-info {
  min-width: 0;
}

.employee-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.employee-position {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
}

.employee-meta {
  display: flex;
  gap: 8px;
}

.employee-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
}

.progress-bar-bg {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #6a4c8d;
  transition: width 0.5s ease;
}

.progress-percent {
  font-weight: 600;
  color: #6a4c8d;
  min-width: 45px;
  text-align: right;
}

.employee-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #666;
  text-align: right;
}

.next-attestation {
  color: #6a4c8d;
  font-weight: 500;
}

.arrow-icon {
  color: #6a4c8d;
  font-size: 20px;
  flex-shrink: 0;
}

.questions-header {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.question-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: #6a4c8d;
}

.question-content {
  margin-bottom: 12px;
}

.question-text {
  margin: 0 0 8px 0;
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-category {
  font-size: 13px;
  color: #666;
}

.question-answer-preview {
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.answer-label {
  font-size: 12px;
  color: #6a4c8d;
  font-weight: 500;
}

.answer-text {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #555;
  line-height: 1.5;
}

.meeting-form {
  max-width: 800px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge.level {
  background: #eef2f7;
  color: #555;
  border: 1px solid #ddd;
}

.badge.category {
  background: #f0e6f5;
  color: #6a4c8d;
  border: 1px solid #d0c0e0;
}

.badge.type {
  color: #fff;
}

.badge.current {
  background: #6a4c8d;
  color: #fff;
  margin-left: 8px;
}

.badge.completed {
  background: #4caf50;
  color: #fff;
  margin-left: 8px;
}

.type-attestation {
  background: #f4b942;
  color: #333;
}

.type-practice {
  background: #4caf50;
}

.type-performance {
  background: #e74c3c;
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
  border-radius: 12px;
  padding: 30px;
  position: relative;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
}

.modal-profile {
  max-width: 900px;
}

.modal-large {
  max-width: 800px;
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
  background: #e74c3c;
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
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
  color: #4a2c6d;
}

.modal-employee-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.modal-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #6a4c8d;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
}

.modal-employee-info h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #333;
}

.modal-employee-info p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Categories Section */
.categories-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.category-row.active {
  background: #f8f5fc;
  border-color: #6a4c8d;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-name {
  font-weight: 600;
  font-size: 15px;
  color: #333;
}

.category-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-value {
  font-weight: 600;
  color: #6a4c8d;
  min-width: 45px;
  text-align: right;
}

.category-progress .progress-bar-bg {
  width: 120px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.category-progress .progress-bar-fill {
  height: 100%;
  background: #6a4c8d;
  transition: width 0.5s ease;
}

.expand-icon {
  color: #6a4c8d;
  font-size: 16px;
}

/* Topics Section */
.topics-section {
  margin-top: 10px;
}

.category-block {
  margin-bottom: 20px;
}

.topic-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
  padding-left: 10px;
  border-left: 3px solid #6a4c8d;
}

.topics-table {
  overflow-x: auto;
}

.topics-table table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.topics-table th {
  text-align: left;
  padding: 12px 15px;
  background: #f9f9f9;
  color: #666;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #e0e0e0;
}

.topics-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
  font-size: 14px;
}

.topic-name {
  font-weight: 500;
  color: #333;
}

.topic-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topic-progress .progress-bar-bg {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.topic-progress .progress-bar-fill {
  height: 100%;
  background: #6a4c8d;
}

.progress-percent {
  font-weight: 600;
  color: #6a4c8d;
  min-width: 35px;
  font-size: 13px;
}

.stages {
  font-family: monospace;
  color: #666;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  font-size: 13px;
}

.section-block h3 {
  font-size: 15px;
  color: #6a4c8d;
  margin: 0 0 10px 0;
}

.section-block p {
  margin: 0;
  font-size: 14px;
  color: #555;
  line-height: 1.6;
}

.progress-detail {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.progress-detail .progress-bar-bg {
  margin-bottom: 10px;
}

.literature-list {
  margin: 0;
  padding-left: 20px;
  color: #555;
  line-height: 1.6;
}

.literature-list li {
  margin-bottom: 6px;
}

.modal-footer {
  margin-top: 30px;
  text-align: right;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-close {
  background: #e74c3c;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-close:hover {
  background: #c0392b;
}

@media (max-width: 768px) {
  .team-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .employee-item {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .employee-progress {
    width: 100%;
  }

  .employee-stats {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .arrow-icon {
    display: none;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .filters-row,
  .questions-header {
    flex-direction: column;
  }

  .search-input,
  .filter-select {
    width: 100%;
    max-width: 100%;
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .btn-close,
  .el-button {
    width: 100%;
  }

  .category-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .category-progress {
    width: 100%;
  }

  .category-progress .progress-bar-bg {
    flex: 1;
  }

  .topics-table table {
    font-size: 12px;
  }

  .topics-table th,
  .topics-table td {
    padding: 8px 10px;
  }
}
</style>
