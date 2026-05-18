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
    <el-table :data="filteredCategories" stripe border class="data-table" @row-click="viewCategory">
      <el-table-column prop="name" label="Название категории" min-width="300" />
      <el-table-column prop="skillsCount" label="Навыков" width="120" align="center">
        <template #default="{ row }">
          {{ countCategorySkills(row.id) }}
        </template>
      </el-table-column>
      <el-table-column label="Действия" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click.stop="editCategory(row)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button link type="danger" size="small" @click.stop="deleteCategory(row)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 🔹 Модальное окно: Категория -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? 'Редактирование категории' : 'Новая категория'"
      :width="500"
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

// === Модальное окно ===
const categoryDialogVisible = ref(false)
const editingCategory = ref(null)

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
  // Просмотр можно реализовать при необходимости
  ElMessage.info(`Категория: ${category.name}`)
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
