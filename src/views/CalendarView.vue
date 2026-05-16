<template>
  <div class="calendar-page">
    <!-- Заголовок -->
    <div class="page-header">
      <h1 class="page-title">Календарь</h1>
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
          <el-radio-group v-model="filterStatus" @change="applyFilters" class="custom-radio-group">
            <el-radio-button value="all">Все</el-radio-button>
            <el-radio-button value="upcoming">Предстоящие</el-radio-button>
            <el-radio-button value="past">Прошедшие</el-radio-button>
          </el-radio-group>
        </div>

        <!-- ✅ Фильтр по встречам (только для руководителя) -->
        <el-select
          v-if="canGradeMeeting"
          v-model="filterMeetings"
          placeholder="Все встречи"
          size="default"
          class="filter-select custom-select"
          @change="applyFilters"
          popper-class="custom-select-popper"
        >
          <el-option label="Все встречи" value="all" />
          <el-option label="Мои встречи" value="my" />
          <el-option label="Встречи подчиненных" value="subordinates" />
        </el-select>

        <el-select
          v-model="filterRole"
          placeholder="Все роли"
          size="default"
          class="filter-select custom-select"
          @change="applyFilters"
          popper-class="custom-select-popper"
        >
          <el-option label="Все роли" value="all" />
          <el-option label="Аттестуемый" value="ATTESTED" />
          <el-option label="Аттестующий" value="ATTESTOR" />
        </el-select>

        <el-select
          v-model="filterType"
          placeholder="Все типы"
          size="default"
          class="filter-select custom-select"
          @change="applyFilters"
          popper-class="custom-select-popper"
        >
          <el-option label="Все типы" value="all" />
          <el-option label="Аттестация" value="EXAM" />
          <el-option label="Практика" value="PRACTICE" />
          <el-option label="Performance Review" value="REVIEW" />
        </el-select>

        <!-- ✅ Добавлен clearable и исправлена работа очистки -->
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="—"
          start-placeholder="Начало"
          end-placeholder="Конец"
          size="default"
          :shortcuts="dateShortcuts"
          :disabled-date="disabledDate"
          @change="applyFilters"
          @clear="handleDateClear"
          format="DD.MM.YYYY"
          value-format="YYYY-MM-DD"
          clearable
          :popper-options="{ placement: 'bottom-end' }"
          class="date-range-picker custom-date-picker"
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
          ref="meetingCardRefs"
          :meeting="mapToMeeting(attestation)"
          :can-grade="canGradeMeeting"
          @view-results="handleViewResults"
          @open-grading="handleOpenGrading"
          @save-grade="handleSaveGrade"
        />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import MeetingCard, { type Meeting } from '@/components/common/MeetingCard.vue'

dayjs.locale('ru')

const authStore = useAuthStore()
const currentUser = computed(() => authStore.user)

// ✅ Проверка роли: руководитель
const canGradeMeeting = computed(() => {
  const role = currentUser.value?.role_name
  if (!role) return false
  const normalizedRole = role.trim().toLowerCase()
  const allowedRoles = ['supervisor', 'manager', 'admin', 'spo', 'руководитель']
  return allowedRoles.includes(normalizedRole)
})

// Фильтры
const searchQuery = ref('')
const filterStatus = ref<'all' | 'upcoming' | 'past'>('all')
const filterMeetings = ref<'all' | 'my' | 'subordinates'>('all') // ✅ Новый фильтр
const filterRole = ref<'all' | 'ATTESTED' | 'ATTESTOR'>('all')
const filterType = ref<'all' | 'EXAM' | 'PRACTICE' | 'REVIEW'>('all')
const dateRange = ref<[string, string] | null>(null)

// ✅ Рефы для доступа к методам MeetingCard
const meetingCardRefs = ref<InstanceType<typeof MeetingCard>[]>([])

// Вспомогательные
const currentUserId = computed(() => currentUser.value?.id || '1')

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
      is_current_user: p.id === currentUserId.value,
    })),
    role: attestation.participants.find((p: any) => p.id === currentUserId.value)?.role,
    isPast: attestation.isPast,
    isToday: attestation.isToday,
    isUpcoming: attestation.isUpcoming,
    result: attestation.result,
    questions: attestation.questions,
  }
}

// ✅ Mock-данные
const mockAttestations = computed(() => [
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
  },
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

  // ✅ Фильтр по встречам (только для руководителя)
  if (canGradeMeeting.value && filterMeetings.value !== 'all') {
    if (filterMeetings.value === 'my') {
      // Только встречи, где текущий пользователь является участником
      result = result.filter((a) => a.participants.some((p: any) => p.id === currentUserId.value))
    } else if (filterMeetings.value === 'subordinates') {
      // Только встречи подчиненных (где текущий пользователь НЕ участвует)
      result = result.filter((a) => !a.participants.some((p: any) => p.id === currentUserId.value))
    }
  } else if (!canGradeMeeting.value) {
    // Для не-руководителей показываем только их встречи
    result = result.filter((a) => a.participants.some((p: any) => p.id === currentUserId.value))
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

// ✅ Обработчик очистки даты
const handleDateClear = () => {
  dateRange.value = null
  applyFilters()
}

// ✅ Валидация: блокируем выбор даты начала позже даты конца
const disabledDate = (date: Date) => {
  if (dateRange.value?.[1]) {
    const endDate = dayjs(dateRange.value[1])
    if (!dateRange.value[0]) {
      return date > endDate.toDate()
    }
  }
  if (dateRange.value?.[0]) {
    const startDate = dayjs(dateRange.value[0])
    return date < startDate.startOf('day').toDate()
  }
  return false
}

// ✅ Валидация при изменении диапазона - ИСПРАВЛЕНО: не сбрасываем если значение null
watch(dateRange, ([start, end]) => {
  // Если очищаем - не показываем ошибку
  if (!start && !end) return

  if (start && end && dayjs(start).isAfter(dayjs(end))) {
    ElMessage.warning('Дата начала не может быть позже даты окончания')
    dateRange.value = null
  }
})

// ✅ Обработчики событий от MeetingCard
const handleViewResults = (meeting: Meeting) => {
  const card = meetingCardRefs.value.find((ref) => ref?.$el.contains(document.activeElement))
  card?.openResultsModal()
}

const handleOpenGrading = (meeting: Meeting) => {
  const card = meetingCardRefs.value.find((ref) => ref?.$el.contains(document.activeElement))
  card?.openGradingModal()
}

const handleSaveGrade = (meeting: Meeting, grade: 'зачтено' | 'незачтено', comment: string) => {
  const attestation = mockAttestations.value.find((a) => a.id === meeting.id)
  if (attestation) {
    attestation.result = {
      passed: grade === 'зачтено',
      feedback: comment,
      date: new Date().toISOString(),
    }
    attestation.status = 'completed'
  }
  ElMessage.success('Оценка сохранена')
}

// Быстрые даты
const dateShortcuts = [
  {
    text: 'Ближайшие 7 дней',
    value: () => {
      // ✅ Исправлено: от сегодня до +7 дней вперед
      const start = dayjs().startOf('day')
      const end = dayjs().add(7, 'day').endOf('day')
      return [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
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

/* === Стили для date-picker с форматом __.__.____г. === */
:deep(.custom-date-picker .el-input__inner) {
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}
:deep(.custom-date-picker .el-range-input) {
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

/* Фокус с фиолетовой обводкой */
:deep(.custom-date-picker .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4a2c6d inset !important;
  border-color: #4a2c6d !important;
}
:deep(.custom-date-picker .el-input__wrapper) {
  border-radius: 4px !important;
}

/* === Стили для кнопки очистки (крестик) === */
:deep(.custom-date-picker .el-input__clear) {
  cursor: pointer;
  transition: color 0.2s;
}
:deep(.custom-date-picker .el-input__clear:hover) {
  color: var(--danger);
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

/* === Стили для кастомных селектов === */
:deep(.custom-select .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4a2c6d inset !important;
  border-color: #4a2c6d !important;
}
:deep(.custom-select .el-input__wrapper),
:deep(.custom-date-picker .el-input__wrapper) {
  border-radius: 4px !important;
}

/* === Стили для радио-кнопок === */
:deep(.custom-radio-group .el-radio-button__inner) {
  background-color: #f5f5f5 !important;
  border: 1px solid #d9d9d9 !important;
  color: var(--text) !important;
  box-shadow: none !important;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  padding: 8px 16px;
}
:deep(.custom-radio-group .el-radio-button__inner:hover) {
  color: var(--primary) !important;
}
:deep(.custom-radio-group .el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 4px 0 0 4px !important;
}
:deep(
  .custom-radio-group
    .el-radio-button:first-child
    .el-radio-button__original-radio:checked
    + .el-radio-button__inner
) {
  border-right: 1px solid #4a2c6d !important;
}
:deep(.custom-radio-group .el-radio-button:nth-child(2) .el-radio-button__inner) {
  border-radius: 0 !important;
  border-left: none !important;
}
:deep(
  .custom-radio-group
    .el-radio-button:nth-child(2)
    .el-radio-button__original-radio:checked
    + .el-radio-button__inner
) {
  border-right: 1px solid #4a2c6d !important;
}
:deep(.custom-radio-group .el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 4px 4px 0 !important;
  border-left: none !important;
}
:deep(.custom-radio-group .el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #e0e0e0 !important;
  border-color: var(--gray) !important;
  color: var(--text) !important;
  box-shadow: none !important;
}

/* === Стили для выпадающих списков селектов === */
:global(.custom-select-popper .el-select-dropdown__item) {
  background-color: transparent !important;
  color: var(--text) !important;
}
:global(.custom-select-popper .el-select-dropdown__item.is-selected) {
  background-color: #f8f4fc !important;
  color: #4a2c6d !important;
}
:global(.custom-select-popper .el-select-dropdown__item.is-selected:hover),
:global(.custom-select-popper .el-select-dropdown__item.is-selected.hover) {
  background-color: #f8f4fc !important;
  color: #4a2c6d !important;
}
:global(.custom-select-popper .el-select-dropdown__item:not(.is-selected):hover),
:global(.custom-select-popper .el-select-dropdown__item:not(.is-selected).hover) {
  background-color: transparent !important;
  color: #4a2c6d !important;
}

/* === Адаптив === */
@media (max-width: 768px) {
  .filters-row {
    flex-wrap: wrap;
  }
  .radio-group-wrapper,
  .filter-select,
  .date-range-picker {
    flex-shrink: 1;
  }
}

/* === Дополнительные стили для фокуса === */
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4a2c6d inset !important;
  border-color: #4a2c6d !important;
}
:deep(.el-select.is-focus .el-input__inner) {
  border-color: #4a2c6d !important;
  box-shadow: none !important;
}
:deep(.el-select) {
  --el-select-input-focus-border-color: #4a2c6d !important;
  --el-color-primary: #4a2c6d !important;
}
</style>
