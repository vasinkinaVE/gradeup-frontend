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
      <div class="detail-section">
        <h3 class="section-title">Основная информация</h3>
        <div class="info-grid">
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
          <div class="info-item">
            <span class="info-label">Должность:</span>
            <span v-if="!isEditMode" class="info-value">{{ employee.position }}</span>
            <el-input
              v-else
              v-model="editForm.position"
              placeholder="Должность"
              class="edit-input-full"
            />
          </div>
          <div class="info-item">
            <span class="info-label">Email:</span>
            <span v-if="!isEditMode || isSupervisor" class="info-value">{{ employee.email }}</span>
            <el-input v-else v-model="editForm.email" placeholder="Email" class="edit-input-full" />
          </div>
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
        <div class="detail-actions" v-if="isAdmin">
          <el-button v-if="!isEditMode" type="primary" @click="enableEditMode"
            >Редактировать</el-button
          >
          <template v-else>
            <el-button @click="cancelEdit">Отмена</el-button>
            <el-button type="primary" @click="saveChanges">Сохранить</el-button>
          </template>
        </div>
        <div
          v-if="(isSupervisor || isAdmin) && nextLevel && isPromotionAvailable"
          class="promotion-actions"
        >
          <el-button type="success" @click="showPromoteDialog"> Повысить сотрудника </el-button>
        </div>
      </div>

      <div class="detail-section profile-section">
        <h3 class="section-title">Профиль</h3>
        <!-- ✅ Передаем userFullProfile с приоритетом над шаблонным профилем -->
        <ProfileCard
          v-if="employee.profileId && (userFullProfile || selectedProfileData)"
          :profile="userFullProfile || selectedProfileData"
          :user-id="employee.userId"
          :is-current-user="employee.userId === authUserId"
          :fetch-skill-detail="fetchSkillDetail"
          :fetch-skill-questions="fetchSkillQuestions"
        />

        <!-- ✅ Кнопка отвязки профиля -->
        <div v-if="employee.profileId && (isAdmin || isSupervisor)" class="unlink-profile-section">
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
          <span class="unlink-hint">Профиль будет удалён, прогресс сброшен</span>
        </div>

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
                          <span class="level-collapse-title">{{
                            level.level_name || level.name || `Уровень ${level.num || lIdx + 1}`
                          }}</span>
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
                                                  ><span class="qa-question-text">{{
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
                                                    ><span class="task-text">{{
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
              <el-button type="primary" size="small" @click="assignProfile" :loading="assignLoading"
                >Назначить профиль</el-button
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Remove } from '@element-plus/icons-vue'
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
  userFullProfile?: any | null
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

const skillsCache = new Map<number, any>()
const stageTypes = [
  { key: 'practice', label: 'Практическое задание' },
  { key: 'attestation', label: 'Аттестация' },
  { key: 'performance', label: 'Performance review' },
]

const visible = computed({ get: () => props.visible, set: (v) => emit('update:visible', v) })

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
  const idx = profile.levels.findIndex(
    (l: any) => l.name === currentLevelName || l.level_name === currentLevelName,
  )
  return idx === -1 || idx >= profile.levels.length - 1 ? null : profile.levels[idx + 1]
})

const isPromotionAvailable = computed(() => props.employee?.progress >= 100 && !!nextLevel.value)

const mapTypeToFrontendSimple = (t: string | null | undefined) => {
  if (!t) return 'practice'
  const s = String(t).trim().toLowerCase()
  if (s === 'аттестация' || s === 'certification') return 'attestation'
  if (s === 'performance review' || s === 'performance_review') return 'performance'
  return 'practice'
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
        type: mapTypeToFrontendSimple(st.confirmation_type),
        confirmation_type: st.confirmation_type,
        questions: (Array.isArray(st.questions) ? st.questions : []).map((q: any) => ({
          id: q?.id,
          text: q?.question || q?.text || '',
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
  const ids = level.level_skills || level.skills || []
  return ids.map((item: any) => {
    if (typeof item === 'object' && item?.id)
      return { id: item.id, title: item.title || item.name || getSkillNameById(item.id) }
    return { id: item, title: getSkillNameById(item) }
  })
}

const getSkillNameById = (skillId: number) => {
  const c = skillsCache.get(skillId)
  if (c?.name || c?.title) return c.name || c.title
  for (const p of props.availableProfiles)
    for (const l of p.levels || []) {
      const sk = (l.level_skills || l.skills || []).find(
        (s: any) => (typeof s === 'object' && s.id === skillId) || s === skillId,
      )
      if (sk && typeof sk === 'object' && (sk.name || sk.title)) return sk.name || sk.title
    }
  return `Навык #${skillId}`
}

const getFullSkillDescription = (id: number) => skillsCache.get(id)?.description || ''
const getFullSkillMaterialsArray = (id: number) => {
  const m = skillsCache.get(id)?.materials || skillsCache.get(id)?.literature
  return typeof m === 'string' && m.trim()
    ? m.split('\n').filter(Boolean)
    : Array.isArray(m)
      ? m
      : []
}
const getFullSkillStages = (id: number) => skillsCache.get(id)?.stages || []
const getSkillStageTypesWithContent = (id: number) => {
  const st = getFullSkillStages(id)
  if (!st?.length) return stageTypes
  const av = stageTypes.filter((t) => st.some((s) => s?.type === t.key))
  return av.length ? av : stageTypes
}
const getSkillStagesByTypeSimple = (id: number, type: string) =>
  (getFullSkillStages(id) || []).filter((s: any) => s?.type === type)
const getStageContentTitleSimple = (t: string) =>
  t === 'attestation' ? 'Вопросы и ответы' : 'Задания и критерии'
const getSkillSelectedStageType = (id: number) => skillSelectedStageTypes.value[id] || 'practice'
const selectSkillStageType = (id: number, t: string) => {
  skillSelectedStageTypes.value[id] = t
}
const hasStageContent = (stages: any[], t: string) => stages.some((s) => s.type === t)

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
      ?.levels?.find((l) => (l.id || -1) === lId)
    if (level) {
      for (const sk of getLevelSkillIds(level)) {
        if (!skillsCache.has(sk.id)) await fetchFullSkillData(sk.id)
        if (!skillSelectedStageTypes.value[sk.id])
          skillSelectedStageTypes.value[sk.id] =
            getSkillStageTypesWithContent(sk.id)[0]?.key || 'practice'
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
    if (!skillsCache.has(id)) await fetchFullSkillData(id)
    if (!skillSelectedStageTypes.value[id])
      skillSelectedStageTypes.value[id] = getSkillStageTypesWithContent(id)[0]?.key || 'practice'
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
  const r = props.availableRoles.find((r) => r.id === rId)
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
}

const enableEditMode = () => {
  isEditMode.value = true
  editForm.value = {
    userId: props.employee?.userId,
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
  enableEditMode()
}

const saveChanges = () => {
  if (!editForm.value.firstName || !editForm.value.lastName || !editForm.value.email) {
    return ElMessage.warning('Заполните обязательные поля: Имя, Фамилия, Email')
  }
  emit('update', editForm.value)
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
      `Вы уверены, что хотите отвязать профиль от сотрудника ${props.employee.fullName}? Прогресс и история этапов будут сброшены.`,
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
    `Повысить ${props.employee.fullName} до "${nextLevel.value.name}"?`,
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
    }
  },
  { immediate: true },
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
}
.stage-tab {
  padding: var(--spacing-xs) var(--spacing-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: #999;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
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
}
.qa-question:hover,
.task-title:hover {
  background: #ebebeb;
}
.qa-question-text,
.task-text {
  flex: 1;
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
}
.unlink-profile-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px dashed #f56c6c;
}
.unlink-hint {
  font-size: 12px;
  color: var(--gray);
  font-style: italic;
}
</style>
