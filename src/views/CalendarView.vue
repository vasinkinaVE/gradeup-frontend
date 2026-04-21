<template>
  <div class="calendar-page">
    <!-- Заголовок -->
    <div class="page-header">
      <h1 class="page-title">Календарь аттестаций</h1>
      <p class="page-subtitle">Все аттестации, в которых вы участвуете</p>
    </div>

    <!-- Фильтры -->
    <div class="filters-bar">
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

    <!-- Список аттестаций через MeetingCard -->
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
        shadow="never"
        :class="{ 'is-past': attestation.isPast, 'is-today': attestation.isToday }"
      >
        <MeetingCard
          :meeting="mapToMeeting(attestation)"
          :show-footer="true"
          @open-control="openControlModal"
          @view-results="viewResults"
        />
      </el-card>
    </div>

    <!-- Модальное окно: Управление аттестацией -->
    <el-dialog
      v-model="controlDialogVisible"
      title="Управление аттестацией"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedAttestation" class="modal-content">
        <!-- ... содержимое модалки остаётся без изменений ... -->
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
                <span class="status-text">{{
                  getStatusLabelByValue(getQuestionStatus(questionIdx))
                }}</span>
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

        <!-- Практическое задание -->
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
                <el-radio-button label="passed"
                  ><el-icon style="margin-right: 4px"><Check /></el-icon>Зачтено</el-radio-button
                >
                <el-radio-button label="failed"
                  ><el-icon style="margin-right: 4px"><Close /></el-icon>Не зачтено</el-radio-button
                >
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

        <!-- Performance Review -->
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
        <el-button type="primary" @click="saveGradingAndClose">Сохранить оценку</el-button>
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
import MeetingCard, { type Meeting } from '@/components/common/MeetingCard.vue'

dayjs.locale('ru')

const authStore = useAuthStore()
const currentUser = computed(() => authStore.currentUser)

// Фильтры
const searchQuery = ref('')
const filterStatus = ref<'all' | 'upcoming' | 'past'>('all')
const filterRole = ref<'all' | 'ATTESTED' | 'ATTESTOR'>('all')
const filterType = ref<'all' | 'EXAM' | 'PRACTICE' | 'REVIEW'>('all')
const dateRange = ref<[string, string] | null>(null)

// Модалки
const controlDialogVisible = ref(false)
const selectedAttestation = ref<any>(null)
const questionGrades = ref<Array<'passed' | 'failed' | 'not_answered'>>([])
const taskGrade = ref<'passed' | 'failed'>('passed')
const taskComment = ref('')

// Вспомогательные
const currentUserId = computed(() => currentUser.value?.id || '1')
const currentUserFullName = computed(() => {
  const user = currentUser.value
  if (!user) return 'Иванов И.И.'
  return `${user.lastName} ${user.firstName.charAt(0)}.${user.middleName ? user.middleName.charAt(0) + '.' : ''}`
})

// Прогресс оценки
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

// Mapper: конвертируем данные календаря в формат MeetingCard
const mapToMeeting = (attestation: any): Meeting => {
  return {
    id: attestation.id,
    skill_name: attestation.topic,
    confirmation_type: attestation.confirmationType,
    status: attestation.status,
    date_time: attestation.startTime,
    location: attestation.location,
    duration: attestation.duration,
    description: attestation.description,
    materials: [], // Можно добавить поле materials в данные календаря при необходимости
    participants: attestation.participants.map((p: any) => ({
      id: p.id,
      full_name: p.name,
      role: p.role === 'ATTESTED' ? 'Аттестуемый' : 'Аттестующий',
      is_current_user: p.id === currentUserId.value,
    })),
    role: attestation.role,
    isPast: attestation.isPast,
    isToday: attestation.isToday,
    isUpcoming: attestation.isUpcoming,
  }
}

// Mock-данные
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
    status: 'scheduled',
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

// Фильтрация
const filteredAttestations = computed(() => {
  let result = [...mockAttestations.value]

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((a) => {
      const topicMatch = a.topic.toLowerCase().includes(query)
      const participantMatch = a.participants.some((p: any) => p.name.toLowerCase().includes(query))
      return topicMatch || participantMatch
    })
  }

  if (filterStatus.value === 'upcoming') result = result.filter((a) => a.isUpcoming)
  else if (filterStatus.value === 'past') result = result.filter((a) => a.isPast)

  if (filterRole.value !== 'all') result = result.filter((a) => a.role === filterRole.value)
  if (filterType.value !== 'all')
    result = result.filter((a) => a.confirmationType === filterType.value)

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

  return result.sort((a, b) => {
    if (a.isUpcoming && !b.isUpcoming) return -1
    if (!a.isUpcoming && b.isUpcoming) return 1
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  })
})

// Методы
const applyFilters = () => {}
const formatDateTime = (date: Date | string) => dayjs(date).format('DD.MM.YYYY, HH:mm')

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
    EXAM: '',
    PRACTICE: 'success',
    REVIEW: 'danger',
  }
  return types[type] || ''
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
const getAvatarColor = (name: string) => {
  const colors = ['#4A2C6D', '#6A4C8D', '#8B6FA8', '#A084B8']
  return colors[name.length % colors.length]
}

const getQuestionStatus = (index: number) => questionGrades.value[index] || 'not_answered'
const setQuestionStatus = (index: number, status: 'passed' | 'failed' | 'not_answered') => {
  const newGrades = [...questionGrades.value]
  newGrades[index] = status
  questionGrades.value = newGrades
}

const getStatusLabelByValue = (value: 'passed' | 'failed' | 'not_answered') => {
  const labels = { passed: 'Зачтено', failed: 'Не зачтено', not_answered: 'Не отвечал' }
  return labels[value]
}

const openControlModal = (meeting: Meeting) => {
  // Находим оригинальную аттестацию по ID
  const attestation = mockAttestations.value.find((a) => a.id === meeting.id)
  if (!attestation) return

  selectedAttestation.value = attestation
  const questionCount = attestation.questions?.length || 0
  questionGrades.value = Array.from({ length: questionCount }, () => 'not_answered' as const)
  taskGrade.value = 'passed'
  taskComment.value = ''
  controlDialogVisible.value = true
}

const saveGradingAndClose = () => {
  if (!selectedAttestation.value) return
  if (selectedAttestation.value.confirmationType === 'EXAM') {
    const total = selectedAttestation.value.questions.length
    const graded = questionGrades.value.filter((g) => g !== 'not_answered').length
    if (graded < total) {
      ElMessage.warning(`Оцените все вопросы (${graded} из ${total})`)
      return
    }
  }
  ElMessage.success('Оценка сохранена')
  controlDialogVisible.value = false
}

const viewResults = (id: string) => ElMessage.info(`Просмотр результатов: ${id}`)

// Быстрые даты
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
    value: () => [
      dayjs().startOf('month').format('YYYY-MM-DD'),
      dayjs().endOf('month').format('YYYY-MM-DD'),
    ],
  },
  {
    text: 'Следующий месяц',
    value: () => [
      dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD'),
      dayjs().add(1, 'month').endOf('month').format('YYYY-MM-DD'),
    ],
  },
]
</script>

<style scoped>
.calendar-page {
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
  background-color: var(--background);
  min-height: 100vh;
  font-family: var(--font-family);
}

/* Заголовок */
.page-header {
  margin-bottom: var(--spacing-lg);
}

.page-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text);
  font-family: var(--font-family);
}

.page-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--gray);
  font-weight: var(--font-weight-normal);
  font-family: var(--font-family);
}

/* Фильтры */
.filters-bar {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: #fff;
  border-radius: 8px; /* Было: var(--radius-md) = 12px */
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
}

.search-row {
  margin-bottom: var(--spacing-sm);
  width: 100%;
}

.search-input {
  width: 100%;
}

.filters-row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
}

.radio-group-wrapper {
  display: inline-flex;
  flex-shrink: 0;
}

.filter-select {
  width: 120px !important;
  flex-shrink: 0;
}

.date-range-picker {
  width: 240px !important;
  flex-shrink: 0;
}

/* Список аттестаций */
.attestations-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.attestation-card {
  transition: none !important;
  box-shadow: none !important;
  border-radius: 6px; /* Было: var(--radius-md) = 12px */
}

.attestation-card:hover {
  box-shadow: none !important;
  transform: none !important;
}

.attestation-card.is-past {
  opacity: 0.85;
}

:deep(.el-card__header) {
  padding: 0;
  border-bottom: none;
  background: transparent;
}

:deep(.el-card__body) {
  padding: 0;
}

/* Карточка встречи (внутри MeetingCard) */
:deep(.meeting-card) {
  font-family: var(--font-family);
  border-radius: 6px !important;
}

:deep(.meeting-title) {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  font-family: var(--font-family);
}

:deep(.info-label) {
  font-size: 13px;
  color: var(--gray);
  font-weight: var(--font-weight-normal);
  font-family: var(--font-family);
}

:deep(.info-value) {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
}

:deep(.participants-title) {
  font-size: 14px;
  color: var(--gray);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
}

:deep(.participant-name) {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
}

:deep(.participant-role) {
  font-size: 13px;
  color: var(--text);
  font-weight: var(--font-weight-normal);
  font-family: var(--font-family);
}

:deep(.status-badge) {
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--gray);
  font-family: var(--font-family);
  border-radius: 4px !important; /* Было: var(--radius-sm) = 8px */
}

:deep(.confirmation-badge) {
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  border-radius: 4px !important;
}

/* Модальные окна */
:deep(.el-dialog__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid #f0f0f0;
  font-family: var(--font-family);
}

:deep(.el-dialog__body) {
  padding: var(--spacing-lg);
  font-family: var(--font-family);
}

:deep(.el-dialog__footer) {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-top: 1px solid #f0f0f0;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  max-height: 70vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
  font-family: var(--font-family);
}

.modal-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  font-family: var(--font-family);
}

.modal-text {
  margin: 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  font-weight: var(--font-weight-normal);
  font-family: var(--font-family);
}

/* Оценка вопросов */
.grading-instruction {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: #f0f7ff;
  border-radius: 6px; /* Было: var(--radius-sm) = 8px */
  font-size: 13px;
  color: var(--text);
  font-weight: var(--font-weight-normal);
  font-family: var(--font-family);
}

.grading-instruction :deep(.el-icon) {
  color: var(--primary);
  font-size: 16px;
}

.questions-grading-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.question-grading-item {
  padding: var(--spacing-md);
  border: 1px solid #e0e0e0;
  border-radius: 6px; /* Было: var(--radius-md) = 12px */
  background: #fff;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.question-number {
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
  font-size: 14px;
  font-family: var(--font-family);
}

.grading-buttons {
  display: flex;
  gap: var(--spacing-xs);
}

.grading-buttons :deep(.el-button) {
  min-width: 100px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
  border-radius: 4px;
}

.question-text {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-sm);
  font-family: var(--font-family);
}

.ideal-answer {
  padding: var(--spacing-sm);
  background: var(--background);
  border-radius: 4px; /* Было: var(--radius-sm) = 8px */
  margin-bottom: var(--spacing-sm);
}

.answer-label {
  display: block;
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--gray);
  margin-bottom: var(--spacing-xs);
  font-family: var(--font-family);
}

.answer-text {
  margin: 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  font-weight: var(--font-weight-normal);
  font-family: var(--font-family);
}

.question-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px; /* Оставляем 12px для "таблеток" — это уместно */
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
}

.question-status.passed {
  background: #f0f9eb;
  color: var(--success);
  border: 1px solid var(--success);
}

.question-status.failed {
  background: #fef0f0;
  color: var(--danger);
  border: 1px solid var(--danger);
}

.question-status.not_answered {
  background: #f5f7fa;
  color: var(--gray);
  border: 1px solid var(--gray);
}

.grading-summary {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: 6px;
}

.grading-stats {
  display: flex;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-sm);
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family);
}

.stat-passed {
  color: var(--success);
}

.stat-failed {
  color: var(--danger);
}

.stat-not-answered {
  color: var(--gray);
}

/* Практическое задание */
.task-description {
  padding: var(--spacing-sm);
  background: var(--background);
  border-radius: 4px;
}

.task-description p {
  margin: 0 0 var(--spacing-sm);
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  font-weight: var(--font-weight-normal);
  font-family: var(--font-family);
}

.task-requirements,
.task-criteria {
  margin-top: var(--spacing-sm);
}

.requirements-label,
.criteria-label {
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
  margin: 0 0 var(--spacing-xs);
  font-family: var(--font-family);
}

.task-requirements ul,
.task-criteria ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.task-requirements li,
.task-criteria li {
  font-size: 14px;
  color: var(--text);
  margin-bottom: var(--spacing-xs);
  line-height: 1.5;
  font-weight: var(--font-weight-normal);
  font-family: var(--font-family);
}

.task-grading {
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: 6px;
}

.grading-options {
  margin-top: var(--spacing-sm);
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

  .question-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .grading-stats {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
}

/* Deep styles для фильтров */
:deep(.el-radio-button__inner) {
  background-color: #f5f5f5 !important;
  border: 1px solid #d9d9d9 !important;
  color: var(--text) !important;
  box-shadow: none !important;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  padding: 8px 16px;
  font-family: var(--font-family);
  border-radius: 4px !important;
}

:deep(.el-radio-button__inner:hover) {
  color: var(--primary) !important;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #e0e0e0 !important;
  border-color: var(--gray) !important;
  color: var(--text) !important;
  box-shadow: none !important;
}

:deep(.el-select.is-focus .el-input__inner) {
  border-color: #d9d9d9 !important;
  box-shadow: none !important;
}

:deep(.el-select) {
  --el-select-input-focus-border-color: #d9d9d9 !important;
  --el-color-primary: var(--primary) !important;
  font-family: var(--font-family);
}

:deep(.el-tag--plain.el-tag--warning) {
  background-color: #fdf6ec;
  border-color: var(--warning);
  color: var(--warning);
  border-radius: 4px;
}

:deep(.el-tag--plain.el-tag--success) {
  background-color: #f0f9eb;
  border-color: var(--success);
  color: var(--success);
  border-radius: 4px;
}

:deep(.el-tag--plain.el-tag--danger) {
  background-color: #fef0f0;
  border-color: var(--danger);
  color: var(--danger);
  border-radius: 4px;
}

:deep(.el-button) {
  font-family: var(--font-family);
  border-radius: 4px !important;
}

:deep(.el-input__inner) {
  font-family: var(--font-family);
  border-radius: 4px !important;
}
</style>
