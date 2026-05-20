<!-- src/components/control/SkillSection.vue -->
<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление навыками</h2>
      <div class="header-actions">
        <el-button @click="openCategoriesDialog">
          <el-icon><Collection /></el-icon>
          Категории
        </el-button>
        <el-button type="primary" @click="openSkillDialog()">
          <el-icon><Plus /></el-icon>
          Создать навык
        </el-button>
      </div>
    </div>

    <!-- Поиск -->
    <div class="filters-row">
      <el-input
        v-model="skillSearch"
        placeholder="Поиск по названию навыка"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <!-- Таблица навыков -->
    <el-table :data="filteredSkills" stripe border class="data-table" @row-click="viewSkill">
      <el-table-column prop="name" label="Название навыка" min-width="250" />
      <el-table-column prop="categoryNames" label="Категории" width="200" show-overflow-tooltip />
      <el-table-column prop="description" label="Описание" min-width="300" show-overflow-tooltip />
      <el-table-column prop="stagesCount" label="Этапов" width="100" align="center">
        <template #default="{ row }">
          {{ row.stages?.length || 0 }}
        </template>
      </el-table-column>
    </el-table>

    <!-- 🔹 Модальное окно: КАТЕГОРИИ -->
    <el-dialog
      v-model="categoriesDialogVisible"
      title="Управление категориями"
      :width="500"
      class="admin-dialog"
      destroy-on-close
    >
      <div class="categories-list">
        <el-empty v-if="!categories.length" description="Нет категорий" :image-size="60" />

        <div v-for="cat in categories" :key="cat.id" class="category-item">
          <span class="category-name">{{ cat.name }}</span>
          <el-button
            type="danger"
            size="small"
            :icon="Delete"
            circle
            @click="confirmDeleteCategory(cat)"
            :disabled="isCategoryInUse(cat.id)"
          />
          <el-tooltip
            v-if="isCategoryInUse(cat.id)"
            content="Категория используется в навыках"
            placement="top"
          >
            <el-icon class="info-icon"><Warning /></el-icon>
          </el-tooltip>
        </div>
      </div>

      <div class="category-form">
        <el-input
          v-model="newCategoryName"
          placeholder="Название новой категории"
          @keyup.enter="addCategory"
          clearable
        >
          <template #append>
            <el-button
              type="primary"
              :icon="Plus"
              @click="addCategory"
              :disabled="!newCategoryName.trim()"
            />
          </template>
        </el-input>
      </div>

      <template #footer>
        <el-button @click="categoriesDialogVisible = false">Закрыть</el-button>
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: ПРОСМОТР НАВЫКА -->
    <el-dialog
      v-model="viewSkillVisible"
      title="Просмотр навыка"
      :width="700"
      class="admin-dialog"
      destroy-on-close
    >
      <div v-if="viewingSkill" class="view-content">
        <div class="view-row">
          <div class="view-label">Категории</div>
          <div class="view-value">{{ viewingSkill.categoryNames || 'Не указаны' }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Название</div>
          <div class="view-value">{{ viewingSkill.name }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Описание</div>
          <div class="view-value">{{ viewingSkill.description || '—' }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Материалы для подготовки</div>
          <div class="view-value">{{ viewingSkill.materials || 'Нет материалов' }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Этапы</div>
          <div class="stages-tabs">
            <div
              v-for="stageType in stageTypesWithContent"
              :key="stageType.key"
              class="stage-tab"
              :class="{ active: selectedViewStageType === stageType.key }"
              @click="selectViewStageType(stageType.key)"
            >
              {{ stageType.label }}
            </div>
          </div>

          <div class="stage-content">
            <div
              v-for="(stage, idx) in getStagesByType(viewingSkill.stages, selectedViewStageType)"
              :key="stage.id || idx"
              class="stage-item"
            >
              <div class="stage-title">
                {{ getStageContentTitle(selectedViewStageType) }}
              </div>

              <div v-if="stage.questions?.length" class="stage-qa-list">
                <div v-for="(q, qIdx) in stage.questions" :key="qIdx" class="qa-item">
                  <div
                    class="qa-question"
                    @click="toggleQAExpand(viewingSkill.id || 'view', stage.id || idx, qIdx)"
                  >
                    <span>{{ qIdx + 1 }}.</span>
                    <span class="qa-question-text">{{ q.text }}</span>
                    <el-icon
                      class="collapse-icon"
                      :class="{
                        expanded:
                          expandedQA[`${viewingSkill.id || 'view'}_${stage.id || idx}_${qIdx}`],
                      }"
                    >
                      <ArrowRight />
                    </el-icon>
                  </div>
                  <el-collapse-transition>
                    <div
                      v-show="expandedQA[`${viewingSkill.id || 'view'}_${stage.id || idx}_${qIdx}`]"
                      class="qa-answer"
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
              <el-empty v-else description="Нет вопросов/заданий" :image-size="50" />
            </div>
            <el-empty
              v-if="!getStagesByType(viewingSkill.stages, selectedViewStageType).length"
              description="Нет данных для этого этапа"
              :image-size="50"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button :icon="Edit" @click="handleEditSkill">Редактировать</el-button>
        <el-button type="danger" :icon="Delete" @click="confirmDeleteSkill">Удалить</el-button>
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: НАВЫК (редактирование) -->
    <el-dialog
      v-model="skillDialogVisible"
      :title="editingSkill ? 'Редактирование навыка' : 'Новый навык'"
      :width="700"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="skillForm" label-position="top" class="skill-form">
        <el-form-item label="Категории" prop="categoryIds">
          <el-select
            v-model="skillForm.categoryIds"
            placeholder="Выберите категории"
            clearable
            multiple
            collapse-tags
            collapse-tags-tooltip
            :max-collapse-tags="3"
            class="category-select"
          >
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="Название навыка *" prop="name">
          <el-input v-model="skillForm.name" placeholder="Например: Проектирование схем БД" />
        </el-form-item>

        <el-form-item label="Описание" prop="description">
          <el-input
            v-model="skillForm.description"
            type="textarea"
            :rows="2"
            placeholder="Краткое описание навыка"
          />
        </el-form-item>

        <el-form-item label="Материалы для подготовки" prop="materials">
          <el-input
            v-model="skillForm.materials"
            type="textarea"
            :rows="3"
            placeholder="Введите материалы для подготовки (ссылки, книги, курсы)"
          />
        </el-form-item>

        <!-- Этапы подтверждения -->
        <div class="form-section">
          <h4 class="section-title">Этапы подтверждения</h4>
          <div class="stages-list">
            <div v-for="(stage, stIdx) in skillForm.stages" :key="stIdx" class="stage-item">
              <div class="stage-header">
                <span class="stage-number">Этап {{ stIdx + 1 }}</span>
                <el-select
                  v-model="stage.type"
                  placeholder="Тип подтверждения"
                  size="small"
                  class="stage-type-select"
                >
                  <el-option
                    v-for="type in getAvailableStageTypes(stIdx)"
                    :key="type.value"
                    :label="type.label"
                    :value="type.value"
                  />
                </el-select>
                <el-button
                  type="danger"
                  size="small"
                  :icon="Delete"
                  circle
                  @click="removeStage(stIdx)"
                />
              </div>

              <!-- Вопросы/Задания внутри этапа -->
              <div class="stage-questions">
                <div v-for="(q, qIdx) in stage.questions" :key="qIdx" class="question-item">
                  <div class="question-header">
                    <span class="question-number">
                      {{ isPracticeOrPerformance(stage.type) ? 'Задание' : 'Вопрос' }}
                      {{ qIdx + 1 }}
                    </span>
                    <el-button
                      size="small"
                      type="danger"
                      :icon="Delete"
                      circle
                      @click="removeQuestion(stIdx, qIdx)"
                    />
                  </div>
                  <el-form-item
                    :label="
                      isPracticeOrPerformance(stage.type) ? 'Текст задания *' : 'Текст вопроса *'
                    "
                    size="small"
                  >
                    <el-input
                      v-model="stage.questions[qIdx].text"
                      type="textarea"
                      :rows="2"
                      :placeholder="
                        isPracticeOrPerformance(stage.type)
                          ? 'Введите текст задания'
                          : 'Введите текст вопроса'
                      "
                    />
                  </el-form-item>
                  <el-form-item
                    :label="
                      isPracticeOrPerformance(stage.type)
                        ? 'Критерий оценивания *'
                        : 'Эталонный ответ *'
                    "
                    size="small"
                  >
                    <el-input
                      v-model="stage.questions[qIdx].answer"
                      type="textarea"
                      :rows="3"
                      :placeholder="
                        isPracticeOrPerformance(stage.type)
                          ? 'Введите критерий оценивания'
                          : 'Введите правильный ответ'
                      "
                    />
                  </el-form-item>
                </div>
                <el-button type="primary" link size="small" @click="addQuestion(stIdx)">
                  <el-icon><Plus /></el-icon> Добавить
                  {{ isPracticeOrPerformance(stage.type) ? 'задание' : 'вопрос' }}
                </el-button>
              </div>
            </div>
            <el-button type="primary" link size="small" @click="addStage()">
              <el-icon><Plus /></el-icon> Добавить этап
            </el-button>
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="skillDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveSkill">Сохранить</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Delete,
  Edit,
  Search,
  ArrowRight,
  Collection,
  Warning,
} from '@element-plus/icons-vue'

const props = defineProps({
  skills: {
    type: Array,
    required: true,
  },
  categories: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['update:skills', 'update:categories'])

// === Поиск ===
const skillSearch = ref('')

const filteredSkills = computed(() => {
  if (!skillSearch.value) return props.skills
  const q = skillSearch.value.toLowerCase()
  return props.skills.filter((s) => s.name?.toLowerCase().includes(q))
})

// === Модальные окна ===
const skillDialogVisible = ref(false)
const viewSkillVisible = ref(false)
const categoriesDialogVisible = ref(false)

const editingSkill = ref(null)
const viewingSkill = ref(null)

// === Категории: состояние ===
const newCategoryName = ref('')

// === Расширения для просмотра ===
const expandedQA = ref({})
const selectedViewStageType = ref('practice')

// === Типы этапов ===
const stageTypes = [
  { key: 'practice', label: 'Практика' },
  { key: 'attestation', label: 'Аттестация' },
  { key: 'performance', label: 'Performance Review' },
]

// === Вычисляемые: только этапы с контентом для табов ===
const stageTypesWithContent = computed(() => {
  if (!viewingSkill.value?.stages) return []
  return stageTypes.filter((type) =>
    viewingSkill.value.stages?.some(
      (stage) => stage.type === type.key && stage.questions?.length > 0,
    ),
  )
})

// === Форма навыка ===
const skillForm = ref({
  name: '',
  categoryIds: [],
  categoryNames: '',
  description: '',
  materials: '',
  stages: [],
})

// === Хелперы ===
const isPracticeOrPerformance = (type) => {
  return type === 'practice' || type === 'performance'
}

// 🔧 Хелпер для получения строки названий категорий по массиву id
const getCategoryNamesByIds = (ids) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return ''
  const names = ids
    .map((id) => {
      const cat = props.categories.find((c) => c.id === id)
      return cat?.name
    })
    .filter(Boolean)
  return names.join(', ')
}

const getStagesByType = (stages, type) => {
  return stages?.filter((stage) => stage.type === type) || []
}

const getStageContentTitle = (type) => {
  if (type === 'attestation') {
    return 'Вопросы и ответы'
  }
  return 'Задания и критерии'
}

const toggleQAExpand = (skillId, stageId, idx) => {
  const key = `${skillId}_${stageId}_${idx}`
  expandedQA.value[key] = !expandedQA.value[key]
}

const selectViewStageType = (type) => {
  selectedViewStageType.value = type
}

const getAvailableStageTypes = (currentIndex) => {
  const allTypes = [
    { value: 'attestation', label: 'Аттестация' },
    { value: 'practice', label: 'Практика' },
    { value: 'performance', label: 'Perf. Review' },
  ]

  const usedTypes = skillForm.value.stages
    .filter((_, idx) => idx !== currentIndex)
    .map((s) => s.type)

  return allTypes.filter((t) => !usedTypes.includes(t.value))
}

// === Проверка: используется ли категория в навыках ===
const isCategoryInUse = (categoryId) => {
  return props.skills.some((skill) => {
    const ids = skill.categoryIds || (skill.categoryId ? [skill.categoryId] : [])
    return ids.includes(categoryId)
  })
}

// === КАТЕГОРИИ: действия ===
const openCategoriesDialog = () => {
  newCategoryName.value = ''
  categoriesDialogVisible.value = true
}

const addCategory = () => {
  const name = newCategoryName.value.trim()
  if (!name) {
    ElMessage.warning('Введите название категории')
    return
  }

  if (props.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    ElMessage.warning('Такая категория уже существует')
    return
  }

  const newCategory = {
    id: Date.now(),
    name: name,
  }

  emit('update:categories', [...props.categories, newCategory])
  newCategoryName.value = ''
  ElMessage.success('Категория добавлена')
}

const confirmDeleteCategory = async (category) => {
  if (isCategoryInUse(category.id)) {
    ElMessage.warning('Нельзя удалить категорию, которая используется в навыках')
    return
  }

  try {
    await ElMessageBox.confirm(`Удалить категорию "${category.name}"?`, 'Подтверждение', {
      type: 'warning',
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
    })
    emit(
      'update:categories',
      props.categories.filter((c) => c.id !== category.id),
    )
    ElMessage.success('Категория удалена')
  } catch {
    // отменено
  }
}

// === НАВЫКИ: действия ===
const viewSkill = (skill) => {
  const ids = skill.categoryIds || (skill.categoryId ? [skill.categoryId] : [])
  viewingSkill.value = {
    ...skill,
    categoryNames: ids.length ? getCategoryNamesByIds(ids) : skill.categoryName || 'Не указаны',
  }
  expandedQA.value = {}
  const firstAvailable = stageTypesWithContent.value[0]?.key || 'practice'
  selectedViewStageType.value = firstAvailable
  viewSkillVisible.value = true
}

const handleEditSkill = () => {
  openSkillDialog(viewingSkill.value)
  viewSkillVisible.value = false
}

const confirmDeleteSkill = async () => {
  if (!viewingSkill.value) return
  try {
    await ElMessageBox.confirm(`Удалить навык "${viewingSkill.value.name}"?`, 'Подтверждение', {
      type: 'warning',
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
    })
    emit(
      'update:skills',
      props.skills.filter((s) => s.id !== viewingSkill.value.id),
    )
    ElMessage.success('Навык удалён')
    viewSkillVisible.value = false
  } catch {
    // отменено
  }
}

const openSkillDialog = (skill = null) => {
  if (skill) {
    editingSkill.value = skill
    const ids = skill.categoryIds || (skill.categoryId ? [skill.categoryId] : [])
    skillForm.value = {
      name: skill.name || '',
      categoryIds: ids,
      categoryNames: skill.categoryNames || getCategoryNamesByIds(ids),
      description: skill.description || '',
      materials: skill.materials || '',
      stages: skill.stages ? JSON.parse(JSON.stringify(skill.stages)) : [],
    }
  } else {
    editingSkill.value = null
    skillForm.value = {
      name: '',
      categoryIds: [],
      categoryNames: '',
      description: '',
      materials: '',
      stages: [],
    }
  }
  skillDialogVisible.value = true
}

const addStage = () => {
  const availableTypes = getAvailableStageTypes(skillForm.value.stages.length)
  if (availableTypes.length === 0) {
    ElMessage.warning('Все типы этапов уже добавлены')
    return
  }

  skillForm.value.stages.push({
    type: availableTypes[0].value,
    questions: [],
  })
}

const removeStage = (idx) => {
  skillForm.value.stages.splice(idx, 1)
}

const addQuestion = (stageIdx) => {
  skillForm.value.stages[stageIdx].questions.push({
    text: '',
    answer: '',
  })
}

const removeQuestion = (stageIdx, qIdx) => {
  skillForm.value.stages[stageIdx].questions.splice(qIdx, 1)
}

const saveSkill = () => {
  if (!skillForm.value.name) {
    ElMessage.warning('Введите название навыка')
    return
  }

  const categoryNames = getCategoryNamesByIds(skillForm.value.categoryIds)

  if (editingSkill.value) {
    const idx = props.skills.findIndex((s) => s.id === editingSkill.value.id)
    if (idx !== -1) {
      const updated = [...props.skills]
      updated[idx] = {
        ...updated[idx],
        ...skillForm.value,
        categoryIds: skillForm.value.categoryIds,
        categoryNames: categoryNames,
      }
      emit('update:skills', updated)
    }
    ElMessage.success('Навык обновлён')
  } else {
    const newSkill = {
      id: Date.now(),
      ...skillForm.value,
      categoryIds: skillForm.value.categoryIds,
      categoryNames: categoryNames,
    }
    emit('update:skills', [newSkill, ...props.skills])
    ElMessage.success('Навык создан')
  }
  skillDialogVisible.value = false
}

const deleteSkill = async (skill) => {
  try {
    await ElMessageBox.confirm(`Удалить навык "${skill.name}"?`, 'Подтверждение', {
      type: 'warning',
    })
    emit(
      'update:skills',
      props.skills.filter((s) => s.id !== skill.id),
    )
    ElMessage.success('Навык удалён')
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
  gap: var(--spacing-sm);
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: var(--font-weight-semibold);
  color: var(--text);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
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
.skill-form {
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

.category-select {
  width: auto;
  min-width: 200px;
}

/* Этапы */
.stages-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.stage-item {
  padding: var(--spacing-md);
  background: #fff;
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}

.stage-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.stage-number {
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  min-width: 80px;
}

.stage-type-select {
  width: 180px;
}

.stage-questions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: #f9f9f9;
  border-radius: var(--radius-sm);
}

.question-item {
  padding: var(--spacing-md);
  background: #fff;
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.question-number {
  font-size: 13px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
}

/* === Модальные окна просмотра === */
.view-content {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--spacing-sm);
}

.view-row {
  margin-bottom: var(--spacing-sm);
}

.view-label {
  font-weight: var(--font-weight-semibold);
  color: var(--text);
  margin-bottom: 2px;
  font-size: 13px;
}

.view-value {
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
}

/* Этапы - табы */
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

/* Содержимое этапа */
.stage-content {
  margin-top: var(--spacing-sm);
}
.stage-item {
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: #fcfcfc;
  border-radius: var(--radius-sm);
}
.stage-title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-xs);
  color: var(--text);
  font-size: 14px;
}

/* Вопросы и ответы */
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

/* Кнопки */
.collapse-icon {
  transition: transform 0.2s;
  color: var(--gray);
  font-size: 14px;
}
.collapse-icon.expanded {
  transform: rotate(90deg);
}

/* === Стили для модального окна категорий === */
.categories-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  max-height: 40vh;
  overflow-y: auto;
  margin-bottom: var(--spacing-md);
  padding-right: var(--spacing-xs);
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-sm);
  border: 1px solid #e0e0e0;
}

.category-name {
  flex: 1;
  font-size: 14px;
  color: var(--text);
}

.category-item .el-button {
  margin-left: var(--spacing-xs);
}

.info-icon {
  color: var(--warning);
  font-size: 16px;
  margin-left: var(--spacing-xs);
  cursor: help;
}

.category-form {
  border-top: 1px solid #e0e0e0;
  padding-top: var(--spacing-md);
}

/* Адаптивность */
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .filters-row {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .skill-form {
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

/* Стили для множественного выбора категорий */
:deep(.category-select .el-tag) {
  margin-right: 4px;
}
</style>
