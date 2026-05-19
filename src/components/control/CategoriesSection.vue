<!-- src/components/control/CategoriesSection.vue -->
<template>
  <section class="tab-content">
    <div class="section-header">
      <h2>Управление категориями</h2>
      <el-button type="primary" @click="openCategoryDialog()">
        <el-icon><Plus /></el-icon>
        Создать категорию
      </el-button>
    </div>

    <!-- Поиск -->
    <div class="filters-row">
      <el-input
        v-model="categorySearch"
        placeholder="Поиск по названию категории"
        prefix-icon="Search"
        clearable
        class="search-input"
      />
    </div>

    <!-- Таблица категорий -->
    <div class="table-wrapper">
      <el-table
        :data="filteredCategories"
        stripe
        border
        class="data-table"
        @row-click="viewCategory"
      >
        <el-table-column prop="name" label="Название категории" min-width="300" />
        <el-table-column prop="skillsCount" label="Навыков" width="120" align="center">
          <template #default="{ row }">
            {{ countCategorySkills(row.id) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 🔹 Модальное окно: ПРОСМОТР КАТЕГОРИИ -->
    <el-dialog
      v-model="viewCategoryVisible"
      title="Просмотр категории"
      :width="400"
      class="admin-dialog"
      destroy-on-close
    >
      <div v-if="viewingCategory" class="view-content">
        <div class="view-row">
          <div class="view-label">Название категории</div>
          <div class="view-value">{{ viewingCategory.name }}</div>
        </div>
      </div>
      <template #footer>
        <el-button :icon="Edit" @click="handleEditCategory">Редактировать</el-button>
        <el-button type="danger" :icon="Delete" @click="confirmDeleteCategory">Удалить</el-button>
      </template>
    </el-dialog>

    <!-- 🔹 Модальное окно: Категория -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? 'Редактирование категории' : 'Новая категория'"
      :width="400"
      class="admin-dialog"
      destroy-on-close
    >
      <el-form :model="categoryForm" label-position="top">
        <el-form-item label="Название категории *" prop="name">
          <el-input
            v-model="categoryForm.name"
            placeholder="Например: Базы данных"
            @keyup.enter="saveCategory"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="categoryDialogVisible = false">Отмена</el-button>
        <el-button type="primary" @click="saveCategory">Сохранить</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Edit, Search } from '@element-plus/icons-vue'

const props = defineProps({
  categories: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['update:categories'])

// === Поиск ===
const categorySearch = ref('')

const filteredCategories = computed(() => {
  if (!categorySearch.value) return props.categories
  const q = categorySearch.value.toLowerCase()
  return props.categories.filter((c) => c.name?.toLowerCase().includes(q))
})

// === Модальные окна ===
const categoryDialogVisible = ref(false)
const viewCategoryVisible = ref(false)

const editingCategory = ref(null)
const viewingCategory = ref(null)

// === Форма категории ===
const categoryForm = ref({
  name: '',
})

// === Хелперы ===
const countCategorySkills = (categoryId) => {
  // Здесь можно добавить логику подсчёта навыков из глобального стейта
  // Пока возвращаем 0, так как навыки хранятся в родительском компоненте
  return 0
}

// === Категории: действия ===
const viewCategory = (category) => {
  viewingCategory.value = category
  viewCategoryVisible.value = true
}

const handleEditCategory = () => {
  openCategoryDialog(viewingCategory.value)
  viewCategoryVisible.value = false
}

const confirmDeleteCategory = async () => {
  if (!viewingCategory.value) return
  try {
    await ElMessageBox.confirm(
      `Удалить категорию "${viewingCategory.value.name}"?`,
      'Подтверждение',
      {
        type: 'warning',
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
      },
    )
    emit(
      'update:categories',
      props.categories.filter((c) => c.id !== viewingCategory.value.id),
    )
    ElMessage.success('Категория удалена')
    viewCategoryVisible.value = false
  } catch {
    // отменено
  }
}

const editCategory = (category) => {
  openCategoryDialog(category)
}

const openCategoryDialog = (category = null) => {
  if (category) {
    editingCategory.value = category
    categoryForm.value = {
      name: category.name || '',
    }
  } else {
    editingCategory.value = null
    categoryForm.value = {
      name: '',
    }
  }
  categoryDialogVisible.value = true
}

const saveCategory = () => {
  if (!categoryForm.value.name?.trim()) {
    ElMessage.warning('Введите название категории')
    return
  }

  if (editingCategory.value) {
    // Редактирование
    const idx = props.categories.findIndex((c) => c.id === editingCategory.value.id)
    if (idx !== -1) {
      const updated = [...props.categories]
      updated[idx] = { ...updated[idx], name: categoryForm.value.name.trim() }
      emit('update:categories', updated)
    }
    ElMessage.success('Категория обновлена')
  } else {
    // Создание
    const newCategory = {
      id: Date.now(),
      name: categoryForm.value.name.trim(),
    }
    emit('update:categories', [...props.categories, newCategory])
    ElMessage.success('Категория создана')
  }
  categoryDialogVisible.value = false
}

const deleteCategory = async (category) => {
  try {
    await ElMessageBox.confirm(`Удалить категорию "${category.name}"?`, 'Подтверждение', {
      type: 'warning',
    })
    emit(
      'update:categories',
      props.categories.filter((c) => c.id !== category.id),
    )
    ElMessage.success('Категория удалена')
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

/* Обёртка таблицы для центрирования */
.table-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-bottom: var(--spacing-md);
}

.data-table {
  width: auto;
  max-width: 600px;
  cursor: pointer;
}

.data-table :deep(.el-table__row) {
  cursor: pointer;
}

.data-table :deep(.el-table__row:hover) {
  background-color: var(--background);
}

/* === Модальные окна просмотра === */
.view-content {
  padding: var(--spacing-sm) 0;
}

.view-row {
  margin-bottom: var(--spacing-md);
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

/* Адаптивность */
@media (max-width: 768px) {
  .filters-row {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
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
