<!-- src/components/employees/EmployeeCard.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="Карточка сотрудника"
    width="90%"
    :style="{ maxWidth: '800px' }"
    destroy-on-close
    @close="handleClose"
  >
    <div v-if="employee" class="employee-detail" v-loading="detailLoading">
      <div class="detail-section">
        <h3 class="section-title">Основная информация</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">ФИО:</span>
            <span v-if="!isEditMode || !canEditEmployeeInfo" class="info-value">
              {{ employee.fullName }}
            </span>
            <div v-else class="info-edit-row">
              <el-input v-model="editForm.lastName" placeholder="Фамилия" class="edit-input" />
              <el-input v-model="editForm.firstName" placeholder="Имя" class="edit-input" />
              <el-input v-model="editForm.patronymic" placeholder="Отчество" class="edit-input" />
            </div>
          </div>

          <div class="info-item">
            <span class="info-label">Должность:</span>
            <span v-if="!isEditMode || !canEditEmployeeInfo" class="info-value">
              {{ employee.position }}
            </span>
            <el-input
              v-else
              v-model="editForm.position"
              placeholder="Должность"
              class="edit-input-full"
            />
          </div>

          <div class="info-item">
            <span class="info-label">Email:</span>
            <span v-if="!isEditMode || !canEditEmployeeInfo" class="info-value">
              {{ employee.email }}
            </span>
            <el-input v-else v-model="editForm.email" placeholder="Email" class="edit-input-full" />
          </div>

          <div class="info-item">
            <span class="info-label">Отдел:</span>
            <span v-if="!isEditMode || !canEditEmployeeInfo" class="info-value">
              {{ employee.departmentName || 'Не назначен' }}
            </span>
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

          <div class="info-item">
            <span class="info-label">Роль:</span>
            <span v-if="!isEditMode || !canEditRole" class="info-value">
              {{ employee.roleName || 'Не назначена' }}
            </span>
            <el-select
              v-else
              v-model="editForm.roleId"
              placeholder="Не назначена"
              clearable
              class="edit-select-full"
              :loading="rolesLoading"
            >
              <el-option
                v-for="role in editableRoles"
                :key="role.id"
                :label="role.displayName"
                :value="role.id"
              />
            </el-select>
          </div>
        </div>

        <div class="detail-actions" v-if="canEditEmployeeInfo">
          <el-button v-if="!isEditMode" type="primary" @click="enableEditMode">
            Редактировать
          </el-button>
          <template v-else>
            <el-button @click="cancelEdit">Отмена</el-button>
            <el-button type="primary" @click="saveChanges">Сохранить</el-button>
          </template>
        </div>

        <div
          v-if="
            canPromoteEmployees && nextLevel && isPromotionAvailable && canManageSpecificEmployee
          "
          class="promotion-actions"
        >
          <el-button type="success" @click="showPromoteDialog"> Повысить сотрудника </el-button>
        </div>
      </div>

      <div class="detail-section profile-section">
        <h3 class="section-title">Профиль</h3>

        <!-- ✅ Показываем карточку профиля, если он назначен (для всех, только просмотр) -->
        <ProfileCard
          v-if="employee.profileId && (userFullProfile || selectedProfileData)"
          :profile="adaptProfileForCard(userFullProfile || selectedProfileData)"
          :user-id="employee.userId"
          :is-current-user="employee.userId === authUserId"
          :fetch-skill-detail="fetchSkillDetail"
          :fetch-skill-questions="fetchSkillQuestions"
          :use-questions-endpoint="true"
        />

        <!-- ✅ Кнопка отвязки только для тех, кто может управлять профилями И может управлять этим сотрудником -->
        <div
          v-if="employee.profileId && canAssignProfile && canManageSpecificEmployee"
          class="unlink-profile-section"
        >
          <el-button
            type="danger"
            link
            size="small"
            @click="unlinkProfile"
            :disabled="assignLoading"
          >
            <el-icon style="margin-right: 4px"><Remove /></el-icon>
            Отвязать профиль
          </el-button>
        </div>

        <!-- ✅ ИСПРАВЛЕНО: сообщение "не назначен" только когда профиль ДЕЙСТВИТЕЛЬНО не назначен -->
        <div v-if="!employee.profileId" class="profile-unassigned">
          <span class="unassigned-text">Профиль не назначен</span>

          <!-- ✅ Секция назначения только для тех, кто может назначать профили И может управлять этим сотрудником -->
          <div v-if="canAssignProfile && canManageSpecificEmployee" class="assign-profile-section">
            <div class="assign-profile-label">Назначить профиль:</div>

            <div v-if="showDepartmentFilterForProfiles" class="profile-department-filter">
              <el-select
                v-model="selectedDepartmentForProfiles"
                placeholder="Все отделы"
                clearable
                size="small"
                class="dept-filter-select"
                @change="onDepartmentFilterChange"
              >
                <el-option
                  v-for="dept in availableDepartmentsForFilter"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
              <span class="filter-hint">Фильтр профилей по отделу</span>
            </div>

            <div class="profiles-collapse">
              <div
                v-for="profile in filteredAvailableProfiles"
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
                    ><ArrowRight
                  /></el-icon>
                </div>
                <el-collapse-transition>
                  <div
                    v-show="expandedProfiles.includes(profile.id)"
                    class="profile-collapse-content"
                  >
                    <div class="profile-description">
                      <strong>Описание:</strong> {{ profile.description || 'Не добавлено' }}
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
                          <span class="level-collapse-title">
                            {{
                              level.level_name || level.name || `Уровень ${level.num || lIdx + 1}`
                            }}
                          </span>
                          <el-icon
                            class="collapse-icon"
                            :class="{
                              expanded: expandedLevels[`${profile.id}_${level.id || lIdx}`],
                            }"
                            ><ArrowRight
                          /></el-icon>
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
                                    ><ArrowRight
                                  /></el-icon>
                                </div>
                                <el-collapse-transition>
                                  <div
                                    v-show="expandedSkills.includes(skillItem.id)"
                                    class="skill-collapse-content"
                                  >
                                    <div class="skill-description">
                                      <strong>Описание:</strong>
                                      {{ getFullSkillDescription(skillItem.id) || 'Не добавлено' }}
                                    </div>
                                    <div class="skill-materials">
                                      <strong>Материалы:</strong>
                                      <ul v-if="getFullSkillMaterialsArray(skillItem.id)?.length">
                                        <li
                                          v-for="(mat, idx) in getFullSkillMaterialsArray(
                                            skillItem.id,
                                          )"
                                          :key="idx"
                                        >
                                          {{ mat }}
                                        </li>
                                      </ul>
                                      <span v-else class="empty-placeholder"
                                        >Материалы не добавлены</span
                                      >
                                    </div>
                                    <div class="skill-stages-section">
                                      <div class="skill-stages-header"><strong>Этапы:</strong></div>
                                      <div
                                        v-if="!getFullSkillStages(skillItem.id)?.length"
                                        class="empty-placeholder"
                                      >
                                        Этапы не добавлены
                                      </div>
                                      <div v-else class="skill-stages">
                                        <div class="stages-tabs">
                                          <div
                                            v-for="st in getSkillStageTypesWithContent(
                                              skillItem.id,
                                            )"
                                            :key="st.key"
                                            class="stage-tab"
                                            :class="{
                                              active:
                                                getSkillSelectedStageType(skillItem.id) === st.key,
                                              'has-content': hasStageContent(
                                                getFullSkillStages(skillItem.id),
                                                st.key,
                                              ),
                                            }"
                                            @click="selectSkillStageType(skillItem.id, st.key)"
                                          >
                                            {{ st.label }}
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
                                                  <span>{{ idx + 1 }}.</span
                                                  ><span class="qa-question-text">
                                                    {{ qa.question || qa.text || 'Без текста' }}
                                                  </span>
                                                  <el-icon
                                                    class="collapse-icon"
                                                    :class="{
                                                      expanded:
                                                        expandedQA[
                                                          `${skillItem.id}_${stage.id || idx}_${idx}`
                                                        ],
                                                    }"
                                                    ><ArrowRight
                                                  /></el-icon>
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
                                                    <span>{{ idx + 1 }}.</span
                                                    ><span class="task-text">
                                                      {{
                                                        task.question || task.text || 'Без текста'
                                                      }}
                                                    </span>
                                                    <el-icon
                                                      class="collapse-icon"
                                                      :class="{
                                                        expanded:
                                                          expandedTasks[
                                                            `${skillItem.id}_${stage.id || idx}_${idx}`
                                                          ],
                                                      }"
                                                      ><ArrowRight
                                                    /></el-icon>
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
import { ArrowRight, Remove } from '@element-plus/icons-vue'
import ProfileCard from '@/components/common/ProfileCard.vue'

const props = defineProps<{
  visible: boolean
  employee: any
  isAdmin: boolean
  isSupervisor: boolean
  isSPOAndSupervisor?: boolean
  isSPOAndDivisionSupervisor?: boolean
  canEditEmployeeInfo?: boolean
  canEditRole?: boolean
  canAssignProfile?: boolean
  canPromoteEmployees?: boolean
  departments: any[]
  availableRoles: any[]
  availableProfiles: any[]
  allProfilesData: any[]
  userFullProfile?: any | null
  departmentProfiles?: Record<number, any[]>
  fetchDepartmentProfiles?: (deptId: number) => Promise<any[]>
  supervisorDivisionId?: number | null
  supervisorDepartmentId?: number | null
  canManageSpecificEmployee?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'update', data: any): void
  (e: 'assign-profile', userId: number, profileId: number): void
  (e: 'promote', employee: any, nextLevel: any): void
  (e: 'unlink-profile', userId: number): void
}>()

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const authUserId = computed(() => props.employee?.userId)

const detailLoading = ref(false)
const isEditMode = ref(false)
const editForm = ref<any>({})
const assignLoading = ref(false)
const selectedProfileForAssign = ref<number | null>(null)
const expandedProfiles = ref<number[]>([])
const expandedLevels = ref<Record<string, boolean>>({})
const expandedSkills = ref<number[]>([])
const expandedQA = ref<Record<string, boolean>>({})
const expandedTasks = ref<Record<string, boolean>>({})
const skillSelectedStageTypes = ref<Record<number, string>>({})

const selectedDepartmentForProfiles = ref<number | null>(null)
const localDepartmentProfiles = ref<Record<number, any[]>>({})

const skillsCache = new Map<number, any>()
const stageTypes = [
  { key: 'Практическое задание', label: 'Практическое задание' },
  { key: 'Аттестация', label: 'Аттестация' },
  { key: 'Performance review', label: 'Performance review' },
]

// 🔧 Роли для редактирования - загружаются с бэкенда
const editableRoles = ref<any[]>([])
const rolesLoading = ref(false)

// 🔧 Словарь для перевода названий ролей
const ROLE_TRANSLATIONS: Record<string, string> = {
  Employee: 'Сотрудник',
  Supervisor: 'Руководитель',
  Specialist: 'СПО',
  Admin: 'Администратор',
}

const visible = computed({ get: () => props.visible, set: (v) => emit('update:visible', v) })

const selectedProfileData = computed(() => {
  if (!props.employee?.profileId) return null
  return props.allProfilesData.find((p) => p.id === props.employee.profileId) || null
})

const adaptProfileForCard = (profile: any) => {
  if (!profile) return null
  return {
    ...profile,
    levels: (profile.levels || []).map((lvl: any) => ({
      ...lvl,
      level_name: lvl.level_name || lvl.name,
      level_progress: lvl.level_progress ?? lvl.progress ?? 0,
      skills: (lvl.skills || lvl.level_skills || []).map((sk: any) => ({
        ...sk,
        title: sk.title || sk.name,
        skill_progress: sk.skill_progress ?? sk.progress ?? 0,
        stage_cnt: sk.stage_cnt ?? 0,
      })),
    })),
  }
}

const nextLevel = computed(() => {
  if (!props.employee?.profileId) return null
  const profile = props.allProfilesData.find((p) => p.id === props.employee.profileId)
  if (!profile?.levels) return null
  const currentLevelName = props.employee.profileLevel
  if (!currentLevelName) return profile.levels[0] || null
  const idx = profile.levels.findIndex(
    (l: any) => l.level_name === currentLevelName || l.name === currentLevelName,
  )
  return idx === -1 || idx >= profile.levels.length - 1 ? null : profile.levels[idx + 1]
})

const isPromotionAvailable = computed(() => {
  if (props.employee?.readyGradeup !== undefined) {
    return props.employee.readyGradeup === true && !!nextLevel.value
  }
  return props.employee?.progress >= 100 && !!nextLevel.value
})

const showDepartmentFilterForProfiles = computed(() => {
  if (props.isAdmin) return true
  if (props.isSupervisor && props.supervisorDivisionId) return true
  return false
})

const availableDepartmentsForFilter = computed(() => {
  if (props.isSupervisor && props.supervisorDivisionId && props.departments.length) {
    return props.departments.filter((d: any) => d.division_id === props.supervisorDivisionId)
  }
  return props.departments
})

const filteredAvailableProfiles = computed(() => {
  if (selectedDepartmentForProfiles.value && props.fetchDepartmentProfiles) {
    const cached = localDepartmentProfiles.value[selectedDepartmentForProfiles.value]
    if (cached) return cached
    return []
  }

  if (!selectedDepartmentForProfiles.value && props.isSupervisor && props.supervisorDivisionId) {
    return props.availableProfiles || []
  }

  if (props.departmentProfiles && selectedDepartmentForProfiles.value) {
    return props.departmentProfiles[selectedDepartmentForProfiles.value] || props.availableProfiles
  }

  return props.availableProfiles
})

// ✅ ИСПОЛЬЗУЕМ prop из родителя
const canManageSpecificEmployee = computed(() => {
  return props.canManageSpecificEmployee ?? false
})

// 🔧 Вспомогательная функция для нормализации роли (добавление displayName)
const normalizeRole = (role: any): any => {
  if (!role) return null
  const roleName = role.name || role.role_name || ''
  return {
    ...role,
    id: role.id,
    displayName: role.displayName || ROLE_TRANSLATIONS[roleName] || roleName || 'Неизвестная роль',
  }
}

// 🔧 Проверка: является ли роль руководителем (исключаем из выбора)
const isSupervisorRole = (role: any): boolean => {
  const name = (role.name || role.role_name || role.displayName || '').toLowerCase().trim()
  const displayName = (role.displayName || '').toLowerCase().trim()
  return (
    name === 'supervisor' ||
    name === 'руководитель' ||
    displayName === 'руководитель' ||
    role.isSupervisorRole === true
  )
}

// 🔧 Загрузка ролей с бэкенда (исключая Руководитель/Supervisor)
const fetchEditableRoles = async () => {
  try {
    rolesLoading.value = true
    const res = await fetch(`${API_BASE}/admin/roles`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // 🔧 Исключаем роль Руководитель/Supervisor и нормализуем роли
    editableRoles.value = (Array.isArray(data) ? data : [])
      .filter((role: any) => !isSupervisorRole(role))
      .map((role: any) => normalizeRole(role))
  } catch (err) {
    console.error('Error fetching roles:', err)
    ElMessage.error('Не удалось загрузить список ролей')
    // Фоллбэк: использовать props.availableRoles с фильтрацией и нормализацией
    editableRoles.value = props.availableRoles
      .filter((role) => !isSupervisorRole(role))
      .map((role: any) => normalizeRole(role))
  } finally {
    rolesLoading.value = false
  }
}

const fetchSkillDetail = async (userId: number, skillId: number) => {
  try {
    const res = await fetch(`${API_BASE}/users/${userId}/skills/${skillId}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return null
  }
}

const fetchSkillQuestions = async (userId: number, skillId: number) => {
  try {
    const res = await fetch(`${API_BASE}/users/${userId}/skills/${skillId}/questions`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    return null
  }
}

const fetchFullSkillData = async (skillId: number) => {
  if (skillsCache.has(skillId)) return skillsCache.get(skillId)
  try {
    const res = await fetch(`${API_BASE}/skills/${skillId}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    let data = await res.json()

    if (data?.skill && !data?.stages) data = { ...data, ...data.skill }

    if (data?.stages && Array.isArray(data.stages)) {
      data.stages = data.stages.map((st: any) => ({
        id: st?.id || null,
        confirmation_type: st.confirmation_type || 'Практическое задание',
        user_stage_id: st.user_stage_id,
        is_accepted: st.is_accepted,
        comment: st.comment,
        updated_at: st.updated_at,
        questions: (Array.isArray(st.questions) ? st.questions : []).map((q: any) => ({
          id: q?.id,
          question: q?.question || q?.text || '',
          answer: q?.answer || '',
          num: q?.num || 1,
        })),
      }))
    } else {
      data.stages = []
    }

    skillsCache.set(skillId, data)
    return data
  } catch {
    return null
  }
}

const getLevelSkillIds = (level: any) => {
  if (!level) return []

  const skills = level.level_skills || level.skills || []

  return skills.map((item: any) => {
    if (typeof item === 'object' && item !== null) {
      const skillId = item.id || item.skill_id
      return {
        id: skillId,
        title: item.title || item.name || getSkillNameById(skillId),
        ...item,
      }
    }
    return { id: item, title: getSkillNameById(item) }
  })
}

const getSkillNameById = (skillId: number) => {
  const cached = skillsCache.get(skillId)
  if (cached?.name || cached?.title) return cached.name || cached.title

  for (const profile of props.availableProfiles) {
    for (const level of profile.levels || []) {
      const skills = level.level_skills || level.skills || []
      const found = skills.find((s: any) => {
        const id = typeof s === 'object' ? s.id || s.skill_id : s
        return id === skillId
      })
      if (found && typeof found === 'object' && (found.name || found.title)) {
        return found.name || found.title
      }
    }
  }
  return `Навык #${skillId}`
}

const getFullSkillDescription = (id: number) => skillsCache.get(id)?.description || ''

const getFullSkillMaterialsArray = (id: number) => {
  const skill = skillsCache.get(id)
  const m = skill?.literature || skill?.materials
  if (typeof m === 'string' && m.trim()) {
    return m
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean)
  }
  return Array.isArray(m) ? m : []
}

const getFullSkillStages = (id: number) => skillsCache.get(id)?.stages || []

const getSkillStageTypesWithContent = (id: number) => {
  const stages = getFullSkillStages(id)
  if (!stages?.length) return stageTypes
  const available = stageTypes.filter((t) =>
    stages.some((s: any) => s?.confirmation_type === t.key),
  )
  return available.length ? available : stageTypes
}

const getSkillStagesByTypeSimple = (id: number, type: string) =>
  (getFullSkillStages(id) || []).filter((s: any) => s?.confirmation_type === type)

const getStageContentTitleSimple = (t: string) =>
  t === 'Аттестация' ? 'Вопросы и ответы' : 'Задания и критерии'

const getSkillSelectedStageType = (id: number) =>
  skillSelectedStageTypes.value[id] || 'Практическое задание'

const selectSkillStageType = (id: number, t: string) => {
  skillSelectedStageTypes.value[id] = t
}

const hasStageContent = (stages: any[], t: string) => stages.some((s) => s.confirmation_type === t)

const toggleProfileExpand = (id: number) => {
  const idx = expandedProfiles.value.indexOf(id)
  idx === -1 ? expandedProfiles.value.push(id) : expandedProfiles.value.splice(idx, 1)
}

const toggleLevelExpand = async (pId: number, lId: number | string) => {
  const key = `${pId}_${lId}`
  if (!expandedLevels.value[key]) {
    expandedLevels.value[key] = true

    const level = props.availableProfiles
      .find((p) => p.id === pId)
      ?.levels?.find((l: any) => (l.id || -1) === lId)

    if (level) {
      for (const skillItem of getLevelSkillIds(level)) {
        if (!skillsCache.has(skillItem.id)) {
          await fetchFullSkillData(skillItem.id)
        }
        if (!skillSelectedStageTypes.value[skillItem.id]) {
          skillSelectedStageTypes.value[skillItem.id] =
            getSkillStageTypesWithContent(skillItem.id)[0]?.key || 'Практическое задание'
        }
      }
    }
  } else {
    delete expandedLevels.value[key]
  }
}

const toggleSkillExpand = async (id: number) => {
  const idx = expandedSkills.value.indexOf(id)
  if (idx === -1) {
    expandedSkills.value.push(id)
    if (!skillsCache.has(id)) {
      await fetchFullSkillData(id)
    }
    if (!skillSelectedStageTypes.value[id]) {
      skillSelectedStageTypes.value[id] =
        getSkillStageTypesWithContent(id)[0]?.key || 'Практическое задание'
    }
  } else {
    expandedSkills.value.splice(idx, 1)
  }
}

const toggleQAExpand = (sId: number, stId: number | string, idx: number) => {
  expandedQA.value[`${sId}_${stId}_${idx}`] = !expandedQA.value[`${sId}_${stId}_${idx}`]
}

const toggleTaskExpand = (sId: number, stId: number | string, idx: number) => {
  expandedTasks.value[`${sId}_${stId}_${idx}`] = !expandedTasks.value[`${sId}_${stId}_${idx}`]
}

const getRoleNameById = (rId: number | null) => {
  if (!rId) return 'Не назначена'
  const r = editableRoles.value.find((r) => r.id === rId)
  return r?.displayName || r?.name || 'Не назначена'
}

const handleClose = () => {
  isEditMode.value = false
  expandedProfiles.value = []
  expandedLevels.value = {}
  expandedSkills.value = []
  expandedQA.value = {}
  expandedTasks.value = {}
  skillSelectedStageTypes.value = {}
  selectedProfileForAssign.value = null
  selectedDepartmentForProfiles.value = null
}

const enableEditMode = () => {
  isEditMode.value = true
  const safeId =
    props.employee?.userId && !isNaN(Number(props.employee?.userId))
      ? props.employee.userId
      : props.employee?.id || 0

  editForm.value = {
    userId: safeId,
    firstName: props.employee?.firstName || '',
    lastName: props.employee?.lastName || '',
    patronymic: props.employee?.patronymic || '',
    email: props.employee?.email || '',
    position: props.employee?.position || '',
    profileId: props.employee?.profileId || null,
    roleId: props.employee?.roleId || null,
    departmentId: props.employee?.departmentId || null,
  }
}

const cancelEdit = () => {
  isEditMode.value = false
}

const saveChanges = () => {
  if (!props.canEditEmployeeInfo) {
    ElMessage.warning('У вас нет прав на редактирование основной информации')
    return
  }

  if (editForm.value.roleId !== props.employee?.roleId && !props.canEditRole) {
    ElMessage.warning('У вас нет прав на изменение роли сотрудника')
    return
  }

  if (!editForm.value.firstName || !editForm.value.lastName || !editForm.value.email) {
    return ElMessage.warning('Заполните обязательные поля: Имя, Фамилия, Email')
  }

  const userId = editForm.value.userId

  if (!userId || isNaN(Number(userId))) {
    console.error('Invalid userId:', {
      fromEditForm: editForm.value.userId,
      fromProps: props.employee?.userId,
      employee: props.employee,
      editForm: editForm.value,
    })
    return ElMessage.error('Ошибка: некорректный ID сотрудника')
  }

  const payload: any = {
    userId: Number(userId),
    firstName: editForm.value.firstName,
    lastName: editForm.value.lastName,
    patronymic: editForm.value.patronymic || '',
    email: editForm.value.email,
    position: editForm.value.position || '',
  }

  if (
    editForm.value.roleId !== null &&
    editForm.value.roleId !== undefined &&
    editForm.value.roleId !== ''
  ) {
    const roleIdNum = Number(editForm.value.roleId)
    if (!isNaN(roleIdNum)) {
      payload.role_id = roleIdNum
    }
  }

  if (
    editForm.value.departmentId !== null &&
    editForm.value.departmentId !== undefined &&
    editForm.value.departmentId !== ''
  ) {
    const deptIdNum = Number(editForm.value.departmentId)
    if (!isNaN(deptIdNum)) {
      payload.department_id = deptIdNum
    }
  }

  emit('update', payload)
}

const onDepartmentFilterChange = async () => {
  if (!selectedDepartmentForProfiles.value || !props.fetchDepartmentProfiles) return

  try {
    if (localDepartmentProfiles.value[selectedDepartmentForProfiles.value]) return

    const profiles = await props.fetchDepartmentProfiles(selectedDepartmentForProfiles.value)
    localDepartmentProfiles.value[selectedDepartmentForProfiles.value] = profiles
  } catch (err) {
    console.error('Error fetching department profiles:', err)
    ElMessage.error('Не удалось загрузить профили отдела')
  }
}

const assignProfile = async () => {
  if (!props.employee?.userId || !selectedProfileForAssign.value)
    return ElMessage.warning('Выберите профиль')
  assignLoading.value = true
  try {
    emit('assign-profile', props.employee.userId, selectedProfileForAssign.value)
    selectedProfileForAssign.value = null
  } catch (e: any) {
    ElMessage.error(e.message || 'Ошибка')
  } finally {
    assignLoading.value = false
  }
}

const unlinkProfile = async () => {
  if (!props.employee?.userId) {
    return ElMessage.warning('Не указан ID сотрудника')
  }

  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите отвязать профиль от сотрудника ${props.employee.fullName}?`,
      'Отвязать профиль',
      {
        confirmButtonText: 'Отвязать',
        cancelButtonText: 'Отмена',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    )
    emit('unlink-profile', props.employee.userId)
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Error unlinking profile:', err)
      ElMessage.error('Ошибка при отвязке профиля')
    }
  }
}

const showPromoteDialog = () => {
  if (!props.employee || !nextLevel.value) return
  ElMessageBox.confirm(
    `Повысить ${props.employee.fullName} до "${nextLevel.value.level_name || nextLevel.value.name}"?`,
    'Подтверждение',
    { confirmButtonText: 'Повысить', cancelButtonText: 'Отмена', type: 'warning' },
  ).then(() => emit('promote', props.employee, nextLevel.value))
}

watch(
  () => props.visible,
  (v) => {
    if (v && props.employee) {
      enableEditMode()
      isEditMode.value = false
      // 🔧 Загружаем роли при открытии диалога в режиме редактирования
      if (props.canEditRole) {
        fetchEditableRoles()
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.visible,
  (v) => {
    if (v) {
      selectedDepartmentForProfiles.value = null
    }
  },
)
</script>

<style scoped>
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
  align-items: flex-start;
  flex-wrap: wrap;
}
.info-label {
  font-weight: var(--font-weight-medium);
  color: #000;
  min-width: 100px;
  flex-shrink: 0;
}
.info-value {
  color: #000;
  flex: 1;
  font-size: 14px;
  min-width: 0;
  word-break: break-word;
}
.info-edit-row {
  display: flex;
  gap: var(--spacing-xs);
  flex: 1;
  flex-wrap: wrap;
  width: 100%;
}
.edit-input {
  flex: 1;
  min-width: 0;
  width: 100%;
}
.edit-input-full,
.edit-select-full {
  width: 100%;
}
:deep(.info-item .el-input__inner),
:deep(.info-item .el-select__input) {
  font-size: 14px !important;
  color: #000;
}
.detail-actions,
.promotion-actions,
.assign-profile-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  justify-content: flex-end;
  flex-wrap: wrap;
}
.promotion-actions {
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
.profile-department-filter {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f9f9f9;
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
}
.dept-filter-select {
  width: 200px;
  max-width: 100%;
}
.filter-hint {
  font-size: 12px;
  color: var(--gray);
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
  flex-wrap: wrap;
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
  min-width: 0;
}
.collapse-icon {
  transition: transform 0.2s;
  color: var(--gray);
  font-size: 14px;
  flex-shrink: 0;
}
.collapse-icon.expanded {
  transform: rotate(90deg);
}
.profile-collapse-content {
  padding: var(--spacing-sm);
  background: #fff;
}
.profile-description,
.empty-placeholder {
  font-size: 13px;
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px dashed #e0e0e0;
  line-height: 1.5;
}
.empty-placeholder {
  color: var(--gray);
  font-style: italic;
  padding: var(--spacing-sm) 0;
  border: none;
}
.skills-section-label {
  font-weight: var(--font-weight-semibold);
  margin: var(--spacing-sm) 0 var(--spacing-xs);
  font-size: 14px;
}
.skills-list-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}
.level-collapse-item,
.skill-collapse-item {
  margin-bottom: var(--spacing-xs);
}
.level-collapse-header,
.skill-collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs);
  background: #f5f5f5;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}
.level-collapse-header:hover,
.skill-collapse-header:hover {
  background: #ebebeb;
}
.level-collapse-title {
  font-weight: var(--font-weight-medium);
  color: #000;
}
.skill-collapse-title {
  color: #000;
}
.level-collapse-content {
  padding: var(--spacing-xs) 0 0 var(--spacing-sm);
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
  margin-bottom: var(--spacing-xs);
  font-size: 13px;
}
.stages-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
  border-bottom: 2px solid #e0e0e0;
  flex-wrap: wrap;
}
.stage-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: #999;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
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
  color: #000;
  font-size: 14px;
}
.stage-qa-list,
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}
.qa-item,
.task-item {
  border: 1px solid #e8e8e8;
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.qa-question,
.task-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f5f5f5;
  cursor: pointer;
  font-size: 13px;
  flex-wrap: wrap;
}
.qa-question:hover,
.task-title:hover {
  background: #ebebeb;
}
.qa-question-text,
.task-text {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}
.qa-answer,
.task-criteria {
  padding: var(--spacing-sm);
  background: #fff;
  font-size: 13px;
  color: #333;
  border-top: 1px solid #e8e8e8;
}
.task-criteria p {
  margin: var(--spacing-xs) 0 0 0;
  word-break: break-word;
}
.unlink-profile-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px dashed #f56c6c;
  flex-wrap: wrap;
}
.unlink-hint {
  font-size: 12px;
  color: var(--gray);
  font-style: italic;
}

/* ✅ АДАПТИВНОСТЬ МОДАЛЬНОГО ОКНА (только диалог, внутренние компоненты не трогаем) */

/* Базовые стили для центрирования и ограничения высоты */
:deep(.el-dialog) {
  margin: 0 auto !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid #eee;
}

:deep(.el-dialog__body) {
  padding: var(--spacing-md) var(--spacing-lg);
  overflow-y: auto;
  flex: 1;
}

:deep(.el-dialog__footer) {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid #eee;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
}

/* ✅ Адаптивность ширины диалога */
/* ≤ 1024px: уменьшаем ширину */
:deep(.el-dialog) {
  width: 90% !important;
  max-width: 750px !important;
}

@media (max-width: 1024px) {
  :deep(.el-dialog) {
    width: 92% !important;
    max-width: 95vw !important;
  }
}

/* ≤ 768px: ещё больше сжимаем */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
    max-width: 95vw !important;
  }
  :deep(.el-dialog__header),
  :deep(.el-dialog__body),
  :deep(.el-dialog__footer) {
    padding: var(--spacing-sm) var(--spacing-md);
  }
  :deep(.el-dialog__title) {
    font-size: 16px;
  }
}

/* ≤ 480px: минимальные отступы */
@media (max-width: 480px) {
  :deep(.el-dialog) {
    width: 98% !important;
    max-width: 98vw !important;
  }
  :deep(.el-dialog__header),
  :deep(.el-dialog__body),
  :deep(.el-dialog__footer) {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
  :deep(.el-dialog__title) {
    font-size: 15px;
  }
}

/* ✅ Корректное отображение скролла внутри диалога */
:deep(.el-dialog__body) {
  scrollbar-width: thin;
  scrollbar-color: #c0c4cc #f0f2f5;
}
:deep(.el-dialog__body::-webkit-scrollbar) {
  width: 6px;
}
:deep(.el-dialog__body::-webkit-scrollbar-track) {
  background: #f0f2f5;
  border-radius: 3px;
}
:deep(.el-dialog__body::-webkit-scrollbar-thumb) {
  background: #c0c4cc;
  border-radius: 3px;
}
:deep(.el-dialog__body::-webkit-scrollbar-thumb:hover) {
  background: #909399;
}

/* ✅ КАСТОМИЗАЦИЯ КНОПОК */

/* Кнопка "Редактировать" — цвет #4a2c6d (только когда она одна в detail-actions) */
:deep(.detail-actions .el-button--primary:not(:last-child)),
:deep(.detail-actions .el-button--primary:only-child) {
  --el-button-bg-color: #4a2c6d !important;
  --el-button-border-color: #4a2c6d !important;
  --el-button-hover-bg-color: #3a2356 !important;
  --el-button-hover-border-color: #3a2356 !important;
  --el-button-active-bg-color: #2a1a40 !important;
  --el-button-active-border-color: #2a1a40 !important;
  --el-button-text-color: #fff !important;
  --el-button-hover-text-color: #fff !important;
  --el-button-active-text-color: #fff !important;
}
:deep(.detail-actions .el-button--primary:not(:last-child).el-button),
:deep(.detail-actions .el-button--primary:only-child.el-button) {
  background-color: #4a2c6d !important;
  border-color: #4a2c6d !important;
  color: #fff !important;
}
:deep(.detail-actions .el-button--primary:not(:last-child).el-button:hover),
:deep(.detail-actions .el-button--primary:only-child.el-button:hover) {
  background-color: #3a2356 !important;
  border-color: #3a2356 !important;
}

/* Кнопка "Сохранить" (в режиме редактирования) — зелёная, как "Повысить" */
:deep(.detail-actions .el-button--primary:last-child:not(:only-child)) {
  --el-button-bg-color: #67c23a !important;
  --el-button-border-color: #67c23a !important;
  --el-button-hover-bg-color: #5daf34 !important;
  --el-button-hover-border-color: #5daf34 !important;
  --el-button-active-bg-color: #53a32f !important;
  --el-button-active-border-color: #53a32f !important;
  --el-button-text-color: #fff !important;
  --el-button-hover-text-color: #fff !important;
  --el-button-active-text-color: #fff !important;
}
:deep(.detail-actions .el-button--primary:last-child:not(:only-child).el-button) {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #fff !important;
}
:deep(.detail-actions .el-button--primary:last-child:not(:only-child).el-button:hover) {
  background-color: #5daf34 !important;
  border-color: #5daf34 !important;
}

/* Кнопка "Назначить профиль" — зелёная, как "Повысить" */
:deep(.assign-profile-actions .el-button--primary) {
  --el-button-bg-color: #67c23a !important;
  --el-button-border-color: #67c23a !important;
  --el-button-hover-bg-color: #5daf34 !important;
  --el-button-hover-border-color: #5daf34 !important;
  --el-button-active-bg-color: #53a32f !important;
  --el-button-active-border-color: #53a32f !important;
  --el-button-text-color: #fff !important;
  --el-button-hover-text-color: #fff !important;
  --el-button-active-text-color: #fff !important;
}
:deep(.assign-profile-actions .el-button--primary.el-button) {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #fff !important;
}
:deep(.assign-profile-actions .el-button--primary.el-button:hover) {
  background-color: #5daf34 !important;
  border-color: #5daf34 !important;
}

/* Кнопка "Отмена" — серый при наведении (как в окне подтверждения) */
:deep(.detail-actions .el-button:not(.el-button--primary):hover) {
  background-color: #c5c5c5 !important;
  border-color: #909399 !important;
  color: #fff !important;
}

/* ✅ КАСТОМИЗАЦИЯ РАДИО-КНОПОК (выбор профиля) — цвет #6a4c8d */
:deep(.profile-radio .el-radio__input .el-radio__inner) {
  border-color: #6a4c8d !important;
}
:deep(.profile-radio .el-radio__input.is-checked .el-radio__inner) {
  background-color: #6a4c8d !important;
  border-color: #6a4c8d !important;
}
:deep(.profile-radio .el-radio__input.is-checked .el-radio__inner::after) {
  background-color: #fff !important;
}
:deep(.profile-radio .el-radio__input:hover .el-radio__inner) {
  border-color: #6a4c8d !important;
}
</style>
