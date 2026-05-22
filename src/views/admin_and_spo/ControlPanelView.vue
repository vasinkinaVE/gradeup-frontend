<!-- src/views/admin_and_spo/ControlPanelView.vue -->
<template>
  <div class="control-panel">
    <!-- Заголовок -->
    <header class="panel-header">
      <h1>Панель управления</h1>
    </header>

    <!-- Вкладки -->
    <div class="panel-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="onTabChange(tab.id)"
      >
        <el-icon><component :is="tab.icon" /></el-icon>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Секции -->
    <SkillSection
      v-if="activeTab === 'skills'"
      v-model:skills="skills"
      :categories="categories"
      :loading="skillsLoading"
      @update:categories="fetchCategories"
      @update:skills="fetchSkills"
      @refresh="handleRefresh"
    />

    <DepartmentsSection
      v-if="activeTab === 'departments'"
      ref="departmentsSectionRef"
      v-model:departments="departments"
      :all-profiles="profiles"
      :employees="employees"
      :loading="departmentsLoading"
      @update:departments="handleDepartmentsUpdate"
      @refresh="handleRefresh"
    />

    <DirectionsSection
      v-if="activeTab === 'directions'"
      v-model:directions="directions"
      :all-departments="departments"
    />

    <ProfilesSection
      v-if="activeTab === 'profiles'"
      ref="profilesSectionRef"
      v-model:profiles="profiles"
      :all-skills="skills"
      :categories="categories"
      :departments="departments"
      :loading="profilesLoading"
      @refresh="handleRefresh"
      @update:profiles="handleProfilesUpdate"
      @update:departmentFilter="onProfileDepartmentFilterChange"
    />

    <MeetingSection
      v-if="activeTab === 'meetings'"
      v-model:meetings="meetings"
      :skills="skills"
      :employees="employees"
    />

    <!-- 🔥 Журнал событий -->
    <LogsSection
      v-if="activeTab === 'logs'"
      v-model:logs="logs"
      :loading="logsLoading"
      @refresh="fetchLogs"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  FolderOpened,
  Document,
  Calendar,
  OfficeBuilding,
  Guide,
  Collection,
  Timer,
} from '@element-plus/icons-vue'

import SkillSection from '@/components/control/SkillSection.vue'
import DepartmentsSection from '@/components/control/DepartmentsSection.vue'
import DirectionsSection from '@/components/control/DirectionsSection.vue'
import ProfilesSection from '@/components/control/ProfilesSection.vue'
import MeetingSection from '@/components/control/MeetingSection.vue'
import LogsSection from '@/components/control/LogsSection.vue'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const tabs = [
  { id: 'skills', label: 'Навыки', icon: FolderOpened },
  { id: 'departments', label: 'Отделы', icon: OfficeBuilding },
  { id: 'directions', label: 'Направления', icon: Guide },
  { id: 'profiles', label: 'Профили', icon: Document },
  { id: 'meetings', label: 'Встречи', icon: Calendar },
  { id: 'logs', label: 'Журнал событий', icon: Timer },
]

const activeTab = ref('skills')
const departmentsSectionRef = ref(null)
const profilesSectionRef = ref(null)

// Загрузки
const skillsLoading = ref(false)
const departmentsLoading = ref(false)
const profilesLoading = ref(false)
const logsLoading = ref(false)

// Данные
const categories = ref([])
const skills = ref([])
const departments = ref([])
const directions = ref([])
const profiles = ref([])
const meetings = ref([])
const employees = ref([])
const logs = ref([])

// Фильтры для профилей
const profileDepartmentFilter = ref([])

const extractCategoryIds = (categoriesData) => {
  if (!categoriesData) return []
  if (!Array.isArray(categoriesData)) return []
  return categoriesData
    .map((c) => {
      if (typeof c === 'object' && c !== null && 'id' in c) {
        return c.id
      }
      return c
    })
    .filter((id) => id != null)
}

// === Категории ===
const fetchCategories = async () => {
  try {
    const res = await fetch(`${API_BASE}/category/`)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()
    categories.value = data.map((c) => ({
      id: c.id,
      name: c.category_name,
    }))
  } catch (err) {
    console.error('Error fetching categories:', err)
    ElMessage.error('Не удалось загрузить категории')
  }
}

// 🔧 Функция нормализации типа этапа (должна быть такой же как в ProfilesSection)
const normalizeStageType = (type) => {
  if (!type) return 'practice'
  const t = String(type).toLowerCase().trim()

  // Аттестация: поддержка всех вариантов
  if (t === 'аттестация' || t === 'certification') return 'attestation'

  // Performance review: поддержка snake_case и пробелов
  if (t === 'performance review' || t === 'performancereview' || t === 'performance_review')
    return 'performance'

  // Практическое задание: поддержка всех вариантов
  if (t === 'практическое задание' || t === 'practice') return 'practice'

  return 'practice'
}

// === Навыки ===
const fetchSkills = async () => {
  try {
    skillsLoading.value = true
    const res = await fetch(`${API_BASE}/skills/`)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()

    const newSkills = []
    for (const s of data) {
      try {
        const rawCategories = Array.isArray(s.categories) ? s.categories : []
        const catIds = extractCategoryIds(rawCategories)
        const categoryNames = rawCategories
          .map((c) => c?.category_name || c?.name)
          .filter((name) => name?.trim())
          .join(', ')

        // 🔧 Нормализация этапов и вопросов
        const rawStages = Array.isArray(s.stages) ? s.stages : []
        const normalizedStages = rawStages.map((stage, stIdx) => {
          // Поддержка разных названий поля с вопросами
          const rawQuestions = stage.questions || stage.questions_list || stage.items || []
          const normalizedQuestions = Array.isArray(rawQuestions)
            ? rawQuestions.map((q, qIdx) => ({
                id: q?.id ?? q?.question_id ?? `q_${stIdx}_${qIdx}`,
                // 🔧 Универсальное извлечение текста вопроса
                text: q?.question || q?.text || q?.content || q?.question_text || q?.title || '',
                // 🔧 Универсальное извлечение ответа
                answer: q?.answer || q?.response || q?.correct_answer || q?.solution || '',
                num: q?.num ?? q?.number ?? qIdx + 1,
              }))
            : []

          // 🔧 Нормализуем тип этапа
          const rawType = stage.confirmation_type || stage.type || stage.stage_type
          const normalizedType = normalizeStageType(rawType)

          return {
            ...stage,
            // 🔧 Гарантируем, что вопросы всегда в поле `questions`
            questions: normalizedQuestions,
            // 🔧 Сохраняем нормализованный тип
            type: normalizedType,
            confirmation_type: normalizedType,
          }
        })

        const skillObj = {
          id: s.id,
          name: s.title || s.name || '',
          title: s.title || '',
          description: s.description || '',
          materials: s.literature || s.materials || '',
          literature: s.literature || '',
          categories: rawCategories,
          categoryIds: catIds,
          categoryNames: categoryNames || 'Не указаны',
          // 🔧 Используем нормализованные этапы
          stages: normalizedStages,
          stagesCount: normalizedStages.length,
        }
        newSkills.push(skillObj)
      } catch (err) {
        console.error('❌ Error normalizing skill:', s, err)
      }
    }
    skills.value = newSkills
    console.log(
      '✅ Skills loaded and normalized:',
      skills.value.map((s) => ({
        id: s.id,
        name: s.name,
        stages: s.stages.map((st) => ({ type: st.type, questionsCount: st.questions.length })),
      })),
    )
  } catch (err) {
    console.error('❌ Error fetching skills:', err)
    ElMessage.error('Не удалось загрузить навыки')
    skills.value = []
  } finally {
    skillsLoading.value = false
  }
}

// === Сотрудники (для выбора руководителя) ===
const fetchEmployees = async () => {
  try {
    const res = await fetch(`${API_BASE}/employees/`)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()
    employees.value = data.map((emp) => ({
      id: emp.id,
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      patronymic: emp.patronymic || '',
      position: emp.position || '',
    }))
  } catch (err) {
    console.error('Error fetching employees:', err)
    employees.value = []
  }
}

// === Отделы ===
const fetchDepartments = async () => {
  try {
    departmentsLoading.value = true
    const res = await fetch(`${API_BASE}/admin/departments/`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()

    const normalized = Array.isArray(data)
      ? data.map((d) => {
          let dept = d
          if (typeof d === 'string') {
            try {
              dept = JSON.parse(d)
            } catch {
              dept = {}
            }
          }
          return {
            id: dept.id,
            name: dept.department_name || dept.name || '',
            description: dept.description || '',
            supervisor_id: dept.supervisor_id || dept.supervisor?.id || null,
            supervisor: dept.supervisor || null,
            profiles: Array.isArray(dept.profiles)
              ? dept.profiles.map((p) => (typeof p === 'object' ? p.id : p))
              : [],
            availableProfileIds: Array.isArray(dept.profiles)
              ? dept.profiles.map((p) => (typeof p === 'object' ? p.id : p))
              : [],
          }
        })
      : []

    departments.value = normalized
    return normalized
  } catch (err) {
    console.error('Error fetching departments:', err)
    ElMessage.error('Не удалось загрузить отделы')
    departments.value = []
    return []
  } finally {
    departmentsLoading.value = false
  }
}

// === Профили (через /profiles/levels) ===
const fetchProfiles = async (deptIds = null) => {
  try {
    profilesLoading.value = true

    // 🔧 ИСПРАВЛЕНО: используем конкатенацию вместо new URL()
    let url = `${API_BASE}/profiles/levels`
    if (deptIds?.length) {
      const params = new URLSearchParams()
      deptIds.forEach((id) => params.append('departments_id', id))
      url = `${url}?${params.toString()}`
    }

    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
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
      ? profilesData.map((p) => ({
          id: p.id,
          title: p.title || p.position || '',
          description: p.description || '',
          levels: p.levels || [],
        }))
      : []

    profiles.value = normalized
    return normalized
  } catch (err) {
    console.error('Error fetching profiles:', err)
    ElMessage.error('Не удалось загрузить профили')
    profiles.value = []
    return []
  } finally {
    profilesLoading.value = false
  }
}

// === Журнал событий ===
const fetchLogs = async () => {
  try {
    logsLoading.value = true
    const res = await fetch(`${API_BASE}/logs/`)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()

    logs.value = data.map((log) => ({
      id: log.id,
      timestamp: log.timestamp || log.created_at || '',
      event_type: log.event_type || log.type || '',
      actor: log.actor || log.user || log.who || '',
      target: log.target || log.to_whom || log.recipient || '',
      message: log.message || log.description || '',
      severity: log.severity || log.level || 'info',
    }))
  } catch (err) {
    console.error('Error fetching logs:', err)
    ElMessage.error('Не удалось загрузить журнал событий')
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

// === Обработчики событий ===
const handleRefresh = () => {
  // Глобальный индикатор загрузки
}

const handleDepartmentsUpdate = async (newDepts = null) => {
  if (Array.isArray(newDepts)) {
    departments.value = newDepts
  } else {
    await fetchDepartments()
  }
}

const handleProfilesUpdate = async (newProfiles = null) => {
  if (Array.isArray(newProfiles)) {
    profiles.value = newProfiles
  } else {
    await fetchProfiles(profileDepartmentFilter.value.length ? profileDepartmentFilter.value : null)
  }
}

const onProfileDepartmentFilterChange = (deptIds) => {
  profileDepartmentFilter.value = deptIds
}

const onTabChange = async (tabId) => {
  activeTab.value = tabId

  if (tabId === 'departments' && !departments.value.length) {
    await fetchDepartments()
  }
  if (tabId === 'profiles' && !profiles.value.length) {
    await fetchProfiles(profileDepartmentFilter.value.length ? profileDepartmentFilter.value : null)
  }
  if (tabId === 'logs' && !logs.value.length) {
    await fetchLogs()
  }
}

// === Публичные методы ===
const reloadDepartments = async () => {
  if (departmentsSectionRef.value?.reload) {
    await departmentsSectionRef.value.reload()
  } else {
    await fetchDepartments()
  }
}

const reloadProfiles = async () => {
  if (profilesSectionRef.value?.reload) {
    await profilesSectionRef.value.reload()
  } else {
    await fetchProfiles(profileDepartmentFilter.value.length ? profileDepartmentFilter.value : null)
  }
}

// === Инициализация ===
onMounted(async () => {
  await Promise.all([fetchCategories(), fetchSkills(), fetchEmployees(), fetchDepartments()])

  await fetchProfiles(profileDepartmentFilter.value.length ? profileDepartmentFilter.value : null)

  if (activeTab.value === 'logs') {
    await fetchLogs()
  }
})

// === Watch для реактивного обновления ===
watch(activeTab, async (newTab) => {
  if (newTab === 'departments' && !departments.value.length) {
    await fetchDepartments()
  }
  if (newTab === 'profiles' && !profiles.value.length) {
    await fetchProfiles(profileDepartmentFilter.value.length ? profileDepartmentFilter.value : null)
  }
})

// Экспортируем методы
defineExpose({
  reloadDepartments,
  reloadProfiles,
  fetchDepartments,
  fetchProfiles,
})
</script>

<style scoped>
.control-panel {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
  color: var(--text);
}
.panel-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--text);
}
.panel-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin: var(--spacing-md) 0 var(--spacing-lg);
  background: var(--background);
  padding: var(--spacing-xs);
  border-radius: var(--radius-md);
  width: fit-content;
  flex-wrap: wrap;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--gray);
  transition: all 0.2s;
}
.tab-btn:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.1);
}
.tab-btn.active {
  background: var(--primary);
  color: #fff;
}
.tab-btn .el-icon {
  font-size: 16px;
}
@media (max-width: 768px) {
  .panel-tabs {
    flex-direction: column;
    width: 100%;
  }
  .tab-btn {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
