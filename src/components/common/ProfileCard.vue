<!-- src/components/common/ProfileCard.vue -->
<template>
  <div class="profile-card">
    <div class="profile-header">
      <h2 class="profile-title">{{ profile?.title || profile?.name || 'Профиль' }}</h2>
      <p class="profile-description">{{ profile?.description || 'Описание не указано' }}</p>
    </div>

    <div class="profile-content">
      <div v-for="level in profileLevels" :key="level.id" class="level-section">
        <div class="level-header" @click="toggleLevel(level.id)">
          <el-icon class="expand-icon" :class="{ expanded: expandedLevels.includes(level.id) }"
            ><ArrowRight
          /></el-icon>
          <span class="level-title">{{
            level.level_name || level.name || `Уровень ${level.num}`
          }}</span>
          <div class="level-progress">
            <span class="level-progress-text"
              >{{ level.level_progress ?? level.progress ?? 0 }}%</span
            >
            <div class="level-progress-bar">
              <div
                class="level-progress-fill"
                :style="{ width: (level.level_progress ?? level.progress ?? 0) + '%' }"
              ></div>
            </div>
          </div>
        </div>

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
                v-for="skill in getLevelSkills(level)"
                :key="skill.id"
                class="skill-row"
                @click="openSkillModal(skill)"
              >
                <td class="skill-name">{{ skill.title || skill.name || 'Навык' }}</td>
                <td class="skill-progress">
                  <div class="progress-bar-wrapper">
                    <span class="progress-text"
                      >{{ skill.skill_progress ?? skill.progress ?? 0 }}%</span
                    >
                    <div class="progress-bar">
                      <div
                        class="progress-bar-fill"
                        :style="{ width: (skill.skill_progress ?? skill.progress ?? 0) + '%' }"
                      ></div>
                    </div>
                  </div>
                </td>
                <td class="skill-stages">
                  <div class="stages-count" :class="{ 'no-data': skill.stage_cnt === 0 }">
                    {{ skill.stage_cnt > 0 ? skill.stage_cnt : '—' }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="isModalVisible"
      :title="selectedSkill?.title || selectedSkill?.name || ''"
      width="90%"
      :style="{ maxWidth: '800px' }"
      :close-on-click-modal="false"
      class="skill-modal"
      align-center
      @closed="onModalClosed"
    >
      <div class="skill-modal-content" v-loading="skillLoading" v-if="selectedSkill">
        <div class="skill-info-section">
          <div class="skill-description">
            <h4 class="section-title">Описание</h4>
            <p class="section-text" :class="{ 'placeholder-text': !selectedSkill.description }">
              {{ selectedSkill.description || 'Описание не указано' }}
            </p>
          </div>
          <div class="skill-materials">
            <h4 class="section-title">Материалы для подготовки</h4>
            <div v-if="selectedSkill.literature" class="materials-text">
              <p
                v-for="(mat, i) in parseLiterature(selectedSkill.literature)"
                :key="i"
                class="material-text"
              >
                {{ mat }}
              </p>
            </div>
            <div v-else class="placeholder-text">Материалы пока не добавлены</div>
          </div>
        </div>

        <el-tabs v-model="activeTab" class="skill-tabs">
          <el-tab-pane
            v-for="stage in normalizedStages"
            :key="stage.uniqueKey"
            :label="getStageTypeName(stage.confirmation_type)"
            :name="stage.uniqueKey"
          >
            <div class="stage-content">
              <!-- ✅ Блок 1: Статус защиты (независимый) -->
              <div
                v-if="stage.is_accepted !== undefined && stage.is_accepted !== null"
                class="stage-defended"
              >
                <div class="stage-grade">
                  <span class="grade-label">Оценка:</span>
                  <span :class="['grade-value', stage.is_accepted ? 'passed' : 'failed']">
                    {{ stage.is_accepted ? 'зачтено' : 'незачтено' }}
                  </span>
                  <span v-if="stage.updated_at" class="grade-date"
                    >, {{ formatDate(stage.updated_at) }}</span
                  >
                </div>
                <div v-if="stage.comment" class="stage-comment">
                  <span class="comment-label">Комментарий:</span>
                  <p class="comment-text">{{ stage.comment }}</p>
                </div>
              </div>
              <div v-else class="placeholder-text">Этот этап навыка еще не был защищен</div>

              <!-- ✅ Блок 2: Вопросы/задания (независимый) -->
              <div v-if="hasQuestions(stage)" class="stage-questions">
                <h4 class="section-title">{{ getQuestionsTitle(stage.confirmation_type) }}</h4>
                <div class="questions-list">
                  <div
                    v-for="q in stage.normalizedQuestions"
                    :key="q.uniqueKey"
                    class="question-item"
                  >
                    <div class="question-header" @click="toggleQuestion(q.uniqueKey)">
                      <el-icon
                        class="question-toggle-icon"
                        :class="{ 'is-expanded': expandedQuestions.has(q.uniqueKey) }"
                      >
                        <ArrowRight />
                      </el-icon>
                      <span class="question-text">{{ q.question || q.text || 'Без текста' }}</span>
                    </div>
                    <transition name="expand">
                      <div v-show="expandedQuestions.has(q.uniqueKey)" class="answer-block">
                        <span class="answer-label">{{
                          getAnswerLabel(stage.confirmation_type)
                        }}</span>
                        <p class="answer-text">{{ q.answer || 'Ответ не указан' }}</p>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>
              <div v-else class="placeholder-text">Вопросы/задания не добавлены</div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'

interface StageTypeMap {
  Аттестация: string
  'Практическое задание': string
  'Performance review': string
}
const stageTypesNames: StageTypeMap = {
  Аттестация: 'Аттестация',
  'Практическое задание': 'Практическое задание',
  'Performance review': 'Performance review',
}

interface Question {
  uniqueKey: string | number
  text?: string
  question?: string
  answer?: string
  [k: string]: any
}
interface Stage {
  uniqueKey: string
  id?: number | null
  confirmation_type?: string
  user_stage_id?: number | null
  is_accepted?: boolean | null
  updated_at?: string
  comment?: string | null
  normalizedQuestions: Question[]
}
interface Skill {
  id: number
  name?: string
  title?: string
  skill_progress?: number
  progress?: number
  stage_cnt?: number
  description?: string
  literature?: string | string[]
  stages?: any[]
}
interface Level {
  id: number
  name?: string
  level_name?: string
  num?: number
  level_progress?: number
  progress?: number
  skills?: Skill[]
  level_skills?: (number | Skill)[]
}

const props = withDefaults(
  defineProps<{
    profile: {
      id?: number
      title?: string
      name?: string
      description?: string
      levels?: Level[]
      [k: string]: any
    }
    userId?: number
    isCurrentUser?: boolean
    fetchSkillDetail?: (userId: number, skillId: number) => Promise<any>
    fetchSkillQuestions?: (userId: number, skillId: number) => Promise<any>
    useQuestionsEndpoint?: boolean
  }>(),
  {
    userId: 0,
    isCurrentUser: false,
    useQuestionsEndpoint: true,
  },
)

const expandedLevels = ref<number[]>([])
const selectedSkill = ref<Skill | null>(null)
const isModalVisible = ref(false)
const activeTab = ref('')
const skillLoading = ref(false)
const expandedQuestions = ref<Set<string | number>>(new Set())

const profileLevels = computed(() =>
  (props.profile?.levels || []).map((l) => ({
    ...l,
    level_name: l.level_name || l.name || `Уровень ${l.num || ''}`,
    level_progress: l.level_progress ?? l.progress ?? 0,
  })),
)

const getLevelSkills = (level: Level): Skill[] => {
  const raw = level.skills || level.level_skills || []
  return raw.map((item: any) => {
    if (typeof item === 'object' && item !== null) {
      return {
        id: item.id,
        title: item.title || item.name || 'Навык',
        name: item.name || item.title,
        skill_progress: item.skill_progress ?? item.progress ?? 0,
        progress: item.progress ?? item.skill_progress ?? 0,
        stage_cnt: item.stage_cnt ?? 0,
        description: item.description,
        literature: item.literature,
        stages: Array.isArray(item.stages) ? item.stages : [],
        is_accepted: item.is_accepted,
      }
    }
    return {
      id: item as number,
      title: `Навык #${item}`,
      name: `Навык #${item}`,
      skill_progress: 0,
      progress: 0,
      stage_cnt: 0,
      stages: [],
    }
  })
}

const parseLiterature = (lit: string | string[] | undefined): string[] => {
  if (!lit) return []
  if (Array.isArray(lit)) return lit
  if (typeof lit === 'string') {
    return lit
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

const normalizeQuestions = (raw: any[], confirmationType: string): Question[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((q, i) => {
    if (q.uniqueKey) return q as Question
    return {
      uniqueKey: q.num ?? q.id ?? q.question_id ?? `q_${i}`,
      text: q.question ?? q.text ?? q.title ?? q.content ?? '',
      question: q.question ?? q.text ?? q.title ?? q.content ?? '',
      answer: q.answer ?? q.response ?? q.correct_answer ?? q.expected_answer ?? '',
    }
  })
}

const normalizeStages = (skill: Skill | null): Stage[] => {
  if (!skill?.stages || !Array.isArray(skill.stages)) return []
  return skill.stages.map((st: any, i) => {
    // ✅ Если normalizedQuestions уже есть — используем их
    if (st.normalizedQuestions && Array.isArray(st.normalizedQuestions)) {
      return {
        uniqueKey: `${st.id ?? `s_${i}`}_${st.confirmation_type}`,
        ...st,
      }
    }

    const id = st.id ?? `s_${i}`
    const confirmationType = st.confirmation_type || 'Практическое задание'
    const normQ = normalizeQuestions(
      st.questions || st.questions_list || st.items || [],
      confirmationType,
    )
    return {
      uniqueKey: `${id}_${confirmationType}`,
      id,
      confirmation_type: confirmationType,
      user_stage_id: st.user_stage_id,
      is_accepted: st.is_accepted,
      updated_at: st.updated_at || st.date_time,
      comment: st.comment || st.feedback,
      normalizedQuestions: normQ,
    }
  })
}

const normalizedStages = computed(() => normalizeStages(selectedSkill.value))
const hasQuestions = (s: Stage) => s.normalizedQuestions && s.normalizedQuestions.length > 0

const toggleLevel = (id: number) => {
  const i = expandedLevels.value.indexOf(id)
  i > -1 ? expandedLevels.value.splice(i, 1) : expandedLevels.value.push(id)
}

// ✅ ИСПРАВЛЕНО: Нормализация стадий при получении данных из API
const openSkillModal = async (skill: Skill) => {
  selectedSkill.value = { ...skill }
  isModalVisible.value = true
  expandedQuestions.value.clear()
  skillLoading.value = true

  try {
    let apiData: any = null

    if (props.useQuestionsEndpoint && props.fetchSkillQuestions && props.userId) {
      apiData = await props.fetchSkillQuestions(props.userId, skill.id)
    } else if (props.fetchSkillDetail && props.userId) {
      apiData = await props.fetchSkillDetail(props.userId, skill.id)
    }

    if (apiData && selectedSkill.value) {
      // Обновляем базовые поля
      if (apiData.description) selectedSkill.value.description = apiData.description
      if (apiData.literature) selectedSkill.value.literature = apiData.literature

      // ✅ ИСПРАВЛЕНО: Если API вернул стадии — нормализуем их сразу
      if (apiData.stages && Array.isArray(apiData.stages)) {
        selectedSkill.value.stages = apiData.stages.map((st: any) => ({
          id: st?.id ?? null,
          confirmation_type: st.confirmation_type || 'Практическое задание',
          user_stage_id: st.user_stage_id,
          is_accepted: st.is_accepted,
          comment: st.comment,
          updated_at: st.updated_at,
          // ✅ Преобразуем вопросы в формат Question с normalizedQuestions
          normalizedQuestions: (Array.isArray(st.questions) ? st.questions : []).map(
            (q: any, idx: number) => ({
              uniqueKey: q?.id ?? q?.num ?? `q_${idx}`,
              text: q?.question ?? q?.text ?? '',
              question: q?.question ?? q?.text ?? '',
              answer: q?.answer ?? '',
            }),
          ),
        }))
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки деталей навыка:', e)
  } finally {
    skillLoading.value = false
  }

  await nextTick()
  if (normalizedStages.value.length > 0) {
    activeTab.value = normalizedStages.value[0].uniqueKey
  }
}

const onModalClosed = () => {
  selectedSkill.value = null
  expandedQuestions.value.clear()
  activeTab.value = ''
}

const toggleQuestion = (k: string | number) =>
  expandedQuestions.value.has(k)
    ? expandedQuestions.value.delete(k)
    : expandedQuestions.value.add(k)

const getStageTypeName = (t: string | undefined | null) =>
  t && stageTypesNames[t as keyof StageTypeMap]
    ? stageTypesNames[t as keyof StageTypeMap]
    : 'Практическое задание'

const getQuestionsTitle = (t: string | undefined | null) =>
  t === 'Практическое задание' || t === 'Performance review'
    ? 'Задания и критерии'
    : 'Вопросы и ответы'

const getAnswerLabel = (t: string | undefined | null) =>
  t === 'Практическое задание' || t === 'Performance review'
    ? 'Критерий оценивания:'
    : 'Эталонный ответ:'

const formatDate = (d: string | null | undefined) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
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

watch(
  () => selectedSkill.value,
  () => {
    if (selectedSkill.value && normalizedStages.value.length)
      activeTab.value = normalizedStages.value[0].uniqueKey
  },
)
</script>

<style scoped>
.stages-count.no-data {
  color: var(--gray);
  font-style: italic;
}
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
}
.level-progress-fill {
  height: 100%;
  background: #6a4c8d;
  border-radius: 3px;
  transition: width 0.3s ease;
}
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
.stages-count.no-data {
  color: var(--gray);
  font-style: italic;
}
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
@media (max-width: 429px) {
  .skill-name {
    font-size: 13px;
  }
  .skills-table th,
  .skills-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
}
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
.placeholder-text {
  color: var(--gray);
  font-style: italic;
  display: block;
  font-size: 14px;
  margin: 0;
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
}
.skill-tabs {
  margin-top: var(--spacing-md);
}
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
.stage-defended {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
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
@media (max-width: 1024px) {
  :deep(.skill-modal .el-dialog__header),
  :deep(.skill-modal .el-dialog__body),
  :deep(.skill-modal .el-dialog__footer) {
    padding: var(--spacing-md);
  }
}
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
