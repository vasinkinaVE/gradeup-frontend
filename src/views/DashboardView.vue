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

            <div class="employee-info">
              <div class="info-row">
                <span class="label">ФИО</span>
                <span class="value">{{ fullName }}</span>
              </div>
              <div class="info-row">
                <span class="label">Должность</span>
                <span class="value">{{ currentUser?.position }}</span>
              </div>
              <div class="info-row">
                <span class="label">Категория</span>
                <span class="value">{{ currentUser?.category }}</span>
              </div>
              <div class="info-row">
                <span class="label">Email</span>
                <span class="value">{{ currentUser?.email }}</span>
              </div>
              <div class="info-row">
                <span class="label">Отдел</span>
                <span class="value">{{ currentUser?.department }}</span>
              </div>

              <el-divider />

              <!-- Прогресс в текущей категории -->
              <div class="progress-section">
                <div class="progress-header">
                  <span class="label">Прогресс категории</span>
                  <span class="progress-percent">{{ progress }}%</span>
                </div>
                <el-progress
                  :percentage="progress"
                  :stroke-width="8"
                  :show-text="false"
                  color="#6A4C8D"
                />
                <p class="progress-subtext">Закрыто тем: {{ closedTopics }} из {{ totalTopics }}</p>
              </div>
            </div>
          </el-card>

          <!-- Ближайшая аттестация -->
          <el-card class="attestation-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon :size="18"><Timer /></el-icon>
                  Ближайшая аттестация
                </span>
              </div>
            </template>

            <div class="attestation-header">
              <div class="attestation-badges">
                <span :class="['badge', 'type', getTypeClass(attestation.type)]">
                  {{ getTypeLabel(attestation.type) }}
                </span>
              </div>
              <h3 class="attestation-topic">{{ attestation.topic }}</h3>
              <el-tag class="status-badge" type="info" effect="plain"> Запланирована </el-tag>
            </div>

            <div class="attestation-info-grid">
              <div class="info-item">
                <el-icon class="info-icon"><Clock /></el-icon>
                <div class="info-content">
                  <span class="info-label">Дата и время</span>
                  <span class="info-value">{{ attestation.dateTime }}</span>
                </div>
              </div>

              <div class="info-item">
                <el-icon class="info-icon"><Location /></el-icon>
                <div class="info-content">
                  <span class="info-label">Место</span>
                  <span class="info-value">{{ attestation.location }}</span>
                </div>
              </div>

              <div class="info-item">
                <el-icon class="info-icon"><Watch /></el-icon>
                <div class="info-content">
                  <span class="info-label">Длительность</span>
                  <span class="info-value">{{ attestation.duration }} мин.</span>
                </div>
              </div>
            </div>

            <div class="participants-section">
              <span class="section-label">Участники:</span>
              <div class="participants-list">
                <div
                  v-for="participant in attestation.participants"
                  :key="participant.id"
                  class="participant-item"
                >
                  <el-avatar
                    :size="32"
                    class="participant-avatar"
                    :style="{ backgroundColor: getAvatarColor(participant.name) }"
                  >
                    {{ getInitials(participant.name) }}
                  </el-avatar>
                  <span class="participant-name">{{ participant.name }}</span>
                  <div class="participant-badges">
                    <el-tag
                      v-if="participant.id === currentUser?.id"
                      size="small"
                      type="info"
                      class="my-badge"
                    >
                      Я
                    </el-tag>
                    <el-tag
                      size="small"
                      :type="participant.role === 'ATTESTED' ? 'warning' : 'success'"
                      effect="plain"
                    >
                      {{ participant.role === 'ATTESTED' ? 'Аттестуемый' : 'Аттестующий' }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { User, Timer, Clock, Location, Watch } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Данные текущего пользователя из store
const currentUser = computed(() => authStore.currentUser)

const fullName = computed(() => {
  const user = currentUser.value
  if (!user) return 'Пользователь'
  return `${user.lastName} ${user.firstName} ${user.middleName || ''}`.trim()
})

// Прогресс (соответствует данным из профиля - 3 категория)
const progress = 56
const closedTopics = 14
const totalTopics = 25

// Mock-данные для ближайшей аттестации (соответствуют профилю)
const attestation = computed(() => ({
  id: '101',
  topic: 'Проектирование схем БД',
  type: 'attestation', // attestation, practice, performance
  dateTime: '17.03.2026, 10:00',
  location: 'Zoom',
  duration: 60,
  participants: [
    {
      id: currentUser.value?.id || '1',
      name: fullName.value,
      role: 'ATTESTED',
    },
    {
      id: '2',
      name: 'Петров П.П.',
      role: 'ATTESTOR',
    },
  ],
}))

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    attestation: 'Аттестация',
    practice: 'Практика',
    performance: 'Perf. Review',
  }
  return map[type] || type
}

const getTypeClass = (type: string) => {
  return `type-${type}`
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getAvatarColor = (name: string) => {
  const colors = ['#4A2C6D', '#6A4C8D', '#8B6FA8', '#A084B8']
  const index = name.length % colors.length
  return colors[index]
}
</script>

<style scoped>
.employee-dashboard {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* Основной контент */
.dashboard-content {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Приветствие */
.welcome-section {
  margin-bottom: 24px;
}

.welcome-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

/* Сетка */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

/* Карточки */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Личная информация */
.employee-info {
  padding: 8px 0;
}

.info-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  padding-right: 20px;
}

.value {
  color: #333;
  font-weight: 500;
  font-size: 14px;
  text-align: left;
}

.progress-section {
  padding-top: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}

.progress-percent {
  color: #6a4c8d;
  font-weight: 600;
}

.progress-subtext {
  margin: 10px 0 0;
  font-size: 13px;
  color: #666;
  text-align: center;
}

/* Аттестация */
.attestation-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.attestation-badges {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.badge.type {
  color: #fff;
}

.type-attestation {
  background: #f4b942;
  color: #333;
}

.type-practice {
  background: #4caf50;
}

.type-performance {
  background: #e74c3c;
}

.attestation-topic {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.status-badge {
  font-size: 12px;
  padding: 4px 10px;
}

.attestation-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px; /* ИЗМЕНЕНО: было 0 */
  margin-bottom: 24px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item {
  display: flex;
  flex-direction: row; /* ИЗМЕНЕНО: было column */
  align-items: flex-start; /* ИЗМЕНЕНО: было center */
  text-align: left; /* ИЗМЕНЕНО: было center */
  gap: 12px; /* ДОБАВЛЕНО: отступ между иконкой и текстом */
  padding: 0 10px;
}

.info-icon {
  font-size: 24px;
  color: #6a4c8d;
  flex-shrink: 0; /* ДОБАВЛЕНО: чтобы иконка не сжималась */
  margin-top: 2px; /* ДОБАВЛЕНО: небольшая корректировка по вертикали */
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1; /* ДОБАВЛЕНО: занимаем доступное пространство */
}

.info-label {
  font-size: 13px;
  color: #666;
}

.info-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.participants-section {
  margin-bottom: 20px;
}

.section-label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #f8f4fc;
}

.participant-avatar {
  flex-shrink: 0;
}

.participant-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  flex: 1;
}

.participant-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.my-badge {
  font-size: 11px;
  padding: 0 6px;
  height: 22px;
  line-height: 22px;
}

/* Deep styles */
:deep(.el-card__header) {
  padding: 14px 20px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-divider) {
  margin: 16px 0;
}
</style>
