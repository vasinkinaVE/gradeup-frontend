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
              <div class="info-row">
                <span class="label">ФИО</span>
                <span class="value">{{ fullName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Должность</span>
                <span class="value">{{ currentUser.position || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Email</span>
                <span class="value">{{ currentUser.email }}</span>
              </div>
              <div class="info-row">
                <span class="label">Отдел</span>
                <span class="value">{{ currentUser.department_id || '—' }}</span>
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

            <ProfileCard :levels="profileLevels" />
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

const authStore = useAuthStore()

const currentUser = computed(() => authStore.user)

const fullName = computed(() => {
  const user = currentUser.value
  if (!user) return 'Пользователь'
  const { first_name = '', last_name = '', patronymic = '' } = user
  return `${last_name} ${first_name} ${patronymic || ''}`.trim() || 'Пользователь'
})

const upcomingMeeting = ref<Meeting | null>(null)
const profileLevels = ref<Level[]>([])

onMounted(async () => {
  if (!currentUser.value) {
    // Можно вызвать authStore.fetchCurrentUser()
  }

  await Promise.all([fetchUpcomingMeeting(), fetchProfileData()])
})

const fetchUpcomingMeeting = async () => {
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

// Загрузка данных профиля (заглушка - заменить на API вызов)
const fetchProfileData = async () => {
  profileLevels.value = [
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
            },
            {
              id: 2,
              type: 'attestation',
              description: 'Аттестация по Vue.js',
              materials: ['Test questions', 'Practical exam'],
              progress: 100,
            },
          ],
        },
        {
          id: 2,
          name: 'Работа с Git и системами контроля версий',
          total_progress: 100,
          stages: [
            {
              id: 3,
              type: 'practice',
              description: 'Практика работы с Git',
              materials: ['Git documentation'],
              progress: 100,
            },
            {
              id: 4,
              type: 'attestation',
              description: 'Аттестация по Git',
              materials: ['Exam'],
              progress: 100,
            },
          ],
        },
      ],
    },
    {
      id: 2,
      name: '1 категория',
      progress: 25,
      skills: [
        {
          id: 3,
          name: 'Архитектура frontend приложений',
          total_progress: 25,
          stages: [
            {
              id: 5,
              type: 'practice',
              description: 'Практика по архитектуре',
              materials: ['Architecture patterns'],
              progress: 50,
            },
            {
              id: 6,
              type: 'attestation',
              description: 'Аттестация',
              materials: [],
              progress: 0,
            },
            {
              id: 7,
              type: 'performance_review',
              description: 'Performance review',
              materials: [],
              progress: 0,
            },
          ],
        },
      ],
    },
    {
      id: 3,
      name: '2 категория',
      progress: 0,
      skills: [],
    },
  ]
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

/* Убираем hover-эффект и тень у карточек */
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

/* Убираем hover у Element Plus карточек через deep */
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

/* Личная информация: одинаковые отступы сверху и снизу */
.employee-info {
  padding: var(--spacing-md) 0; /* Одинаковый отступ сверху и снизу */
}

.info-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid #f0f0f0;
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

.meeting-placeholder {
  color: var(--gray);
  font-size: 14px;
  line-height: 1.5;
  padding: var(--spacing-md) 0;
  text-align: center;
}

:deep(.el-card__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

:deep(.el-card__body) {
  padding: var(--spacing-lg);
}

@media (max-width: 768px) {
  .top-row {
    grid-template-columns: 1fr;
  }
}
</style>
