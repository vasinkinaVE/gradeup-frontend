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
      :width="900"
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
                  <div v-if="level.categories?.length" class="categories-view">
                    <div v-for="(cat, cIdx) in level.categories" :key="cIdx" class="category-view">
                      <strong>Категория:</strong> {{ cat.name }}
                      <ul class="skills-list-view">
                        <li v-for="skillId in cat.skills" :key="skillId">
                          {{ getSkillNameById(skillId) }}
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div v-if="level.uncategorizedSkills?.length" class="uncategorized-view">
                    <strong>Навыки без категории:</strong>
                    <ul class="skills-list-view">
                      <li v-for="skillId in level.uncategorizedSkills" :key="skillId">
                        {{ getSkillNameById(skillId) }}
                      </li>
                    </ul>
                  </div>

                  <el-empty
                    v-if="!level.categories?.length && !level.uncategorizedSkills?.length"
                    description="Нет навыков"
                    :image-size="50"
                  />
                </div>
              </el-collapse-transition>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="viewProfileVisible = false">Закрыть</el-button>
        <el-button type="primary" :icon="Edit" @click="handleEditProfile">
          Редактировать
        </el-button>
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: Профиль (редактирование) -->
    <el-dialog
      v-model="profileDialogVisible"
      :title="editingProfile ? 'Редактирование профиля' : 'Новый профиль'"
      :width="1000"
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
                    class="skill-select"
                  >
                    <el-option
                      v-for="skill in allSkills"
                      :key="skill.id"
                      :label="skill.name"
                      :value="skill.id"
                    />
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

// === Форма профиля ===
const profileForm = ref({
  position: '',
  description: '',
  levels: [],
})

// === Хелперы ===
const countProfileSkills = (profile) => {
  if (!profile.levels) return 0
  return profile.levels.reduce((total, level) => {
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

const getSkillNameById = (id) => props.allSkills.find((s) => s.id === id)?.name || `Навык #${id}`

const toggleViewLevelExpand = (levelIdx) => {
  const idx = expandedViewLevels.value.indexOf(levelIdx)
  if (idx === -1) {
    expandedViewLevels.value.push(levelIdx)
  } else {
    expandedViewLevels.value.splice(idx, 1)
  }
}

// === Профили: действия ===
const viewProfile = (profile) => {
  viewingProfile.value = profile
  expandedViewLevels.value = []
  viewProfileVisible.value = true
}

const handleEditProfile = () => {
  openProfileDialog(viewingProfile.value)
  viewProfileVisible.value = false
}

const openProfileDialog = (profile = null) => {
  if (profile) {
    editingProfile.value = profile
    profileForm.value = JSON.parse(JSON.stringify(profile))
  } else {
    editingProfile.value = null
    profileForm.value = {
      position: '',
      description: '',
      levels: [],
    }
  }
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

.categories-view,
.uncategorized-view {
  margin-left: var(--spacing-md);
}

.category-view {
  margin-bottom: var(--spacing-sm);
}

.skills-list-view {
  list-style: disc;
  padding-left: var(--spacing-md);
  margin: var(--spacing-xs) 0;
}

.skills-list-view li {
  font-size: 14px;
  margin-bottom: var(--spacing-xs);
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
</style>
