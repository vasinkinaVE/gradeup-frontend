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
    <SkillSection v-if="activeTab === 'skills'" v-model:skills="skills" :categories="categories" />

    <CategoriesSection v-if="activeTab === 'categories'" v-model:categories="categories" />

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
import { ref } from 'vue'
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
import CategoriesSection from '@/components/control/CategoriesSection.vue'
import DepartmentsSection from '@/components/control/DepartmentsSection.vue'
import DirectionsSection from '@/components/control/DirectionsSection.vue'
import ProfilesSection from '@/components/control/ProfilesSection.vue'
import MeetingSection from '@/components/control/MeetingSection.vue'

// === Вкладки ===
const tabs = [
  { id: 'skills', label: 'Навыки', icon: FolderOpened },
  { id: 'categories', label: 'Категории', icon: Collection },
  { id: 'departments', label: 'Отделы', icon: OfficeBuilding },
  { id: 'directions', label: 'Направления', icon: Guide },
  { id: 'profiles', label: 'Профили', icon: Document },
  { id: 'meetings', label: 'Встречи', icon: Calendar },
]

const activeTab = ref('skills')

// === Данные: Категории ===
const categories = ref([
  { id: 1, name: 'Базы данных' },
  { id: 2, name: 'Frontend' },
  { id: 3, name: 'Backend' },
  { id: 4, name: 'DevOps' },
  { id: 5, name: 'Тестирование' },
])

// === Данные: Отделы ===
const departments = ref([])

// === Данные: Направления ===
const directions = ref([])

// === Данные: НАВЫКИ ===
const skills = ref([])

// === Данные: Профили ===
const profiles = ref([])

// === Данные: Встречи ===
const meetings = ref([])

// === Данные: Сотрудники ===
const employees = ref([])
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

/* Адаптивность */
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
