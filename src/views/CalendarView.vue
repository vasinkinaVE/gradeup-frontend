<template>
  <div class="calendar-page">
    <div class="page-header"><h1 class="page-title">Календарь</h1></div>
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
        <el-select
          v-if="showMeetingsFilter"
          v-model="filterMeetings"
          placeholder="Все встречи"
          size="default"
          class="filter-select custom-select"
          @change="applyFilters"
          popper-class="custom-select-popper"
        >
          <el-option label="Все встречи" value="all" /><el-option
            label="Мои встречи"
            value="my"
          /><el-option label="Встречи подчиненных" value="subordinates" />
        </el-select>
        <el-select
          v-model="filterRole"
          placeholder="Все роли"
          size="default"
          class="filter-select custom-select"
          @change="applyFilters"
          popper-class="custom-select-popper"
        >
          <el-option label="Все роли" value="all" /><el-option
            label="Аттестуемый"
            value="Аттестуемый"
          /><el-option label="Аттестующий" value="Аттестующий" />
        </el-select>
        <el-select
          v-model="filterType"
          placeholder="Все типы"
          size="default"
          class="filter-select custom-select"
          @change="applyFilters"
          popper-class="custom-select-popper"
        >
          <el-option label="Все типы" value="all" /><el-option
            label="Аттестация"
            value="Аттестация"
          /><el-option label="Практическое задание" value="Практическое задание" /><el-option
            label="Performance review"
            value="Performance review"
          />
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
          :can-grade="canUserGradeMeeting(meeting)"
          @view-results="handleViewResults"
          @open-grading="handleOpenGrading"
          @save-grade="handleGradeSaved"
          @grade-saved="handleGradeSaved"
          @grade-error="handleGradeError"
          @meeting-completed="handleMeetingCompleted"
          @meeting-status-updated="handleMeetingStatusUpdated"
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

const isEmployee = computed(() => {
  const u = currentUser.value
  if (!u) return false
  const roles = ['employee', 'сотрудник']
  const check = (r: string) => roles.includes(r.trim().toLowerCase())
  if (
    u.role_name &&
    check(u.role_name) &&
    (!Array.isArray(u.roles) || !u.roles.some((x: any) => !check(String(x))))
  )
    return true
  if (Array.isArray(u.roles)) return u.roles.every((x: any) => check(String(x)))
  return false
})
const showMeetingsFilter = computed(() => !isEmployee.value)

const userDepartmentCache = ref<Record<number, number | undefined>>({})
const fetchUserDepartment = async (userId: number): Promise<number | undefined> => {
  if (userDepartmentCache.value[userId] !== undefined) return userDepartmentCache.value[userId]
  try {
    const res = await axios.get(`${API_BASE}/users/${userId}/`, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })
    userDepartmentCache.value[userId] = res.data?.department_id
    return res.data?.department_id
  } catch (e) {
    console.error(e)
    return undefined
  }
}

const divisionDepartmentsCache = ref<Record<number, number[]>>({})
const fetchDivisionDepartments = async (divisionId: number): Promise<number[]> => {
  if (divisionDepartmentsCache.value[divisionId]) return divisionDepartmentsCache.value[divisionId]
  try {
    const res = await axios.get(`${API_BASE}/admin/divisions/${divisionId}`, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })
    const depts = res.data?.departments || []
    divisionDepartmentsCache.value[divisionId] = depts
      .map((d: any) => d.id)
      .filter((id: number) => id != null)
    return divisionDepartmentsCache.value[divisionId]
  } catch (e) {
    console.error(e)
    return []
  }
}

const checkSupervisorRole = (u: any): boolean => {
  if (!u) return false
  if (
    u.role_name &&
    ['supervisor', 'руководитель'].includes(u.role_name.toString().trim().toLowerCase())
  )
    return true
  if (Array.isArray(u.roles))
    return u.roles.some((r: any) =>
      ['supervisor', 'руководитель'].includes(r.toString().trim().toLowerCase()),
    )
  return false
}

const canUserGradeMeeting = (meeting: Meeting): boolean => {
  const user = currentUser.value
  if (!user || !meeting || meeting.status !== 'completed' || meeting.is_approved !== false)
    return false
  if (
    meeting.participants.some(
      (p) => p.is_current_user && (p.role === 'Аттестуемый' || p.role === 'student'),
    )
  )
    return false
  if (!checkSupervisorRole(user)) return false

  if (user.managed_division_id === null && user.department_id)
    return meeting.department_id === user.department_id
  if (user.managed_division_id != null) {
    const allowed = divisionDepartmentsCache.value[user.managed_division_id] || []
    return allowed.includes(meeting.department_id)
  }
  return false
}

const searchQuery = ref('')
const filterStatus = ref<'all' | 'upcoming' | 'past'>('all')
const filterMeetings = ref<'all' | 'my' | 'subordinates'>('all')
const filterRole = ref<'all' | 'Аттестуемый' | 'Аттестующий'>('all')
const filterType = ref<'all' | 'Аттестация' | 'Практическое задание' | 'Performance review'>('all')
const dateRange = ref<[string, string] | null>(null)

const meetingsLoaded = ref(false)
const allMeetings = ref<Meeting[]>([])
const meetingCardRefs = ref<InstanceType<typeof MeetingCard>[]>([])
const currentUserId = computed(() => currentUser.value?.id)

const mapApiMeetingToMeeting = (apiData: any): Meeting => {
  const parts: Meeting['participants'] = []
  let role: Meeting['role']
  const isSt = apiData.student?.user_id === currentUserId.value
  const isEx = apiData.examiner?.user_id === currentUserId.value
  if (apiData.student) {
    parts.push({
      id: apiData.student.id,
      user_id: apiData.student.user_id,
      full_name: apiData.student.full_name,
      role: 'Аттестуемый',
      is_current_user: isSt,
    })
    if (isSt) role = 'student'
  }
  if (apiData.examiner) {
    parts.push({
      id: apiData.examiner.id,
      user_id: apiData.examiner.user_id,
      full_name: apiData.examiner.full_name,
      role: 'Аттестующий',
      is_current_user: isEx,
    })
    if (isEx) role = 'examiner'
  }
  const st = dayjs(apiData.started_at)
  const now = dayjs()
  return {
    id: apiData.id,
    skill_name: apiData.title || 'Без названия',
    confirmation_type: apiData.confirmation_type || '',
    status: apiData.status as 'planned' | 'completed',
    date_time: apiData.started_at,
    location: apiData.location || 'Не указано',
    duration: apiData.duration || 60,
    description: apiData.description || undefined,
    participants: parts,
    role,
    isPast: apiData.status === 'completed' || st.isBefore(now, 'day'),
    isToday: st.isSame(now, 'day'),
    isUpcoming: false,
    stage_id: apiData.stage_id,
    stage_version_id: apiData.stage_version_id,
    user_stage_id: apiData.user_stage_id,
    skill_id: apiData.skill_id,
    is_approved: apiData.is_approved,
    ended_at: apiData.ended_at,
  }
}

const fetchMeetings = async () => {
  try {
    const params: Record<string, any> = {}
    const user = currentUser.value
    if (user?.managed_division_id === null && user?.department_id)
      params.department_id = user.department_id
    else if (user?.managed_division_id != null) {
      const ids = await fetchDivisionDepartments(user.managed_division_id)
      if (ids.length) params.department_id = ids // Axios преобразует массив в ?department_id=1&department_id=2...
    }

    if (dateRange.value?.[0] && dateRange.value?.[1]) {
      params.start_date = dayjs(dateRange.value[0]).startOf('day').format('YYYY-MM-DDTHH:mm:ss')
      params.end_date = dayjs(dateRange.value[1]).endOf('day').format('YYYY-MM-DDTHH:mm:ss')
    }
    if (filterStatus.value === 'upcoming') params.status = 'planned'
    else if (filterStatus.value === 'past') params.status = 'completed'
    if (filterType.value !== 'all') params.confirmation_type = filterType.value
    if (filterRole.value !== 'all' && currentUserId.value) {
      params.user_id = currentUserId.value
      if (['Аттестуемый', 'Аттестующий'].includes(filterRole.value))
        params.user_role = filterRole.value
    }
    if (showMeetingsFilter.value && filterMeetings.value !== 'all' && currentUserId.value) {
      if (filterMeetings.value === 'my') params.user_id = currentUserId.value
      else if (filterMeetings.value === 'subordinates') params.exclude_user_id = currentUserId.value
    } else if (isEmployee.value && currentUserId.value) params.user_id = currentUserId.value

    const res = await axios.get(`${API_BASE}/meetings/`, {
      params,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })
    const mapped = (res.data || []).map(mapApiMeetingToMeeting)

    const attestedIds = [
      ...new Set(
        mapped
          .map(
            (m) =>
              m.participants.find((p) => p.role === 'Аттестуемый' || p.role === 'student')?.user_id,
          )
          .filter((id): id is number => id != null),
      ),
    ]
    await Promise.all(attestedIds.map((id) => fetchUserDepartment(id)))

    mapped.forEach((m) => {
      const att = m.participants.find((p) => p.role === 'Аттестуемый' || p.role === 'student')
      if (att) m.department_id = userDepartmentCache.value[att.user_id]
    })

    allMeetings.value = Array.from(new Map(mapped.map((m) => [m.id, m])).values())
    meetingsLoaded.value = true
  } catch (e) {
    console.error(e)
    ElMessage.error('Не удалось загрузить встречи')
    meetingsLoaded.value = true
  }
}

const filteredMeetings = computed(() => {
  let res = [...allMeetings.value]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    res = res.filter(
      (m) =>
        m.skill_name.toLowerCase().includes(q) ||
        m.participants.some((p) => p.full_name.toLowerCase().includes(q)),
    )
  }
  if (showMeetingsFilter.value && filterMeetings.value === 'subordinates' && currentUserId.value)
    res = res.filter((m) => !m.participants.some((p) => p.is_current_user))
  return res.sort((a, b) => {
    if (a.isUpcoming && !b.isUpcoming) return -1
    if (!a.isUpcoming && b.isUpcoming) return 1
    return new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
  })
})

const applyFilters = () => fetchMeetings()
const handleDateClear = () => {
  dateRange.value = null
  applyFilters()
}
const disabledDate = (date: Date) => {
  if (dateRange.value?.[1]) {
    const end = dayjs(dateRange.value[1])
    if (!dateRange.value[0]) return date > end.toDate()
  }
  if (dateRange.value?.[0]) return date < dayjs(dateRange.value[0]).startOf('day').toDate()
  return false
}
watch(dateRange, ([s, e]) => {
  if (s && e && dayjs(s).isAfter(dayjs(e))) {
    ElMessage.warning('Дата начала не может быть позже даты окончания')
    dateRange.value = null
  }
})

const handleMeetingCompleted = (m: Meeting) => {
  const i = allMeetings.value.findIndex((x) => x.id === m.id)
  if (i !== -1) allMeetings.value[i] = { ...allMeetings.value[i], ...m }
  ElMessage.success('Встреча завершена')
}
const handleMeetingStatusUpdated = (m: Meeting) => {
  const i = allMeetings.value.findIndex((x) => x.id === m.id)
  if (i !== -1) allMeetings.value[i] = { ...allMeetings.value[i], ...m }
}
const handleViewResults = (m: Meeting) => console.log('Просмотр результатов:', m)
const handleOpenGrading = (m: Meeting) => console.log('Открытие оценки:', m)
const handleGradeSaved = async () => {
  await fetchMeetings()
}
const handleGradeError = (e: any) => console.error('Ошибка:', e)

const dateShortcuts = [
  {
    text: 'Ближайшие 7 дней',
    value: () => [
      dayjs().startOf('day').format('YYYY-MM-DD'),
      dayjs().add(7, 'day').endOf('day').format('YYYY-MM-DD'),
    ],
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
onMounted(() => fetchMeetings())
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
  width: 180px !important;
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
