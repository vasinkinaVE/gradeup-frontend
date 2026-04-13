<template>
  <div class="employee-dashboard">
    <!-- Основной контент -->
    <div class="dashboard-content">
      <!-- Приветствие -->
      <div class="welcome-section">
        <h1 class="welcome-title">Добро пожаловать, {{ fullName }}!</h1>
      </div>

      <!-- Сетка контента -->
      <div class="dashboard-grid">
        <!-- Основная колонка -->
        <div class="main-column">
          <!-- Личная информация -->
          <el-card class="info-card" shadow="hover">
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

            <el-divider />

            <!-- Прогресс в текущей категории -->
            <div class="progress-section">
              <el-alert
                title="Данные о прогрессе пока недоступны"
                type="info"
                :closable="false"
                show-icon
              />
            </div>
          </el-card>

          <!-- Сообщение об отсутствии аттестаций -->
          <el-alert
            title="Ближайшие встречи не запланированы"
            description="Информация о предстоящих встречах появится здесь, когда они будут назначены"
            type="info"
            :closable="false"
            show-icon
            class="no-attestation-alert"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Данные текущего пользователя из store
const currentUser = computed(() => authStore.user)

// ФИО из API-полей (first_name, last_name, patronymic)
const fullName = computed(() => {
  const user = currentUser.value
  if (!user) return 'Пользователь'
  const { first_name = '', last_name = '', patronymic = '' } = user
  return `${last_name} ${first_name} ${patronymic || ''}`.trim() || 'Пользователь'
})

// Загружаем пользователя при монтировании, если нужно
onMounted(async () => {
  if (!currentUser.value && localStorage.getItem('access_token')) {
    try {
      await authStore.fetchCurrentUser()
    } catch (err) {
      console.error('Failed to fetch user:', err)
    }
  }
})
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

/* Приветствие */
.welcome-section {
  margin-bottom: var(--spacing-lg);
}

.welcome-title {
  margin: 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text);
}

/* Сетка */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
}

/* Карточки */
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

/* Личная информация */
.employee-info {
  padding: var(--spacing-sm) 0;
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

/* Прогресс */
.progress-section {
  padding-top: var(--spacing-md);
}

/* Сообщение об отсутствии аттестаций */
.no-attestation-alert {
  margin-top: var(--spacing-md);
}

/* Deep styles для Element Plus */
:deep(.el-card__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

:deep(.el-card__body) {
  padding: var(--spacing-lg);
}

:deep(.el-divider) {
  margin: var(--spacing-md) 0;
}

:deep(.el-alert) {
  background-color: var(--background);
}
</style>
