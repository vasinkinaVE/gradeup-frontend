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
        @click="activeTab = tab.id"
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
      :loading="loading"
      @update:categories="fetchCategories"
      @update:skills="fetchSkills"
    />

    <DepartmentsSection
      v-if="activeTab === 'departments'"
      v-model:departments="departments"
      :all-profiles="profiles"
    />

    <DirectionsSection
      v-if="activeTab === 'directions'"
      v-model:directions="directions"
      :all-departments="departments"
    />

    <ProfilesSection
      v-if="activeTab === 'profiles'"
      v-model:profiles="profiles"
      :all-skills="skills"
      :categories="categories"
    />

    <MeetingSection
      v-if="activeTab === 'meetings'"
      v-model:meetings="meetings"
      :skills="skills"
      :employees="employees"
    />

    <!-- 🔥 Новая секция: Журнал событий -->
    <LogsSection
      v-if="activeTab === 'logs'"
      v-model:logs="logs"
      :loading="logsLoading"
      @refresh="fetchLogs"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  FolderOpened,
  Document,
  Calendar,
  OfficeBuilding,
  Guide,
  Collection,
  Timer, // ✅ Иконка для журнала событий
} from '@element-plus/icons-vue'

import SkillSection from '@/components/control/SkillSection.vue'
import DepartmentsSection from '@/components/control/DepartmentsSection.vue'
import DirectionsSection from '@/components/control/DirectionsSection.vue'
import ProfilesSection from '@/components/control/ProfilesSection.vue'
import MeetingSection from '@/components/control/MeetingSection.vue'
import LogsSection from '@/components/control/LogsSection.vue' // ✅ Импорт новой секции

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const tabs = [
  { id: 'skills', label: 'Навыки', icon: FolderOpened },
  { id: 'departments', label: 'Отделы', icon: OfficeBuilding },
  { id: 'directions', label: 'Направления', icon: Guide },
  { id: 'profiles', label: 'Профили', icon: Document },
  { id: 'meetings', label: 'Встречи', icon: Calendar },
  { id: 'logs', label: 'Журнал событий', icon: Timer }, // ✅ Новая вкладка
]

const activeTab = ref('skills')
const loading = ref(false)

const categories = ref([])
const skills = ref([])
const departments = ref([])
const directions = ref([])
const profiles = ref([])
const meetings = ref([])
const employees = ref([])

// 🔥 Данные для журнала событий
const logs = ref([])
const logsLoading = ref(false)

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

const fetchSkills = async () => {
  try {
    loading.value = true
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

        const stages = Array.isArray(s.stages) ? s.stages : []
        const stagesCount = stages.length

        const skillObj = {
          id: s.id,
          name: s.title || s.name || '',
          title: s.title || '',
          description: s.description || '',
          materials: s.literature || '',
          literature: s.literature || '',
          categories: rawCategories,
          categoryIds: catIds,
          categoryNames: categoryNames || 'Не указаны',
          stages: stages,
          stagesCount: stagesCount,
        }
        newSkills.push(skillObj)
      } catch (err) {
        console.error('Error normalizing skill:', s, err)
      }
    }
    skills.value = newSkills
  } catch (err) {
    console.error('Error fetching skills:', err)
    ElMessage.error('Не удалось загрузить навыки')
    skills.value = []
  }
}

// 🔥 Загрузка журнала событий
const fetchLogs = async () => {
  try {
    logsLoading.value = true
    const res = await fetch(`${API_BASE}/logs/`) // ✅ Эндпоинт для логов
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()

    logs.value = data.map((log) => ({
      id: log.id,
      timestamp: log.timestamp || log.created_at || '',
      event_type: log.event_type || log.type || '',
      actor: log.actor || log.user || log.who || '', // Кто совершил действие
      target: log.target || log.to_whom || log.recipient || '', // Кому/чему адресовано
      message: log.message || log.description || '',
      severity: log.severity || log.level || 'info', // Опционально: для цветовой индикации
    }))
  } catch (err) {
    console.error('Error fetching logs:', err)
    ElMessage.error('Не удалось загрузить журнал событий')
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  await fetchCategories()
  await fetchSkills()
  loading.value = false

  // Загружаем логи при инициализации (опционально)
  if (activeTab.value === 'logs') {
    await fetchLogs()
  }
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
