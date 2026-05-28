<!-- src/views/DashboardView.vue -->
<template>
  <div class="employee-dashboard">
    <div class="dashboard-content">
      <!-- Приветствие -->
      <div class="welcome-section">
        <h1 class="welcome-title">Добро пожаловать, {{ fullName }}!</h1>
      </div>

      <div class="dashboard-grid">
        <!-- Верхняя строка -->
        <div class="top-row">
          <!-- Личная информация -->
          <el-card class="info-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon :size="18"><User /></el-icon>
                  Личная информация
                </span>
              </div>
            </template>

            <div class="employee-info" v-if="currentUser">
              <!-- Фамилия, Имя, Отчество -->
              <div class="info-row">
                <span class="label">Фамилия</span>
                <span class="value">{{ currentUser.last_name || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Имя</span>
                <span class="value">{{ currentUser.first_name || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Отчество</span>
                <span class="value">{{ currentUser.patronymic || '—' }}</span>
              </div>

              <!-- Должность -->
              <div class="info-row">
                <span class="label">Должность</span>
                <span class="value">{{ currentUser.position || '—' }}</span>
              </div>

              <!-- Email -->
              <div class="info-row">
                <span class="label">Email</span>
                <span class="value">{{ currentUser.email || '—' }}</span>
              </div>

              <!-- Отдел -->
              <div class="info-row">
                <span class="label">Отдел</span>
                <span class="value">{{ currentUser.department_name || '—' }}</span>
              </div>

              <!-- 🔹 Направление: показываем ТОЛЬКО если is_supervisor = true И division_id не null -->
              <div
                v-if="currentUser.is_supervisor && currentUser.division_id != null"
                class="info-row"
              >
                <span class="label">Направление</span>
                <span class="value">{{ currentUser.managed_division_name || '—' }}</span>
              </div>
            </div>
            <div v-else class="loading-placeholder">Загрузка...</div>
          </el-card>

          <!-- Ближайшая встреча -->
          <el-card class="info-card meeting-card-wrapper" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon :size="18"><Calendar /></el-icon>
                  Ближайшая встреча
                </span>
              </div>
            </template>

            <MeetingCard v-if="upcomingMeeting" :meeting="upcomingMeeting" />
            <div v-else class="meeting-placeholder">
              Информация о предстоящих встречах появится здесь, когда они будут назначены
            </div>
          </el-card>
        </div>

        <!-- Нижняя строка -->
        <div class="bottom-row">
          <el-card class="profile-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon :size="18"><List /></el-icon>
                  Профиль
                </span>
              </div>
            </template>

            <!-- ✅ Показываем ProfileCard только если профиль загружен -->
            <ProfileCard
              v-if="userProfile"
              :profile="userProfile"
              :user-id="currentUserId"
              :is-current-user="true"
              :fetch-skill-detail="fetchSkillDetail"
              :fetch-skill-questions="undefined"
              :use-questions-endpoint="false"
            />
            <!-- ✅ Если профиля нет (404) -->
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

// ✅ Создаем экземпляр axios с baseURL из .env (VITE_API_URL=/api)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const authStore = useAuthStore()

const currentUser = computed(() => authStore.user)
const currentUserId = computed(() => currentUser.value?.id)

const fullName = computed(() => {
  const user = currentUser.value
  if (!user) return 'Пользователь'
  const { first_name = '', last_name = '', patronymic = '' } = user
  return `${last_name} ${first_name} ${patronymic || ''}`.trim() || 'Пользователь'
})

const upcomingMeeting = ref<Meeting | null>(null)

// ✅ Профиль пользователя — может быть null, если не назначен
const userProfile = ref<{
  user_id: number
  profile_id: number
  title: string
  current_level_id: number
  levels: Level[]
  profile_progress: number
  ready_gradeup: boolean
} | null>(null)

onMounted(async () => {
  if (!currentUser.value) {
    await authStore.fetchCurrentUser()
  }

  await Promise.all([fetchUpcomingMeeting(), fetchUserProfile()])
})

const fetchUpcomingMeeting = async () => {
  // Заглушка - заменить на API вызов
  upcomingMeeting.value = {
    id: 1,
    skill_name: 'Разработка веб-приложений на Vue.js',
    confirmation_type: 'Практика',
    status: 'scheduled',
    date_time: '2026-04-25T14:00:00',
    location: 'Переговорная комната 305',
    duration: 90,
    participants: [
      {
        id: 1,
        full_name: fullName.value,
        role: 'Аттестуемый',
        is_current_user: true,
      },
      {
        id: 2,
        full_name: 'Иванов Иван Иванович',
        role: 'Аттестующий',
        is_current_user: false,
      },
    ],
  }
}

// ✅ Загрузка профиля пользователя с сервера
const fetchUserProfile = async () => {
  const userId = currentUserId.value
  if (!userId) return

  try {
    const response = await apiClient.get(`/users/${userId}/profile/`)
    userProfile.value = response.data
  } catch (error: any) {
    // ✅ Если 404 — профиль не назначен, это нормальная ситуация
    if (error?.response?.status === 404) {
      userProfile.value = null
    } else {
      console.error('Ошибка загрузки профиля:', error)
      userProfile.value = null
    }
  }
}

// ✅ Загрузка деталей навыка: GET /users/{user_id}/skills/{skill_id}
// Возвращает описание, материалы, стадии — без вопросов (вопросы не предусмотрены этим эндпоинтом)
const fetchSkillDetail = async (userId: number, skillId: number) => {
  const response = await apiClient.get(`/users/${userId}/skills/${skillId}`)
  return response.data
}
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

.info-card {
  height: 100%;
  width: 100%;
}

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

.loading-placeholder {
  color: var(--gray);
  padding: var(--spacing-md) 0;
  font-size: 14px;
}

.meeting-card-wrapper :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 220px;
  padding: var(--spacing-lg);
}

.meeting-placeholder {
  color: var(--gray);
  font-size: 14px;
  line-height: 1.5;
  padding: var(--spacing-md) 0;
  text-align: center;
  width: 100%;
}

/* ✅ Стиль для сообщения "Профиль не назначен" */
.profile-placeholder {
  color: var(--gray);
  font-size: 14px;
  line-height: 1.5;
  padding: var(--spacing-lg) 0;
  text-align: center;
  width: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
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
