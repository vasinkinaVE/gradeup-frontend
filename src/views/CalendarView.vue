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
            <el-radio-button value="all">Все</el-radio-button>
            <el-radio-button value="upcoming">Предстоящие</el-radio-button>
            <el-radio-button value="past">Прошедшие</el-radio-button>
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
        description="Нет встреч по выбранным фильтрам"
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
          :can-grade="canGradeMeeting"
          @view-results="openResultsModal"
          @open-grading="openGradingModal"
        />
      </el-card>
    </div>

    <!-- Модальное окно: Результаты аттестации -->
    <el-dialog
      v-model="resultsDialogVisible"
      title="Результаты аттестации"
      width="500px"
      :close-on-click-modal="true"
    >
      <div v-if="selectedResultMeeting" class="results-content">
        <div class="result-header">
          <h4 class="result-title">{{ selectedResultMeeting.skill_name }}</h4>
          <el-tag
            :type="getTypeTag(selectedResultMeeting.confirmation_type)"
            size="small"
            effect="plain"
          >
            {{ getMeetingTypeText(selectedResultMeeting.confirmation_type) }}
          </el-tag>
        </div>

        <div class="result-row">
          <span class="result-label">Дата завершения:</span>
          <span class="result-value">
            {{
              selectedResultMeeting.result?.date
                ? formatDateTime(selectedResultMeeting.result.date)
                : '—'
            }}
          </span>
        </div>

        <div class="result-row">
          <span class="result-label">Статус:</span>
          <el-tag :type="selectedResultMeeting.result?.passed ? 'success' : 'danger'" size="small">
            {{ selectedResultMeeting.result?.passed ? 'Зачтено' : 'Не зачтено' }}
          </el-tag>
        </div>

        <div v-if="selectedResultMeeting.result?.score !== undefined" class="result-row">
          <span class="result-label">Оценка:</span>
          <span class="result-value score">{{ selectedResultMeeting.result.score }}%</span>
        </div>

        <div v-if="selectedResultMeeting.result?.feedback" class="result-section">
          <span class="result-label">Комментарий аттестующего:</span>
          <p class="result-feedback">{{ selectedResultMeeting.result.feedback }}</p>
        </div>

        <div v-if="!selectedResultMeeting.result" class="no-results">
          Результаты ещё не опубликованы. Пожалуйста, дождитесь проверки.
        </div>
      </div>
      <template #footer>
        <el-button @click="resultsDialogVisible = false">Закрыть</el-button>
      </template>
    </el-dialog>

    <!-- Модальное окно: Оценка аттестации (только для руководителя) -->
    <el-dialog
      v-model="gradingDialogVisible"
      title="Оценка аттестации"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedGradingMeeting" class="grading-content">
        <!-- Информация о встрече -->
        <div class="grading-header">
          <h4>{{ selectedGradingMeeting.skill_name }}</h4>
          <el-tag size="small" effect="plain">
            {{ getMeetingTypeText(selectedGradingMeeting.confirmation_type) }}
          </el-tag>
        </div>

        <!-- Аттестуемый -->
        <div class="grading-row">
          <span class="grading-label">Аттестуемый:</span>
          <span class="grading-value">
            {{
              selectedGradingMeeting.participants.find((p) => p.role === 'Аттестуемый')?.full_name
            }}
          </span>
        </div>

        <!-- ✅ Вопросы для оценки (для всех типов встреч) -->
        <div class="grading-questions">
          <h5>Вопросы для оценки</h5>
          <div v-for="idx in 3" :key="idx" class="grading-question">
            <p class="question-text">Вопрос {{ idx }}</p>
            <div class="question-grade">
              <span class="grade-label">Оценка:</span>
              <el-radio-group v-model="questionGrades[idx - 1]" size="small">
                <el-radio value="passed" border>Зачет</el-radio>
                <el-radio value="failed" border>Незачет</el-radio>
              </el-radio-group>
            </div>
          </div>
        </div>

        <!-- Практика / Perf. Review -->
        <div class="grading-simple">
          <el-form label-position="top">
            <el-form-item label="Комментарий">
              <el-input
                v-model="gradeComment"
                type="textarea"
                :rows="3"
                placeholder="Комментарий для сотрудника (необязательно)"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <el-button @click="gradingDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="submitGrade">Сохранить оценку</el-button>
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
  Edit,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import MeetingCard, { type Meeting } from '@/components/common/MeetingCard.vue'

dayjs.locale('ru')

const authStore = useAuthStore()

// ✅ ИСПРАВЛЕНО: authStore.user (не authStore.currentUser)
const currentUser = computed(() => authStore.user)

// ✅ Проверка роли: руководитель
const canGradeMeeting = computed(() => {
  const role = currentUser.value?.role_name // ✅ currentUser.value, не authStore.user.value
  if (!role) return false
  const normalizedRole = role.trim().toLowerCase()
  const allowedRoles = ['supervisor', 'manager', 'admin', 'spo', 'руководитель']
  return allowedRoles.includes(normalizedRole)
})

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

// Модалка результатов
const resultsDialogVisible = ref(false)
const selectedResultMeeting = ref<Meeting | null>(null)

// ✅ Модалка оценки (только для руководителя)
const gradingDialogVisible = ref(false)
const selectedGradingMeeting = ref<Meeting | null>(null)
const simpleGrade = ref<'passed' | 'failed'>('passed')
const gradeComment = ref('')

// Вспомогательные — ✅ ИСПРАВЛЕНО: используем currentUser.value
const currentUserId = computed(() => currentUser.value?.id || '1')

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

// ✅ Вычисляемые свойства для оценки (EXAM)
const totalQuestions = computed(() => selectedGradingMeeting.value?.questions?.length || 0)

const overallScore = computed(() => {
  if (totalQuestions.value === 0) return 0
  return Math.round((passedCount.value / totalQuestions.value) * 100)
})

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
    materials: [],
    participants: attestation.participants.map((p: any) => ({
      id: p.id,
      full_name: p.name,
      role: p.role === 'ATTESTED' ? 'Аттестуемый' : 'Аттестующий',
      // ✅ ИСПРАВЛЕНО: currentUserId.value (который использует currentUser.value)
      is_current_user: p.id === currentUserId.value,
    })),
    // ✅ ИСПРАВЛЕНО: определяем роль через currentUserId.value
    role: attestation.participants.find((p: any) => p.id === currentUserId.value)?.role,
    isPast: attestation.isPast,
    isToday: attestation.isToday,
    isUpcoming: attestation.isUpcoming,
    result: attestation.result,
    questions: attestation.questions,
  }
}

// ✅ Mock-данные: 3 примера для разных сценариев
const mockAttestations = computed(() => [
  // 🔹 Пример 1: Текущий пользователь — аттестуемый, встреча завершена → кнопка "Результаты"
  {
    id: '1',
    topic: 'Базы данных: Индексы и оптимизация',
    description: 'Проверка знаний по оптимизации запросов и работе с индексами в PostgreSQL',
    confirmationType: 'EXAM',
    startTime: dayjs().subtract(3, 'day').hour(15).minute(0).toDate(),
    duration: 45,
    location: 'Переговорная "Альфа", 3 этаж',
    status: 'completed',
    isPast: true,
    isToday: false,
    isUpcoming: false,
    participants: [
      { id: currentUserId.value, name: 'Текущий пользователь', role: 'ATTESTED' },
      { id: 'emp2', name: 'Петров П.П.', role: 'ATTESTOR' },
    ],
    result: {
      score: 85,
      feedback: 'Хорошая работа! Рекомендую углубить знания по индексам.',
      passed: true,
      date: '2026-04-20T16:30:00',
    },
  },

  // 🔹 Пример 2: Текущий пользователь — аттестующий
  {
    id: '2',
    topic: 'Frontend: Vue 3 Composition API',
    description: 'Оценка навыков работы с Composition API и реактивностью во Vue 3',
    confirmationType: 'PRACTICE',
    startTime: dayjs().add(5, 'day').hour(10).minute(0).toDate(),
    duration: 60,
    location: 'Zoom',
    status: 'scheduled',
    isPast: false,
    isToday: false,
    isUpcoming: true,
    participants: [
      { id: 'emp3', name: 'Сидорова А.В.', role: 'ATTESTED' },
      { id: currentUserId.value, name: 'Текущий пользователь', role: 'ATTESTOR' },
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

  // 🔹 Пример 3: Текущий пользователь — руководитель (НЕ участник), может оценить
  // ✅ Эта встреча видна ТОЛЬКО supervisor
  {
    id: '3',
    topic: 'Проектирование схем БД',
    description: 'Проверка знаний по проектированию реляционных баз данных',
    confirmationType: 'EXAM',
    startTime: dayjs().add(2, 'day').hour(14).minute(0).toDate(),
    duration: 60,
    location: 'Zoom',
    status: 'scheduled',
    isPast: false,
    isToday: false,
    isUpcoming: true,
    participants: [
      { id: 'emp7', name: 'Смирнов А.К.', role: 'ATTESTED' },
      { id: 'emp8', name: 'Васильева М.И.', role: 'ATTESTOR' },
      // ✅ Текущего пользователя НЕТ в списке участников
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

  // ✅ Если текущий пользователь НЕ руководитель, скрываем встречи, где он не участник
  if (!canGradeMeeting.value) {
    result = result.filter((a) => {
      const isParticipant = a.participants.some((p: any) => p.id === currentUserId.value)
      return isParticipant
    })
  }

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
    completed: 'Завершена',
    cancelled: 'Отменена',
  }
  return labels[status] || status
}

const getStatusType = (status: string) => {
  const types: Record<string, 'info' | 'primary' | 'success' | 'danger'> = {
    scheduled: 'info',
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
  const types: Record<string, 'warning' | 'success' | 'danger'> = {
    EXAM: 'warning',
    PRACTICE: 'success',
    REVIEW: 'danger',
  }
  return types[type] || ''
}

const getMeetingTypeText = (type: string) => {
  if (!type) return ''
  const lower = type.toLowerCase()
  if (lower.includes('практик') || type === 'PRACTICE') return 'Практика'
  if (lower.includes('аттест') || type === 'EXAM') return 'Аттестация'
  if (lower.includes('perf') || lower.includes('review') || type === 'REVIEW')
    return 'Performance review'
  return type
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

// Обработчик кнопки "Результаты"
const openResultsModal = (meeting: Meeting) => {
  selectedResultMeeting.value = meeting
  resultsDialogVisible.value = true
}

// ✅ Обработчик кнопки "Оценить" (только для руководителя)
const openGradingModal = (meeting: Meeting) => {
  const attestation = mockAttestations.value.find((a) => a.id === meeting.id)
  if (!attestation) return

  selectedGradingMeeting.value = meeting
  // ✅ Инициализируем 3 вопроса для оценки
  questionGrades.value = ['not_answered', 'not_answered', 'not_answered']
  simpleGrade.value = 'passed'
  gradeComment.value = ''
  gradingDialogVisible.value = true
}

// ✅ Сохранение оценки
const submitGrade = () => {
  if (!selectedGradingMeeting.value) return

  const result = {
    passed:
      selectedGradingMeeting.value.confirmation_type === 'Аттестация'
        ? overallScore.value >= 80
        : simpleGrade.value === 'passed',
    score:
      selectedGradingMeeting.value.confirmation_type === 'Аттестация'
        ? overallScore.value
        : undefined,
    feedback: gradeComment.value,
    date: new Date().toISOString(),
  }

  const attestation = mockAttestations.value.find((a) => a.id === selectedGradingMeeting.value?.id)
  if (attestation) {
    attestation.result = result
    attestation.status = 'completed'
  }

  ElMessage.success('Оценка сохранена')
  gradingDialogVisible.value = false

  if (selectedResultMeeting.value?.id === selectedGradingMeeting.value?.id) {
    selectedResultMeeting.value = { ...selectedGradingMeeting.value, result }
  }
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
/* ... стили без изменений ... */
.calendar-page {
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
  background-color: var(--background);
  min-height: 100vh;
}
.page-header {
  margin-bottom: var(--spacing-lg);
}
.page-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text);
}
.page-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--gray);
  font-weight: var(--font-weight-normal);
}
.filters-bar {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: #fff;
  border-radius: 8px;
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
.attestations-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.attestation-card {
  transition: none !important;
  box-shadow: none !important;
  border-radius: 6px;
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
:deep(.meeting-card) {
  border-radius: 6px !important;
}
:deep(.meeting-title) {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}
:deep(.info-label) {
  font-size: 13px;
  color: var(--gray);
  font-weight: var(--font-weight-normal);
}
:deep(.info-value) {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--font-weight-medium);
}
:deep(.participants-title) {
  font-size: 14px;
  color: var(--gray);
  font-weight: var(--font-weight-medium);
}
:deep(.participant-name) {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--font-weight-medium);
}
:deep(.participant-role) {
  font-size: 13px;
  color: var(--text);
  font-weight: var(--font-weight-normal);
}
:deep(.status-badge) {
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--gray);
  border-radius: 4px !important;
}
:deep(.confirmation-badge) {
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  border-radius: 4px !important;
}
:deep(.el-dialog__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid #f0f0f0;
}
:deep(.el-dialog__body) {
  padding: var(--spacing-lg);
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
}
.modal-text {
  margin: 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  font-weight: var(--font-weight-normal);
}
.grading-instruction {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: #f0f7ff;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
  font-weight: var(--font-weight-normal);
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
  border-radius: 6px;
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
}
.grading-buttons {
  display: flex;
  gap: var(--spacing-xs);
}
.grading-buttons :deep(.el-button) {
  min-width: 100px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  border-radius: 4px;
}
.question-text {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-sm);
}
.ideal-answer {
  padding: var(--spacing-sm);
  background: var(--background);
  border-radius: 4px;
  margin-bottom: var(--spacing-sm);
}
.answer-label {
  display: block;
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--gray);
  margin-bottom: var(--spacing-xs);
}
.answer-text {
  margin: 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  font-weight: var(--font-weight-normal);
}
.question-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: var(--font-weight-medium);
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
}
.task-grading {
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: 6px;
}
.grading-options {
  margin-top: var(--spacing-sm);
}
.results-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid #f0f0f0;
}
.result-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}
.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
}
.result-label {
  font-size: 14px;
  color: var(--gray);
  font-weight: var(--font-weight-normal);
}
.result-value {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}
.result-value.score {
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  color: var(--primary);
}
.result-section {
  padding-top: var(--spacing-sm);
  border-top: 1px solid #f0f0f0;
}
.result-feedback {
  margin: var(--spacing-xs) 0 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
}
.no-results {
  font-size: 14px;
  color: var(--gray);
  font-style: italic;
  text-align: center;
  padding: var(--spacing-lg) 0;
}
.grading-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.grading-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid #f0f0f0;
}
.grading-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}
.grading-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
}
.grading-label {
  font-size: 14px;
  color: var(--gray);
  font-weight: var(--font-weight-medium);
}
.grading-value {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}
.grading-questions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.grading-questions h5 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 14px;
  font-weight: var(--font-weight-semibold);
  color: var(--primary);
}
.grading-question {
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}
.question-text {
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}
.question-answer {
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: #fff;
  border-radius: 4px;
  border-left: 3px solid var(--secondary);
}
.answer-label {
  font-size: 12px;
  color: var(--gray);
  font-weight: var(--font-weight-medium);
}
.question-answer p {
  margin: var(--spacing-xs) 0 0 0;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
}
.question-grade {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.grade-label {
  font-size: 13px;
  color: var(--gray);
  font-weight: var(--font-weight-medium);
  min-width: 60px;
}
.grading-simple {
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-sm);
}
.grading-summary {
  padding: var(--spacing-md);
  background: #f8f9fa;
  border-radius: var(--radius-sm);
}
:deep(.el-radio.is-bordered) {
  margin-right: var(--spacing-xs);
  padding: 8px 16px;
}
:deep(.el-radio.is-bordered.el-radio--small) {
  padding: 4px 12px;
}
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
:deep(.el-radio-button__inner) {
  background-color: #f5f5f5 !important;
  border: 1px solid #d9d9d9 !important;
  color: var(--text) !important;
  box-shadow: none !important;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  padding: 8px 16px;
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
  border-radius: 4px !important;
}
:deep(.el-input__inner) {
  border-radius: 4px !important;
}
</style>
