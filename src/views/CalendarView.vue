<!-- src/views/CalendarView.vue -->
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
          :prefix-icon="Search"
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
          <el-option label="Аттестация" value="Аттестация" />
          <el-option label="Практика" value="Практика" />
          <el-option label="Performance Review" value="Performance Review" />
        </el-select>

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

    <!-- Список встреч через MeetingCard -->
    <div class="attestations-list">
      <el-empty v-if="!meetingsLoaded" description="Загрузка встреч..." :image-size="80" />
      <el-empty
        v-else-if="filteredMeetings.length === 0"
        description="Нет встреч по выбранным фильтрам"
        :image-size="80"
      />

      <el-card
        v-for="meeting in filteredMeetings"
        :key="meeting.id"
        class="attestation-card"
        shadow="never"
        :class="{ 'is-past': meeting.isPast, 'is-today': meeting.isToday }"
      >
        <MeetingCard
          ref="meetingCardRefs"
          :meeting="meeting"
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
import { computed, ref, onMounted, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import MeetingCard, { type Meeting } from '@/components/common/MeetingCard.vue'
import axios from 'axios'

dayjs.locale('ru')

const API_BASE = import.meta.env.VITE_API_URL || '/api'
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
const filterMeetings = ref<'all' | 'my' | 'subordinates'>('all')
const filterRole = ref<'all' | 'ATTESTED' | 'ATTESTOR'>('all')
const filterType = ref<'all' | 'Аттестация' | 'Практика' | 'Performance Review'>('all')
const dateRange = ref<[string, string] | null>(null)

// Данные
const meetingsLoaded = ref(false)
const allMeetings = ref<Meeting[]>([])
const meetingCardRefs = ref<InstanceType<typeof MeetingCard>[]>([])

const currentUserId = computed(() => currentUser.value?.id)

// ✅ Маппер: конвертируем ответ API в формат Meeting
const mapApiMeetingToMeeting = (apiData: any): Meeting => {
  const participants: Meeting['participants'] = []
  let userRole: Meeting['role']
  const isCurrentUserStudent = apiData.student?.user_id === currentUserId.value
  const isCurrentUserExaminer = apiData.examiner?.user_id === currentUserId.value

  if (apiData.student) {
    participants.push({
      id: apiData.student.id,
      user_id: apiData.student.user_id, // ✅ ДОБАВЛЕНО: user_id
      full_name: apiData.student.full_name,
      role: 'Аттестуемый',
      is_current_user: isCurrentUserStudent,
    })
    if (isCurrentUserStudent) userRole = 'ATTESTED'
  }
  if (apiData.examiner) {
    participants.push({
      id: apiData.examiner.id,
      user_id: apiData.examiner.user_id, // ✅ ДОБАВЛЕНО: user_id
      full_name: apiData.examiner.full_name,
      role: 'Аттестующий',
      is_current_user: isCurrentUserExaminer,
    })
    if (isCurrentUserExaminer) userRole = 'ATTESTOR'
  }

  const startTime = dayjs(apiData.started_at)
  const now = dayjs()
  const isPast = apiData.status === 'completed' || startTime.isBefore(now, 'day')
  const isToday = startTime.isSame(now, 'day')
  const isUpcoming = !isPast && !isToday

  return {
    id: apiData.id,
    skill_name: apiData.title || 'Без названия',
    confirmation_type: apiData.confirmation_type || '',
    status: apiData.status as 'planned' | 'completed',
    date_time: apiData.started_at,
    location: apiData.location || 'Не указано',
    duration: apiData.duration || 60,
    description: apiData.description || undefined,
    participants,
    role: userRole,
    isPast,
    isToday,
    isUpcoming,
    stage_id: apiData.stage_id,
    stage_version_id: apiData.stage_version_id,
    skill_id: apiData.skill_id,
  }
}

// ✅ Загрузка встреч с сервера
const fetchMeetings = async () => {
  try {
    const params: Record<string, any> = {}

    // Фильтр по дате
    if (dateRange.value?.[0] && dateRange.value?.[1]) {
      params.start_date = dayjs(dateRange.value[0]).startOf('day').format('YYYY-MM-DDTHH:mm:ss')
      params.end_date = dayjs(dateRange.value[1]).endOf('day').format('YYYY-MM-DDTHH:mm:ss')
    }

    // Фильтр по статусу
    if (filterStatus.value === 'upcoming') {
      params.status = 'planned'
    } else if (filterStatus.value === 'past') {
      params.status = 'completed'
    }

    // Фильтр по типу подтверждения
    if (filterType.value !== 'all') {
      params.confirmation_type = filterType.value
    }

    // Фильтр по роли пользователя
    if (filterRole.value !== 'all' && currentUserId.value) {
      params.user_id = currentUserId.value
      if (filterRole.value === 'ATTESTED' || filterRole.value === 'ATTESTOR') {
        params.user_role = filterRole.value
      }
    }

    // Фильтр "Мои встречи" / "Встречи подчиненных" для руководителя
    if (canGradeMeeting.value && filterMeetings.value !== 'all' && currentUserId.value) {
      if (filterMeetings.value === 'my') {
        params.user_id = currentUserId.value
      }
    } else if (!canGradeMeeting.value && currentUserId.value) {
      params.user_id = currentUserId.value
    }

    const response = await axios.get(`${API_BASE}/meetings/`, {
      params,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })

    const mapped = (response.data || []).map(mapApiMeetingToMeeting)
    allMeetings.value = mapped
    meetingsLoaded.value = true
  } catch (error) {
    console.error('Ошибка загрузки встреч:', error)
    ElMessage.error('Не удалось загрузить встречи')
    meetingsLoaded.value = true
  }
}

// ✅ Клиентская фильтрация
const filteredMeetings = computed(() => {
  let result = [...allMeetings.value]

  // Поиск по теме или ФИО
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((m) => {
      const topicMatch = m.skill_name.toLowerCase().includes(query)
      const participantMatch = m.participants.some((p) => p.full_name.toLowerCase().includes(query))
      return topicMatch || participantMatch
    })
  }

  // Фильтр "Встречи подчиненных" (клиентская часть)
  if (canGradeMeeting.value && filterMeetings.value === 'subordinates' && currentUserId.value) {
    result = result.filter((m) => !m.participants.some((p) => p.is_current_user))
  }

  // Сортировка: сначала предстоящие, потом прошедшие
  return result.sort((a, b) => {
    if (a.isUpcoming && !b.isUpcoming) return -1
    if (!a.isUpcoming && b.isUpcoming) return 1
    return new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
  })
})

// Методы
const applyFilters = () => {
  fetchMeetings()
}

const handleDateClear = () => {
  dateRange.value = null
  applyFilters()
}

const disabledDate = (date: Date) => {
  if (dateRange.value?.[1]) {
    const endDate = dayjs(dateRange.value[1])
    if (!dateRange.value[0]) return date > endDate.toDate()
  }
  if (dateRange.value?.[0]) {
    const startDate = dayjs(dateRange.value[0])
    return date < startDate.startOf('day').toDate()
  }
  return false
}

watch(dateRange, ([start, end]) => {
  if (!start && !end) return
  if (start && end && dayjs(start).isAfter(dayjs(end))) {
    ElMessage.warning('Дата начала не может быть позже даты окончания')
    dateRange.value = null
  }
})

// ✅ Обработчики событий от MeetingCard
const handleViewResults = async (meeting: Meeting) => {
  console.log('Просмотр результатов:', meeting)
}

const handleOpenGrading = (meeting: Meeting) => {
  console.log('Открытие оценки:', meeting)
}

const handleSaveGrade = async (
  meeting: Meeting,
  grade: 'зачтено' | 'незачтено',
  comment: string,
) => {
  try {
    if (!meeting.stage_id) {
      ElMessage.error('Недостаточно данных для сохранения оценки')
      return
    }

    // ✅ Берём user_id аттестуемого из участников
    const attested = meeting.participants.find(
      (p) => p.role === 'Аттестуемый' || p.role === 'ATTESTED',
    )
    const attestedUserId = attested?.user_id

    if (!attestedUserId) {
      ElMessage.error('Не удалось определить аттестуемого')
      return
    }

    await axios.post(
      `${API_BASE}/evaluations/`,
      {
        user_id: attestedUserId,
        stage_id: meeting.stage_id,
        is_accepted: grade === 'зачтено',
        comment,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      },
    )

    ElMessage.success('Оценка сохранена')
    await fetchMeetings()
  } catch (error) {
    console.error('Ошибка сохранения оценки:', error)
    ElMessage.error('Не удалось сохранить оценку')
  }
}

// Быстрые даты
const dateShortcuts = [
  {
    text: 'Ближайшие 7 дней',
    value: () => {
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

onMounted(() => {
  fetchMeetings()
})
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
:deep(.custom-date-picker .el-input__inner),
:deep(.custom-date-picker .el-range-input) {
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}
:deep(.custom-date-picker .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4a2c6d inset !important;
  border-color: #4a2c6d !important;
}
:deep(.custom-date-picker .el-input__wrapper) {
  border-radius: 4px !important;
}
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
:deep(.custom-select .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4a2c6d inset !important;
  border-color: #4a2c6d !important;
}
:deep(.custom-select .el-input__wrapper),
:deep(.custom-date-picker .el-input__wrapper) {
  border-radius: 4px !important;
}
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
