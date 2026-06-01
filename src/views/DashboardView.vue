<!-- src/views/DashboardView.vue -->
<template>
  <div class="employee-dashboard">
    <div class="dashboard-content">
      <div class="welcome-section">
        <h1 class="welcome-title">Добро пожаловать, {{ fullName }}!</h1>
      </div>

      <div class="dashboard-grid">
        <div class="top-row">
          <el-card class="info-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title"
                  ><el-icon :size="18"><User /></el-icon> Личная информация</span
                >
              </div>
            </template>
            <div class="employee-info" v-if="currentUser">
              <div class="info-row">
                <span class="label">Фамилия</span
                ><span class="value">{{ currentUser.last_name || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Имя</span
                ><span class="value">{{ currentUser.first_name || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Отчество</span
                ><span class="value">{{ currentUser.patronymic || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Должность</span
                ><span class="value">{{ currentUser.position || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Email</span
                ><span class="value">{{ currentUser.email || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Отдел</span
                ><span class="value">{{ currentUser.department_name || '—' }}</span>
              </div>
              <div
                v-if="currentUser.is_supervisor && currentUser.division_id != null"
                class="info-row"
              >
                <span class="label">Направление</span
                ><span class="value">{{ currentUser.managed_division_name || '—' }}</span>
              </div>
            </div>
            <div v-else class="loading-placeholder">Загрузка...</div>
          </el-card>

          <el-card class="info-card meeting-card-wrapper" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title"
                  ><el-icon :size="18"><Calendar /></el-icon> Ближайшая встреча</span
                >
              </div>
            </template>
            <MeetingCard
              v-if="upcomingMeeting"
              :meeting="upcomingMeeting"
              :can-grade="canGradeMeeting"
              @view-results="handleViewResults"
              @open-grading="handleOpenGrading"
              @save-grade="handleGradeSaved"
              @grade-saved="handleGradeSaved"
              @grade-error="handleGradeError"
              @meeting-completed="handleMeetingCompleted"
              @meeting-status-updated="handleMeetingStatusUpdated"
            />
            <div v-else-if="meetingLoadError" class="meeting-placeholder">
              {{ meetingLoadError }}
            </div>
            <div v-else class="meeting-placeholder">Загрузка...</div>
          </el-card>
        </div>

        <div class="bottom-row">
          <el-card class="profile-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title"
                  ><el-icon :size="18"><List /></el-icon> Профиль</span
                >
              </div>
            </template>
            <ProfileCard
              v-if="userProfile"
              :profile="userProfile"
              :user-id="currentUserId"
              :is-current-user="true"
              :fetch-skill-detail="fetchSkillDetail"
              :fetch-skill-questions="undefined"
              :use-questions-endpoint="false"
            />
            <div v-else class="profile-placeholder">Профиль не назначен</div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { User, Calendar, List } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import MeetingCard, { type Meeting } from '@/components/common/MeetingCard.vue'
import ProfileCard, { type Level } from '@/components/common/ProfileCard.vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const authStore = useAuthStore()
const currentUser = computed(() => authStore.user)
const currentUserId = computed(() => currentUser.value?.id)

const fullName = computed(() => {
  const u = currentUser.value
  if (!u) return 'Пользователь'
  return `${u.last_name || ''} ${u.first_name || ''} ${u.patronymic || ''}`.trim() || 'Пользователь'
})

const upcomingMeeting = ref<Meeting | null>(null)
const meetingLoadError = ref<string | null>(null)
const userProfile = ref<{
  user_id: number
  profile_id: number
  title: string
  current_level_id: number
  levels: Level[]
  profile_progress: number
  ready_gradeup: boolean
} | null>(null)

// ✅ Кэш отделов пользователей
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
    console.error('Ошибка загрузки отдела:', e)
    return undefined
  }
}

// ✅ Проверка прав на оценку (зависит от department_id, который подгрузится асинхронно)
const canGradeMeeting = computed(() => {
  const user = currentUser.value
  const meeting = upcomingMeeting.value
  if (!user || !meeting) return false
  if (
    meeting.participants.some(
      (p) => p.is_current_user && (p.role === 'Аттестуемый' || p.role === 'student'),
    )
  )
    return false
  if (meeting.status !== 'completed' || meeting.is_approved !== false) return false

  const hasSupervisor =
    user.role_name?.toString().toLowerCase() === 'supervisor' ||
    user.role_name?.toString().toLowerCase() === 'руководитель' ||
    user.roles?.some((r: any) =>
      ['supervisor', 'руководитель'].includes(r.toString().toLowerCase()),
    )
  if (!hasSupervisor) return false

  if (user.managed_division_id === null && user.department_id)
    return meeting.department_id === user.department_id
  if (user.managed_division_id != null) return true // Детальная проверка отделов направления делается при загрузке
  return false
})

onMounted(async () => {
  if (!currentUser.value) await authStore.fetchCurrentUser()
  await Promise.all([fetchUpcomingMeeting(), fetchUserProfile()])
})

const mapMeetingData = (apiData: any, userId: number | undefined): Meeting => {
  const participants: Meeting['participants'] = []
  let userRole: Meeting['role']
  if (apiData.student) {
    participants.push({
      id: apiData.student.id,
      user_id: apiData.student.user_id,
      full_name: apiData.student.full_name,
      role: 'Аттестуемый',
      is_current_user: apiData.student.user_id === userId,
    })
    if (apiData.student.user_id === userId) userRole = 'student'
  }
  if (apiData.examiner) {
    participants.push({
      id: apiData.examiner.id,
      user_id: apiData.examiner.user_id,
      full_name: apiData.examiner.full_name,
      role: 'Аттестующий',
      is_current_user: apiData.examiner.user_id === userId,
    })
    if (apiData.examiner.user_id === userId) userRole = 'examiner'
  }
  return {
    id: apiData.id,
    skill_name: apiData.title || apiData.skill_name || 'Без названия',
    confirmation_type: apiData.confirmation_type || '',
    status: apiData.status as 'planned' | 'completed',
    date_time: apiData.started_at || apiData.date_time,
    location: apiData.location || 'Не указано',
    duration: apiData.duration || 60,
    description: apiData.description || undefined,
    participants,
    role: userRole,
    isUpcoming: true,
    stage_id: apiData.stage_id,
    stage_version_id: apiData.stage_version_id,
    user_stage_id: apiData.user_stage_id,
    skill_id: apiData.skill_id,
    is_approved: apiData.is_approved,
    ended_at: apiData.ended_at,
  }
}

const fetchUpcomingMeeting = async () => {
  meetingLoadError.value = null
  upcomingMeeting.value = null
  try {
    const params: Record<string, any> = {}
    const user = currentUser.value
    if (user?.managed_division_id === null && user?.department_id)
      params.department_id = user.department_id
    else if (user?.managed_division_id != null) {
      /* Логика направления */
    }

    const res = await axios.get(`${API_BASE}/meetings/next`, {
      params,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })
    const data = res.data
    if (
      data?.detail &&
      typeof data.detail === 'string' &&
      data.detail.includes('нет запланированных встреч')
    ) {
      meetingLoadError.value = 'Запланированных встреч нет'
      return
    }
    if (!data?.id) {
      meetingLoadError.value = 'Запланированных встреч нет'
      return
    }

    const meeting = mapMeetingData(data, currentUserId.value)

    // ✅ Вычисляем department_id через профиль аттестуемого
    const attested = meeting.participants.find(
      (p) => p.role === 'Аттестуемый' || p.role === 'student',
    )
    if (attested?.user_id) meeting.department_id = await fetchUserDepartment(attested.user_id)

    upcomingMeeting.value = meeting
  } catch (e: any) {
    console.error(e)
    meetingLoadError.value = 'Не удалось загрузить информацию о встречах'
  }
}

const fetchUserProfile = async () => {
  const uid = currentUserId.value
  if (!uid) return
  try {
    userProfile.value = (
      await axios.get(`${API_BASE}/users/${uid}/profile/`, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
    ).data
  } catch (e: any) {
    if (e?.response?.status !== 404) console.error(e)
    userProfile.value = null
  }
}
const fetchSkillDetail = async (uid: number, sid: number) =>
  (
    await axios.get(`${API_BASE}/users/${uid}/skills/${sid}`, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })
  ).data

const handleMeetingCompleted = (m: Meeting) => {
  upcomingMeeting.value = { ...upcomingMeeting.value!, ...m }
  ElMessage.success('Встреча завершена')
}
const handleMeetingStatusUpdated = (m: Meeting) => {
  upcomingMeeting.value = { ...upcomingMeeting.value!, ...m }
}
const handleViewResults = (m: Meeting) => console.log('Просмотр результатов:', m)
const handleOpenGrading = (m: Meeting) => console.log('Открытие оценки:', m)
const handleGradeSaved = async () => {
  await fetchUpcomingMeeting()
}
const handleGradeError = (e: any) => console.error('Ошибка:', e)
</script>

<style scoped>
.employee-dashboard {
  min-height: 100vh;
  background-color: var(--background);
}
.dashboard-content {
  padding: var(--spacing-md);
  max-width: 1200px;
  margin: 0 auto;
}
.welcome-section {
  margin-bottom: var(--spacing-lg);
}
.welcome-title {
  margin: 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text);
}
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.top-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}
.bottom-row {
  width: 100%;
}
.info-card,
.meeting-card-wrapper {
  height: 100%;
  width: 100%;
}
.info-card,
.meeting-card-wrapper,
.profile-card {
  box-shadow: none !important;
  transition: none !important;
}
.info-card:hover,
.meeting-card-wrapper:hover,
.profile-card:hover {
  box-shadow: none !important;
  transform: none !important;
}
:deep(.el-card.is-hover-shadow:hover) {
  box-shadow: none !important;
}
.meeting-card-wrapper :deep(.el-card__body) {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 220px;
  padding: var(--spacing-lg);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.info-card:first-child :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 220px;
  padding: var(--spacing-lg);
}
.employee-info {
  width: 100%;
  padding: var(--spacing-md) 0;
}
.info-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  column-gap: var(--spacing-lg);
}
.info-row:last-child {
  border-bottom: none;
}
.label {
  color: var(--gray);
  font-size: 14px;
  font-weight: var(--font-weight-medium);
}
.value {
  color: var(--text);
  font-weight: var(--font-weight-medium);
  font-size: 14px;
}
.loading-placeholder,
.meeting-placeholder {
  color: var(--gray);
  padding: var(--spacing-md) 0;
  font-size: 14px;
  text-align: center;
  width: 100%;
}
.meeting-placeholder {
  line-height: 1.5;
}
.profile-placeholder {
  color: var(--gray);
  font-size: 14px;
  line-height: 1.5;
  padding: var(--spacing-md) 0;
  text-align: center;
  width: 100%;
}
:deep(.el-card__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid #eee;
  background: #fafafa;
}
:deep(.el-card__body) {
  padding: var(--spacing-lg);
}
:global(html.el-popup-parent--hidden),
:global(body.el-popup-parent--hidden) {
  padding-right: 0 !important;
  overflow-y: scroll !important;
  overflow-x: hidden !important;
}
@media (max-width: 768px) {
  .top-row {
    grid-template-columns: 1fr;
  }
  .info-card:first-child :deep(.el-card__body),
  .meeting-card-wrapper :deep(.el-card__body) {
    min-height: auto;
  }
}
@media (min-width: 769px) {
  .meeting-card-wrapper :deep(.meeting-info) {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
</style>
