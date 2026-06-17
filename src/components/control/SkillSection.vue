<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление навыками</h2>
      <div class="header-actions">
        <el-button
          class="btn-categories"
          @click="openCategoriesDialog"
          :loading="categoriesLoading"
        >
          <el-icon><Collection /></el-icon>
          Категории
        </el-button>
        <el-button
          type="primary"
          class="btn-create-skill"
          @click="openSkillDialog()"
          :loading="skillsLoading"
        >
          <el-icon><Plus /></el-icon>
          Создать навык
        </el-button>
      </div>
    </div>

    <div class="filters-row">
      <el-input
        v-model="skillSearch"
        placeholder="Поиск по названию навыка"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <el-table
      :data="filteredSkills"
      stripe
      border
      class="data-table"
      @row-click="viewSkill"
      v-loading="skillsLoading"
    >
      <el-table-column prop="name" label="Название навыка" min-width="250" />

      <el-table-column label="Категории" width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ getSkillCategoryNames(row) }}
        </template>
      </el-table-column>

      <el-table-column prop="description" label="Описание" min-width="300" show-overflow-tooltip />
      <el-table-column label="Этапов" width="100" align="center">
        <template #default="{ row }">
          {{ row.stages?.length || row.stagesCount || 0 }}
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="categoriesDialogVisible"
      title="Управление категориями"
      width="80%"
      :style="{ maxWidth: '500px' }"
      class="admin-dialog"
      destroy-on-close
      align-center
    >
      <div class="categories-list" v-loading="categoriesLoading">
        <el-empty v-if="!categories.length" description="Нет категорий" :image-size="60" />

        <div v-for="cat in categories" :key="cat.id" class="category-item">
          <span class="category-name">{{ cat.name }}</span>
          <el-button
            type="danger"
            size="small"
            :icon="Delete"
            circle
            @click="confirmDeleteCategory(cat)"
          />
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
              :disabled="!newCategoryName.trim() || categoriesLoading"
            />
          </template>
        </el-input>
      </div>

      <template #footer> </template>
    </el-dialog>

    <el-dialog
      v-model="viewSkillVisible"
      title="Просмотр навыка"
      width="95%"
      :style="{ maxWidth: '900px' }"
      class="admin-dialog"
      destroy-on-close
    >
      <div v-if="viewingSkill" class="view-content" v-loading="viewSkillLoading">
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
          <div class="view-value view-value-multiline">{{ viewingSkill.description || '—' }}</div>
        </div>

        <div class="view-row">
          <div class="view-label">Материалы для подготовки</div>
          <div class="view-value view-value-multiline">
            {{ viewingSkill.materials || 'Нет материалов' }}
          </div>
        </div>

        <div class="view-row">
          <div class="view-label">Этапы</div>

          <div
            v-if="!viewingSkill.stages || viewingSkill.stages.length === 0"
            class="empty-message"
          >
            Этапы не добавлены
          </div>

          <template v-else>
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
                v-if="!getStagesByType(viewingSkill.stages, selectedViewStageType)?.length"
                class="empty-message"
              >
                Нет данных для этого этапа
              </div>

              <template v-else>
                <div
                  v-for="(stage, idx) in getStagesByType(
                    viewingSkill.stages,
                    selectedViewStageType,
                  )"
                  :key="stage.id || idx"
                  class="stage-item"
                >
                  <div class="stage-title">
                    {{ getStageContentTitle(selectedViewStageType) }}
                  </div>

                  <div
                    v-if="!stage.questions || stage.questions.length === 0"
                    class="empty-message"
                  >
                    Вопросы/задания не добавлены
                  </div>

                  <div v-else class="stage-qa-list">
                    <div v-for="(q, qIdx) in stage.questions" :key="qIdx" class="qa-item">
                      <div
                        class="qa-question"
                        @click="toggleQAExpand(viewingSkill.id || 'view', stage.id || idx, qIdx)"
                      >
                        <span class="qa-question-num">{{ qIdx + 1 }}.</span>
                        <span class="qa-question-text">{{ q.text || 'Без текста' }}</span>
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
                          v-show="
                            expandedQA[`${viewingSkill.id || 'view'}_${stage.id || idx}_${qIdx}`]
                          "
                          class="qa-answer"
                        >
                          <strong>{{
                            isPracticeOrPerformance(stage.type)
                              ? 'Критерий оценивания:'
                              : 'Эталонный ответ:'
                          }}</strong>
                          {{ q.answer || '—' }}
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
      <template #footer>
        <el-button class="btn-edit" :icon="Edit" @click="handleEditSkill">Редактировать</el-button>
        <el-button type="danger" :icon="Delete" @click="confirmDeleteSkill">Удалить</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="skillDialogVisible"
      :title="editingSkill ? 'Редактирование навыка' : 'Новый навык'"
      width="95%"
      :style="{ maxWidth: '1000px' }"
      class="admin-dialog"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form :model="skillForm" label-position="top" class="skill-form" v-loading="skillsLoading">
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
            placeholder="Введите материалы для подготовки"
          />
        </el-form-item>

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

              <div class="stage-questions">
                <div v-for="(q, qIdx) in stage.questions" :key="qIdx" class="question-item">
                  <div class="question-header">
                    <span class="question-number">
                      {{ isPracticeOrPerformance(stage.type) ? 'Задание' : 'Вопрос' }}
                      {{ q.num }}
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
        <el-button class="btn-cancel" @click="skillDialogVisible = false">Отмена</el-button>
        <el-button class="btn-save" type="primary" @click="saveSkill" :loading="skillsLoading"
          >Сохранить</el-button
        >
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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
  skills: { type: Array, required: true },
  categories: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:skills', 'update:categories'])

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const skillsLoading = ref(false)
const categoriesLoading = ref(false)
const viewSkillLoading = ref(false)
const skillSearch = ref('')

const filteredSkills = computed(() => {
  const _ = props.categories
  if (!skillSearch.value) return props.skills || []
  const q = skillSearch.value.toLowerCase()
  return (props.skills || []).filter((s) => s.name?.toLowerCase().includes(q))
})

const skillDialogVisible = ref(false)
const viewSkillVisible = ref(false)
const categoriesDialogVisible = ref(false)
const editingSkill = ref(null)
const viewingSkill = ref(null)
const newCategoryName = ref('')
const expandedQA = ref({})
const selectedViewStageType = ref('practice')

const stageTypes = [
  { key: 'practice', label: 'Практическое задание' },
  { key: 'attestation', label: 'Аттестация' },
  { key: 'performance', label: 'Performance review' },
]

const stageTypesWithContent = computed(() => {
  if (!viewingSkill.value?.stages) return stageTypes
  const available = stageTypes.filter((t) =>
    viewingSkill.value.stages?.some((s) => s.type === t.key),
  )
  return available.length > 0 ? available : stageTypes
})

const skillForm = ref({
  name: '',
  categoryIds: [],
  categoryNames: '',
  description: '',
  materials: '',
  stages: [],
})

const mapTypeToFrontend = (backendType) => {
  if (!backendType) return 'practice'
  const t = String(backendType).trim()
  if (t === 'Аттестация') return 'attestation'
  if (t === 'Performance review') return 'performance'
  if (t === 'Практическое задание') return 'practice'
  return 'practice'
}

const mapTypeToBackend = (frontendType) => {
  if (frontendType === 'attestation') return 'Аттестация'
  if (frontendType === 'performance') return 'Performance review'
  return 'Практическое задание'
}

const isPracticeOrPerformance = (type) => type === 'practice' || type === 'performance'

const getCategoryNamesByIds = (ids, categoriesList) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return ''
  if (!categoriesList || !Array.isArray(categoriesList)) return ''
  const names = ids
    .map((id) => {
      const cat = categoriesList.find((c) => String(c?.id) === String(id))
      return cat?.name || cat?.category_name
    })
    .filter(Boolean)
  return names.join(', ')
}

const getSkillCategoryNames = (skill) => {
  if (skill?.categoryNames?.trim()) {
    return skill.categoryNames
  }

  if (Array.isArray(skill.categories) && skill.categories.length > 0) {
    const names = skill.categories
      .map((c) => c?.category_name || c?.name)
      .filter((name) => name?.trim())
    if (names.length > 0) return names.join(', ')
  }

  let ids = []
  if (Array.isArray(skill.categoryIds)) ids.push(...skill.categoryIds)
  if (Array.isArray(skill.category_ids)) ids.push(...skill.category_ids)
  if (skill.categoryId != null) ids.push(skill.categoryId)

  if (ids.length === 0) return 'Не указаны'
  if (!props.categories?.length) return '—'

  const names = ids
    .map((id) => {
      const cat = props.categories.find((c) => String(c?.id) === String(id))
      return cat?.name || cat?.category_name
    })
    .filter(Boolean)

  return names.length > 0 ? names.join(', ') : 'Не указаны'
}

const getStagesByType = (stages, type) => {
  if (!stages || !Array.isArray(stages)) return []
  return stages.filter((s) => s?.type === type)
}

const getStageContentTitle = (type) =>
  type === 'attestation' ? 'Вопросы и ответы' : 'Задания и критерии'

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
    { value: 'practice', label: 'Практическое задание' },
    { value: 'performance', label: 'Performance review' },
  ]
  const used = (skillForm.value.stages || [])
    .filter((_, i) => i !== currentIndex)
    .map((s) => s.type)
  return allTypes.filter((t) => !used.includes(t.value))
}

const isCategoryInUse = (categoryId) => {
  return (props.skills || []).some((skill) => {
    const ids = skill.categoryIds || extractCategoryIds(skill.categories)
    return ids.some((id) => String(id) === String(categoryId))
  })
}

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

const renumberQuestions = (stage) => {
  if (!stage.questions || !Array.isArray(stage.questions)) return
  stage.questions.forEach((q, idx) => {
    q.num = idx + 1
  })
}

const addCategory = async () => {
  const name = newCategoryName.value.trim()
  if (!name) return ElMessage.warning('Введите название')
  try {
    categoriesLoading.value = true
    const res = await fetch(`${API_BASE}/category/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_name: name }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail?.[0]?.msg || `HTTP ${res.status}`)
    }
    await emit('update:categories')
    newCategoryName.value = ''
    ElMessage.success('Категория добавлена')
  } catch (e) {
    console.error('Error adding category:', e)
    ElMessage.error('Ошибка при добавлении категории')
  } finally {
    categoriesLoading.value = false
  }
}

const confirmDeleteCategory = async (cat) => {
  try {
    await ElMessageBox.confirm('Удалить категорию?', 'Подтверждение', { type: 'warning' })
    categoriesLoading.value = true
    const res = await fetch(`${API_BASE}/category/${cat.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    await emit('update:categories')
    ElMessage.success('Категория удалена')
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Error deleting category:', err)
      ElMessage.error('Ошибка при удалении категории')
    }
  } finally {
    categoriesLoading.value = false
  }
}

const openCategoriesDialog = () => {
  newCategoryName.value = ''
  categoriesDialogVisible.value = true
}

// === Навыки: API ===
const saveSkill = async () => {
  if (!skillForm.value.name?.trim()) return ElMessage.warning('Введите название навыка')
  try {
    skillsLoading.value = true

    skillForm.value.stages.forEach((stage) => {
      renumberQuestions(stage)
    })

    const payload = {
      skill: {
        title: skillForm.value.name.trim(),
        description: skillForm.value.description || '',
        literature: skillForm.value.materials || '',
      },
      categories: Array.isArray(skillForm.value.categoryIds) ? skillForm.value.categoryIds : [],
      stages: (skillForm.value.stages || []).map((st) => {
        const questionsPayload = (st.questions || []).map((q) => ({
          ...(q?.id ? { id: q.id } : {}),
          num: q.num || 1,
          question: q?.text || '',
          answer: q?.answer || '',
        }))
        return {
          ...(st?.id ? { id: st.id } : {}),
          confirmation_type: mapTypeToBackend(st.type),
          questions: questionsPayload,
        }
      }),
    }
    let res
    if (editingSkill.value?.id) {
      res = await fetch(`${API_BASE}/skills/${editingSkill.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      res = await fetch(`${API_BASE}/skills/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail?.[0]?.msg || err.detail || `HTTP ${res.status}`)
    }
    ElMessage.success(editingSkill.value ? 'Навык обновлён' : 'Навык создан')
    await emit('update:skills')
    await emit('update:categories')
    skillDialogVisible.value = false
  } catch (err) {
    console.error('Error saving skill:', err)
    ElMessage.error(err.message || 'Ошибка сохранения навыка')
  } finally {
    skillsLoading.value = false
  }
}

const confirmDeleteSkill = async () => {
  if (!viewingSkill.value?.id) {
    ElMessage.warning('Не выбран навык для удаления')
    return
  }
  try {
    await ElMessageBox.confirm(`Удалить навык "${viewingSkill.value.name}"?`, 'Подтверждение', {
      type: 'warning',
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
    })
    skillsLoading.value = true
    const res = await fetch(`${API_BASE}/skills/${viewingSkill.value.id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    ElMessage.success('Навык удалён')
    await emit('update:skills')
    await emit('update:categories')
    viewSkillVisible.value = false
    viewingSkill.value = null
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Error deleting skill:', err)
      ElMessage.error(err.message || 'Ошибка при удалении навыка')
    }
  } finally {
    skillsLoading.value = false
  }
}

const normalizeSkillData = (skill, categoriesList = []) => {
  if (!skill) return null
  let ids = []
  if (Array.isArray(skill.categoryIds)) ids = skill.categoryIds
  else if (Array.isArray(skill.categories)) ids = extractCategoryIds(skill.categories)
  else if (Array.isArray(skill.category_ids)) ids = skill.category_ids
  else if (skill.categoryId) ids = [skill.categoryId]
  const categoryNames = getCategoryNamesByIds(ids, categoriesList)
  const normalizedStages = []
  if (skill.stages && Array.isArray(skill.stages)) {
    for (const st of skill.stages) {
      const type = mapTypeToFrontend(st.confirmation_type)
      const questions = []
      if (st.questions && Array.isArray(st.questions)) {
        for (const q of st.questions) {
          questions.push({
            id: q?.id || null,
            text: q?.question || q?.text || '',
            answer: q?.answer || '',
            num: q?.num || 1,
          })
        }
      }
      normalizedStages.push({
        id: st?.id || null,
        type,
        confirmation_type: st.confirmation_type,
        last_version: st.last_version,
        questions,
      })
    }
  }
  return {
    ...skill,
    categoryIds: ids,
    categoryNames: categoryNames || skill.categoryNames || '',
    name: skill.name || skill.title || '',
    materials: skill.materials || skill.literature || '',
    stages: normalizedStages,
    stagesCount: normalizedStages.length,
  }
}

const viewSkill = async (skill) => {
  try {
    viewSkillLoading.value = true
    const res = await fetch(`${API_BASE}/skills/${skill.id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const fullData = await res.json()
    viewingSkill.value = normalizeSkillData(
      fullData,
      props.categories?.length ? props.categories : [],
    )
    expandedQA.value = {}
    selectedViewStageType.value = stageTypesWithContent.value[0]?.key || 'practice'
    viewSkillVisible.value = true
  } catch (err) {
    console.error('Error loading skill details:', err)
    ElMessage.error('Не удалось загрузить детали навыка')
    viewingSkill.value = normalizeSkillData(skill, props.categories?.length ? props.categories : [])
    viewSkillVisible.value = true
  } finally {
    viewSkillLoading.value = false
  }
}

const handleEditSkill = () => {
  if (viewingSkill.value) {
    openSkillDialog(viewingSkill.value)
  }
  viewSkillVisible.value = false
}

const openSkillDialog = (skill = null) => {
  if (skill) {
    editingSkill.value = skill
    const normalized = normalizeSkillData(skill, props.categories?.length ? props.categories : [])
    skillForm.value = {
      name: normalized.name || '',
      categoryIds: normalized.categoryIds || [],
      categoryNames: normalized.categoryNames || '',
      description: normalized.description || '',
      materials: normalized.materials || '',
      stages:
        normalized.stages?.map((s) => ({
          ...s,
          questions: s.questions?.map((q) => ({ ...q, text: q.text || q.question || '' })) || [],
        })) || [],
    }
    skillForm.value.stages.forEach((stage) => {
      renumberQuestions(stage)
    })
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
  const types = getAvailableStageTypes(skillForm.value.stages?.length || 0)
  if (!types.length) return ElMessage.warning('Все типы этапов уже добавлены')
  if (!skillForm.value.stages) skillForm.value.stages = []
  skillForm.value.stages.push({ type: types[0].value, questions: [] })
}

const removeStage = (idx) => {
  if (skillForm.value.stages?.[idx]) {
    skillForm.value.stages.splice(idx, 1)
  }
}

const addQuestion = (idx) => {
  if (skillForm.value.stages?.[idx]) {
    if (!skillForm.value.stages[idx].questions) {
      skillForm.value.stages[idx].questions = []
    }
    skillForm.value.stages[idx].questions.push({ text: '', answer: '' })
    renumberQuestions(skillForm.value.stages[idx])
  }
}

const removeQuestion = (sIdx, qIdx) => {
  if (skillForm.value.stages?.[sIdx]?.questions?.[qIdx]) {
    skillForm.value.stages[sIdx].questions.splice(qIdx, 1)
    renumberQuestions(skillForm.value.stages[sIdx])
  }
}

watch(
  () => props.categories,
  () => {
    emit('update:skills')
  },
  { deep: true },
)
</script>

<style scoped>
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
:deep(.data-table.el-table),
:deep(.data-table .el-table__body-wrapper) {
  overflow-x: auto;
}
:deep(.data-table .el-table__body tr > td:first-child),
:deep(.data-table .el-table__header tr > th:first-child) {
  position: sticky;
  left: 0;
  z-index: 10;
  background: #fff;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05);
}
:deep(.data-table .el-table__body tr:hover > td:first-child) {
  background: #f5f7fa !important;
}
:deep(.data-table .el-table__body tr.el-table__row--striped:hover > td:first-child) {
  background: #fafafa !important;
}
:deep(.data-table .el-table__header tr > th:first-child) {
  background: #fafafa;
}
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
.view-value-multiline {
  white-space: pre-wrap;
  word-break: break-word;
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
  align-items: flex-start;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: #f5f5f5;
  cursor: pointer;
  font-size: 13px;
}
.qa-question:hover {
  background: #ebebeb;
}
.qa-question-num {
  flex-shrink: 0;
  min-width: 24px;
  font-weight: var(--font-weight-medium);
  color: var(--text);
  line-height: 1.5;
}
.qa-question-text {
  flex: 1;
  line-height: 1.5;
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
  align-self: center;
}
.collapse-icon.expanded {
  transform: rotate(90deg);
}
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

.empty-message {
  color: #909399;
  font-size: 13px;
  padding: 8px 0;
  font-style: italic;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    justify-content: flex-end;
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

@media (max-width: 1200px) {
  :deep(.admin-dialog .el-dialog) {
    width: 85% !important;
  }
}

@media (max-width: 992px) {
  :deep(.admin-dialog .el-dialog) {
    width: 90% !important;
  }
}

@media (max-width: 768px) {
  :deep(.admin-dialog .el-dialog) {
    width: 95% !important;
    max-width: 95vw !important;
  }
  :deep(.admin-dialog .el-dialog__header),
  :deep(.admin-dialog .el-dialog__body),
  :deep(.admin-dialog .el-dialog__footer) {
    padding: var(--spacing-sm) var(--spacing-md);
  }
  :deep(.admin-dialog .el-dialog__title) {
    font-size: 16px;
  }
  .view-content {
    max-height: 70vh;
  }
  .skill-form {
    max-height: 60vh;
  }
}

@media (max-width: 480px) {
  :deep(.admin-dialog .el-dialog) {
    width: 98% !important;
  }
  :deep(.admin-dialog .el-dialog__header),
  :deep(.admin-dialog .el-dialog__body),
  :deep(.admin-dialog .el-dialog__footer) {
    padding: var(--spacing-xs) var(--spacing-sm);
  }
  :deep(.admin-dialog .el-dialog__title) {
    font-size: 15px;
  }
}

:deep(.admin-dialog .el-form-item__label) {
  font-weight: var(--font-weight-medium);
}
:deep(.category-select .el-tag) {
  margin-right: 4px;
}
</style>

<style>
.btn-create-skill.el-button--primary {
  background-color: #4a2c6d !important;
  border-color: #4a2c6d !important;
  color: #fff !important;
}
.btn-create-skill.el-button--primary:hover {
  background-color: #3a2255 !important;
  border-color: #3a2255 !important;
  color: #fff !important;
}
.btn-create-skill.el-button--primary:active {
  background-color: #2d1a42 !important;
  border-color: #2d1a42 !important;
}

.btn-categories.el-button {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
.btn-categories.el-button:hover {
  background-color: #e8e8e8 !important;
  border-color: #c0c4cc !important;
  color: #606266 !important;
}

.btn-save.el-button--primary {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #fff !important;
}
.btn-save.el-button--primary:hover {
  background-color: #5daf34 !important;
  border-color: #5daf34 !important;
  color: #fff !important;
}
.btn-save.el-button--primary:active {
  background-color: #53a32f !important;
  border-color: #53a32f !important;
}

.btn-cancel.el-button {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
.btn-cancel.el-button:hover {
  background-color: #e8e8e8 !important;
  border-color: #c0c4cc !important;
  color: #606266 !important;
}

.btn-edit.el-button {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
.btn-edit.el-button:hover {
  background-color: #e8e8e8 !important;
  border-color: #c0c4cc !important;
  color: #606266 !important;
}
</style>
