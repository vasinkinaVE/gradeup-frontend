<!-- src/components/common/MeetingCard.vue -->
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
      <!-- ✅ Кнопка "Завершить встречу" - только для Аттестующего, если встреча запланирована -->
      <el-button
        v-if="meeting.role === 'examiner' && meeting.status === 'planned'"
        class="btn-complete"
        size="small"
        type="warning"
        @click="confirmCompleteMeeting"
      >
        <el-icon><CircleCheck /></el-icon>
        Завершить встречу
      </el-button>

      <!-- ✅ Кнопка "Оценить" - только для Аттестующего, если встреча завершена и ещё не оценена -->
      <el-button
        v-if="
          meeting.role === 'examiner' && meeting.status === 'completed' && !meetingHasEvaluation
        "
        class="btn-grade"
        size="small"
        @click="openGradingModal"
      >
        <el-icon><Edit /></el-icon>
        Оценить
      </el-button>

      <!-- ✅ Кнопка "Результаты" - доступна всем, если встреча завершена и оценена -->
      <el-button
        v-if="meeting.status === 'completed' && meetingHasEvaluation"
        class="btn-results"
        size="small"
        plain
        @click="openResultsModal"
      >
        Результаты
      </el-button>
    </div>

    <!-- Модалка с деталями встречи -->
    <el-dialog
      v-model="isModalVisible"
      :title="meeting.skill_name"
      width="90%"
      :style="{ maxWidth: '800px' }"
      :close-on-click-modal="true"
      class="meeting-modal"
      align-center
      @open="onModalOpen"
    >
      <div class="meeting-modal-content">
        <div v-if="materialsLoading" class="loading-materials">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>Загрузка материалов...</span>
        </div>

        <template v-else>
          <!-- Описание встречи -->
          <div class="modal-section">
            <h4 class="section-title">Описание</h4>
            <p class="section-text" :class="{ 'placeholder-text': !meetingDetails.description }">
              {{ meetingDetails.description || 'Описание не указано' }}
            </p>
          </div>

          <!-- Материалы для подготовки -->
          <div class="modal-section">
            <h4 class="section-title">Материалы для подготовки</h4>
            <div v-if="meetingDetails.materials?.length" class="materials-text">
              <p
                v-for="(material, index) in meetingDetails.materials"
                :key="index"
                class="material-text"
              >
                {{ material }}
              </p>
            </div>
            <div v-else class="placeholder-text">Материалы пока не добавлены</div>
          </div>

          <!-- Вопросы и ответы (только для экзаменатора) -->
          <div
            v-if="meeting.role === 'examiner' && meetingDetails.questions?.length"
            class="modal-section"
          >
            <h4 class="section-title">{{ getQuestionsTitle(meeting.confirmation_type) }}</h4>
            <div class="questions-list">
              <div
                v-for="(question, qIdx) in meetingDetails.questions"
                :key="question.id || qIdx"
                class="question-item"
              >
                <div class="question-header" @click="toggleQuestion(question.id || qIdx)">
                  <el-icon
                    class="question-toggle-icon"
                    :class="{ 'is-expanded': expandedQuestions.has(question.id || qIdx) }"
                  >
                    <ArrowRight />
                  </el-icon>
                  <span class="question-text">{{ question.text }}</span>
                </div>

                <transition name="expand">
                  <div v-show="expandedQuestions.has(question.id || qIdx)" class="answer-block">
                    <span class="answer-label">{{
                      getAnswerLabel(meeting.confirmation_type)
                    }}</span>
                    <p class="answer-text">{{ question.idealAnswer }}</p>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </template>
      </div>
    </el-dialog>

    <!-- Модалка оценки -->
    <el-dialog
      v-model="isGradingModalVisible"
      title="Оценка встречи"
      width="90%"
      :style="{ maxWidth: '500px' }"
      :close-on-click-modal="false"
      class="grading-modal"
      align-center
    >
      <div class="grading-modal-content" v-if="gradingMeeting">
        <div class="grading-meeting-info">
          <h4 class="grading-meeting-title">{{ gradingMeeting.skill_name }}</h4>
          <span
            class="grading-stage-badge"
            :style="{
              borderColor: getConfirmationColor(gradingMeeting.confirmation_type),
              color: getConfirmationColor(gradingMeeting.confirmation_type),
            }"
          >
            {{ getMeetingTypeText(gradingMeeting.confirmation_type) }}
          </span>
        </div>

        <div class="grading-divider"></div>

        <div class="grading-participants">
          <span class="grading-participant-label">Аттестуемый:</span>
          <span class="grading-participant-name">
            {{ getAttestedName(gradingMeeting.participants) }}
          </span>
        </div>

        <div class="grading-evaluation">
          <span class="grading-evaluation-label">Оценка:</span>
          <el-radio-group v-model="gradeValue" class="grade-radio-group">
            <el-radio value="зачтено" class="grade-radio passed">зачтено</el-radio>
            <el-radio value="незачтено" class="grade-radio failed">незачтено</el-radio>
          </el-radio-group>
        </div>

        <div class="grading-comment-section">
          <span class="grading-comment-label">Комментарий:</span>
          <el-input
            v-model="gradeComment"
            type="textarea"
            :rows="3"
            placeholder="Введите комментарий..."
            class="grading-comment-input"
          />
        </div>
      </div>

      <template #footer>
        <div class="grading-modal-footer">
          <el-button class="btn-cancel" @click="closeGradingModal">Отмена</el-button>
          <el-button class="btn-save" type="primary" @click="saveGrade">Сохранить оценку</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Модалка результатов -->
    <el-dialog
      v-model="isResultsModalVisible"
      title="Результаты встречи"
      width="90%"
      :style="{ maxWidth: '500px' }"
      :close-on-click-modal="true"
      class="results-modal"
      align-center
    >
      <div class="results-modal-content">
        <div v-if="resultsLoading" class="loading-materials">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>Загрузка результатов...</span>
        </div>

        <template v-else-if="resultsMeeting && resultsData">
          <div class="result-header">
            <h4 class="result-title">{{ resultsMeeting.skill_name }}</h4>
            <span
              class="result-stage-badge"
              :style="{
                borderColor: getConfirmationColor(resultsMeeting.confirmation_type),
                color: getConfirmationColor(resultsMeeting.confirmation_type),
              }"
            >
              {{ getMeetingTypeText(resultsMeeting.confirmation_type) }}
            </span>
          </div>

          <div class="result-grade">
            <span class="grade-label">Оценка:</span>
            <span :class="['grade-value', resultsData.is_accepted ? 'passed' : 'failed']">
              {{ resultsData.is_accepted ? 'зачтено' : 'незачтено' }}
            </span>
            <span v-if="resultsData.updated_at" class="grade-date">
              , {{ formatDate(resultsData.updated_at) }}
            </span>
          </div>

          <div v-if="resultsData.comment" class="result-comment">
            <span class="comment-label">Комментарий:</span>
            <p class="comment-text">{{ resultsData.comment }}</p>
          </div>
        </template>

        <div v-else-if="resultsMeeting" class="no-results">
          Результаты ещё не опубликованы. Пожалуйста, дождитесь проверки.
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Clock,
  Location,
  Timer,
  Edit,
  ArrowRight,
  Loading,
  CircleCheck,
} from '@element-plus/icons-vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface MeetingParticipant {
  id: number
  user_id: number
  full_name: string
  role: string
  is_current_user: boolean
}

export interface Question {
  id?: string | number
  text: string
  idealAnswer: string
}

export interface MeetingResult {
  score?: number
  feedback?: string
  passed: boolean
  date?: string
}

export interface EvaluationData {
  id: number
  is_accepted: boolean
  stage_version_id: number
  comment: string
  updated_at: string
  skill_id: number
  title: string
  stage_id: number
  confirmation_type: string
}

export interface Meeting {
  id: number | string
  skill_name: string
  confirmation_type: string
  status: 'planned' | 'completed'
  date_time: string | Date
  location: string
  duration: number
  description?: string
  participants: MeetingParticipant[]
  role?: 'student' | 'examiner'
  isPast?: boolean
  isToday?: boolean
  isUpcoming?: boolean
  result?: MeetingResult
  stage_id?: number
  stage_version_id?: number
  skill_id?: number
  has_evaluation?: boolean // ✅ Флаг: есть ли уже оценка у встречи
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
  'save-grade': [meeting: Meeting, grade: 'зачтено' | 'незачтено', comment: string]
  'grade-saved': []
  'grade-error': [error: any]
  'meeting-completed': [meeting: Meeting]
  'meeting-status-updated': [meeting: Meeting]
}>()

const isModalVisible = ref(false)
const expandedQuestions = ref<Set<string | number>>(new Set())

const materialsLoading = ref(false)
const meetingDetails = ref<{
  description?: string
  materials: string[]
  questions: Question[]
}>({ description: undefined, materials: [], questions: [] })

const isGradingModalVisible = ref(false)
const gradingMeeting = ref<Meeting | null>(null)
const gradeValue = ref<'зачтено' | 'незачтено'>('зачтено')
const gradeComment = ref('')

const isResultsModalVisible = ref(false)
const resultsMeeting = ref<Meeting | null>(null)
const resultsLoading = ref(false)
const resultsData = ref<EvaluationData | null>(null)

// ✅ Улучшенная проверка: есть ли оценка (множественные источники)
const meetingHasEvaluation = computed(() => {
  // 1. Явный флаг от бэкенда
  if (props.meeting.has_evaluation === true) return true

  // 2. Если есть объект result с полем passed
  if (props.meeting.result?.passed !== undefined) return true

  // 3. Если уже загружены данные оценки в resultsData
  if (resultsData.value !== null) return true

  // 4. Если статус completed и есть stage_version_id - возможно, оценка есть (проверим асинхронно)
  // Возвращаем false, чтобы не блокировать UI, но запустим проверку в onMounted
  return false
})

// ✅ Асинхронная проверка наличия оценки через API
const checkEvaluationStatus = async () => {
  // Проверяем только если встреча завершена, но статус оценки неизвестен
  if (
    props.meeting.status === 'completed' &&
    props.meeting.has_evaluation === undefined &&
    props.meeting.result?.passed === undefined &&
    props.meeting.stage_version_id
  ) {
    try {
      const response = await axios.get(
        `${API_BASE}/evaluations/${props.meeting.stage_version_id}`,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        },
      )

      if (response.data?.id) {
        // Оценка найдена — обновляем локальное состояние
        resultsData.value = response.data as EvaluationData
        // Уведомляем родителя об обновлении статуса
        emit('meeting-status-updated', {
          ...props.meeting,
          has_evaluation: true,
        })
      }
    } catch (error) {
      // Если 404 — оценки нет, это нормально, просто игнорируем
      if (axios.isAxiosError(error) && error.response?.status !== 404) {
        console.error('Ошибка проверки оценки:', error)
      }
    }
  }
}

const openMeetingModal = () => {
  isModalVisible.value = true
}

const fetchMeetingMaterials = async () => {
  materialsLoading.value = true
  meetingDetails.value = { description: undefined, materials: [], questions: [] }

  try {
    const response = await axios.get(`${API_BASE}/meetings/${props.meeting.id}/materials`, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })

    const data = response.data
    const questions: Question[] = (data.questions || []).map((q: any) => ({
      id: q.id,
      text: q.question,
      idealAnswer: q.answer,
    }))
    const materials: string[] = data.literature
      ? String(data.literature)
          .split('\n')
          .filter((line: string) => line.trim())
      : []

    meetingDetails.value = {
      description: data.description,
      materials,
      questions,
    }
  } catch (error) {
    console.error('Ошибка загрузки материалов встречи:', error)
    meetingDetails.value = { description: undefined, materials: [], questions: [] }
  } finally {
    materialsLoading.value = false
  }
}

const fetchEvaluationResult = async () => {
  const stageVersionId = props.meeting.stage_version_id
  if (!stageVersionId) return null

  try {
    const response = await axios.get(`${API_BASE}/evaluations/${stageVersionId}`, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    })
    return response.data as EvaluationData
  } catch (error) {
    console.error('Ошибка загрузки оценки:', error)
    return null
  }
}

// ✅ Новый метод: завершить встречу
const completeMeeting = async () => {
  try {
    const response = await axios.patch(
      `${API_BASE}/meetings/${props.meeting.id}/set-status`,
      {},
      {
        params: { status: 'completed' },
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      },
    )

    const updatedMeeting = { ...props.meeting, status: 'completed' as const }

    ElMessage.success('Встреча завершена')
    emit('meeting-completed', updatedMeeting)
    emit('meeting-status-updated', updatedMeeting)

    return response.data
  } catch (error) {
    console.error('Ошибка завершения встречи:', error)
    ElMessage.error('Не удалось завершить встречу')
    throw error
  }
}

// ✅ Подтверждение завершения встречи
const confirmCompleteMeeting = async () => {
  try {
    await ElMessageBox.confirm(
      'Вы действительно хотите завершить встречу?',
      'Подтверждение действия',
      {
        confirmButtonText: 'Да, завершить',
        cancelButtonText: 'Отмена',
        type: 'warning',
        distinguishCancelAndClose: true,
      },
    )
    await completeMeeting()
  } catch (action) {
    if (action === 'cancel') {
      return
    }
  }
}

const submitGrade = async (
  attestedUserId: number | undefined,
  stageId: number | undefined,
  grade: 'зачтено' | 'незачтено',
  comment: string,
) => {
  if (!attestedUserId || !stageId) {
    throw new Error('Недостаточно данных для сохранения оценки')
  }

  const response = await axios.post(
    `${API_BASE}/evaluations/`,
    {
      user_id: attestedUserId,
      stage_id: stageId,
      is_accepted: grade === 'зачтено',
      comment,
    },
    {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    },
  )
  return response.data
}

const getAttestedUserId = (): number | undefined => {
  const attested = props.meeting.participants.find(
    (p) => p.role === 'Аттестуемый' || p.role === 'student',
  )
  return attested?.user_id
}

const onModalOpen = async () => {
  expandedQuestions.value.clear()
  await fetchMeetingMaterials()

  // ✅ Если встреча завершена, но оценка не известна — проверим асинхронно
  if (props.meeting.status === 'completed' && !meetingHasEvaluation.value) {
    await checkEvaluationStatus()
  }
}

const toggleQuestion = (questionId: string | number) => {
  if (expandedQuestions.value.has(questionId)) {
    expandedQuestions.value.delete(questionId)
  } else {
    expandedQuestions.value.add(questionId)
  }
}

const openGradingModal = () => {
  gradingMeeting.value = props.meeting
  gradeValue.value = 'зачтено'
  gradeComment.value = ''
  isGradingModalVisible.value = true
  emit('open-grading', props.meeting)
}

const closeGradingModal = () => {
  isGradingModalVisible.value = false
  gradingMeeting.value = null
}

const saveGrade = async () => {
  if (!gradingMeeting.value) return
  try {
    const attestedUserId = getAttestedUserId()

    await submitGrade(
      attestedUserId,
      gradingMeeting.value.stage_id,
      gradeValue.value,
      gradeComment.value,
    )

    ElMessage.success('Оценка сохранена')
    emit('save-grade', gradingMeeting.value, gradeValue.value, gradeComment.value)
    emit('grade-saved')
    closeGradingModal()

    emit('meeting-status-updated', { ...props.meeting, has_evaluation: true })
  } catch (error) {
    console.error('Ошибка сохранения оценки:', error)
    ElMessage.error('Не удалось сохранить оценку')
    emit('grade-error', error)
  }
}

const openResultsModal = async () => {
  resultsMeeting.value = props.meeting
  isResultsModalVisible.value = true
  emit('view-results', props.meeting)

  await loadResultsData()
}

const loadResultsData = async () => {
  if (!resultsMeeting.value || resultsMeeting.value.status !== 'completed') return

  resultsLoading.value = true
  resultsData.value = null

  try {
    const data = await fetchEvaluationResult()
    resultsData.value = data
  } catch (error) {
    console.error('Ошибка загрузки результатов:', error)
  } finally {
    resultsLoading.value = false
  }
}

const getAttestedName = (participants: MeetingParticipant[]): string => {
  const attested = participants.find((p) => p.role === 'Аттестуемый' || p.role === 'student')
  return attested?.full_name || '—'
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

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours} ч ${mins} мин`
  if (hours > 0) return `${hours} ч`
  return `${mins} мин`
}

const getStatusText = (status: string) => {
  return status === 'planned' ? 'Запланирована' : 'Завершена'
}

const getMeetingTypeText = (type: string) => {
  if (!type) return ''
  const typeMap: Record<string, string> = {
    certification: 'Аттестация',
    practice: 'Практическое задание',
    performance_review: 'Performance review',
  }
  return typeMap[type] || type
}

const getConfirmationColor = (type: string) => {
  const colorMap: Record<string, string> = {
    certification: '#ff9800',
    practice: '#4caf50',
    performance_review: '#f44336',
  }
  return colorMap[type] || 'var(--gray)'
}

const getQuestionsTitle = (type: string): string => {
  if (type === 'practice' || type === 'performance_review') {
    return 'Задания и критерии'
  }
  return 'Вопросы и ответы'
}

const getAnswerLabel = (type: string): string => {
  if (type === 'practice' || type === 'performance_review') {
    return 'Критерий оценивания:'
  }
  return 'Эталонный ответ:'
}

// ✅ Проверяем наличие оценки при монтировании компонента
onMounted(async () => {
  await checkEvaluationStatus()
})

defineExpose({
  openGradingModal,
  openResultsModal,
  openMeetingModal,
  fetchMeetingMaterials,
  loadResultsData,
  completeMeeting,
})
</script>

<style scoped>
.btn-complete {
  background-color: #ff9800 !important;
  border-color: #ff9800 !important;
  color: #fff !important;
}
.btn-complete:hover {
  background-color: #f57c00 !important;
  border-color: #f57c00 !important;
}
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
.meeting-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-sm);
  padding-top: var(--spacing-md);
  margin-top: var(--spacing-md);
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.btn-grade {
  background-color: var(--secondary) !important;
  border-color: var(--secondary) !important;
  color: #fff !important;
}
.btn-grade:hover {
  background-color: #5a3c7d !important;
  border-color: #5a3c7d !important;
}
.btn-results {
  color: var(--gray) !important;
  border-color: var(--gray) !important;
}
.btn-results:hover {
  background-color: var(--gray) !important;
  color: #fff !important;
}
.meeting-modal-content {
  padding: var(--spacing-sm) 0;
}
.loading-materials {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) 0;
  color: var(--gray);
  font-size: 14px;
}
.loading-materials .is-loading {
  animation: rotating 1s linear infinite;
}
@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
.grading-modal-content {
  padding: var(--spacing-sm) 0;
}
.grading-meeting-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}
.grading-meeting-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}
.grading-stage-badge {
  border: 1px solid;
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  background: transparent;
}
.grading-divider {
  height: 1px;
  background: #f0f0f0;
  margin: var(--spacing-md) 0;
}
.grading-participants {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}
.grading-participant-label {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}
.grading-participant-name {
  font-size: 14px;
  font-weight: var(--font-weight-normal);
  color: var(--text);
}
.grading-evaluation {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}
.grading-evaluation-label {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}
.grade-radio-group {
  display: flex;
  gap: var(--spacing-md);
}
.grade-radio :deep(.el-radio__label) {
  color: var(--text);
  font-size: 14px;
}
.grade-radio.passed :deep(.el-radio__input.is-checked .el-radio__inner) {
  background-color: #4caf50 !important;
  border-color: #4caf50 !important;
}
.grade-radio.failed :deep(.el-radio__input.is-checked .el-radio__inner) {
  background-color: #f44336 !important;
  border-color: #f44336 !important;
}
.grading-comment-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}
.grading-comment-label {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}
.grading-comment-input :deep(.el-textarea__inner) {
  color: var(--text);
  background: transparent;
  border: 1px solid #dcdfe6;
  border-radius: var(--radius-sm);
}
.grading-comment-input :deep(.el-textarea__inner:focus) {
  border-color: #909399 !important;
}
.grading-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
.btn-save {
  background-color: var(--secondary) !important;
  border-color: var(--secondary) !important;
  color: #fff !important;
}
.btn-save:hover {
  background-color: #5a3c7d !important;
  border-color: #5a3c7d !important;
}
.btn-cancel {
  color: var(--gray) !important;
  border-color: var(--gray) !important;
}
.btn-cancel:hover {
  background-color: #909399 !important;
  border-color: #909399 !important;
  color: #fff !important;
}
.results-modal-content {
  padding: var(--spacing-sm) 0;
}
.result-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid #f0f0f0;
}
.result-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}
.result-stage-badge {
  border: 1px solid;
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  background: transparent;
}
.result-grade {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
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
.result-comment {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
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
.no-results {
  font-size: 14px;
  color: var(--gray);
  font-style: italic;
  text-align: center;
  padding: var(--spacing-lg) 0;
}
@media (max-width: 700px) {
  .meeting-info {
    grid-template-columns: repeat(2, 1fr);
  }
  .meeting-header-top {
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }
}
@media (max-width: 480px) {
  .meeting-info {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  .meeting-card {
    padding: var(--spacing-sm);
  }
}
:deep(.meeting-modal),
:deep(.grading-modal),
:deep(.results-modal) {
  border-radius: 12px;
}
:deep(.meeting-modal .el-overlay),
:deep(.grading-modal .el-overlay),
:deep(.results-modal .el-overlay) {
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
}
:deep(.meeting-modal .el-dialog),
:deep(.grading-modal .el-dialog),
:deep(.results-modal .el-dialog) {
  margin: auto !important;
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
:deep(.meeting-modal .el-dialog__header),
:deep(.grading-modal .el-dialog__header),
:deep(.results-modal .el-dialog__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  margin-right: 0;
  border-bottom: 1px solid #eee;
}
:deep(.meeting-modal .el-dialog__title),
:deep(.grading-modal .el-dialog__title),
:deep(.results-modal .el-dialog__title) {
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  word-wrap: break-word;
}
:deep(.meeting-modal .el-dialog__body),
:deep(.grading-modal .el-dialog__body),
:deep(.results-modal .el-dialog__body) {
  padding: var(--spacing-lg);
  flex: 1;
  overflow-y: auto;
}
:deep(.meeting-modal .el-dialog__footer),
:deep(.grading-modal .el-dialog__footer),
:deep(.results-modal .el-dialog__footer) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid #eee;
}
:global(body.el-popup-parent--hidden) {
  padding-right: 0 !important;
  overflow-y: scroll !important;
}
:deep(.meeting-modal .el-dialog__headerbtn),
:deep(.meeting-modal .el-dialog__close),
:deep(.grading-modal .el-dialog__headerbtn),
:deep(.grading-modal .el-dialog__close),
:deep(.results-modal .el-dialog__headerbtn),
:deep(.results-modal .el-dialog__close) {
  color: var(--gray);
  transition: color 0.2s;
}
:deep(.meeting-modal .el-dialog__headerbtn:hover),
:deep(.meeting-modal .el-dialog__headerbtn:hover .el-icon),
:deep(.meeting-modal .el-dialog__close:hover),
:deep(.grading-modal .el-dialog__headerbtn:hover),
:deep(.grading-modal .el-dialog__headerbtn:hover .el-icon),
:deep(.grading-modal .el-dialog__close:hover),
:deep(.results-modal .el-dialog__headerbtn:hover),
:deep(.results-modal .el-dialog__headerbtn:hover .el-icon),
:deep(.results-modal .el-dialog__close:hover) {
  color: #f44336 !important;
}
@media (max-width: 1024px) {
  :deep(.meeting-modal .el-dialog__header),
  :deep(.meeting-modal .el-dialog__body),
  :deep(.meeting-modal .el-dialog__footer),
  :deep(.grading-modal .el-dialog__header),
  :deep(.grading-modal .el-dialog__body),
  :deep(.grading-modal .el-dialog__footer),
  :deep(.results-modal .el-dialog__header),
  :deep(.results-modal .el-dialog__body),
  :deep(.results-modal .el-dialog__footer) {
    padding: var(--spacing-md);
  }
}
@media (max-width: 768px) {
  :deep(.meeting-modal),
  :deep(.grading-modal),
  :deep(.results-modal) {
    width: 95% !important;
  }
  :deep(.meeting-modal .el-dialog),
  :deep(.grading-modal .el-dialog),
  :deep(.results-modal .el-dialog) {
    margin: auto !important;
    width: 100% !important;
    max-height: 90vh;
  }
  :deep(.meeting-modal .el-dialog__header),
  :deep(.grading-modal .el-dialog__header),
  :deep(.results-modal .el-dialog__header) {
    padding: var(--spacing-sm) var(--spacing-md);
  }
  :deep(.meeting-modal .el-dialog__title),
  :deep(.grading-modal .el-dialog__title),
  :deep(.results-modal .el-dialog__title) {
    font-size: 16px;
  }
  :deep(.meeting-modal .el-dialog__body),
  :deep(.grading-modal .el-dialog__body),
  :deep(.results-modal .el-dialog__body) {
    padding: var(--spacing-md);
  }
  :deep(.meeting-modal .el-dialog__footer),
  :deep(.grading-modal .el-dialog__footer),
  :deep(.results-modal .el-dialog__footer) {
    padding: var(--spacing-sm) var(--spacing-md);
  }
  .section-title,
  .grading-meeting-title,
  .grading-participant-label,
  .grading-participant-name,
  .grading-evaluation-label,
  .grading-comment-label,
  .result-title,
  .result-stage-badge,
  .grade-label,
  .grade-value,
  .grade-date,
  .comment-label,
  .comment-text {
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
@media (max-width: 480px) {
  :deep(.meeting-modal),
  :deep(.grading-modal),
  :deep(.results-modal) {
    width: 98% !important;
  }
  :deep(.meeting-modal .el-dialog__header),
  :deep(.meeting-modal .el-dialog__body),
  :deep(.meeting-modal .el-dialog__footer),
  :deep(.grading-modal .el-dialog__header),
  :deep(.grading-modal .el-dialog__body),
  :deep(.grading-modal .el-dialog__footer),
  :deep(.results-modal .el-dialog__header),
  :deep(.results-modal .el-dialog__body),
  :deep(.results-modal .el-dialog__footer) {
    padding: var(--spacing-sm);
  }
}
</style>
