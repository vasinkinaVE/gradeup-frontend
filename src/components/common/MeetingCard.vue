<template>
  <div class="meeting-card">
    <!-- Статус -->
    <span class="status-badge">
      {{ getStatusText(meeting.status) }}
    </span>

    <!-- Заголовок: тип подтверждения + название (кликабельное) -->
    <div class="meeting-header">
      <div class="header-left">
        <span
          class="confirmation-badge"
          :style="{
            borderColor: getConfirmationColor(meeting.confirmation_type),
            color: getConfirmationColor(meeting.confirmation_type),
          }"
        >
          {{ getMeetingTypeText(meeting.confirmation_type) }}
        </span>
        <h3
          class="meeting-title meeting-title-clickable"
          @click="openMeetingModal"
          title="Подробнее о встрече"
        >
          {{ meeting.skill_name }}
        </h3>
      </div>
    </div>

    <!-- Информация: дата, место, длительность -->
    <div class="meeting-info">
      <div class="info-item">
        <el-icon class="info-icon"><Clock /></el-icon>
        <div class="info-content">
          <div class="info-label">Дата и время</div>
          <div class="info-value">{{ formatDateTime(meeting.date_time) }}</div>
        </div>
      </div>

      <div class="info-item">
        <el-icon class="info-icon"><Location /></el-icon>
        <div class="info-content">
          <div class="info-label">Место</div>
          <div class="info-value">{{ meeting.location }}</div>
        </div>
      </div>

      <div class="info-item">
        <el-icon class="info-icon"><Timer /></el-icon>
        <div class="info-content">
          <div class="info-label">Длительность</div>
          <div class="info-value">{{ formatDuration(meeting.duration) }}</div>
        </div>
      </div>
    </div>

    <!-- Участники -->
    <div class="participants-section">
      <span class="participants-title">Участники:</span>
      <div class="participants-list">
        <div
          v-for="participant in meeting.participants"
          :key="participant.id"
          class="participant-item"
          :class="{ 'is-current-user': participant.is_current_user }"
        >
          <span class="participant-name">{{ participant.full_name }}</span>
          <span class="participant-role">({{ participant.role }})</span>
        </div>
      </div>
    </div>

    <!-- Модалка с деталями встречи -->
    <el-dialog
      v-model="isModalVisible"
      :title="meeting.skill_name"
      width="600px"
      :close-on-click-modal="true"
    >
      <div class="meeting-modal-content">
        <!-- Описание встречи -->
        <div class="modal-section">
          <h4 class="section-title">Описание</h4>
          <p class="section-text">{{ meeting.description || 'Описание не указано' }}</p>
        </div>

        <!-- Вопросы и ответы (только для аттестующих и типа EXAM) -->
        <div v-if="meeting.role === 'ATTESTOR'" class="modal-section">
          <h4 class="section-title">Вопросы и ответы</h4>
          <div v-if="meeting.questions && meeting.questions.length > 0" class="questions-list">
            <div
              v-for="(question, index) in meeting.questions"
              :key="question.id || index"
              class="question-item"
            >
              <div class="question-text">
                <span class="question-number">{{ index + 1 }}.</span>
                {{ question.text }}
              </div>
              <div class="answer-block">
                <span class="answer-label">Эталонный ответ:</span>
                <p class="answer-text">{{ question.idealAnswer }}</p>
              </div>
            </div>
          </div>
          <div v-else class="no-questions">Вопросы пока не добавлены</div>
        </div>

        <!-- Материалы для подготовки -->
        <div class="modal-section">
          <h4 class="section-title">Материалы для подготовки</h4>
          <div v-if="meeting.materials && meeting.materials.length > 0" class="materials-text">
            <p v-for="(material, index) in meeting.materials" :key="index" class="material-text">
              {{ material }}
            </p>
          </div>
          <div v-else class="no-materials">Материалы пока не добавлены</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Clock, Location, Timer } from '@element-plus/icons-vue'

export interface MeetingParticipant {
  id: number | string
  full_name: string
  role: string
  is_current_user: boolean
}

export interface Question {
  id?: string | number
  text: string
  idealAnswer: string
}

export interface Meeting {
  id: number | string
  skill_name: string
  confirmation_type: string
  status: 'scheduled' | 'completed'
  date_time: string | Date
  location: string
  duration: number
  description?: string
  materials?: string[]
  questions?: Question[] // Вопросы для аттестующих
  participants: MeetingParticipant[]
  role?: 'ATTESTED' | 'ATTESTOR'
  isPast?: boolean
  isToday?: boolean
  isUpcoming?: boolean
}

interface Props {
  meeting: Meeting
}

const props = defineProps<Props>()

const isModalVisible = ref(false)

const openMeetingModal = () => {
  isModalVisible.value = true
}

const formatDateTime = (dateTime: string | Date) => {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours} ч ${mins} мин`
  if (hours > 0) return `${hours} ч`
  return `${mins} мин`
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    scheduled: 'Запланирована',
    completed: 'Завершена',
  }
  return texts[status] || status
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

const getConfirmationColor = (type: string) => {
  if (!type) return 'var(--gray)'
  const lower = type.toLowerCase()
  if (lower.includes('практик') || type === 'PRACTICE') return '#4caf50'
  if (lower.includes('аттест') || type === 'EXAM') return '#ff9800'
  if (lower.includes('perf') || lower.includes('review') || type === 'REVIEW') return '#f44336'
  return 'var(--gray)'
}
</script>

<style scoped>
.meeting-card {
  position: relative;
  background: #fff;
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  width: 100%;
  box-sizing: border-box;
}

.status-badge {
  position: absolute;
  top: 0;
  right: 0;
  border: 1px solid var(--gray);
  border-radius: var(--radius-sm);
  padding: 2px 10px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--gray);
  background: transparent;
  white-space: nowrap;
  line-height: 1.4;
}

.meeting-header {
  margin-bottom: var(--spacing-md);
  padding-right: 100px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.confirmation-badge {
  border: 1px solid;
  border-radius: var(--radius-sm);
  padding: 2px 10px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  line-height: 1.4;
  background: transparent;
}

.meeting-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  line-height: 1.4;
}

.meeting-title-clickable {
  cursor: pointer;
  transition: color 0.2s;
}

.meeting-title-clickable:hover {
  color: var(--primary);
  text-decoration: underline;
}

.meeting-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.info-icon {
  font-size: 18px;
  color: var(--primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.info-label {
  font-size: 13px;
  color: var(--gray);
  font-weight: var(--font-weight-normal);
}

.info-value {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.participants-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.participants-title {
  font-size: 14px;
  color: var(--gray);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: 100%;
}

.participant-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: 6px 10px;
  background: #f8f4fc;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}

.participant-item.is-current-user {
  background: #e8e0f0;
  border: 1px solid #d0c0e0;
}

.participant-name {
  flex: 1;
  font-size: 14px;
  color: var(--text);
  font-weight: var(--font-weight-medium);
  line-height: 1.5;
}

.participant-role {
  font-size: 13px;
  color: #000000;
  font-weight: var(--font-weight-normal);
  flex-shrink: 0;
}

/* Модалка */
.meeting-modal-content {
  padding: var(--spacing-sm) 0;
}

.modal-section {
  margin-bottom: var(--spacing-lg);
}

.modal-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin: 0 0 var(--spacing-sm) 0;
}

.section-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin: 0;
}

/* Вопросы и ответы */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.question-item {
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-sm);
}

.question-text {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
  margin-bottom: var(--spacing-sm);
  line-height: 1.5;
}

.question-number {
  font-weight: var(--font-weight-bold);
  color: var(--primary);
  margin-right: var(--spacing-xs);
}

.answer-block {
  padding-top: var(--spacing-sm);
  border-top: 1px solid #e4e7ed;
}

.answer-label {
  display: block;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--gray);
  margin-bottom: var(--spacing-xs);
}

.answer-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin: 0;
}

.no-questions {
  font-size: 14px;
  color: var(--gray);
  font-style: italic;
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-sm);
}

/* Материалы */
.materials-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.material-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin: 0;
  padding: 0;
}

.no-materials {
  font-size: 14px;
  color: var(--gray);
  font-style: italic;
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-sm);
}

@media (max-width: 768px) {
  .meeting-header {
    padding-right: 0;
  }

  .status-badge {
    position: static;
    margin-bottom: var(--spacing-sm);
  }

  .meeting-info {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }

  .participants-section {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
}
</style>
