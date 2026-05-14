<template>
  <div class="meeting-card">
    <!-- Верхняя строка: тип (слева) + статус (справа) -->
    <div class="meeting-header-top">
      <span
        class="confirmation-badge"
        :style="{
          borderColor: getConfirmationColor(meeting.confirmation_type),
          color: getConfirmationColor(meeting.confirmation_type),
        }"
      >
        {{ getMeetingTypeText(meeting.confirmation_type) }}
      </span>

      <span class="status-badge">
        {{ getStatusText(meeting.status) }}
      </span>
    </div>

    <!-- Заголовок: название встречи (кликабельное) -->
    <div class="meeting-header-bottom">
      <h3
        class="meeting-title meeting-title-clickable"
        @click="openMeetingModal"
        title="Подробнее о встрече"
      >
        {{ meeting.skill_name }}
      </h3>
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

    <!-- Футер с кнопками -->
    <div class="meeting-footer">
      <!-- Кнопка "Оценить" — только для руководителя, если встреча не завершена -->
      <el-button
        v-if="canGrade && meeting.status !== 'completed'"
        type="primary"
        size="small"
        @click="$emit('open-grading', meeting)"
      >
        <el-icon><Edit /></el-icon>
        Оценить
      </el-button>

      <!-- Кнопка "Результаты" — для аттестуемого, если встреча завершена -->
      <el-button
        v-if="meeting.role === 'ATTESTED' && meeting.status === 'completed'"
        type="primary"
        size="small"
        plain
        @click="$emit('view-results', meeting)"
      >
        Результаты
      </el-button>
    </div>

    <!-- Модалка с деталями встречи -->
    <el-dialog
      v-model="isModalVisible"
      :title="meeting.skill_name"
      width="90%"
      :style="{ maxWidth: '600px' }"
      :close-on-click-modal="true"
      class="meeting-modal"
      align-center
    >
      <div class="meeting-modal-content">
        <!-- Описание встречи -->
        <div class="modal-section">
          <h4 class="section-title">Описание</h4>
          <p class="section-text">{{ meeting.description || 'Описание не указано' }}</p>
        </div>

        <!-- ✅ Вопросы и ответы (для аттестующих И руководителей) -->
        <div v-if="meeting.role === 'ATTESTOR' || canGrade" class="modal-section">
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
import { Clock, Location, Timer, Edit } from '@element-plus/icons-vue'

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
  questions?: Question[]
  participants: MeetingParticipant[]
  role?: 'ATTESTED' | 'ATTESTOR'
  isPast?: boolean
  isToday?: boolean
  isUpcoming?: boolean
}

interface Props {
  meeting: Meeting
  canGrade?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canGrade: false,
})

const emit = defineEmits<{
  'view-results': [meeting: Meeting]
  'open-grading': [meeting: Meeting]
}>()

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
  border-radius: 6px;
  padding: var(--spacing-md);
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  min-width: 0;
}

/* === Верхняя строка: тип (слева) + статус (справа) === */
.meeting-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
  min-width: 0;
}

.confirmation-badge {
  border: 1px solid;
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  line-height: 1.4;
  background: transparent;
  flex-shrink: 0;
}

.status-badge {
  border: 1px solid var(--gray);
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--gray);
  background: transparent;
  white-space: nowrap;
  line-height: 1.4;
  flex-shrink: 0;
}

/* === Название встречи — под верхней строкой, по левому краю === */
.meeting-header-bottom {
  margin-bottom: var(--spacing-md);
  min-width: 0;
}

.meeting-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  line-height: 1.4;
  text-align: left;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.meeting-title-clickable {
  cursor: pointer;
  transition: color 0.2s;
}

.meeting-title-clickable:hover {
  color: var(--primary);
  text-decoration: underline;
}

/* 🔹 ПО УМОЛЧАНИЮ: 3 колонки (для Календаря) */
.meeting-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  min-width: 0;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  min-width: 0;
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
  min-width: 0;
  width: 100%;
}

.info-label {
  font-size: 13px;
  color: var(--gray);
  font-weight: var(--font-weight-normal);
  white-space: nowrap;
  flex-shrink: 0;
}

.info-value {
  font-size: 14px;
  color: var(--text);
  font-weight: var(--font-weight-medium);
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.participants-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-sm);
  min-width: 0;
  width: 100%;
}

.participants-title {
  font-size: 14px;
  color: var(--gray);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  flex-shrink: 0;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: 100%;
  min-width: 0;
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
  min-width: 0;
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
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.participant-role {
  font-size: 13px;
  color: #000000;
  font-weight: var(--font-weight-normal);
  flex-shrink: 0;
  white-space: nowrap;
}

/* Footer с кнопками */
.meeting-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  margin-top: var(--spacing-md);
  border-top: 1px solid #f0f0f0;
  /* 🔹 Убрали flex-wrap, чтобы кнопки не переносились на новую строку */
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
  word-wrap: break-word;
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
  border-radius: 6px;
  min-width: 0;
}

.question-text {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
  margin-bottom: var(--spacing-sm);
  line-height: 1.5;
  word-wrap: break-word;
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
  word-wrap: break-word;
}

.no-questions,
.no-materials {
  font-size: 14px;
  color: var(--gray);
  font-style: italic;
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: 6px;
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
  word-wrap: break-word;
}

/* ========================================
   АДАПТИВНОСТЬ (Базовая для компонента)
   ======================================== */

/* Планшеты (до 700px) — 2 колонки */
@media (max-width: 700px) {
  .meeting-info {
    grid-template-columns: repeat(2, 1fr);
  }

  .meeting-header-top {
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .participants-section {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }

  .participant-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .participant-role {
    align-self: flex-end;
  }
  /* 🔹 Убрали justify-content: center, чтобы кнопки не смещались */
}

/* Мобильные (до 480px) — 1 колонка */
@media (max-width: 480px) {
  .meeting-info {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }

  .meeting-card {
    padding: var(--spacing-sm);
  }
  /* Шрифты НЕ уменьшаем, как вы просили */
}

/* ========================================
   АДАПТИВНОСТЬ МОДАЛЬНОГО ОКНА
   ======================================== */

/* Глобальные стили для модального окна (через :deep) */
:deep(.meeting-modal) {
  border-radius: 12px;
}

/* 🔹 Центрирование модального окна по вертикали и горизонтали */
:deep(.meeting-modal .el-overlay) {
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
}

:deep(.meeting-modal .el-dialog) {
  margin: auto !important;
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

:deep(.meeting-modal .el-dialog__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  margin-right: 0;
  border-bottom: 1px solid #eee;
}

:deep(.meeting-modal .el-dialog__title) {
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  word-wrap: break-word;
}

:deep(.meeting-modal .el-dialog__body) {
  padding: var(--spacing-lg);
  flex: 1;
  overflow-y: auto;
}

:deep(.meeting-modal .el-dialog__footer) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid #eee;
}

/* 🔹 Убираем отступ справа при открытии модалки */
:global(body.el-popup-parent--hidden) {
  padding-right: 0 !important;
  overflow-y: scroll !important;
}

/* Планшеты (до 1024px) — уменьшаем отступы в модалке */
@media (max-width: 1024px) {
  :deep(.meeting-modal .el-dialog__header),
  :deep(.meeting-modal .el-dialog__body),
  :deep(.meeting-modal .el-dialog__footer) {
    padding: var(--spacing-md);
  }
}

/* Мобильные (до 768px) — адаптация модалки */
@media (max-width: 768px) {
  :deep(.meeting-modal) {
    width: 95% !important;
  }

  :deep(.meeting-modal .el-dialog) {
    margin: auto !important;
    width: 100% !important;
    max-height: 90vh;
  }

  :deep(.meeting-modal .el-dialog__header) {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  :deep(.meeting-modal .el-dialog__title) {
    font-size: 16px;
  }

  :deep(.meeting-modal .el-dialog__body) {
    padding: var(--spacing-md);
  }

  :deep(.meeting-modal .el-dialog__footer) {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  /* Компактные стили для контента модалки на мобильных */
  .section-title {
    font-size: 13px;
  }

  .section-text,
  .question-text,
  .answer-text,
  .material-text {
    font-size: 13px;
    line-height: 1.5;
  }

  .question-item {
    padding: var(--spacing-sm);
  }

  .question-number {
    margin-right: var(--spacing-xs);
  }

  .answer-label {
    font-size: 12px;
  }
}

/* Очень маленькие экраны (до 480px) — модалка */
@media (max-width: 480px) {
  :deep(.meeting-modal) {
    width: 98% !important;
  }

  :deep(.meeting-modal .el-dialog__header),
  :deep(.meeting-modal .el-dialog__body),
  :deep(.meeting-modal .el-dialog__footer) {
    padding: var(--spacing-sm);
  }

  .no-questions,
  .no-materials {
    padding: var(--spacing-sm);
  }
}
</style>
