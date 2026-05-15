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
              <!-- 🔹 Три отдельных поля: Фамилия, Имя, Отчество -->
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
          description:
            'Навык разработки современных SPA-приложений с использованием Vue.js 3, Composition API, Pinia и Vue Router',
          materials: [
            'Официальная документация Vue.js: https://vuejs.org/guide/introduction.html',
            'Vue Router: https://router.vuejs.org/',
            'Pinia: https://pinia.vuejs.org/',
            'Vue Style Guide: https://vuejs.org/style-guide/',
          ],
          stages: [
            {
              id: 1,
              type: 'practice',
              description: 'Практическое задание по созданию SPA приложения',
              materials: ['Vue.js Guide', 'Vue Router Documentation'],
              // ✅ Заполненные поля для защищённого этапа
              is_defended: true,
              grade: 'зачтено',
              date_time: '2026-04-20T15:30:00',
              comment:
                'Отлично выполнена работа с компонентами и роутингом. Рекомендуется углубить знания в области оптимизации производительности и работы с состоянием через Pinia.',
              questions: [
                {
                  id: 1,
                  text: 'В чём разница между Options API и Composition API?',
                  answer:
                    'Options API организует код по опциям (data, methods, computed), а Composition API позволяет группировать логику по функциональности через хуки (setup, ref, reactive). Composition API улучшает переиспользование и типизацию.',
                },
                {
                  id: 2,
                  text: 'Как работает реактивность в Vue 3?',
                  answer:
                    'Vue 3 использует Proxy для отслеживания изменений объектов. При чтении свойства происходит сбор зависимостей, при записи — уведомление подписчиков. Это позволяет автоматически обновлять DOM при изменении данных.',
                },
              ],
            },
            {
              id: 2,
              type: 'attestation',
              description: 'Аттестация по Vue.js',
              materials: ['Test questions', 'Practical exam'],
              // Можно также заполнить для аттестации при необходимости
              is_defended: true,
              grade: 'зачтено',
              date_time: '2026-04-22T10:00:00',
              comment:
                'Аттестация пройдена успешно. Кандидат продемонстрировал уверенные знания фреймворка.',
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
            },
            {
              id: 4,
              type: 'attestation',
              description: 'Аттестация по Git',
              materials: ['Exam'],
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
            },
            {
              id: 6,
              type: 'attestation',
              description: 'Аттестация',
              materials: [],
            },
            {
              id: 7,
              type: 'performance_review',
              description: 'Performance review',
              materials: [],
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

/* === ВЕРТИКАЛЬНОЕ ЦЕНТРИРОВАНИЕ ДЛЯ "ЛИЧНАЯ ИНФОРМАЦИЯ" === */
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
  /* 🔹 Увеличиваем ширину колонки с названиями + добавляем отступ между колонками */
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

/* === ВЕРТИКАЛЬНОЕ ЦЕНТРИРОВАНИЕ ДЛЯ "БЛИЖАЙШАЯ ВСТРЕЧА" === */
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

:deep(.el-card__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

:deep(.el-card__body) {
  padding: var(--spacing-lg);
}

/* 🔹 Убираем отступ справа при открытии модалок и меню (drawer) */
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

  /* На мобильных убираем фиксированную высоту */
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
