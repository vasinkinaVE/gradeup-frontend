<!-- src/components/control/ProfilesSection.vue -->
<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление профилями</h2>
      <el-button type="primary" @click="openProfileDialog()" :loading="loading">
        <el-icon><Plus /></el-icon>
        Создать профиль
      </el-button>
    </div>

    <div class="filters-row">
      <el-input
        v-model="profileSearch"
        placeholder="Поиск по названию профиля"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
      <el-select
        v-model="departmentFilter"
        placeholder="Фильтр по отделам"
        multiple
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="2"
        clearable
        class="department-filter-select"
        @change="onDepartmentFilterChange"
      >
        <el-option
          v-for="dept in availableDepartments"
          :key="dept.id"
          :label="dept.name"
          :value="dept.id"
        />
      </el-select>
    </div>

    <el-table
      :data="filteredProfiles"
      stripe
      border
      class="data-table"
      @row-click="viewProfile"
      v-loading="loading"
      :empty-text="loading ? 'Загрузка...' : 'Нет профилей'"
    >
      <el-table-column prop="title" label="Название профиля" min-width="250" />
      <el-table-column prop="description" label="Описание" min-width="300" show-overflow-tooltip />
      <el-table-column label="Уровней" width="100" align="center">
        <template #default="{ row }">{{ row.levels?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="Навыков" width="100" align="center">
        <template #default="{ row }">{{ countProfileSkills(row) }}</template>
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
      <div v-if="viewingProfile" class="view-content" v-loading="viewLoading">
        <div class="profile-view-section">
          <div class="view-label">Название профиля</div>
          <div class="view-value">{{ viewingProfile.title }}</div>
        </div>
        <div class="profile-view-section">
          <div class="view-label">Описание</div>
          <div class="view-value view-value-multiline">{{ viewingProfile.description || '—' }}</div>
        </div>
        <div class="profile-view-section">
          <div class="view-label">Уровни</div>
          <div v-if="!viewingProfile.levels?.length" class="empty-placeholder">
            Уровни не добавлены
          </div>
          <div v-else class="levels-collapse">
            <div
              v-for="(level, lIdx) in viewingProfile.levels"
              :key="level.id || lIdx"
              class="level-collapse-item"
            >
              <div class="level-collapse-header" @click="toggleViewLevelExpand(lIdx)">
                <span class="level-collapse-title">{{
                  level.level_name || `Уровень ${level.num || lIdx + 1}`
                }}</span>
                <el-icon
                  class="collapse-icon"
                  :class="{ expanded: expandedViewLevels.includes(lIdx) }"
                  ><ArrowRight
                /></el-icon>
              </div>
              <el-collapse-transition>
                <div v-show="expandedViewLevels.includes(lIdx)" class="level-collapse-content">
                  <div class="skills-section-label">Навыки</div>
                  <div v-if="!getLevelSkillIds(level).length" class="empty-placeholder">
                    Навыки не добавлены
                  </div>
                  <div v-else class="skills-list-container">
                    <div
                      v-for="skillItem in getLevelSkillIds(level)"
                      :key="skillItem.id"
                      class="skill-collapse-item"
                    >
                      <div
                        class="skill-collapse-header"
                        @click="toggleViewSkillExpand(skillItem.id)"
                      >
                        <span class="skill-collapse-title">{{ skillItem.title }}</span>
                        <el-icon
                          class="collapse-icon"
                          :class="{ expanded: expandedViewSkills.includes(skillItem.id) }"
                          ><ArrowRight
                        /></el-icon>
                      </div>
                      <el-collapse-transition>
                        <div
                          v-show="expandedViewSkills.includes(skillItem.id)"
                          class="skill-collapse-content"
                        >
                          <div class="skill-detail-section">
                            <div class="skill-detail-row">
                              <span class="skill-detail-label">Название:</span
                              ><span class="skill-detail-value">{{ skillItem.title }}</span>
                            </div>
                            <div class="skill-detail-row">
                              <span class="skill-detail-label">Описание:</span
                              ><span class="skill-detail-value view-value-multiline">{{
                                getFullSkillDescription(skillItem.id)
                              }}</span>
                            </div>
                            <div class="skill-detail-row">
                              <span class="skill-detail-label">Материалы:</span
                              ><span class="skill-detail-value view-value-multiline">{{
                                getFullSkillMaterials(skillItem.id)
                              }}</span>
                            </div>
                            <div class="view-row" style="margin-top: var(--spacing-sm)">
                              <div class="view-label">Этапы</div>
                              <div
                                v-if="!getFullSkillStages(skillItem.id)?.length"
                                class="empty-placeholder"
                              >
                                Этапы не добавлены
                              </div>
                              <template v-else>
                                <div class="stages-tabs">
                                  <div
                                    v-for="stageType in getSkillStageTypesWithContent(skillItem.id)"
                                    :key="stageType.key"
                                    class="stage-tab"
                                    :class="{
                                      active:
                                        getSkillSelectedStageType(skillItem.id) === stageType.key,
                                    }"
                                    @click.stop="selectSkillStageType(skillItem.id, stageType.key)"
                                  >
                                    {{ stageType.label }}
                                  </div>
                                </div>
                                <div class="stage-content">
                                  <div
                                    v-if="
                                      !getSkillStagesByTypeSimple(
                                        skillItem.id,
                                        getSkillSelectedStageType(skillItem.id),
                                      )?.length
                                    "
                                    class="empty-placeholder"
                                  >
                                    Нет данных для этого этапа
                                  </div>
                                  <template v-else>
                                    <div
                                      v-for="(stage, sIdx) in getSkillStagesByTypeSimple(
                                        skillItem.id,
                                        getSkillSelectedStageType(skillItem.id),
                                      )"
                                      :key="stage.id || `stage_${sIdx}`"
                                      class="stage-item"
                                    >
                                      <div class="stage-title">
                                        {{
                                          getStageContentTitleSimple(
                                            getSkillSelectedStageType(skillItem.id),
                                          )
                                        }}
                                      </div>
                                      <div
                                        v-if="
                                          !stage.questions ||
                                          !Array.isArray(stage.questions) ||
                                          stage.questions.length === 0
                                        "
                                        class="empty-placeholder"
                                      >
                                        Вопросы/задания не добавлены
                                      </div>
                                      <div v-else class="stage-qa-list">
                                        <div
                                          v-for="(q, qIdx) in stage.questions"
                                          :key="q.id || `q_${sIdx}_${qIdx}`"
                                          class="qa-item"
                                        >
                                          <div
                                            class="qa-question"
                                            @click.stop="
                                              toggleSkillQAExpand(
                                                skillItem.id,
                                                stage.id || sIdx,
                                                qIdx,
                                              )
                                            "
                                          >
                                            <span>{{ qIdx + 1 }}.</span
                                            ><span class="qa-question-text">{{
                                              q.text || q.question || 'Без текста'
                                            }}</span>
                                            <el-icon
                                              class="collapse-icon"
                                              :class="{
                                                expanded:
                                                  expandedSkillQA[
                                                    `${skillItem.id}_${stage.id || sIdx}_${qIdx}`
                                                  ],
                                              }"
                                              ><ArrowRight
                                            /></el-icon>
                                          </div>
                                          <el-collapse-transition>
                                            <div
                                              v-show="
                                                expandedSkillQA[
                                                  `${skillItem.id}_${stage.id || sIdx}_${qIdx}`
                                                ]
                                              "
                                              class="qa-answer"
                                            >
                                              <strong>{{
                                                isPracticeOrPerformanceSimple(stage.type)
                                                  ? 'Критерий оценивания:'
                                                  : 'Эталонный ответ:'
                                              }}</strong>
                                              <span class="view-value-multiline">{{
                                                q.answer || '—'
                                              }}</span>
                                            </div>
                                          </el-collapse-transition>
                                        </div>
                                      </div>
                                    </div>
                                  </template>
                                </div>
                              </template>
                            </div>
                          </div>
                        </div>
                      </el-collapse-transition>
                    </div>
                  </div>
                </div>
              </el-collapse-transition>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button :icon="Edit" @click="handleEditProfile" :loading="loading"
          >Редактировать</el-button
        >
        <el-button type="danger" :icon="Delete" @click="confirmDeleteProfile" :loading="loading"
          >Удалить</el-button
        >
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
      <el-form :model="profileForm" label-position="top" class="profile-form" v-loading="loading">
        <el-form-item label="Название профиля *" prop="title">
          <el-input v-model="profileForm.title" placeholder="Например: Frontend Developer" />
        </el-form-item>
        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="profileForm.description"
            type="textarea"
            :rows="2"
            placeholder="Краткое описание профиля"
          />
        </el-form-item>
        <div class="form-section">
          <h4 class="section-title">Уровни</h4>
          <div class="levels-list">
            <div v-for="(level, lIdx) in profileForm.levels" :key="lIdx" class="level-item">
              <div class="level-header">
                <el-input
                  v-model="level.level_name"
                  placeholder="Название уровня"
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
              <div class="level-skills">
                <h5 class="subsection-title">Навыки</h5>
                <div class="skills-filter-row">
                  <el-select
                    v-model="skillCategoryFilter"
                    placeholder="Фильтр по категориям"
                    multiple
                    collapse-tags
                    collapse-tags-tooltip
                    :max-collapse-tags="2"
                    clearable
                    class="category-filter-select"
                  >
                    <el-option
                      v-for="cat in categories"
                      :key="cat.id"
                      :label="cat.name"
                      :value="cat.id"
                    />
                  </el-select>
                  <span class="filter-hint">Фильтрует все списки навыков</span>
                </div>
                <div v-for="(skillId, sIdx) in level.skills" :key="sIdx" class="skill-select-item">
                  <el-select
                    v-model="level.skills[sIdx]"
                    placeholder="Выберите навык"
                    filterable
                    clearable
                    class="skill-select"
                    popper-class="skill-select-popper"
                  >
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
                <el-button type="primary" link size="small" @click="level.skills.push(null)"
                  ><el-icon><Plus /></el-icon> Добавить навык</el-button
                >
              </div>
            </div>
            <el-button type="primary" @click="addLevel" class="add-level-btn" :disabled="loading"
              ><el-icon><Plus /></el-icon> Добавить уровень</el-button
            >
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="profileDialogVisible = false" :disabled="loading">Отмена</el-button>
        <el-button type="primary" @click="saveProfile" :loading="loading">Сохранить</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Edit, Search, ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  profiles: { type: Array, required: true },
  allSkills: { type: Array, required: true },
  categories: { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:profiles', 'refresh', 'update:departmentFilter'])
const API_BASE = import.meta.env.VITE_API_URL || '/api'

const profileSearch = ref('')
const departmentFilter = ref([])
const skillCategoryFilter = ref([])

const availableDepartments = computed(() =>
  (props.departments || []).map((d) => ({ id: d.id, name: d.name || d.title || `Отдел #${d.id}` })),
)
const filteredProfiles = computed(() => {
  let result = props.profiles || []
  if (profileSearch.value) {
    const q = profileSearch.value.toLowerCase()
    result = result.filter((p) => p.title?.toLowerCase().includes(q))
  }
  return result
})

const profileDialogVisible = ref(false)
const viewProfileVisible = ref(false)
const viewLoading = ref(false)
const editingProfile = ref(null)
const viewingProfile = ref(null)
const expandedViewLevels = ref([])
const expandedViewSkills = ref([])
const expandedSkillQA = ref({})
const skillSelectedStageTypes = ref({})

const profileForm = ref({ title: '', description: '', levels: [] })

const filteredAllSkills = computed(() => {
  let skills = props.allSkills || []
  if (skillCategoryFilter.value?.length > 0) {
    skills = skills.filter((skill) => {
      if (!skill.categoryId && !skill.categoryIds?.length) return false
      const skillCats = skill.categoryIds || (skill.categoryId ? [skill.categoryId] : [])
      return skillCats.some((cid) => skillCategoryFilter.value.includes(cid))
    })
  }
  return skills
})

const getUncategorizedSkillsList = () =>
  skillCategoryFilter.value?.length > 0
    ? []
    : (filteredAllSkills.value || []).filter((s) => !s.categoryId && !s.categoryIds?.length)
const getSkillsByCategoryList = () => {
  const result = [],
    grouped = {}
  if (!filteredAllSkills.value?.length) return []
  filteredAllSkills.value.forEach((skill) => {
    const catIds = skill.categoryIds || (skill.categoryId ? [skill.categoryId] : [])
    catIds.forEach((catId) => {
      if (!grouped[catId]) grouped[catId] = []
      grouped[catId].push(skill)
    })
  })
  Object.entries(grouped).forEach(([categoryId, skills]) => {
    const category = props.categories?.find((c) => String(c.id) === String(categoryId))
    result.push({ categoryId, categoryName: category?.name || `Категория #${categoryId}`, skills })
  })
  return result
}

const getLevelSkillIds = (level) => {
  if (level.level_skills?.length) return level.level_skills
  if (level.skills?.length) return level.skills.map((id) => ({ id, title: getSkillNameById(id) }))
  return []
}
const getSkillById = (skillId) =>
  props.allSkills?.find((s) => s.id === skillId || String(s.id) === String(skillId))
const getSkillNameById = (skillId) => {
  const s = getSkillById(skillId)
  return s?.name || s?.title || `Навык #${skillId}`
}

const fullSkillsCache = ref({})
const mapTypeToFrontendSimple = (backendType) => {
  if (!backendType) return 'practice'
  const t = String(backendType).trim()
  if (t === 'Аттестация') return 'attestation'
  if (t === 'Performance review') return 'performance'
  if (t === 'Практическое задание') return 'practice'
  return 'practice'
}

const fetchFullSkillData = async (skillId) => {
  if (fullSkillsCache.value[skillId]) return fullSkillsCache.value[skillId]
  try {
    const res = await fetch(`${API_BASE}/skills/${skillId}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    let data = await res.json()
    if (data?.skill && !data?.stages) data = { ...data, ...data.skill }
    if (data?.stages && Array.isArray(data.stages)) {
      data.stages = data.stages.map((stage) => {
        const rawQuestions = stage.questions || stage.questions_list || []
        const questions = Array.isArray(rawQuestions)
          ? rawQuestions.map((q) => ({
              id: q?.id || null,
              text: q?.question || q?.text || '',
              answer: q?.answer || '',
              num: q?.num || 1,
            }))
          : []
        return {
          id: stage?.id || null,
          type: mapTypeToFrontendSimple(stage.confirmation_type),
          confirmation_type: stage.confirmation_type,
          questions,
        }
      })
    } else {
      data.stages = []
    }
    fullSkillsCache.value[skillId] = data
    return data
  } catch (err) {
    console.error(`Error fetching skill ${skillId}:`, err)
    return (
      props.allSkills?.find((s) => s.id === skillId || String(s.id) === String(skillId)) || null
    )
  }
}

const getSkillData = (skillId) =>
  fullSkillsCache.value[skillId] ||
  props.allSkills?.find((s) => s.id === skillId || String(s.id) === String(skillId))
const getFullSkillDescription = (skillId) => getSkillData(skillId)?.description || '—'
const getFullSkillMaterials = (skillId) =>
  getSkillData(skillId)?.materials || getSkillData(skillId)?.literature || 'Нет материалов'
const getFullSkillStages = (skillId) => getSkillData(skillId)?.stages || []

const stageTypes = [
  { key: 'practice', label: 'Практическое задание' },
  { key: 'attestation', label: 'Аттестация' },
  { key: 'performance', label: 'Performance review' },
]
const getSkillStageTypesWithContent = (skillId) => {
  const stages = getFullSkillStages(skillId)
  if (!stages?.length) return stageTypes
  const available = stageTypes.filter((t) => stages.some((s) => s?.type === t.key))
  return available.length > 0 ? available : stageTypes
}
const getSkillStagesByTypeSimple = (skillId, type) => {
  const stages = getFullSkillStages(skillId)
  if (!stages || !Array.isArray(stages)) return []
  return stages.filter((s) => s?.type === type)
}
const getStageContentTitleSimple = (type) =>
  type === 'attestation' ? 'Вопросы и ответы' : 'Задания и критерии'
const isPracticeOrPerformanceSimple = (type) => type === 'practice' || type === 'performance'
const getSkillSelectedStageType = (skillId) => skillSelectedStageTypes.value[skillId] || 'practice'
const selectSkillStageType = (skillId, type) => {
  skillSelectedStageTypes.value[skillId] = type
}

const toggleViewLevelExpand = (levelIdx) => {
  const idx = expandedViewLevels.value.indexOf(levelIdx)
  if (idx === -1) expandedViewLevels.value.push(levelIdx)
  else expandedViewLevels.value.splice(idx, 1)
}
const toggleViewSkillExpand = async (skillId) => {
  const idx = expandedViewSkills.value.indexOf(skillId)
  if (idx === -1) {
    expandedViewSkills.value.push(skillId)
    if (!fullSkillsCache.value[skillId]) await fetchFullSkillData(skillId)
    if (!skillSelectedStageTypes.value[skillId]) {
      const allTypes = getSkillStageTypesWithContent(skillId)
      skillSelectedStageTypes.value[skillId] = allTypes[0]?.key || 'practice'
    }
  } else {
    expandedViewSkills.value.splice(idx, 1)
  }
}
const toggleSkillQAExpand = (skillId, stageId, idx) => {
  const key = `${skillId}_${stageId}_${idx}`
  expandedSkillQA.value[key] = !expandedSkillQA.value[key]
}

const countProfileSkills = (profile) => {
  if (!profile.levels) return 0
  return profile.levels.reduce(
    (total, level) => total + (level.level_skills?.length || level.skills?.length || 0),
    0,
  )
}

const fetchProfilesWithLevels = async (deptIds = null) => {
  try {
    emit('refresh')
    let url = `${API_BASE}/profiles/levels`
    if (deptIds && Array.isArray(deptIds) && deptIds.length > 0) {
      const params = new URLSearchParams()
      deptIds.forEach((id) => params.append('departments_id', String(id)))
      url = `${url}?${params.toString()}`
    }
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()
    let profilesData = data
    if (typeof data === 'string') {
      try {
        profilesData = JSON.parse(data)
      } catch {
        profilesData = []
      }
    }
    const normalized = Array.isArray(profilesData)
      ? profilesData.map(normalizeProfileFromBackend).filter(Boolean)
      : []
    emit('update:profiles', normalized)
    return normalized
  } catch (err) {
    console.error('Error fetching profiles with levels:', err)
    ElMessage.error('Не удалось загрузить профили')
    emit('update:profiles', [])
    return []
  }
}

const fetchProfileById = async (profileId) => {
  try {
    const res = await fetch(`${API_BASE}/profiles/${profileId}`, { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('Error fetching profile:', err)
    ElMessage.error('Не удалось загрузить профиль')
    return null
  }
}

const createProfile = async (profileData) => {
  console.log('📤 Sending payload to /profiles/ (POST):', JSON.stringify(profileData, null, 2))
  const res = await fetch(`${API_BASE}/profiles/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profileData),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    const errorMsg = Array.isArray(errData.detail)
      ? errData.detail.map((d) => d.msg).join('; ')
      : errData.detail || `HTTP ${res.status}`
    throw new Error(errorMsg)
  }
  return await res.json()
}

const updateProfile = async (profileId, profileData) => {
  console.log('📤 Sending payload to /profiles/:id (PUT):', JSON.stringify(profileData, null, 2))
  const res = await fetch(`${API_BASE}/profiles/${profileId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profileData),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    const errorMsg = Array.isArray(errData.detail)
      ? errData.detail.map((d) => d.msg).join('; ')
      : errData.detail || `HTTP ${res.status}`
    throw new Error(errorMsg)
  }
  return await res.json()
}

const deleteProfile = async (profileId) => {
  const res = await fetch(`${API_BASE}/profiles/${profileId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return await res.json()
}

// ✅ ИСПРАВЛЕНО: сохраняем id уровней и профиля при обновлении
const normalizeProfileFromBackend = (backendProfile) => {
  if (!backendProfile) return null
  let data = backendProfile
  if (typeof backendProfile === 'string') {
    try {
      data = JSON.parse(backendProfile)
    } catch {
      return null
    }
  }
  return {
    id: data.id,
    title: data.title || data.position || '',
    description: data.description || '',
    levels: Array.isArray(data.levels)
      ? data.levels.map((lvl) => ({
          id: lvl.id, // ✅ Сохраняем ID уровня
          num: lvl.num,
          level_name: lvl.level_name || lvl.name || '',
          level_skills: Array.isArray(lvl.level_skills)
            ? lvl.level_skills
            : Array.isArray(lvl.skills)
              ? lvl.skills
              : [],
          skills: Array.isArray(lvl.level_skills)
            ? lvl.level_skills.map((s) => (typeof s === 'object' ? s.id : s))
            : Array.isArray(lvl.skills)
              ? lvl.skills.map((s) => (typeof s === 'object' ? s.id : s))
              : [],
        }))
      : [],
  }
}

// ✅ ИСПРАВЛЕНО: передаём id профиля и id уровней при обновлении
const prepareProfileForBackend = (frontendProfile) => {
  const payload = {
    profile: {
      id: frontendProfile.id || null, // ✅ ID профиля для PUT-запроса
      title: (frontendProfile.title || '').trim(),
      description: frontendProfile.description || '',
    },
    levels: (frontendProfile.levels || []).map((lvl, idx) => {
      const rawSkills = lvl.skills || lvl.level_skills || []
      const skillIds = rawSkills
        .map((s) => (typeof s === 'object' && s !== null ? s.id : s))
        .filter((id) => id != null && id !== '' && Number.isInteger(Number(id)))

      const levelPayload = {
        level_name: (lvl.level_name || lvl.name || `Уровень ${idx + 1}`).trim(),
        num: lvl.num || idx + 1,
        skills: skillIds,
      }

      // ✅ Ключевое: передаём id уровня при обновлении, чтобы бэкенд обновлял, а не создавал дубликаты
      if (lvl.id != null) {
        levelPayload.id = lvl.id
      }

      return levelPayload
    }),
  }
  console.log('📦 Prepared payload:', JSON.stringify(payload, null, 2))
  return payload
}

const viewProfile = async (profile) => {
  try {
    viewLoading.value = true
    const fullProfile = await fetchProfileById(profile.id)
    viewingProfile.value = fullProfile
      ? normalizeProfileFromBackend(fullProfile)
      : normalizeProfileFromBackend(profile)
    expandedViewLevels.value = []
    expandedViewSkills.value = []
    expandedSkillQA.value = {}
    skillSelectedStageTypes.value = {}
    viewProfileVisible.value = true
  } catch (err) {
    console.error('Error viewing profile:', err)
    ElMessage.error('Не удалось загрузить профиль')
  } finally {
    viewLoading.value = false
  }
}

const handleEditProfile = () => {
  if (viewingProfile.value) openProfileDialog(viewingProfile.value)
  viewProfileVisible.value = false
}

const confirmDeleteProfile = async () => {
  if (!viewingProfile.value?.id) return
  try {
    await ElMessageBox.confirm(
      `Удалить профиль "${viewingProfile.value.title}"?`,
      'Подтверждение',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
    emit('refresh')
    await deleteProfile(viewingProfile.value.id)
    ElMessage.success('Профиль удалён')
    await fetchProfilesWithLevels(departmentFilter.value.length ? departmentFilter.value : null)
    viewProfileVisible.value = false
  } catch (err) {
    if (err !== 'cancel') ElMessage.error(err.message || 'Ошибка при удалении профиля')
  }
}

const onDepartmentFilterChange = async () => {
  emit('update:departmentFilter', departmentFilter.value)
  await fetchProfilesWithLevels(departmentFilter.value.length > 0 ? departmentFilter.value : null)
}

const openProfileDialog = (profile = null) => {
  if (profile) {
    editingProfile.value = profile
    const normalized = normalizeProfileFromBackend(profile)
    profileForm.value = {
      id: normalized.id, // ✅ Сохраняем ID профиля
      title: normalized.title || '',
      description: normalized.description || '',
      levels:
        normalized.levels?.map((lvl) => ({
          id: lvl.id, // ✅ Сохраняем ID уровня
          num: lvl.num,
          level_name: lvl.level_name,
          skills: lvl.skills || [],
        })) || [],
    }
  } else {
    editingProfile.value = null
    profileForm.value = { title: '', description: '', levels: [] }
  }
  skillCategoryFilter.value = []
  profileDialogVisible.value = true
}

const addLevel = () => {
  profileForm.value.levels.push({
    level_name: '',
    num: profileForm.value.levels.length + 1,
    skills: [],
  })
}
const removeLevel = (idx) => {
  profileForm.value.levels.splice(idx, 1)
  profileForm.value.levels.forEach((lvl, i) => {
    lvl.num = i + 1
  })
}

const saveProfile = async () => {
  if (!profileForm.value.title?.trim()) return ElMessage.warning('Введите название профиля')
  try {
    emit('refresh')
    const payload = prepareProfileForBackend(profileForm.value)
    if (editingProfile.value?.id) {
      await updateProfile(editingProfile.value.id, payload)
      ElMessage.success('Профиль обновлён')
    } else {
      await createProfile(payload)
      ElMessage.success('Профиль создан')
    }
    await fetchProfilesWithLevels(departmentFilter.value.length ? departmentFilter.value : null)
    profileDialogVisible.value = false
  } catch (err) {
    console.error('❌ Error saving profile:', err)
    ElMessage.error(err.message || 'Ошибка сохранения профиля')
  }
}

const reload = async () =>
  await fetchProfilesWithLevels(departmentFilter.value.length ? departmentFilter.value : null)

watch(
  () => [props.allSkills, props.categories, props.departments],
  () => {
    fullSkillsCache.value = {}
  },
  { deep: true },
)

defineExpose({ reload, fetchProfilesWithLevels })
</script>

<style scoped>
/* Стили без изменений — сокращено для экономии места */
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
  align-items: center;
}
.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}
.department-filter-select {
  min-width: 180px;
  max-width: 250px;
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
.skills-filter-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm);
  background: var(--background);
  border-radius: var(--radius-sm);
}
.category-filter-select {
  flex: 1;
  min-width: 180px;
}
.filter-hint {
  font-size: 12px;
  color: var(--gray);
  white-space: nowrap;
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
.view-value-multiline {
  white-space: pre-wrap;
  word-break: break-word;
}
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
.stages-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  border-bottom: 2px solid #e0e0e0;
}
.stage-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: #999;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}
.stage-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.stage-content {
  margin-top: var(--spacing-sm);
}
.stage-content .stage-item {
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: #fcfcfc;
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}
.stage-title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
  color: var(--text);
  font-size: 14px;
}
.stage-qa-list {
  margin-top: var(--spacing-xs);
}
.qa-item {
  margin-bottom: var(--spacing-xs);
  border: 1px solid #e8e8e8;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.qa-question {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f5f5f5;
  cursor: pointer;
  font-size: 13px;
}
.qa-question:hover {
  background: #ebebeb;
}
.qa-question-text {
  flex: 1;
}
.qa-answer {
  padding: var(--spacing-sm);
  background: #fff;
  font-size: 13px;
  color: var(--text);
  border-top: 1px solid #e8e8e8;
}
.collapse-icon {
  transition: transform 0.2s;
  color: var(--gray);
  font-size: 14px;
}
.collapse-icon.expanded {
  transform: rotate(90deg);
}
.empty-placeholder {
  color: var(--gray);
  font-size: 13px;
  font-style: italic;
  padding: var(--spacing-sm) 0;
}
@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input,
  .department-filter-select,
  .category-filter-select {
    width: 100%;
    max-width: none;
  }
  .profile-form {
    max-height: 60vh;
  }
  .skills-filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-hint {
    text-align: center;
  }
}
:deep(.admin-dialog .el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}
:deep(.admin-dialog .el-form-item__label) {
  font-weight: var(--font-weight-medium);
}
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
