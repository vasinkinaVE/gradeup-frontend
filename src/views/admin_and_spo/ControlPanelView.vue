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
} from '@element-plus/icons-vue'

// Импорт секций
import SkillSection from '@/components/control/SkillSection.vue'
import DepartmentsSection from '@/components/control/DepartmentsSection.vue'
import DirectionsSection from '@/components/control/DirectionsSection.vue'
import ProfilesSection from '@/components/control/ProfilesSection.vue'
import MeetingSection from '@/components/control/MeetingSection.vue'

// === API конфигурация ===
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// === Вкладки ===
const tabs = [
  { id: 'skills', label: 'Навыки', icon: FolderOpened },
  { id: 'departments', label: 'Отделы', icon: OfficeBuilding },
  { id: 'directions', label: 'Направления', icon: Guide },
  { id: 'profiles', label: 'Профили', icon: Document },
  { id: 'meetings', label: 'Встречи', icon: Calendar },
]

const activeTab = ref('skills')
const loading = ref(false)

// === Данные ===
const categories = ref([])
const skills = ref([])
const departments = ref([])
const directions = ref([])
const profiles = ref([])
const meetings = ref([])
const employees = ref([])

// === Вспомогательная функция: имена категорий по ID ===
const getCategoryNamesByIds = (ids, categoriesList) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return ''
  if (!categoriesList || !Array.isArray(categoriesList)) return ''

  const names = ids
    .map((id) => {
      const cat = categoriesList.find((c) => String(c.id) === String(id))
      return cat?.name
    })
    .filter(Boolean)
  return names.join(', ')
}

// === API методы: Категории ===
const fetchCategories = async () => {
  try {
    const res = await fetch(`${API_BASE}/category/`)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()
    categories.value = data.map((c) => ({
      id: c.id,
      name: c.category_name,
    }))
    // 🔧 После загрузки категорий обновляем names у навыков
    if (skills.value.length > 0) {
      skills.value = skills.value.map((skill) => ({
        ...skill,
        categoryNames: getCategoryNamesByIds(
          skill.categoryIds || skill.categories,
          categories.value,
        ),
      }))
    }
  } catch (err) {
    console.error('Error fetching categories:', err)
    ElMessage.error('Не удалось загрузить категории')
  }
}

// 🔧 Исправлено: используем /skills/stages/stages для получения stages
const fetchSkills = async () => {
  try {
    // 🔧 Используем эндпоинт, который возвращает stages (даже без вопросов)
    const res = await fetch(`${API_BASE}/skills/stages/stages`)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    const data = await res.json()

    const newSkills = []

    for (const s of data) {
      try {
        // Нормализация этапов (для подсчёта количества)
        const normalizedStages = []
        if (s.stages && Array.isArray(s.stages)) {
          for (const st of s.stages) {
            const stageType = (st.confirmation_type || '').toLowerCase().trim()
            let type = 'practice'
            if (['аттестация', 'attestation'].includes(stageType)) type = 'attestation'
            else if (['performance review', 'performance'].includes(stageType)) type = 'performance'

            normalizedStages.push({
              id: st?.id || null,
              type,
              confirmation_type: st.confirmation_type,
              last_version: st.last_version,
              questions: [], // 🔧 Вопросы подгрузятся при просмотре
            })
          }
        }

        // 🔧 Нормализация категорий
        let catIds = []
        if (s.categories && Array.isArray(s.categories)) {
          catIds = s.categories
        } else if (s.category_ids && Array.isArray(s.category_ids)) {
          catIds = s.category_ids
        } else if (typeof s.categories === 'number') {
          catIds = [s.categories]
        }

        // 🔧 Заполняем categoryNames сразу
        const categoryNames = getCategoryNamesByIds(catIds, categories.value)

        const skillObj = {
          id: s.id,
          name: s.title || s.name || '',
          title: s.title || '',
          description: s.description || '',
          materials: s.literature || s.materials || '',
          literature: s.literature || '',
          categoryIds: catIds,
          categories: catIds,
          categoryNames, // 🔧 Теперь заполнено!
          stages: normalizedStages,
          stagesCount: normalizedStages.length, // 🔧 Для совместимости
        }

        newSkills.push(skillObj)
      } catch (stageErr) {
        console.error('Error normalizing skill:', s, stageErr)
      }
    }

    skills.value = newSkills
  } catch (err) {
    console.error('Error fetching skills:', err)
    ElMessage.error('Не удалось загрузить навыки')
    skills.value = []
  }
}

// === Загрузка данных при монтировании ===
onMounted(async () => {
  loading.value = true
  // 🔧 Сначала загружаем категории, потом навыки (чтобы подставить имена)
  await fetchCategories()
  await fetchSkills()
  loading.value = false
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
