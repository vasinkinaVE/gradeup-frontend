<template>
  <div class="calendar-page">
    <!-- Заголовок страницы -->
    <div class="page-header">
      <h1 class="page-title">Календарь аттестаций</h1>
      <p class="page-subtitle">Все аттестации, в которых вы участвуете</p>
    </div>

    <!-- Поиск и фильтры -->
    <div class="filters-bar">
      <!-- Строка поиска -->
      <div class="search-row">
        <el-input
          v-model="searchQuery"
          placeholder="Поиск по теме или ФИО участника"
          prefix-icon="Search"
          clearable
          class="search-input"
          @input="applyFilters"
        />
      </div>

      <!-- Вторая строка с фильтрами -->
      <div class="filters-row">
        <div class="radio-group-wrapper">
          <el-radio-group v-model="filterStatus" @change="applyFilters">
            <el-radio-button label="all">Все</el-radio-button>
            <el-radio-button label="upcoming">Предстоящие</el-radio-button>
            <el-radio-button label="past">Прошедшие</el-radio-button>
          </el-radio-group>
        </div>

        <el-select
          v-model="filterRole"
          placeholder="Все роли"
          size="default"
          class="filter-select"
          @change="applyFilters"
        >
          <el-option label="Все роли" value="all" />
          <el-option label="Аттестуемый" value="ATTESTED" />
          <el-option label="Аттестующий" value="ATTESTOR" />
        </el-select>

        <el-select
          v-model="filterType"
          placeholder="Все типы"
          size="default"
          class="filter-select"
          @change="applyFilters"
        >
          <el-option label="Все типы" value="all" />
          <el-option label="Аттестация" value="EXAM" />
          <el-option label="Практика" value="PRACTICE" />
          <el-option label="Performance Review" value="REVIEW" />
        </el-select>

        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="—"
          start-placeholder="Начало"
          end-placeholder="Конец"
          size="default"
          :shortcuts="dateShortcuts"
          @change="applyFilters"
          format="DD.MM.YYYY"
          value-format="YYYY-MM-DD"
          class="date-range-picker"
        />
      </div>
    </div>

    <!-- Список аттестаций -->
    <div class="attestations-list">
      <el-empty
        v-if="filteredAttestations.length === 0"
        description="Нет аттестаций по выбранным фильтрам"
        :image-size="80"
      />

      <el-card
        v-for="attestation in filteredAttestations"
        :key="attestation.id"
        class="attestation-card"
        shadow="hover"
        :class="{ 'is-past': attestation.isPast, 'is-today': attestation.isToday }"
      >
        <div class="card-header">
          <div class="card-title-section">
            <el-tag
              :type="getTypeTag(attestation.confirmationType)"
              size="small"
              effect="plain"
              class="type-tag"
            >
              {{ getTypeLabel(attestation.confirmationType) }}
            </el-tag>
            <h3 class="attestation-topic">{{ attestation.topic }}</h3>
          </div>
          <el-tag
            :type="getStatusType(attestation.status)"
            size="small"
            effect="plain"
            class="status-tag"
          >
            {{ getStatusLabel(attestation.status) }}
          </el-tag>
        </div>

        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <el-icon class="info-icon"><Clock /></el-icon>
              <div class="info-content">
                <span class="info-label">Дата и время</span>
                <span class="info-value">{{ formatDateTime(attestation.startTime) }}</span>
              </div>
            </div>

            <div class="info-item">
              <el-icon class="info-icon"><Location /></el-icon>
              <div class="info-content">
                <span class="info-label">Место</span>
                <span class="info-value">{{ attestation.location }}</span>
              </div>
            </div>

            <div class="info-item">
              <el-icon class="info-icon"><Watch /></el-icon>
              <div class="info-content">
                <span class="info-label">Длительность</span>
                <span class="info-value">{{ attestation.duration }} мин.</span>
              </div>
            </div>
          </div>

          <el-divider class="divider" />

          <div class="participants-section">
            <span class="section-label">Участники:</span>
            <div class="participants-list">
              <div
                v-for="participant in attestation.participants"
                :key="participant.id"
                class="participant-item"
                :class="{ 'is-current-user': participant.id === currentUserId }"
              >
                <el-avatar
                  :size="24"
                  class="participant-avatar"
                  :style="{ backgroundColor: getAvatarColor(participant.name) }"
                >
                  {{ getInitials(participant.name) }}
                </el-avatar>
                <span class="participant-name">{{ participant.name }}</span>
                <div class="participant-badges">
                  <el-tag
                    v-if="participant.id === currentUserId"
                    size="small"
                    type="info"
                    effect="plain"
                    class="my-badge"
                  >
                    Я
                  </el-tag>
                  <el-tag
                    size="small"
                    :type="participant.role === 'ATTESTED' ? 'warning' : 'success'"
                    effect="plain"
                    class="participant-role"
                  >
                    {{ participant.role === 'ATTESTED' ? 'Аттестуемый' : 'Аттестующий' }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <el-button
            v-if="attestation.role === 'ATTESTOR'"
            type="primary"
            size="small"
            @click="openControlModal(attestation)"
          >
            <el-icon><Setting /></el-icon>
            Управление аттестацией
          </el-button>
          <el-button
            v-if="attestation.isPast"
            size="small"
            plain
            @click="viewResults(attestation.id)"
          >
            Результаты
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- Модальное окно: Управление аттестацией (Аттестующий) -->
    <el-dialog
      v-model="controlDialogVisible"
      title="Управление аттестацией"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedAttestation" class="modal-content">
        <div class="modal-section">
          <h4 class="modal-title">Тема аттестации</h4>
          <p class="modal-text">{{ selectedAttestation.topic }}</p>
        </div>

        <div class="modal-section">
          <h4 class="modal-title">Тип подтверждения</h4>
          <el-tag :type="getTypeTag(selectedAttestation.confirmationType)" size="small">
            {{ getTypeLabel(selectedAttestation.confirmationType) }}
          </el-tag>
        </div>

        <!-- Вопросы для аттестации с оценкой -->
        <div v-if="selectedAttestation.confirmationType === 'EXAM'" class="modal-section">
          <h4 class="modal-title">Вопросы и оценка</h4>
          <div class="grading-instruction">
            <el-icon><InfoFilled /></el-icon>
            <span
              >Отметьте статус ответа: <strong>Зачтено</strong> (зелёный),
              <strong>Не зачтено</strong> (красный), <strong>Не отвечал</strong> (серый)</span
            >
          </div>

          <div class="questions-grading-list">
            <div
              v-for="(question, questionIdx) in selectedAttestation.questions"
              :key="question.id || `question-${questionIdx}`"
              class="question-grading-item"
            >
              <div class="question-header">
                <span class="question-number">Вопрос {{ questionIdx + 1 }}</span>
                <div class="grading-buttons">
                  <el-tooltip content="Зачтено" placement="top">
                    <el-button
                      :type="getQuestionStatus(questionIdx) === 'passed' ? 'success' : 'info'"
                      size="small"
                      @click="setQuestionStatus(questionIdx, 'passed')"
                      :style="{
                        backgroundColor:
                          getQuestionStatus(questionIdx) === 'passed' ? '#67C23A' : '',
                        borderColor: getQuestionStatus(questionIdx) === 'passed' ? '#67C23A' : '',
                        color: getQuestionStatus(questionIdx) === 'passed' ? 'white' : '',
                      }"
                    >
                      Зачтено
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="Не зачтено" placement="top">
                    <el-button
                      :type="getQuestionStatus(questionIdx) === 'failed' ? 'danger' : 'info'"
                      size="small"
                      @click="setQuestionStatus(questionIdx, 'failed')"
                      :style="{
                        backgroundColor:
                          getQuestionStatus(questionIdx) === 'failed' ? '#F56C6C' : '',
                        borderColor: getQuestionStatus(questionIdx) === 'failed' ? '#F56C6C' : '',
                        color: getQuestionStatus(questionIdx) === 'failed' ? 'white' : '',
                      }"
                    >
                      Не зачтено
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="Не отвечал" placement="top">
                    <el-button
                      size="small"
                      @click="setQuestionStatus(questionIdx, 'not_answered')"
                      :style="{
                        backgroundColor:
                          getQuestionStatus(questionIdx) === 'not_answered' ? '#909399' : '',
                        borderColor:
                          getQuestionStatus(questionIdx) === 'not_answered' ? '#909399' : '',
                        color: getQuestionStatus(questionIdx) === 'not_answered' ? 'white' : '',
                      }"
                    >
                      Не отвечал
                    </el-button>
                  </el-tooltip>
                </div>
              </div>
              <div class="question-text">{{ question.text }}</div>
              <div class="ideal-answer">
                <span class="answer-label">Эталонный ответ:</span>
                <p class="answer-text">{{ question.idealAnswer }}</p>
              </div>
              <div class="question-status" :class="getQuestionStatus(questionIdx)">
                <span class="status-text">
                  {{ getStatusLabelByValue(getQuestionStatus(questionIdx)) }}
                </span>
              </div>
            </div>
          </div>

          <div class="grading-summary">
            <el-progress
              :percentage="gradingProgress"
              :color="gradingProgressColor"
              :format="formatGradingProgress"
            />
            <div class="grading-stats">
              <span class="stat-passed">✓ Зачтено: {{ passedCount }}</span>
              <span class="stat-failed">✗ Не зачтено: {{ failedCount }}</span>
              <span class="stat-not-answered">? Не отвечал: {{ notAnsweredCount }}</span>
            </div>
          </div>
        </div>

        <!-- Практическое задание с оценкой -->
        <div v-else-if="selectedAttestation.confirmationType === 'PRACTICE'" class="modal-section">
          <h4 class="modal-title">Практическое задание</h4>
          <div class="task-description">
            <p>{{ selectedAttestation.task?.description || 'Задание не указано' }}</p>
            <div v-if="selectedAttestation.task?.requirements" class="task-requirements">
              <p class="requirements-label">Требования:</p>
              <ul>
                <li
                  v-for="(req, reqIndex) in selectedAttestation.task.requirements"
                  :key="reqIndex"
                >
                  {{ req }}
                </li>
              </ul>
            </div>
            <div v-if="selectedAttestation.task?.criteria" class="task-criteria">
              <p class="criteria-label">Критерии оценки:</p>
              <ul>
                <li v-for="(crit, critIndex) in selectedAttestation.task.criteria" :key="critIndex">
                  {{ crit }}
                </li>
              </ul>
            </div>
          </div>

          <el-divider />

          <div class="task-grading">
            <h4 class="modal-title">Оценка выполнения</h4>
            <div class="grading-options">
              <el-radio-group v-model="taskGrade" size="large">
                <el-radio-button label="passed">
                  <el-icon style="margin-right: 4px"><Check /></el-icon>
                  Зачтено
                </el-radio-button>
                <el-radio-button label="failed">
                  <el-icon style="margin-right: 4px"><Close /></el-icon>
                  Не зачтено
                </el-radio-button>
              </el-radio-group>
            </div>
            <el-input
              v-model="taskComment"
              type="textarea"
              :rows="3"
              placeholder="Комментарий к оценке (необязательно)"
              style="margin-top: 12px"
            />
          </div>
        </div>

        <!-- Performance Review с оценкой -->
        <div v-else-if="selectedAttestation.confirmationType === 'REVIEW'" class="modal-section">
          <h4 class="modal-title">Метрики для оценки</h4>
          <el-table :data="selectedAttestation.metrics || []" style="width: 100%" border>
            <el-table-column prop="name" label="Показатель" width="200" />
            <el-table-column prop="target" label="Целевое значение" width="150" />
            <el-table-column prop="current" label="Текущее значение" width="150" />
            <el-table-column prop="status" label="Статус" width="120">
              <template #default="scope">
                <el-tag
                  :type="scope.row.status === 'achieved' ? 'success' : 'warning'"
                  size="small"
                >
                  {{ scope.row.status === 'achieved' ? 'Достигнуто' : 'В процессе' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Оценка" width="200">
              <template #default="scope">
                <el-radio-group v-model="scope.row.grade" size="small">
                  <el-radio label="passed">Зачтено</el-radio>
                  <el-radio label="failed">Не зачтено</el-radio>
                </el-radio-group>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <el-button @click="controlDialogVisible = false">Закрыть</el-button>
        <el-button type="primary" @click="saveGradingAndClose"> Сохранить оценку </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Clock,
  Location,
  Watch,
  Setting,
  Search,
  Check,
  Close,
  InfoFilled,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

dayjs.locale('ru')

const authStore = useAuthStore()
const currentUser = computed(() => authStore.currentUser)

// Поиск и фильтры
const searchQuery = ref('')
const filterStatus = ref<'all' | 'upcoming' | 'past'>('all')
const filterRole = ref<'all' | 'ATTESTED' | 'ATTESTOR'>('all')
const filterType = ref<'all' | 'EXAM' | 'PRACTICE' | 'REVIEW'>('all')
const dateRange = ref<[string, string] | null>(null)

// Быстрые выборы дат
const dateShortcuts = [
  {
    text: 'Ближайшие 7 дней',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return [dayjs(start).format('YYYY-MM-DD'), dayjs(end).format('YYYY-MM-DD')]
    },
  },
  {
    text: 'Этот месяц',
    value: () => {
      const start = dayjs().startOf('month').format('YYYY-MM-DD')
      const end = dayjs().endOf('month').format('YYYY-MM-DD')
      return [start, end]
    },
  },
  {
    text: 'Следующий месяц',
    value: () => {
      const start = dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD')
      const end = dayjs().add(1, 'month').endOf('month').format('YYYY-MM-DD')
      return [start, end]
    },
  },
]

// Модальные окна
const controlDialogVisible = ref(false)
const selectedAttestation = ref<any>(null)

// Оценка для вопросов - используем массив
const questionGrades = ref<Array<'passed' | 'failed' | 'not_answered'>>([])

// Оценка для практики
const taskGrade = ref<'passed' | 'failed'>('passed')
const taskComment = ref('')

// Вспомогательные computed
const currentUserId = computed(() => currentUser.value?.id || '1')
const currentUserFullName = computed(() => {
  const user = currentUser.value
  if (!user) return 'Иванов И.И.'
  return `${user.lastName} ${user.firstName.charAt(0)}.${user.middleName ? user.middleName.charAt(0) + '.' : ''}`
})

// Вычисляемые свойства для прогресса оценки
const gradingProgress = computed(() => {
  if (!selectedAttestation.value?.questions?.length) return 0
  const total = selectedAttestation.value.questions.length
  const answered = questionGrades.value.filter((g) => g && g !== 'not_answered').length
  return Math.round((answered / total) * 100)
})

const gradingProgressColor = computed(() => {
  if (gradingProgress.value === 100) return '#67C23A'
  if (gradingProgress.value > 50) return '#E6A23C'
  return '#F56C6C'
})

const passedCount = computed(() => questionGrades.value.filter((g) => g === 'passed').length)

const failedCount = computed(() => questionGrades.value.filter((g) => g === 'failed').length)

const notAnsweredCount = computed(
  () => questionGrades.value.filter((g) => g === 'not_answered').length,
)

const formatGradingProgress = (percentage: number) => {
  const total = selectedAttestation.value?.questions?.length || 0
  const answered = questionGrades.value.filter((g) => g && g !== 'not_answered').length
  return `${answered} из ${total} оценено`
}

// Mock-данные аттестаций
const mockAttestations = computed(() => [
  {
    id: '1',
    topic: 'Базы данных: Индексы и оптимизация',
    description: 'Проверка знаний по оптимизации запросов и работе с индексами в PostgreSQL',
    confirmationType: 'EXAM',
    startTime: dayjs().add(2, 'day').hour(14).minute(0).toDate(),
    duration: 45,
    location: 'Переговорная "Альфа", 3 этаж',
    role: 'ATTESTED',
    status: 'scheduled',
    isPast: false,
    isToday: false,
    isUpcoming: true,
    participants: [
      { id: currentUserId.value, name: currentUserFullName.value, role: 'ATTESTED' },
      { id: '2', name: 'Петров П.П.', role: 'ATTESTOR' },
    ],
  },
  {
    id: '2',
    topic: 'Frontend: Vue 3 Composition API',
    description: 'Оценка навыков работы с Composition API и реактивностью во Vue 3',
    confirmationType: 'PRACTICE',
    startTime: dayjs().add(5, 'day').hour(10).minute(0).toDate(),
    duration: 60,
    location: 'Zoom',
    role: 'ATTESTOR',
    status: 'scheduled',
    isPast: false,
    isToday: false,
    isUpcoming: true,
    participants: [
      { id: '3', name: 'Сидорова А.В.', role: 'ATTESTED' },
      { id: currentUserId.value, name: currentUserFullName.value, role: 'ATTESTOR' },
    ],
    task: {
      description:
        'Создать компонент с использованием Composition API для управления списком задач',
      requirements: [
        'Использовать setup() или <script setup>',
        'Реализовать реактивное хранение данных',
        'Добавить методы для добавления/удаления задач',
      ],
      criteria: [
        'Код соответствует best practices Vue 3',
        'Отсутствуют утечки реактивности',
        'Компонент переиспользуемый',
      ],
    },
  },
  {
    id: '3',
    topic: 'Архитектура: Микросервисы',
    description: 'Проверка понимания принципов микросервисной архитектуры',
    confirmationType: 'EXAM',
    startTime: dayjs().subtract(3, 'day').hour(15).minute(0).toDate(),
    duration: 45,
    location: 'Переговорная "Бета"',
    role: 'ATTESTED',
    status: 'completed',
    isPast: true,
    isToday: false,
    isUpcoming: false,
    participants: [
      { id: currentUserId.value, name: currentUserFullName.value, role: 'ATTESTED' },
      { id: '4', name: 'Козлов Д.С.', role: 'ATTESTOR' },
    ],
  },
  {
    id: '4',
    topic: 'KPI: Выполнение спринтов',
    description: 'Оценка эффективности работы по метрикам выполнения спринтов',
    confirmationType: 'REVIEW',
    startTime: dayjs().startOf('day').toDate(),
    duration: 30,
    location: 'Офис, кабинет 205',
    role: 'ATTESTED',
    status: 'in_progress',
    isPast: false,
    isToday: true,
    isUpcoming: false,
    participants: [
      { id: currentUserId.value, name: currentUserFullName.value, role: 'ATTESTED' },
      { id: '5', name: 'Новикова Е.А.', role: 'ATTESTOR' },
    ],
    metrics: [
      {
        name: 'Velocity',
        target: '25 story points',
        current: '23 story points',
        status: 'achieved',
        grade: 'passed',
      },
      {
        name: 'Sprint completion',
        target: '90%',
        current: '85%',
        status: 'pending',
        grade: 'passed',
      },
      { name: 'Bug rate', target: '< 5%', current: '3%', status: 'achieved', grade: 'passed' },
    ],
  },
  // Новая аттестация для аттестующего с типом EXAM
  {
    id: '5',
    topic: 'Проектирование схем БД',
    description: 'Проверка знаний по проектированию реляционных баз данных',
    confirmationType: 'EXAM',
    startTime: dayjs().add(4, 'day').hour(11).minute(0).toDate(),
    duration: 60,
    location: 'Zoom',
    role: 'ATTESTOR',
    status: 'scheduled',
    isPast: false,
    isToday: false,
    isUpcoming: true,
    participants: [
      { id: '6', name: 'Смирнов А.К.', role: 'ATTESTED' },
      { id: currentUserId.value, name: currentUserFullName.value, role: 'ATTESTOR' },
    ],
    questions: [
      {
        id: 'q1',
        text: 'Что такое нормализация и зачем она нужна?',
        idealAnswer:
          'Нормализация — это процесс организации данных в базе данных для уменьшения избыточности и улучшения целостности данных',
      },
      {
        id: 'q2',
        text: 'В чем разница между Clustered и Non-Clustered индексом?',
        idealAnswer:
          'Clustered индекс определяет физический порядок данных в таблице (может быть только один), Non-Clustered создает отдельную структуру с указателями на данные (может быть несколько)',
      },
      {
        id: 'q3',
        text: 'Опишите уровни изоляции транзакций',
        idealAnswer:
          'Read Uncommitted, Read Committed, Repeatable Read, Serializable — каждый следующий уровень обеспечивает большую изоляцию, но снижает производительность',
      },
    ],
  },
])

// Вычисляемые свойства
const filteredAttestations = computed(() => {
  let result = [...mockAttestations.value]

  // Поиск
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((a) => {
      const topicMatch = a.topic.toLowerCase().includes(query)
      const participantMatch = a.participants.some((p: any) => p.name.toLowerCase().includes(query))
      return topicMatch || participantMatch
    })
  }

  // Фильтр по статусу
  if (filterStatus.value === 'upcoming') {
    result = result.filter((a) => a.isUpcoming)
  } else if (filterStatus.value === 'past') {
    result = result.filter((a) => a.isPast)
  }

  // Фильтр по роли
  if (filterRole.value !== 'all') {
    result = result.filter((a) => a.role === filterRole.value)
  }

  // Фильтр по типу
  if (filterType.value !== 'all') {
    result = result.filter((a) => a.confirmationType === filterType.value)
  }

  // Фильтр по дате
  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    const [start, end] = dateRange.value
    result = result.filter((a) => {
      const attDate = dayjs(a.startTime)
      return (
        attDate.isAfter(dayjs(start).subtract(1, 'day')) &&
        attDate.isBefore(dayjs(end).add(1, 'day'))
      )
    })
  }

  // Сортировка
  return result.sort((a, b) => {
    if (a.isUpcoming && !b.isUpcoming) return -1
    if (!a.isUpcoming && b.isUpcoming) return 1
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  })
})

// Методы
const applyFilters = () => {
  // Фильтрация применяется автоматически через computed
}

const formatDateTime = (date: Date | string) => {
  return dayjs(date).format('DD.MM.YYYY, HH:mm')
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    scheduled: 'Запланирована',
    in_progress: 'Идёт',
    completed: 'Завершена',
    cancelled: 'Отменена',
  }
  return labels[status] || status
}

const getStatusType = (status: string) => {
  const types: Record<string, 'info' | 'primary' | 'success' | 'danger'> = {
    scheduled: 'info',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'info'
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    EXAM: 'Аттестация',
    PRACTICE: 'Практика',
    REVIEW: 'Perf. Review',
  }
  return labels[type] || type
}

const getTypeTag = (type: string) => {
  const types: Record<string, '' | 'warning' | 'success' | 'danger'> = {
    EXAM: '', // желтый (warning без effect)
    PRACTICE: 'success', // зеленый
    REVIEW: 'danger', // красный
  }
  return types[type] || ''
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getAvatarColor = (name: string) => {
  const colors = ['#4A2C6D', '#6A4C8D', '#8B6FA8', '#A084B8']
  const index = name.length % colors.length
  return colors[index]
}

const getQuestionStatus = (index: number): 'passed' | 'failed' | 'not_answered' => {
  return questionGrades.value[index] || 'not_answered'
}

const setQuestionStatus = (index: number, status: 'passed' | 'failed' | 'not_answered') => {
  const newGrades = [...questionGrades.value]
  newGrades[index] = status
  questionGrades.value = newGrades
}

const getStatusLabelByValue = (value: 'passed' | 'failed' | 'not_answered'): string => {
  const labels = {
    passed: 'Зачтено',
    failed: 'Не зачтено',
    not_answered: 'Не отвечал',
  }
  return labels[value]
}

const openControlModal = (attestation: any) => {
  selectedAttestation.value = attestation
  // Инициализируем массив нужной длины
  const questionCount = attestation.questions?.length || 0
  questionGrades.value = Array.from(
    { length: questionCount },
    () => 'not_answered' as 'passed' | 'failed' | 'not_answered',
  )
  taskGrade.value = 'passed'
  taskComment.value = ''
  controlDialogVisible.value = true
}

const saveGradingAndClose = () => {
  if (!selectedAttestation.value) return

  // Валидация: все вопросы должны быть оценены
  if (selectedAttestation.value.confirmationType === 'EXAM') {
    const totalQuestions = selectedAttestation.value.questions.length
    const gradedQuestions = questionGrades.value.filter((g) => g !== 'not_answered').length
    if (gradedQuestions < totalQuestions) {
      ElMessage.warning(`Оцените все вопросы (${gradedQuestions} из ${totalQuestions})`)
      return
    }
  }

  ElMessage.success('Оценка сохранена')
  controlDialogVisible.value = false
  // Здесь будет отправка данных на сервер
}

const viewResults = (id: string) => {
  ElMessage.info(`Просмотр результатов: ${id}`)
}
</script>

<style scoped>
.calendar-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #f0f2f5;
  min-height: 100vh;
}

/* Заголовок */
.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 4px;
  font-size: 28px;
  font-weight: 700;
  color: #333333;
}

.page-subtitle {
  margin: 0;
  font-size: 15px;
  color: #666666;
}

/* Поиск и фильтры */
.filters-bar {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
}

.search-row {
  margin-bottom: 16px;
  width: 100%;
}

.search-input {
  width: 100%;
}

.filters-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
}

.radio-group-wrapper {
  display: inline-flex;
  flex-shrink: 0;
}

:deep(.el-radio-button__inner) {
  padding: 8px 12px !important;
  font-size: 13px !important;
}

.filter-select {
  width: 120px !important;
  flex-shrink: 0;
}

.date-range-picker {
  width: 240px !important;
  flex-shrink: 0;
}

:deep(.el-date-editor.el-input__inner) {
  padding: 0 10px;
}

:deep(.el-range-input) {
  font-size: 13px;
}

/* Deep styles для радио-кнопок */
:deep(.el-radio-button__inner) {
  background-color: #f5f5f5 !important;
  border: 1px solid #d9d9d9 !important;
  color: #666 !important;
  box-shadow: none !important;
  margin-left: 0 !important; /* Убираем наложение */
}

:deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-left: 1px solid #d9d9d9 !important;
  border-radius: 4px 0 0 4px !important; /* Скругление только слева */
}

:deep(.el-radio-button:nth-child(2) .el-radio-button__inner) {
  border-left: none !important; /* Убираем левую границу у средней кнопки */
  border-radius: 0 !important; /* Убираем все скругления */
}

:deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-left: none !important; /* Убираем левую границу у последней кнопки */
  border-radius: 0 4px 4px 0 !important; /* Скругление только справа */
}

:deep(.el-radio-button__inner:hover) {
  color: #4a2c6d !important;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #e0e0e0 !important;
  border-color: #999 !important;
  color: #333 !important;
  box-shadow: none !important;
}

/* Deep styles для селектов */
:deep(.el-select.is-focus .el-input__inner) {
  border-color: #d9d9d9 !important;
  box-shadow: none !important;
}

:deep(.el-select.is-focus) {
  --el-select-input-focus-border-color: #d9d9d9 !important;
}

:deep(.el-select .el-input.is-focus .el-input__inner) {
  border-color: #d9d9d9 !important;
}

:deep(.el-select__caret) {
  color: #666 !important;
}

:deep(.el-select.is-focus .el-select__caret) {
  color: #666 !important;
}

:deep(.el-input__inner) {
  color: #666 !important;
}

:deep(.el-input__inner:focus) {
  color: #666 !important;
  border-color: #d9d9d9 !important;
  box-shadow: none !important;
}

:deep(.el-select .el-input__inner) {
  color: #666 !important;
}

:deep(.el-select .el-input__inner:focus) {
  color: #666 !important;
  border-color: #d9d9d9 !important;
  box-shadow: none !important;
}

/* CSS Variables для Element Plus */
:deep(.el-select) {
  --el-select-input-focus-border-color: #d9d9d9 !important;
  --el-color-primary: #666 !important;
}

/* Убираем синий цвет у всего компонента */
:deep(.el-select.is-focus),
:deep(.el-select.is-focus *),
:deep(.el-select:focus),
:deep(.el-select:focus *) {
  color: #666 !important;
  border-color: #d9d9d9 !important;
}
/* Список аттестаций */
.attestations-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.attestation-card {
  transition: all 0.3s ease;
  border-left: 4px solid #4a2c6d;
}

.attestation-card.is-past {
  border-left-color: #909399;
  opacity: 0.85;
}

.attestation-card.is-today {
  border-left-color: #67c23a;
  box-shadow: 0 4px 12px rgba(74, 44, 109, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.card-title-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.type-tag,
.status-tag {
  font-weight: 500;
}

.attestation-topic {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333333;
}

.card-body {
  padding: 0 0 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.info-icon {
  font-size: 20px;
  color: #4a2c6d;
  margin-top: 2px;
  flex-shrink: 0;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: #666666;
}

.info-value {
  font-size: 14px;
  color: #333333;
  font-weight: 500;
}

.divider {
  margin: 16px 0 !important;
}

.participants-section {
  padding-top: 8px;
}

.section-label {
  display: block;
  font-size: 13px;
  color: #666666;
  margin-bottom: 10px;
  font-weight: 500;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: #f8f4fc;
  border-radius: 6px;
}

.participant-item.is-current-user {
  background: #e8e0f0;
  border: 1px solid #d0c0e0;
}

.participant-avatar {
  flex-shrink: 0;
}

.participant-name {
  flex: 1;
  font-size: 14px;
  color: #333333;
  font-weight: 500;
}

.participant-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.my-badge {
  font-size: 11px;
  padding: 0 6px;
  height: 22px;
  line-height: 22px;
}

.participant-role {
  font-size: 11px;
  padding: 0 6px;
}

.card-footer {
  display: flex;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  justify-content: flex-end;
}

/* Модальные окна */
.modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}

.modal-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #333333;
}

.modal-text {
  margin: 0;
  font-size: 14px;
  color: #666666;
  line-height: 1.6;
}

/* Оценка вопросов */
.grading-instruction {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f0f7ff;
  border-radius: 6px;
  font-size: 13px;
  color: #333333;
}

.grading-instruction .el-icon {
  color: #409eff;
  font-size: 16px;
}

.questions-grading-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-grading-item {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  transition: all 0.3s ease;
}

.question-grading-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}

.question-number {
  font-weight: 600;
  color: #4a2c6d;
  font-size: 14px;
}

.grading-buttons {
  display: flex;
  gap: 8px;
}

.grading-buttons .el-button {
  min-width: 100px;
}

.question-text {
  font-size: 14px;
  color: #333333;
  font-weight: 500;
  margin-bottom: 10px;
}

.ideal-answer {
  padding: 10px;
  background: #f8f4fc;
  border-radius: 6px;
  margin-bottom: 10px;
}

.answer-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #4a2c6d;
  margin-bottom: 4px;
}

.answer-text {
  margin: 0;
  font-size: 13px;
  color: #666666;
  line-height: 1.5;
}

.question-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.question-status.passed {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #67c23a;
}

.question-status.failed {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #f56c6c;
}

.question-status.not_answered {
  background: #f5f7fa;
  color: #909399;
  border: 1px solid #909399;
}

.status-text {
  display: flex;
  align-items: center;
  gap: 4px;
}

.grading-summary {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.grading-stats {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  font-size: 13px;
}

.stat-passed {
  color: #67c23a;
  font-weight: 500;
}

.stat-failed {
  color: #f56c6c;
  font-weight: 500;
}

.stat-not-answered {
  color: #909399;
  font-weight: 500;
}

/* Оценка практики */
.task-description {
  padding: 12px;
  background: #f8f4fc;
  border-radius: 6px;
}

.task-description p {
  margin: 0 0 12px;
  font-size: 14px;
  color: #333333;
  line-height: 1.6;
}

.task-requirements,
.task-criteria {
  margin-top: 12px;
}

.requirements-label,
.criteria-label {
  font-size: 13px;
  font-weight: 600;
  color: #4a2c6d;
  margin: 0 0 6px;
}

.task-requirements ul,
.task-criteria ul {
  margin: 0;
  padding-left: 20px;
}

.task-requirements li,
.task-criteria li {
  font-size: 13px;
  color: #666666;
  margin-bottom: 4px;
  line-height: 1.5;
}

.task-grading {
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.grading-options {
  margin-top: 12px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .filters-row {
    flex-wrap: wrap;
  }

  .radio-group-wrapper,
  .filter-select,
  .date-range-picker {
    flex-shrink: 1;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-footer {
    flex-wrap: wrap;
  }

  .question-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .grading-stats {
    flex-wrap: wrap;
    gap: 10px;
  }
}

/* Deep styles */
:deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: none;
  background: transparent;
}

:deep(.el-card__body) {
  padding: 0 20px 20px;
}

:deep(.el-empty) {
  padding: 40px 0;
}

:deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-date-editor.el-input) {
  width: 100%;
}

/* Стили для тегов типов */
:deep(.el-tag--plain.el-tag--warning) {
  background-color: #fdf6ec;
  border-color: #faad14;
  color: #faad14;
}

:deep(.el-tag--plain.el-tag--success) {
  background-color: #f0f9eb;
  border-color: #67c23a;
  color: #67c23a;
}

:deep(.el-tag--plain.el-tag--danger) {
  background-color: #fef0f0;
  border-color: #f56c6c;
  color: #f56c6c;
}

/* Убираем синее выделение у радио-кнопок, делаем нейтральным серым */
:deep(.el-radio-button__inner) {
  background-color: #f5f5f5 !important;
  border: 1px solid #d9d9d9 !important;
  color: #666 !important;
  box-shadow: none !important;
  font-size: 13px;
  padding: 8px 16px;
}

:deep(.el-radio-button__inner:hover) {
  color: #4a2c6d !important;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #e0e0e0 !important;
  border-color: #999 !important;
  color: #333 !important;
  box-shadow: none !important;
}

:deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-left: 1px solid #d9d9d9 !important;
  border-radius: 4px 0 0 4px !important;
}

:deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 4px 4px 0 !important;
}

:deep(.el-radio-button__inner::before) {
  display: none;
}
</style>
