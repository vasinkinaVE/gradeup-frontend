<!-- src/components/control/ProfilesSection.vue -->
<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление профилями</h2>
      <el-button type="primary" @click="openProfileDialog()">
        <el-icon><Plus /></el-icon>
        Создать профиль
      </el-button>
    </div>

    <!-- Поиск -->
    <div class="filters-row">
      <el-input
        v-model="profileSearch"
        placeholder="Поиск по названию профиля"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <!-- Таблица профилей -->
    <el-table :data="filteredProfiles" stripe border class="data-table" @row-click="viewProfile">
      <el-table-column prop="position" label="Название профиля" min-width="250" />
      <el-table-column prop="description" label="Описание" min-width="300" show-overflow-tooltip />
      <el-table-column prop="levelsCount" label="Уровней" width="100" align="center">
        <template #default="{ row }">
          {{ row.levels?.length || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="skillsCount" label="Навыков" width="100" align="center">
        <template #default="{ row }">
          {{ countProfileSkills(row) }}
        </template>
      </el-table-column>
    </el-table>

    <!-- 🔹 Модальное окно: ПРОСМОТР ПРОФИЛЯ -->
    <el-dialog
      v-model="viewProfileVisible"
      title="Просмотр профиля"
      :width="700"
      class="admin-dialog"
      destroy-on-close
    >
      <div v-if="viewingProfile" class="view-content">
        <div class="profile-view-section">
          <div class="view-label">Название профиля</div>
          <div class="view-value">{{ viewingProfile.position }}</div>
        </div>

        <div class="profile-view-section">
          <div class="view-label">Описание</div>
          <div class="view-value">{{ viewingProfile.description || '—' }}</div>
        </div>

        <div class="profile-view-section">
          <div class="view-label">Уровни</div>
          <div class="levels-collapse">
            <div
              v-for="(level, lIdx) in viewingProfile.levels"
              :key="lIdx"
              class="level-collapse-item"
            >
              <!-- Заголовок уровня -->
              <div class="level-collapse-header" @click="toggleViewLevelExpand(lIdx)">
                <span class="level-collapse-title">{{ level.name || `Уровень ${lIdx + 1}` }}</span>
                <el-icon
                  class="collapse-icon"
                  :class="{ expanded: expandedViewLevels.includes(lIdx) }"
                >
                  <ArrowRight />
                </el-icon>
              </div>

              <!-- Содержимое уровня (навыки) -->
              <el-collapse-transition>
                <div v-show="expandedViewLevels.includes(lIdx)" class="level-collapse-content">
                  <div class="skills-section-label">Навыки</div>
                  <div v-if="getAllSkillIdsForLevel(level).length" class="skills-list-container">
                    <div
                      v-for="skillId in getAllSkillIdsForLevel(level)"
                      :key="skillId"
                      class="skill-collapse-item"
                    >
                      <!-- Заголовок навыка -->
                      <div class="skill-collapse-header" @click="toggleViewSkillExpand(skillId)">
                        <span class="skill-collapse-title">{{ getSkillNameById(skillId) }}</span>
                        <el-icon
                          class="collapse-icon"
                          :class="{ expanded: expandedViewSkills.includes(skillId) }"
                        >
                          <ArrowRight />
                        </el-icon>
                      </div>

                      <!-- Содержимое навыка (как в просмотре навыка, без категории) -->
                      <el-collapse-transition>
                        <div
                          v-show="expandedViewSkills.includes(skillId)"
                          class="skill-collapse-content"
                        >
                          <div class="skill-detail-section">
                            <!-- Название -->
                            <div class="skill-detail-row">
                              <span class="skill-detail-label">Название:</span>
                              <span class="skill-detail-value">{{
                                getSkillNameById(skillId)
                              }}</span>
                            </div>
                            <!-- Описание -->
                            <div class="skill-detail-row">
                              <span class="skill-detail-label">Описание:</span>
                              <span class="skill-detail-value">{{
                                getSkillDescription(skillId)
                              }}</span>
                            </div>
                            <!-- Материалы -->
                            <div class="skill-detail-row">
                              <span class="skill-detail-label">Материалы:</span>
                              <span class="skill-detail-value">{{
                                getSkillMaterials(skillId)
                              }}</span>
                            </div>

                            <!-- Этапы навыка -->
                            <div
                              v-if="getSkillStages(skillId)?.length"
                              class="skill-stages-section"
                            >
                              <div class="skill-stages-label">Этапы:</div>
                              <!-- Табы этапов -->
                              <div class="skill-stages-tabs">
                                <div
                                  v-for="stageType in getSkillStageTypesWithContent(skillId)"
                                  :key="stageType.key"
                                  class="skill-stage-tab"
                                  :class="{
                                    active: getSkillSelectedStageType(skillId) === stageType.key,
                                  }"
                                  @click.stop="selectSkillStageType(skillId, stageType.key)"
                                >
                                  {{ stageType.label }}
                                </div>
                              </div>
                              <!-- Содержимое этапа -->
                              <div class="skill-stage-content">
                                <div
                                  v-for="(stage, sIdx) in getSkillStagesByType(
                                    skillId,
                                    getSkillSelectedStageType(skillId),
                                  )"
                                  :key="stage.id || sIdx"
                                  class="skill-stage-item"
                                >
                                  <div class="skill-stage-title">
                                    {{
                                      getSkillStageContentTitle(getSkillSelectedStageType(skillId))
                                    }}
                                  </div>
                                  <!-- Вопросы/Задания -->
                                  <div v-if="stage.questions?.length" class="skill-stage-qa-list">
                                    <div
                                      v-for="(q, qIdx) in stage.questions"
                                      :key="qIdx"
                                      class="skill-qa-item"
                                    >
                                      <div
                                        class="skill-qa-question"
                                        @click.stop="
                                          toggleSkillQAExpand(skillId, stage.id || sIdx, qIdx)
                                        "
                                      >
                                        <span>{{ qIdx + 1 }}.</span>
                                        <span class="skill-qa-question-text">{{ q.text }}</span>
                                        <el-icon
                                          class="collapse-icon"
                                          :class="{
                                            expanded:
                                              expandedSkillQA[
                                                `${skillId}_${stage.id || sIdx}_${qIdx}`
                                              ],
                                          }"
                                        >
                                          <ArrowRight />
                                        </el-icon>
                                      </div>
                                      <el-collapse-transition>
                                        <div
                                          v-show="
                                            expandedSkillQA[
                                              `${skillId}_${stage.id || sIdx}_${qIdx}`
                                            ]
                                          "
                                          class="skill-qa-answer"
                                        >
                                          <strong>{{
                                            isPracticeOrPerformance(stage.type)
                                              ? 'Критерий оценивания:'
                                              : 'Эталонный ответ:'
                                          }}</strong>
                                          {{ q.answer }}
                                        </div>
                                      </el-collapse-transition>
                                    </div>
                                  </div>
                                  <el-empty
                                    v-else
                                    description="Нет вопросов/заданий"
                                    :image-size="40"
                                  />
                                </div>
                              </div>
                            </div>
                            <el-empty
                              v-else
                              description="Этапы не добавлены"
                              :image-size="40"
                              class="skill-no-stages"
                            />
                          </div>
                        </div>
                      </el-collapse-transition>
                    </div>
                  </div>
                  <el-empty v-else description="Нет навыков" :image-size="50" />
                </div>
              </el-collapse-transition>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button :icon="Edit" @click="handleEditProfile">Редактировать</el-button>
        <el-button type="danger" :icon="Delete" @click="confirmDeleteProfile">Удалить</el-button>
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: Профиль (редактирование) -->
    <el-dialog
      v-model="profileDialogVisible"
      :title="editingProfile ? 'Редактирование профиля' : 'Новый профиль'"
      :width="700"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="profileForm" label-position="top" class="profile-form">
        <el-form-item label="Название профиля *" prop="position">
          <el-input v-model="profileForm.position" placeholder="Например: Frontend Developer" />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="profileForm.description"
            type="textarea"
            :rows="2"
            placeholder="Краткое описание профиля"
          />
        </el-form-item>

        <!-- Уровни -->
        <div class="form-section">
          <h4 class="section-title">Уровни</h4>
          <div class="levels-list">
            <div v-for="(level, lIdx) in profileForm.levels" :key="lIdx" class="level-item">
              <div class="level-header">
                <el-input
                  v-model="level.name"
                  placeholder="Название уровня (Ученик, 1 Категория...)"
                  class="level-name-input"
                />
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  circle
                  @click="removeLevel(lIdx)"
                />
              </div>

              <!-- Навыки уровня -->
              <div class="level-skills">
                <h5 class="subsection-title">Навыки</h5>
                <div v-for="(skillId, sIdx) in level.skills" :key="sIdx" class="skill-select-item">
                  <el-select
                    v-model="level.skills[sIdx]"
                    placeholder="Выберите навык"
                    filterable
                    remote
                    :remote-method="(query) => filterSkillsByQuery(query, lIdx, sIdx)"
                    :filter-method="filterSkills"
                    class="skill-select"
                    popper-class="skill-select-popper"
                  >
                    <!-- Навыки без категории (сначала) -->
                    <el-option-group
                      v-if="getUncategorizedSkillsList().length"
                      label="Без категории"
                    >
                      <el-option
                        v-for="skill in getUncategorizedSkillsList()"
                        :key="skill.id"
                        :label="skill.name"
                        :value="skill.id"
                      />
                    </el-option-group>
                    <!-- Навыки по категориям -->
                    <el-option-group
                      v-for="group in getSkillsByCategoryList()"
                      :key="group.categoryId"
                      :label="group.categoryName"
                    >
                      <el-option
                        v-for="skill in group.skills"
                        :key="skill.id"
                        :label="skill.name"
                        :value="skill.id"
                      />
                    </el-option-group>
                  </el-select>
                  <el-button
                    size="small"
                    type="danger"
                    :icon="Delete"
                    circle
                    @click="level.skills.splice(sIdx, 1)"
                  />
                </div>
                <el-button type="primary" link size="small" @click="level.skills.push(null)">
                  <el-icon><Plus /></el-icon> Добавить навык
                </el-button>
              </div>
            </div>
            <el-button type="primary" @click="addLevel" class="add-level-btn">
              <el-icon><Plus /></el-icon> Добавить уровень
            </el-button>
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="profileDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveProfile">Сохранить</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Edit, Search, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  profiles: {
    type: Array,
    required: true,
  },
  allSkills: {
    type: Array,
    required: true,
  },
  categories: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:profiles'])

// === Поиск ===
const profileSearch = ref('')

const filteredProfiles = computed(() => {
  if (!profileSearch.value) return props.profiles
  const q = profileSearch.value.toLowerCase()
  return props.profiles.filter((p) => p.position?.toLowerCase().includes(q))
})

// === Модальные окна ===
const profileDialogVisible = ref(false)
const viewProfileVisible = ref(false)

const editingProfile = ref(null)
const viewingProfile = ref(null)

// === Для просмотра профиля ===
const expandedViewLevels = ref([])
const expandedViewSkills = ref([])
const expandedSkillQA = ref({})
const skillSelectedStageTypes = ref({})

// === Форма профиля ===
const profileForm = ref({
  position: '',
  description: '',
  levels: [],
})

// === Поиск по навыкам (для каждого селекта отдельно) ===
const skillSearchQueries = ref({})

const setSkillSearchQuery = (levelIdx, skillIdx, query) => {
  const key = `${levelIdx}_${skillIdx}`
  skillSearchQueries.value[key] = query?.toLowerCase() || ''
}

const getSkillSearchQuery = (levelIdx, skillIdx) => {
  const key = `${levelIdx}_${skillIdx}`
  return skillSearchQueries.value[key] || ''
}

const filterSkillsByQuery = (query, levelIdx, skillIdx) => {
  setSkillSearchQuery(levelIdx, skillIdx, query)
}

const filterSkills = (value) => {
  return true
}

// === Хелперы для группировки навыков (для формы) ===
const getUncategorizedSkillsList = () => {
  return props.allSkills.filter((s) => !s.categoryId)
}

const getSkillsByCategoryList = () => {
  const result = []
  const grouped = {}

  props.allSkills.forEach((skill) => {
    if (skill.categoryId) {
      if (!grouped[skill.categoryId]) {
        grouped[skill.categoryId] = []
      }
      grouped[skill.categoryId].push(skill)
    }
  })

  Object.entries(grouped).forEach(([categoryId, skills]) => {
    const category = props.categories.find(
      (c) => c.id === Number(categoryId) || c.id === categoryId,
    )
    result.push({
      categoryId: categoryId,
      categoryName: category?.name || `Категория #${categoryId}`,
      skills: skills,
    })
  })

  return result
}

// === Хелперы для отображения навыков в просмотре ===
const getAllSkillIdsForLevel = (level) => {
  if (level.skills?.length) {
    return level.skills.filter((id) => id)
  }
  const allIds = []
  if (level.uncategorizedSkills?.length) {
    allIds.push(...level.uncategorizedSkills)
  }
  if (level.categories?.length) {
    level.categories.forEach((cat) => {
      if (cat.skills?.length) {
        allIds.push(...cat.skills)
      }
    })
  }
  return allIds
}

const getSkillById = (skillId) => {
  return props.allSkills.find((s) => s.id === skillId)
}

const getSkillNameById = (skillId) => getSkillById(skillId)?.name || `Навык #${skillId}`
const getSkillDescription = (skillId) => getSkillById(skillId)?.description || '—'
const getSkillMaterials = (skillId) => getSkillById(skillId)?.materials || 'Нет материалов'
const getSkillStages = (skillId) => getSkillById(skillId)?.stages || []

// === Хелперы для этапов навыка в просмотре профиля ===
const isPracticeOrPerformance = (type) => type === 'practice' || type === 'performance'

const skillStageTypes = [
  { key: 'practice', label: 'Практика' },
  { key: 'attestation', label: 'Аттестация' },
  { key: 'performance', label: 'Performance Review' },
]

const getSkillStageTypesWithContent = (skillId) => {
  const stages = getSkillStages(skillId)
  return skillStageTypes.filter((type) =>
    stages?.some((stage) => stage.type === type.key && stage.questions?.length > 0),
  )
}

const getSkillStagesByType = (skillId, type) => {
  return getSkillStages(skillId)?.filter((stage) => stage.type === type) || []
}

const getSkillStageContentTitle = (type) => {
  if (type === 'attestation') return 'Вопросы и ответы'
  return 'Задания и критерии'
}

const getSkillSelectedStageType = (skillId) => {
  return skillSelectedStageTypes.value[skillId] || 'practice'
}

const selectSkillStageType = (skillId, type) => {
  skillSelectedStageTypes.value[skillId] = type
}

// === Управление раскрытием ===
const toggleViewLevelExpand = (levelIdx) => {
  const idx = expandedViewLevels.value.indexOf(levelIdx)
  if (idx === -1) {
    expandedViewLevels.value.push(levelIdx)
  } else {
    expandedViewLevels.value.splice(idx, 1)
  }
}

const toggleViewSkillExpand = (skillId) => {
  const idx = expandedViewSkills.value.indexOf(skillId)
  if (idx === -1) {
    expandedViewSkills.value.push(skillId)
    // Инициализируем выбранный тип этапа при первом раскрытии
    if (!skillSelectedStageTypes.value[skillId]) {
      const firstAvailable = getSkillStageTypesWithContent(skillId)[0]?.key || 'practice'
      skillSelectedStageTypes.value[skillId] = firstAvailable
    }
  } else {
    expandedViewSkills.value.splice(idx, 1)
  }
}

const toggleSkillQAExpand = (skillId, stageId, idx) => {
  const key = `${skillId}_${stageId}_${idx}`
  expandedSkillQA.value[key] = !expandedSkillQA.value[key]
}

// === Хелперы ===
const countProfileSkills = (profile) => {
  if (!profile.levels) return 0
  return profile.levels.reduce((total, level) => {
    if (level.skills?.length) {
      return total + level.skills.filter((s) => s).length
    }
    let levelSkills = 0
    if (level.categories) {
      level.categories.forEach((cat) => {
        levelSkills += cat.skills?.filter((s) => s).length || 0
      })
    }
    levelSkills += level.uncategorizedSkills?.filter((s) => s).length || 0
    return total + levelSkills
  }, 0)
}

// === Профили: действия ===
const viewProfile = (profile) => {
  viewingProfile.value = profile
  expandedViewLevels.value = []
  expandedViewSkills.value = []
  expandedSkillQA.value = {}
  skillSelectedStageTypes.value = {}
  viewProfileVisible.value = true
}

const handleEditProfile = () => {
  openProfileDialog(viewingProfile.value)
  viewProfileVisible.value = false
}

const confirmDeleteProfile = async () => {
  if (!viewingProfile.value) return
  try {
    await ElMessageBox.confirm(
      `Удалить профиль "${viewingProfile.value.position}"?`,
      'Подтверждение',
      {
        type: 'warning',
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
      },
    )
    emit(
      'update:profiles',
      props.profiles.filter((p) => p.id !== viewingProfile.value.id),
    )
    ElMessage.success('Профиль удалён')
    viewProfileVisible.value = false
  } catch {
    // отменено
  }
}

const openProfileDialog = (profile = null) => {
  if (profile) {
    editingProfile.value = profile
    const normalizedLevels =
      profile.levels?.map((level) => {
        if (level.skills?.length) {
          return { ...level, skills: [...level.skills] }
        }
        const allSkillIds = []
        if (level.uncategorizedSkills?.length) {
          allSkillIds.push(...level.uncategorizedSkills)
        }
        if (level.categories?.length) {
          level.categories.forEach((cat) => {
            if (cat.skills?.length) {
              allSkillIds.push(...cat.skills)
            }
          })
        }
        return {
          ...level,
          skills: allSkillIds,
          categories: undefined,
          uncategorizedSkills: undefined,
        }
      }) || []

    profileForm.value = {
      position: profile.position || '',
      description: profile.description || '',
      levels: normalizedLevels,
    }
  } else {
    editingProfile.value = null
    profileForm.value = {
      position: '',
      description: '',
      levels: [],
    }
  }
  skillSearchQueries.value = {}
  profileDialogVisible.value = true
}

const addLevel = () => {
  profileForm.value.levels.push({
    name: '',
    skills: [],
  })
}

const removeLevel = (idx) => {
  profileForm.value.levels.splice(idx, 1)
}

const saveProfile = () => {
  if (!profileForm.value.position) {
    ElMessage.warning('Введите название профиля')
    return
  }

  if (editingProfile.value) {
    const idx = props.profiles.findIndex((p) => p.id === editingProfile.value.id)
    if (idx !== -1) {
      const updated = [...props.profiles]
      updated[idx] = { ...updated[idx], ...profileForm.value }
      emit('update:profiles', updated)
    }
    ElMessage.success('Профиль обновлён')
  } else {
    const newProfile = {
      id: Date.now(),
      ...profileForm.value,
    }
    emit('update:profiles', [newProfile, ...props.profiles])
    ElMessage.success('Профиль создан')
  }
  profileDialogVisible.value = false
}

const deleteProfile = async (profile) => {
  try {
    await ElMessageBox.confirm(`Удалить профиль "${profile.position}"?`, 'Подтверждение', {
      type: 'warning',
    })
    emit(
      'update:profiles',
      props.profiles.filter((p) => p.id !== profile.id),
    )
    ElMessage.success('Профиль удалён')
  } catch {
    /* отменено */
  }
}
</script>

<style scoped>
/* === Секция === */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}

.filters-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.data-table {
  width: 100%;
  margin-bottom: var(--spacing-md);
  cursor: pointer;
}

.data-table :deep(.el-table__row) {
  cursor: pointer;
}

.data-table :deep(.el-table__row:hover) {
  background-color: var(--background);
}

/* Формы */
.profile-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}

.form-section {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-md);
}

.section-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}

.subsection-title {
  margin: var(--spacing-md) 0 var(--spacing-sm) 0;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

/* Уровни и навыки */
.levels-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.level-item {
  padding: var(--spacing-md);
  background: #fff;
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}

.level-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.level-name-input {
  flex: 1;
}

.level-skills {
  padding-left: var(--spacing-md);
  border-left: 2px solid var(--background);
}

.skill-select-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.skill-select {
  flex: 1;
}

/* === Модальные окна просмотра === */
.view-content {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}

.profile-view-section {
  margin-bottom: var(--spacing-lg);
}

.view-label {
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin-bottom: var(--spacing-xs);
  font-size: 14px;
}

.view-value {
  font-size: 14px;
  color: var(--text);
  line-height: 1.6;
}

/* Уровни - сворачиваемые */
.levels-collapse {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.level-collapse-item {
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.level-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: #f9f9f9;
  cursor: pointer;
  transition: background 0.2s;
}
.level-collapse-header:hover {
  background: #f0f0f0;
}
.level-collapse-title {
  font-weight: var(--font-weight-medium);
  color: var(--text);
  font-size: 14px;
}
.level-collapse-content {
  padding: var(--spacing-md);
  background: #fff;
}

.skills-section-label {
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin: var(--spacing-sm) 0 var(--spacing-xs) 0;
  font-size: 14px;
}

.skills-list-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

/* Навыки - сворачиваемые */
.skill-collapse-item {
  border: 1px solid #d0d0d0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-top: var(--spacing-xs);
}
.skill-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) var(--spacing-md);
  background: #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}
.skill-collapse-header:hover {
  background: #e5e5e5;
}
.skill-collapse-title {
  font-weight: var(--font-weight-medium);
  color: var(--text);
  font-size: 13px;
}
.skill-collapse-content {
  padding: var(--spacing-md);
  background: #fafafa;
}

/* Детали навыка внутри профиля */
.skill-detail-section {
  font-size: 13px;
}
.skill-detail-row {
  margin-bottom: var(--spacing-xs);
  display: flex;
  gap: var(--spacing-xs);
}
.skill-detail-label {
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  min-width: 100px;
  flex-shrink: 0;
}
.skill-detail-value {
  color: var(--text);
  flex: 1;
}

/* Этапы навыка */
.skill-stages-section {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px dashed #ccc;
}
.skill-stages-label {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
  font-size: 13px;
}

/* Табы этапов навыка */
.skill-stages-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  border-bottom: 2px solid #d0d0d0;
}
.skill-stage-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  cursor: pointer;
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: #888;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}
.skill-stage-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* Содержимое этапа навыка */
.skill-stage-content {
  margin-top: var(--spacing-sm);
}
.skill-stage-item {
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: #fff;
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}
.skill-stage-title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
  color: var(--text);
  font-size: 13px;
}

/* Вопросы/ответы навыка */
.skill-stage-qa-list {
  margin-top: var(--spacing-xs);
}
.skill-qa-item {
  margin-bottom: var(--spacing-xs);
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.skill-qa-question {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f5f5f5;
  cursor: pointer;
  font-size: 12px;
}
.skill-qa-question:hover {
  background: #ebebeb;
}
.skill-qa-question-text {
  flex: 1;
}
.skill-qa-answer {
  padding: var(--spacing-sm);
  background: #fff;
  font-size: 12px;
  color: var(--text);
  border-top: 1px solid #e0e0e0;
}

.skill-no-stages {
  padding: var(--spacing-sm) 0;
}

/* Кнопки */
.add-level-btn {
  margin-top: var(--spacing-md);
}

.collapse-icon {
  transition: transform 0.2s;
  color: var(--gray);
  font-size: 14px;
}
.collapse-icon.expanded {
  transform: rotate(90deg);
}

/* Адаптивность */
@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .profile-form {
    max-height: 60vh;
  }
}

/* Deep styles для Element Plus */
:deep(.admin-dialog .el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}

:deep(.admin-dialog .el-form-item__label) {
  font-weight: var(--font-weight-medium);
}

/* Стили для группировки навыков в селекте */
:deep(.skill-select-popper .el-select-group__title) {
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  padding-left: 12px;
  font-size: 13px;
}

:deep(.skill-select-popper .el-select-group__wrap:not(:last-of-type)) {
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 4px;
  margin-bottom: 4px;
}
</style>
