<!-- src/components/employees/EmployeeCard.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="Карточка сотрудника"
    width="750px"
    destroy-on-close
    @close="handleClose"
  >
    <div v-if="employee" class="employee-detail" v-loading="detailLoading">
      <!-- Основная информация -->
      <div class="detail-section">
        <h3 class="section-title">Основная информация</h3>
        <div class="info-grid">
          <!-- ФИО -->
          <div class="info-item">
            <span class="info-label">ФИО:</span>
            <span v-if="!isEditMode || isSupervisor" class="info-value">{{
              employee.fullName
            }}</span>
            <div v-else class="info-edit-row">
              <el-input v-model="editForm.lastName" placeholder="Фамилия" class="edit-input" />
              <el-input v-model="editForm.firstName" placeholder="Имя" class="edit-input" />
              <el-input v-model="editForm.patronymic" placeholder="Отчество" class="edit-input" />
            </div>
          </div>
          <!-- Должность -->
          <div class="info-item">
            <span class="info-label">Должность:</span>
            <span v-if="!isEditMode || isSupervisor" class="info-value">{{
              employee.position
            }}</span>
            <el-input
              v-else
              v-model="editForm.position"
              placeholder="Должность"
              class="edit-input-full"
              disabled
            />
          </div>
          <!-- Email -->
          <div class="info-item">
            <span class="info-label">Email:</span>
            <span v-if="!isEditMode || isSupervisor" class="info-value">{{ employee.email }}</span>
            <el-input v-else v-model="editForm.email" placeholder="Email" class="edit-input-full" />
          </div>
          <!-- Отдел -->
          <div class="info-item" v-if="!isSupervisor">
            <span class="info-label">Отдел:</span>
            <span v-if="!isEditMode" class="info-value">{{
              employee.departmentName || 'Не назначен'
            }}</span>
            <el-select
              v-else
              v-model="editForm.departmentId"
              placeholder="Не назначен"
              clearable
              class="edit-select-full"
            >
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="dept.name"
                :value="dept.id"
              />
            </el-select>
          </div>
          <!-- Роль -->
          <div class="info-item" v-if="!isSupervisor">
            <span class="info-label">Роль:</span>
            <span v-if="!isEditMode" class="info-value">{{
              employee.roleName || 'Не назначена'
            }}</span>
            <el-select
              v-else-if="isAdmin"
              v-model="editForm.roleId"
              placeholder="Не назначена"
              clearable
              class="edit-select-full"
            >
              <el-option
                v-for="role in availableRoles"
                :key="role.id"
                :label="role.displayName"
                :value="role.id"
              />
            </el-select>
            <span v-else class="info-value">{{ getRoleNameById(editForm.roleId) }}</span>
          </div>
        </div>
        <!-- Кнопки управления -->
        <div class="detail-actions" v-if="isAdmin">
          <el-button v-if="!isEditMode" type="primary" @click="enableEditMode"
            >Редактировать</el-button
          >
          <template v-else>
            <el-button @click="cancelEdit">Отмена</el-button>
            <el-button type="primary" @click="saveChanges">Сохранить</el-button>
          </template>
        </div>
        <!-- Кнопка повышения -->
        <div
          v-if="(isSupervisor || isAdmin) && nextLevel && isPromotionAvailable"
          class="promotion-actions"
        >
          <el-button type="success" @click="showPromoteDialog"> Повысить сотрудника </el-button>
        </div>
      </div>

      <!-- Профиль -->
      <div class="detail-section profile-section">
        <h3 class="section-title">Профиль</h3>
        <ProfileCard v-if="selectedProfileData" :profile="selectedProfileData" />

        <div v-else class="profile-unassigned">
          <span class="unassigned-text">Профиль не назначен</span>
          <div v-if="isSupervisor || (isAdmin && !isEditMode)" class="assign-profile-section">
            <div class="assign-profile-label">Назначить профиль:</div>
            <div class="profiles-collapse">
              <div
                v-for="profile in availableProfiles"
                :key="profile.id"
                class="profile-collapse-item"
              >
                <div class="profile-collapse-header" @click="toggleProfileExpand(profile.id)">
                  <el-radio
                    v-model="selectedProfileForAssign"
                    :label="profile.id"
                    @click.stop
                    class="profile-radio"
                  />
                  <span class="profile-collapse-title">{{ profile.title }}</span>
                  <el-icon
                    class="collapse-icon"
                    :class="{ expanded: expandedProfiles.includes(profile.id) }"
                  >
                    <ArrowRight />
                  </el-icon>
                </div>

                <el-collapse-transition>
                  <div
                    v-show="expandedProfiles.includes(profile.id)"
                    class="profile-collapse-content"
                  >
                    <div class="profile-description">
                      <strong>Описание:</strong>
                      {{ profile.description || 'Описание не добавлено' }}
                    </div>

                    <div v-if="!profile.levels?.length" class="empty-placeholder">
                      Уровни не добавлены
                    </div>

                    <div v-else>
                      <div
                        v-for="(level, lIdx) in profile.levels || []"
                        :key="level.id || lIdx"
                        class="level-collapse-item"
                      >
                        <div
                          class="level-collapse-header"
                          @click="toggleLevelExpand(profile.id, level.id || lIdx)"
                        >
                          <span class="level-collapse-title">{{
                            level.level_name || level.name || `Уровень ${level.num || lIdx + 1}`
                          }}</span>
                          <el-icon
                            class="collapse-icon"
                            :class="{
                              expanded: expandedLevels[`${profile.id}_${level.id || lIdx}`],
                            }"
                          >
                            <ArrowRight />
                          </el-icon>
                        </div>

                        <el-collapse-transition>
                          <div
                            v-show="expandedLevels[`${profile.id}_${level.id || lIdx}`]"
                            class="level-collapse-content"
                          >
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
                                  @click="toggleSkillExpand(skillItem.id)"
                                >
                                  <span class="skill-collapse-title">{{ skillItem.title }}</span>
                                  <el-icon
                                    class="collapse-icon"
                                    :class="{ expanded: expandedSkills.includes(skillItem.id) }"
                                  >
                                    <ArrowRight />
                                  </el-icon>
                                </div>

                                <el-collapse-transition>
                                  <div
                                    v-show="expandedSkills.includes(skillItem.id)"
                                    class="skill-collapse-content"
                                  >
                                    <div class="skill-description">
                                      <strong>Описание:</strong>
                                      {{
                                        getFullSkillDescription(skillItem.id) ||
                                        'Описание не добавлено'
                                      }}
                                    </div>

                                    <div class="skill-materials">
                                      <strong>Материалы для подготовки:</strong>
                                      <ul v-if="getFullSkillMaterialsArray(skillItem.id)?.length">
                                        <li
                                          v-for="(material, idx) in getFullSkillMaterialsArray(
                                            skillItem.id,
                                          ) || []"
                                          :key="idx"
                                        >
                                          {{ material }}
                                        </li>
                                      </ul>
                                      <span v-else class="empty-placeholder"
                                        >Материалы не добавлены</span
                                      >
                                    </div>

                                    <div class="skill-stages-section">
                                      <div class="skill-stages-header">
                                        <strong>Этапы:</strong>
                                      </div>

                                      <div
                                        v-if="!getFullSkillStages(skillItem.id)?.length"
                                        class="empty-placeholder"
                                      >
                                        Этапы не добавлены
                                      </div>

                                      <div v-else class="skill-stages">
                                        <div class="stages-tabs">
                                          <div
                                            v-for="stageType in getSkillStageTypesWithContent(
                                              skillItem.id,
                                            )"
                                            :key="stageType.key"
                                            class="stage-tab"
                                            :class="{
                                              active:
                                                getSkillSelectedStageType(skillItem.id) ===
                                                stageType.key,
                                              'has-content': hasStageContent(
                                                getFullSkillStages(skillItem.id),
                                                stageType.key,
                                              ),
                                            }"
                                            @click="
                                              selectSkillStageType(skillItem.id, stageType.key)
                                            "
                                          >
                                            {{ stageType.label }}
                                          </div>
                                        </div>

                                        <div class="stage-content">
                                          <div
                                            v-for="stage in getSkillStagesByTypeSimple(
                                              skillItem.id,
                                              getSkillSelectedStageType(skillItem.id),
                                            )"
                                            :key="stage.id"
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
                                                getSkillSelectedStageType(skillItem.id) ===
                                                  'attestation' && stage.questions?.length
                                              "
                                              class="stage-qa-list"
                                            >
                                              <div
                                                v-for="(qa, idx) in stage.questions"
                                                :key="idx"
                                                class="qa-item"
                                              >
                                                <div
                                                  class="qa-question"
                                                  @click="
                                                    toggleQAExpand(
                                                      skillItem.id,
                                                      stage.id || idx,
                                                      idx,
                                                    )
                                                  "
                                                >
                                                  <span>{{ idx + 1 }}.</span>
                                                  <span class="qa-question-text">{{
                                                    qa.text || qa.question || 'Без текста'
                                                  }}</span>
                                                  <el-icon
                                                    class="collapse-icon"
                                                    :class="{
                                                      expanded:
                                                        expandedQA[
                                                          `${skillItem.id}_${stage.id || idx}_${idx}`
                                                        ],
                                                    }"
                                                  >
                                                    <ArrowRight />
                                                  </el-icon>
                                                </div>
                                                <el-collapse-transition>
                                                  <div
                                                    v-show="
                                                      expandedQA[
                                                        `${skillItem.id}_${stage.id || idx}_${idx}`
                                                      ]
                                                    "
                                                    class="qa-answer"
                                                  >
                                                    <strong>Эталонный ответ:</strong>
                                                    {{ qa.answer || '—' }}
                                                  </div>
                                                </el-collapse-transition>
                                              </div>
                                            </div>

                                            <div v-else class="stage-tasks-criteria">
                                              <div
                                                v-if="stage.questions?.length"
                                                class="tasks-list"
                                              >
                                                <div
                                                  v-for="(task, idx) in stage.questions"
                                                  :key="idx"
                                                  class="task-item"
                                                >
                                                  <div
                                                    class="task-title"
                                                    @click="
                                                      toggleTaskExpand(
                                                        skillItem.id,
                                                        stage.id || idx,
                                                        idx,
                                                      )
                                                    "
                                                  >
                                                    <span>{{ idx + 1 }}.</span>
                                                    <span class="task-text">{{
                                                      task.text || task.question || 'Без текста'
                                                    }}</span>
                                                    <el-icon
                                                      class="collapse-icon"
                                                      :class="{
                                                        expanded:
                                                          expandedTasks[
                                                            `${skillItem.id}_${stage.id || idx}_${idx}`
                                                          ],
                                                      }"
                                                    >
                                                      <ArrowRight />
                                                    </el-icon>
                                                  </div>
                                                  <el-collapse-transition>
                                                    <div
                                                      v-show="
                                                        expandedTasks[
                                                          `${skillItem.id}_${stage.id || idx}_${idx}`
                                                        ]
                                                      "
                                                      class="task-criteria"
                                                    >
                                                      <strong>Критерий оценивания:</strong>
                                                      <p>
                                                        {{ task.answer || 'Критерий не указан' }}
                                                      </p>
                                                    </div>
                                                  </el-collapse-transition>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
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
                </el-collapse-transition>
              </div>
            </div>
            <div class="assign-profile-actions" v-if="selectedProfileForAssign">
              <el-button
                type="primary"
                size="small"
                @click="assignProfile"
                :loading="assignLoading"
              >
                Назначить профиль
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import ProfileCard from '@/components/common/ProfileCard.vue'

const props = defineProps<{
  visible: boolean
  employee: any
  isAdmin: boolean
  isSupervisor: boolean
  departments: any[]
  availableRoles: any[]
  availableProfiles: any[]
  allProfilesData: any[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'update', data: any): void
  (e: 'assign-profile', userId: number, profileId: number): void
  (e: 'promote', employee: any, nextLevel: any): void
}>()

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const detailLoading = ref(false)
const isEditMode = ref(false)
const editForm = ref<any>({})
const assignLoading = ref(false) // 🔧 Состояние загрузки для кнопки назначения

const selectedProfileForAssign = ref<number | null>(null)
const expandedProfiles = ref<number[]>([])
const expandedLevels = ref<Record<string, boolean>>({})
const expandedSkills = ref<number[]>([])
const expandedQA = ref<Record<string, boolean>>({})
const expandedTasks = ref<Record<string, boolean>>({})
const skillSelectedStageTypes = ref<Record<number, string>>({})

const stageTypes = [
  { key: 'practice', label: 'Практическое задание' },
  { key: 'attestation', label: 'Аттестация' },
  { key: 'performance', label: 'Performance review' },
]

const fullSkillsCache = ref<Record<number, any>>({})

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const selectedProfileData = computed(() => {
  if (!props.employee?.profileId) return null
  return props.allProfilesData.find((p) => p.id === props.employee.profileId) || null
})

const nextLevel = computed(() => {
  if (!props.employee?.profileId) return null
  const profile = props.allProfilesData.find((p) => p.id === props.employee.profileId)
  if (!profile?.levels) return null

  const currentLevelName = props.employee.profileLevel
  if (!currentLevelName) return profile.levels[0] || null

  const currentLevelIndex = profile.levels.findIndex(
    (level: any) => level.name === currentLevelName,
  )

  if (currentLevelIndex === -1 || currentLevelIndex >= profile.levels.length - 1) {
    return null
  }
  return profile.levels[currentLevelIndex + 1]
})

const isPromotionAvailable = computed(() => {
  if (!props.employee?.progress || props.employee.progress !== 100) return false
  return !!nextLevel.value
})

const mapTypeToFrontendSimple = (backendType: string | null | undefined) => {
  if (!backendType) return 'practice'
  const t = String(backendType).trim()
  if (t === 'Аттестация') return 'attestation'
  if (t === 'Performance review') return 'performance'
  if (t === 'Практическое задание') return 'practice'
  return 'practice'
}

const fetchFullSkillData = async (skillId: number) => {
  if (fullSkillsCache.value[skillId]) return fullSkillsCache.value[skillId]

  try {
    const res = await fetch(`${API_BASE}/skills/${skillId}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    let data = await res.json()

    if (data?.skill && !data?.stages) {
      data = { ...data, ...data.skill }
    }

    if (data?.stages && Array.isArray(data.stages)) {
      data.stages = data.stages.map((stage: any) => {
        const rawQuestions = stage.questions || stage.questions_list || []
        const questions = Array.isArray(rawQuestions)
          ? rawQuestions.map((q: any) => ({
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
    return null
  }
}

const getLevelSkillIds = (level: any) => {
  if (!level) return []

  let skillIds: any[] = []

  if (level.level_skills && Array.isArray(level.level_skills)) {
    skillIds = level.level_skills
  } else if (level.skills && Array.isArray(level.skills)) {
    skillIds = level.skills
  }

  return skillIds.map((item: any) => {
    if (typeof item === 'object' && item !== null && item.id) {
      return {
        id: item.id,
        title: item.title || item.name || getSkillNameById(item.id),
      }
    } else {
      return {
        id: item,
        title: getSkillNameById(item),
      }
    }
  })
}

const getSkillNameById = (skillId: number) => {
  if (fullSkillsCache.value[skillId]?.name) return fullSkillsCache.value[skillId].name
  if (fullSkillsCache.value[skillId]?.title) return fullSkillsCache.value[skillId].title

  for (const profile of props.availableProfiles) {
    for (const level of profile.levels || []) {
      const skills = level.level_skills || level.skills || []
      const skill = skills.find(
        (s: any) => (typeof s === 'object' && s.id === skillId) || s === skillId,
      )
      if (skill && typeof skill === 'object' && (skill.name || skill.title)) {
        return skill.name || skill.title
      }
    }
  }
  return `Навык #${skillId}`
}

const getSkillData = (skillId: number) => {
  return fullSkillsCache.value[skillId] || null
}

const getFullSkillDescription = (skillId: number) => {
  const skill = getSkillData(skillId)
  return skill?.description || ''
}

const getFullSkillMaterials = (skillId: number) => {
  const skill = getSkillData(skillId)
  return skill?.materials || skill?.literature || ''
}

const getFullSkillMaterialsArray = (skillId: number) => {
  const skill = getSkillData(skillId)
  const materials = skill?.materials || skill?.literature
  if (typeof materials === 'string' && materials.trim()) {
    return materials.split('\n').filter((m: string) => m.trim())
  }
  return Array.isArray(materials) ? materials : []
}

const getFullSkillStages = (skillId: number) => {
  const skill = getSkillData(skillId)
  return skill?.stages || []
}

const getSkillStageTypesWithContent = (skillId: number) => {
  const stages = getFullSkillStages(skillId)
  if (!stages?.length) return stageTypes
  const available = stageTypes.filter((t) => stages.some((s) => s?.type === t.key))
  return available.length > 0 ? available : stageTypes
}

const getSkillStagesByTypeSimple = (skillId: number, type: string) => {
  const stages = getFullSkillStages(skillId)
  if (!stages || !Array.isArray(stages)) return []
  return stages.filter((s) => s?.type === type)
}

const getStageContentTitleSimple = (type: string) =>
  type === 'attestation' ? 'Вопросы и ответы' : 'Задания и критерии'

const getSkillSelectedStageType = (skillId: number) =>
  skillSelectedStageTypes.value[skillId] || 'practice'

const selectSkillStageType = (skillId: number, type: string) => {
  skillSelectedStageTypes.value[skillId] = type
}

const hasStageContent = (stages: any[], type: string) => {
  return stages.some((stage) => stage.type === type)
}

const toggleProfileExpand = (profileId: number) => {
  const idx = expandedProfiles.value.indexOf(profileId)
  if (idx === -1) {
    expandedProfiles.value.push(profileId)
  } else {
    expandedProfiles.value.splice(idx, 1)
  }
}

const toggleLevelExpand = async (profileId: number, levelId: number | string) => {
  const key = `${profileId}_${levelId}`
  const isExpanded = expandedLevels.value[key]

  if (!isExpanded) {
    expandedLevels.value[key] = true

    const level = props.availableProfiles
      .find((p) => p.id === profileId)
      ?.levels?.find((l) => (l.id || -1) === levelId)

    if (level) {
      const skillItems = getLevelSkillIds(level)

      for (const skillItem of skillItems) {
        const skillId = skillItem.id
        if (!fullSkillsCache.value[skillId]) {
          await fetchFullSkillData(skillId)
        }
        if (!skillSelectedStageTypes.value[skillId]) {
          const allTypes = getSkillStageTypesWithContent(skillId)
          skillSelectedStageTypes.value[skillId] = allTypes[0]?.key || 'practice'
        }
      }
    }
  } else {
    delete expandedLevels.value[key]
  }
}

const toggleSkillExpand = async (skillId: number) => {
  const idx = expandedSkills.value.indexOf(skillId)
  if (idx === -1) {
    expandedSkills.value.push(skillId)
    if (!fullSkillsCache.value[skillId]) {
      await fetchFullSkillData(skillId)
    }
    if (!skillSelectedStageTypes.value[skillId]) {
      const allTypes = getSkillStageTypesWithContent(skillId)
      skillSelectedStageTypes.value[skillId] = allTypes[0]?.key || 'practice'
    }
  } else {
    expandedSkills.value.splice(idx, 1)
  }
}

const toggleQAExpand = (skillId: number, stageId: number | string, idx: number) => {
  const key = `${skillId}_${stageId}_${idx}`
  expandedQA.value[key] = !expandedQA.value[key]
}

const toggleTaskExpand = (skillId: number, stageId: number | string, idx: number) => {
  const key = `${skillId}_${stageId}_${idx}`
  expandedTasks.value[key] = !expandedTasks.value[key]
}

const getRoleNameById = (roleId: number | null) => {
  if (!roleId) return 'Не назначена'
  const role = props.availableRoles.find((r) => r.id === roleId)
  if (!role) return 'Не назначена'
  return role.displayName || role.name || 'Не назначена'
}

const handleClose = () => {
  isEditMode.value = false
  expandedProfiles.value = []
  expandedLevels.value = {}
  expandedSkills.value = []
  expandedQA.value = {}
  expandedTasks.value = {}
  skillSelectedStageTypes.value = {}
  fullSkillsCache.value = {}
  selectedProfileForAssign.value = null
}

const enableEditMode = () => {
  isEditMode.value = true
  editForm.value = { ...props.employee }
}

const cancelEdit = () => {
  isEditMode.value = false
  editForm.value = { ...props.employee }
}

const saveChanges = () => {
  emit('update', editForm.value)
}

// 🔧 ОБНОВЛЁННАЯ ФУНКЦИЯ НАЗНАЧЕНИЯ ПРОФИЛЯ
const assignProfile = async () => {
  if (!props.employee?.userId || !selectedProfileForAssign.value) {
    ElMessage.warning('Выберите профиль для назначения')
    return
  }

  assignLoading.value = true
  try {
    const response = await fetch(`${API_BASE}/users/profiles/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        user_id: props.employee.userId,
        profile_id: selectedProfileForAssign.value,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      let errorMsg = `Ошибка сервера: ${response.status}`

      if (Array.isArray(errData.detail)) {
        errorMsg = errData.detail.map((d: any) => d.msg).join('\n')
      } else if (errData.detail) {
        errorMsg =
          typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail)
      }
      throw new Error(errorMsg)
    }

    ElMessage.success('Профиль успешно назначен')

    const assignedProfileId = selectedProfileForAssign.value
    selectedProfileForAssign.value = null

    // Уведомляем родителя об успешном назначении
    emit('assign-profile', props.employee.userId, assignedProfileId)

    // Обновляем локальные данные карточки
    emit('update', { ...props.employee, profileId: assignedProfileId })
  } catch (error: any) {
    console.error('Ошибка при назначении профиля:', error)
    ElMessage.error(error.message || 'Не удалось назначить профиль')
  } finally {
    assignLoading.value = false
  }
}

const showPromoteDialog = () => {
  if (!props.employee || !nextLevel.value) return

  ElMessageBox.confirm(
    `Повысить сотрудника ${props.employee.fullName} до уровня "${nextLevel.value.name}"?`,
    'Подтверждение повышения',
    {
      confirmButtonText: 'Повысить',
      cancelButtonText: 'Отмена',
      type: 'warning',
    },
  ).then(() => {
    emit('promote', props.employee, nextLevel.value)
  })
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      editForm.value = { ...props.employee }
      isEditMode.value = false
    }
  },
)
</script>

<style scoped>
/* ... все стили из вашего исходного кода остаются без изменений ... */
.employee-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.detail-section {
  background: #fff;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  border: 1px solid #e0e0e0;
}
.section-title {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  color: #000;
}
.info-grid {
  display: grid;
  gap: var(--spacing-xs);
}
.info-item {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  align-items: center;
}
.info-label {
  font-weight: var(--font-weight-medium);
  color: #000;
  min-width: 100px;
}
.info-value {
  color: #000;
  flex: 1;
  font-size: 14px;
}

.info-edit-row {
  display: flex;
  gap: var(--spacing-xs);
  flex: 1;
}
.edit-input {
  flex: 1;
  min-width: 0;
}
.edit-input-full {
  width: 100%;
}
.edit-select-full {
  width: 100%;
}
:deep(.info-item .el-input__inner),
:deep(.info-item .el-select__input) {
  font-size: 14px !important;
  color: #000;
}
:deep(.info-item .el-input),
:deep(.info-item .el-select) {
  font-size: 14px;
}

.detail-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  justify-content: flex-end;
}

.promotion-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid #e0e0e0;
}

.profile-unassigned {
  padding: var(--spacing-sm);
  color: #666;
}
.unassigned-text {
  font-style: italic;
  color: #999;
}

.assign-profile-section {
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px dashed #e0e0e0;
}
.assign-profile-label {
  font-weight: var(--font-weight-medium);
  color: #000;
  margin-bottom: var(--spacing-xs);
}
.profiles-collapse {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}
.profile-collapse-item {
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.profile-collapse-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f9f9f9;
  cursor: pointer;
  transition: background 0.2s;
}
.profile-collapse-header:hover {
  background: #f0f0f0;
}
.profile-radio {
  flex-shrink: 0;
}
:deep(.profile-radio .el-radio__label) {
  display: none;
}
.profile-collapse-title {
  flex: 1;
  font-weight: var(--font-weight-medium);
  color: #000;
  font-size: 14px;
}
.collapse-icon {
  transition: transform 0.2s;
  color: var(--gray);
  font-size: 14px;
}
.collapse-icon.expanded {
  transform: rotate(90deg);
}
.profile-collapse-content {
  padding: var(--spacing-sm);
  background: #fff;
}

.profile-description {
  font-size: 13px;
  color: #666;
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px dashed #e0e0e0;
  line-height: 1.5;
  white-space: pre-wrap;
}

.empty-placeholder {
  color: var(--gray);
  font-size: 13px;
  font-style: italic;
  padding: var(--spacing-sm) 0;
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

.level-collapse-item {
  margin-bottom: var(--spacing-xs);
}
.level-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs);
  background: #f5f5f5;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
}
.level-collapse-header:hover {
  background: #ebebeb;
}
.level-collapse-title {
  font-weight: var(--font-weight-medium);
  color: #000;
}
.level-collapse-content {
  padding: var(--spacing-xs) 0 0 var(--spacing-sm);
}

.skill-collapse-item {
  margin-bottom: var(--spacing-xs);
}
.skill-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs);
  background: #fafafa;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
}
.skill-collapse-header:hover {
  background: #f0f0f0;
}
.skill-collapse-title {
  color: #000;
}
.skill-collapse-content {
  padding: var(--spacing-xs) 0 0 var(--spacing-md);
  font-size: 13px;
  color: #333;
}
.skill-description,
.skill-materials,
.skill-stages-section {
  margin-bottom: var(--spacing-xs);
}
.skill-materials ul {
  margin: var(--spacing-xs) 0;
  padding-left: var(--spacing-md);
}

.skill-stages-section {
  margin-top: var(--spacing-sm);
}

.skill-stages-header {
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin-bottom: var(--spacing-xs);
  font-size: 13px;
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
.stage-tab.has-content:not(.active) {
  color: #666;
}
.stage-tab.has-content:not(.active):hover {
  color: #333;
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
  color: #000;
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
  color: #333;
  border-top: 1px solid #e8e8e8;
}

.stage-tasks-criteria {
  margin-top: var(--spacing-xs);
}
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.task-item {
  border: 1px solid #e8e8e8;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.task-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f5f5f5;
  cursor: pointer;
  font-size: 13px;
}
.task-title:hover {
  background: #ebebeb;
}
.task-text {
  flex: 1;
}
.task-criteria {
  padding: var(--spacing-sm);
  background: #fff;
  font-size: 13px;
  color: #333;
  border-top: 1px solid #e8e8e8;
}
.task-criteria p {
  margin: var(--spacing-xs) 0 0 0;
}
.criteria-list {
  margin-top: var(--spacing-xs);
}
.criteria-list ul {
  margin: var(--spacing-xs) 0;
  padding-left: var(--spacing-md);
}

.assign-profile-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-sm);
}
</style>
