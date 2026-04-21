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
      width="800px"
      :close-on-click-modal="false"
      @closed="onModalClosed"
    >
      <div class="skill-modal-content" v-if="selectedSkill">
        <!-- Табы с этапами -->
        <el-tabs v-model="activeTab" class="skill-tabs">
          <el-tab-pane
            v-for="stage in selectedSkill.stages"
            :key="stage.id"
            :label="getStageTypeName(stage.type)"
            :name="stage.id.toString()"
          >
            <div class="stage-content">
              <!-- Прогресс этапа -->
              <div class="stage-progress-section">
                <div class="progress-header">
                  <span class="progress-label">Прогресс этапа</span>
                  <span class="progress-value">{{ stage.progress }}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" :style="{ width: stage.progress + '%' }"></div>
                </div>
              </div>

              <!-- Описание -->
              <div class="stage-section">
                <h4 class="section-title">
                  <el-icon><Document /></el-icon>
                  Описание
                </h4>
                <p class="section-text">{{ stage.description }}</p>
              </div>

              <!-- Материалы -->
              <div class="stage-section">
                <h4 class="section-title">
                  <el-icon><Reading /></el-icon>
                  Материалы для подготовки
                </h4>
                <div v-if="stage.materials.length > 0" class="materials-text">
                  <p
                    v-for="(material, index) in stage.materials"
                    :key="index"
                    class="material-text"
                  >
                    {{ material }}
                  </p>
                </div>
                <div v-else class="no-materials">Материалы пока не добавлены</div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowRight, Document, Reading } from '@element-plus/icons-vue'

export interface Stage {
  id: number
  type: 'practice' | 'attestation' | 'performance_review'
  description: string
  materials: string[]
  progress: number
}

export interface Skill {
  id: number
  name: string
  total_progress: number
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

// Раскрывающиеся уровни
const expandedLevels = ref<number[]>([1])

// Выбранный навык для модалки
const selectedSkill = ref<Skill | null>(null)
const isModalVisible = ref(false)
const activeTab = ref('')

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
  // Инициализация активного таба при открытии
  if (skill.stages.length > 0) {
    activeTab.value = skill.stages[0].id.toString()
  }
}

// Закрытие модалки
const closeSkillModal = () => {
  isModalVisible.value = false
}

// После закрытия модалки
const onModalClosed = () => {
  selectedSkill.value = null
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

/* ===== Стили модалки (встроены) ===== */
.skill-modal-content {
  padding: var(--spacing-sm) 0;
}

.skill-tabs {
  margin-top: var(--spacing-md);
}

.stage-content {
  padding: var(--spacing-sm) 0;
}

/* Прогресс этапа */
.stage-progress-section {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-md);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.progress-label {
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

.progress-value {
  font-size: 18px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
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

/* Секции */
.stage-section {
  margin-bottom: var(--spacing-lg);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 14px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin-bottom: var(--spacing-sm);
}

.section-title .el-icon {
  color: var(--primary);
}

.section-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin: 0;
}

/* Материалы - просто текст */
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
  background: #fafafa;
  border-radius: var(--radius-sm);
}
</style>
