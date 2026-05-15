<template>
  <div class="profile-card">
    <!-- Заголовок профиля -->
    <div class="profile-header">
      <h2 class="profile-title">Название профиля</h2>
      <p class="profile-description">Описание профиля</p>
    </div>

    <div class="profile-content">
      <div v-for="level in levels" :key="level.id" class="level-section">
        <!-- Заголовок уровня с прогрессом -->
        <div class="level-header" @click="toggleLevel(level.id)">
          <el-icon class="expand-icon" :class="{ expanded: expandedLevels.includes(level.id) }">
            <ArrowRight />
          </el-icon>
          <span class="level-title">{{ level.name }}</span>
          <!-- Прогресс уровня -->
          <div class="level-progress">
            <span class="level-progress-text">{{ level.progress }}%</span>
            <div class="level-progress-bar">
              <div class="level-progress-fill" :style="{ width: level.progress + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Таблица навыков -->
        <div v-show="expandedLevels.includes(level.id)" class="skills-table-wrapper">
          <table class="skills-table">
            <thead>
              <tr>
                <th class="skill-name-col">Навык</th>
                <th class="progress-col">Прогресс</th>
                <th class="stages-col">Этапы</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="skill in level.skills"
                :key="skill.id"
                class="skill-row"
                @click="openSkillModal(skill)"
              >
                <td class="skill-name">
                  {{ skill.name }}
                </td>
                <td class="skill-progress">
                  <div class="progress-bar-wrapper">
                    <span class="progress-text">{{ skill.total_progress }}%</span>
                    <div class="progress-bar">
                      <div
                        class="progress-bar-fill"
                        :style="{ width: skill.total_progress + '%' }"
                      ></div>
                    </div>
                  </div>
                </td>
                <td class="skill-stages">
                  <div class="stages-count">
                    {{ skill.stages.length }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Модалка с деталями навыка (встроена) -->
    <el-dialog
      v-model="isModalVisible"
      :title="selectedSkill?.name || ''"
      width="90%"
      :style="{ maxWidth: '800px' }"
      :close-on-click-modal="false"
      class="skill-modal"
      align-center
      @closed="onModalClosed"
    >
      <div class="skill-modal-content" v-if="selectedSkill">
        <!-- 🔹 Описание и материалы (ПЕРЕД табами) -->
        <div class="skill-info-section">
          <!-- Описание -->
          <div class="skill-description">
            <h4 class="section-title">Описание</h4>
            <p class="section-text" :class="{ 'placeholder-text': !selectedSkill.description }">
              {{ selectedSkill.description || 'Описание не указано' }}
            </p>
          </div>

          <!-- Материалы -->
          <div class="skill-materials">
            <h4 class="section-title">Материалы для подготовки</h4>
            <div v-if="selectedSkill.materials?.length" class="materials-text">
              <p
                v-for="(material, index) in selectedSkill.materials"
                :key="index"
                class="material-text"
              >
                {{ material }}
              </p>
            </div>
            <div v-else class="placeholder-text">Материалы пока не добавлены</div>
          </div>
        </div>

        <!-- 🔹 Табы с этапами -->
        <el-tabs v-model="activeTab" class="skill-tabs">
          <el-tab-pane
            v-for="stage in selectedSkill.stages"
            :key="stage.id"
            :label="getStageTypeName(stage.type)"
            :name="stage.id.toString()"
          >
            <div class="stage-content">
              <!-- 🔹 Если этап не защищен -->
              <div v-if="!stage.is_defended" class="placeholder-text">
                Этот этап навыка еще не был защищен
              </div>

              <!-- 🔹 Если этап защищен -->
              <div v-else class="stage-defended">
                <!-- Оценка + дата -->
                <div class="stage-grade">
                  <span class="grade-label">Оценка:</span>
                  <!-- ✅ Исправлено: динамический класс для цвета оценки -->
                  <span :class="['grade-value', stage.grade === 'зачтено' ? 'passed' : 'failed']">
                    {{ stage.grade || 'незачтено' }}
                  </span>
                  <span v-if="stage.date_time" class="grade-date"
                    >, {{ formatDate(stage.date_time) }}</span
                  >
                </div>

                <!-- Комментарий -->
                <div v-if="stage.comment" class="stage-comment">
                  <span class="comment-label">Комментарий:</span>
                  <p class="comment-text">{{ stage.comment }}</p>
                </div>

                <!-- ✅ Вопросы/Задания и ответы (только если это НЕ профиль текущего пользователя) -->
                <div
                  v-if="stage.questions?.length && !isCurrentUserProfile"
                  class="stage-questions"
                >
                  <h4 class="section-title">{{ getQuestionsTitle(stage.type) }}</h4>
                  <div class="questions-list">
                    <div
                      v-for="(question, qIdx) in stage.questions"
                      :key="question.id || qIdx"
                      class="question-item"
                    >
                      <!-- Заголовок вопроса с кнопкой сворачивания -->
                      <div class="question-header" @click="toggleQuestion(question.id || qIdx)">
                        <el-icon
                          class="question-toggle-icon"
                          :class="{ 'is-expanded': expandedQuestions.has(question.id || qIdx) }"
                        >
                          <ArrowRight />
                        </el-icon>
                        <span class="question-text">{{ question.text }}</span>
                      </div>

                      <!-- Разворачиваемый ответ -->
                      <transition name="expand">
                        <div
                          v-show="expandedQuestions.has(question.id || qIdx)"
                          class="answer-block"
                        >
                          <span class="answer-label">{{ getAnswerLabel(stage.type) }}</span>
                          <p class="answer-text">{{ question.answer }}</p>
                        </div>
                      </transition>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowRight, Close } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

export interface Question {
  id?: string | number
  text: string
  answer: string
}

export interface Stage {
  id: number
  type: 'practice' | 'attestation' | 'performance_review'
  description: string
  materials: string[]
  is_defended?: boolean
  grade?: 'зачтено' | 'незачтено'
  date_time?: string
  comment?: string
  questions?: Question[]
}

export interface Skill {
  id: number
  name: string
  total_progress: number
  description?: string
  materials?: string[]
  stages: Stage[]
}

export interface Level {
  id: number
  name: string
  progress: number
  skills: Skill[]
}

interface Props {
  levels: Level[]
}

const props = defineProps<Props>()
const authStore = useAuthStore()

// Проверяем, является ли это профилем текущего пользователя
const isCurrentUserProfile = computed(() => {
  return true
})

// Раскрывающиеся уровни
const expandedLevels = ref<number[]>([1])

// Выбранный навык для модалки
const selectedSkill = ref<Skill | null>(null)
const isModalVisible = ref(false)
const activeTab = ref('')

// Сворачиваемые вопросы
const expandedQuestions = ref<Set<string | number>>(new Set())

// Toggle уровня
const toggleLevel = (levelId: number) => {
  const index = expandedLevels.value.indexOf(levelId)
  if (index > -1) {
    expandedLevels.value.splice(index, 1)
  } else {
    expandedLevels.value.push(levelId)
  }
}

// Открытие модалки
const openSkillModal = (skill: Skill) => {
  selectedSkill.value = skill
  isModalVisible.value = true
  expandedQuestions.value.clear()
  if (skill.stages.length > 0) {
    activeTab.value = skill.stages[0].id.toString()
  }
}

// После закрытия модалки
const onModalClosed = () => {
  selectedSkill.value = null
  expandedQuestions.value.clear()
}

// Переключение сворачивания вопроса
const toggleQuestion = (questionId: string | number) => {
  if (expandedQuestions.value.has(questionId)) {
    expandedQuestions.value.delete(questionId)
  } else {
    expandedQuestions.value.add(questionId)
  }
}

// Получить название типа этапа
const getStageTypeName = (type: string) => {
  const names: Record<string, string> = {
    practice: 'Практика',
    attestation: 'Аттестация',
    performance_review: 'Performance review',
  }
  return names[type] || type
}

// ✅ Заголовок секции вопросов/заданий в зависимости от типа этапа
const getQuestionsTitle = (type: string): string => {
  if (type === 'practice' || type === 'performance_review') {
    return 'Задания и критерии'
  }
  return 'Вопросы и ответы'
}

// ✅ Подпись для ответа в зависимости от типа этапа
const getAnswerLabel = (type: string): string => {
  if (type === 'practice' || type === 'performance_review') {
    return 'Критерий оценивания:'
  }
  return 'Эталонный ответ:'
}

// Форматирование даты: 20.04.2026 15:30
const formatDate = (dateTime: string) => {
  const date = new Date(dateTime)
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\//g, '.')
    .replace(', ', ' ')
}
</script>

<style scoped>
.profile-card {
  padding: var(--spacing-md);
}

.profile-header {
  margin-bottom: var(--spacing-lg);
}

.profile-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  color: var(--text);
}

.profile-description {
  margin: 0;
  font-size: 14px;
  color: var(--gray);
  line-height: 1.5;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* Уровень */
.level-section {
  border: 1px solid #e4e7ed;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #fff;
}

.level-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: #fafafa;
  cursor: pointer;
  transition: background 0.2s;
}

.level-header:hover {
  background: #f5f7fa;
}

.expand-icon {
  font-size: 16px;
  color: var(--gray);
  transition: transform 0.3s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.level-title {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  flex: 1;
}

/* Прогресс уровня */
.level-progress {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.level-progress-text {
  font-size: 14px;
  font-weight: var(--font-weight-normal);
  color: var(--text);
  width: 40px;
  text-align: right;
}

.level-progress-bar {
  width: 120px;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  min-width: 0;
}

.level-progress-fill {
  height: 100%;
  background: #6a4c8d;
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Таблица навыков */
.skills-table-wrapper {
  overflow-x: auto;
}

.skills-table {
  width: 100%;
  border-collapse: collapse;
}

.skills-table th,
.skills-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.skills-table th {
  background: #fafafa;
  font-weight: var(--font-weight-semibold);
  font-size: 13px;
  color: var(--gray);
  text-transform: uppercase;
}

.skills-table tbody tr {
  cursor: pointer;
  transition: background 0.2s;
}

.skills-table tbody tr:hover {
  background: #f5f7fa;
}

.skill-name-col {
  width: 50%;
}

.skill-name {
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

.progress-col {
  width: 35%;
}

.progress-bar-wrapper {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: var(--spacing-md);
  align-items: center;
  width: 100%;
}

.progress-text {
  font-size: 14px;
  font-weight: var(--font-weight-normal);
  color: var(--text);
  text-align: right;
}

.progress-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  min-width: 0;
}

.progress-bar-fill {
  height: 100%;
  background: #6a4c8d;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.stages-col {
  width: 15%;
  text-align: center;
}

.stages-count {
  font-size: 14px;
  font-weight: var(--font-weight-normal);
  color: var(--text);
  background: var(--background);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

/* ========================================
   АДАПТИВНОСТЬ
   ======================================== */

/* Планшеты и большие телефоны (до 560px) */
@media (max-width: 560px) {
  .level-progress {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
    width: 30%;
  }

  .level-progress-text {
    width: auto;
    text-align: left;
  }

  .level-progress-bar {
    width: 100%;
  }

  .progress-bar-wrapper {
    grid-template-columns: 1fr;
    gap: var(--spacing-xs);
  }

  .progress-text {
    text-align: left;
  }

  .level-header {
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .level-title {
    width: 100%;
  }
}

/* 🔹 Очень маленькие экраны (до 429px) */
@media (max-width: 429px) {
  .skill-name {
    font-size: 13px;
  }

  .skills-table th,
  .skills-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}

/* ========================================
   Стили модалки
   ======================================== */

.skill-modal-content {
  padding: var(--spacing-sm) 0;
}

.skill-info-section {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid #eee;
}

.skill-description,
.skill-materials {
  margin-bottom: var(--spacing-md);
}

.skill-description:last-child,
.skill-materials:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin-bottom: var(--spacing-sm);
}

.section-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin: 0;
}

/* ✅ Плейсхолдеры: серый курсив БЕЗ выделения */
.placeholder-text {
  color: var(--gray);
  font-style: italic;
  background: transparent;
  padding: 0;
  border-radius: 0;
  margin: 0;
  display: block;
  font-size: 14px;
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

/* Табы */
.skill-tabs {
  margin-top: var(--spacing-md);
}

/* ✅ Фиолетовые табы при наведении и активном состоянии */
:deep(.skill-tabs .el-tabs__item) {
  color: var(--gray);
  transition: color 0.2s;
}

:deep(.skill-tabs .el-tabs__item:hover),
:deep(.skill-tabs .el-tabs__item.is-active) {
  color: var(--secondary);
}

:deep(.skill-tabs .el-tabs__active-bar) {
  background-color: var(--secondary);
}

.stage-content {
  padding: var(--spacing-sm) 0;
}

/* 🔹 Этап защищен */
.stage-defended {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* Оценка */
.stage-grade {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.grade-label {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

.grade-value {
  font-size: 14px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}

/* ✅ Исправлено: цвета для зачтено/незачтено */
.grade-value.passed {
  color: #4caf50;
}

.grade-value.failed {
  color: #f44336;
}

.grade-date {
  font-size: 14px;
  color: var(--text);
}

/* Комментарий */
.stage-comment {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.comment-label {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

.comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin: 0;
}

/* Вопросы и ответы */
.stage-questions {
  margin-top: var(--spacing-md);
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.question-item {
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(240, 240, 240, 0.5);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(228, 231, 237, 0.5);
}

/* Заголовок вопроса с кнопкой */
.question-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  padding: var(--spacing-xs) 0;
}

.question-toggle-icon {
  font-size: 14px;
  color: var(--gray);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.question-toggle-icon.is-expanded {
  transform: rotate(90deg);
}

.question-text {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
  line-height: 1.5;
}

/* Анимация разворачивания */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-top-width: 0;
}

.answer-block {
  padding-top: var(--spacing-sm);
  border-top: 1px solid rgba(228, 231, 237, 0.5);
  margin-top: var(--spacing-xs);
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

/* ========================================
   АДАПТИВНОСТЬ МОДАЛЬНОГО ОКНА
   ======================================== */

:deep(.skill-modal) {
  border-radius: 12px;
}

:deep(.skill-modal .el-overlay) {
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
}

:deep(.skill-modal .el-dialog) {
  margin: auto !important;
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

:deep(.skill-modal .el-dialog__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  margin-right: 0;
  border-bottom: 1px solid #eee;
}

:deep(.skill-modal .el-dialog__title) {
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  word-wrap: break-word;
}

:deep(.skill-modal .el-dialog__body) {
  padding: var(--spacing-lg);
  flex: 1;
  overflow-y: auto;
}

:deep(.skill-modal .el-dialog__footer) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid #eee;
}

/* ✅ Исправлено: крестик закрытия — красный при наведении */
:deep(.skill-modal .el-dialog__headerbtn),
:deep(.skill-modal .el-dialog__close) {
  color: var(--gray);
  transition: color 0.2s;
}

:deep(.skill-modal .el-dialog__headerbtn:hover),
:deep(.skill-modal .el-dialog__headerbtn:hover .el-icon),
:deep(.skill-modal .el-dialog__close:hover) {
  color: #f44336 !important;
}

:global(body.el-popup-parent--hidden) {
  padding-right: 0 !important;
  overflow-y: scroll !important;
}

/* Планшеты (до 1024px) */
@media (max-width: 1024px) {
  :deep(.skill-modal .el-dialog__header),
  :deep(.skill-modal .el-dialog__body),
  :deep(.skill-modal .el-dialog__footer) {
    padding: var(--spacing-md);
  }
}

/* Мобильные (до 768px) */
@media (max-width: 768px) {
  :deep(.skill-modal) {
    width: 95% !important;
  }

  :deep(.skill-modal .el-dialog) {
    margin: auto !important;
    width: 100% !important;
    max-height: 90vh;
  }

  :deep(.skill-modal .el-dialog__header) {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  :deep(.skill-modal .el-dialog__title) {
    font-size: 16px;
  }

  :deep(.skill-modal .el-dialog__body) {
    padding: var(--spacing-md);
  }

  :deep(.skill-modal .el-dialog__footer) {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .section-title {
    font-size: 13px;
  }

  .section-text,
  .question-text,
  .answer-text,
  .material-text,
  .placeholder-text {
    font-size: 13px;
    line-height: 1.5;
  }

  .question-item {
    padding: var(--spacing-sm);
  }

  .answer-label {
    font-size: 12px;
  }
}

/* Очень маленькие экраны (до 480px) */
@media (max-width: 480px) {
  :deep(.skill-modal) {
    width: 98% !important;
  }

  :deep(.skill-modal .el-dialog__header),
  :deep(.skill-modal .el-dialog__body),
  :deep(.skill-modal .el-dialog__footer) {
    padding: var(--spacing-sm);
  }
}
</style>
